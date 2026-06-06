import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { Question } from "@/types";
import type {
  AssignmentStatus,
  StudentOption,
  WorksheetAssignment,
} from "@/types/assignment";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { logWorksheetCompletedOnCard } from "@/lib/workspaceCardContentService";

const ASSIGNMENTS_COLLECTION = "assignments";
const WORKSPACE_BOARDS_COLLECTION = "workspace_boards";

export type MarkAssignmentCompletedOptions = {
  score?: { correct: number; total: number };
  workspace?: { boardId: string; cardId: string };
};

async function findWorkspaceCardIdForAssignment(
  boardId: string,
  assignmentId: string,
): Promise<string | null> {
  const snapshot = await getDocs(
    collection(getFirebaseDb(), WORKSPACE_BOARDS_COLLECTION, boardId, "cards"),
  );
  for (const cardDoc of snapshot.docs) {
    const data = cardDoc.data();
    if (data.deletedAt) continue;
    if (data.assignmentId === assignmentId) return cardDoc.id;
  }
  return null;
}

async function resolveWorkspaceTargetForAssignment(
  assignment: WorksheetAssignment,
  hint?: { boardId: string; cardId: string },
): Promise<{ boardId: string; cardId: string } | null> {
  if (hint) return hint;

  const boardId = assignment.workspaceBoardId ?? assignment.assignedToStudentUid;
  if (!boardId) return null;

  const cardId =
    assignment.workspaceCardId ??
    (await findWorkspaceCardIdForAssignment(boardId, assignment.id));
  if (!cardId) return null;

  return { boardId, cardId };
}

function parseAssignment(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): WorksheetAssignment {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    questionIds: (data.questionIds as string[]) ?? [],
    tutorUid: data.tutorUid as string,
    assignedToStudentUid: data.assignedToStudentUid as string,
    status: (data.status as AssignmentStatus) ?? "todo",
    createdAt: data.createdAt,
    completedAt: data.completedAt,
    dueAt: data.dueAt ?? null,
    workspaceBoardId: (data.workspaceBoardId as string | undefined) ?? null,
    workspaceListId: (data.workspaceListId as string | undefined) ?? null,
    workspaceCardId: (data.workspaceCardId as string | undefined) ?? null,
    title: (data.title as string) ?? "Assigned worksheet",
    tagCodes: (data.tagCodes as string[]) ?? [],
  };
}

function mapStudentDoc(id: string, data: DocumentData): StudentOption {
  return {
    uid: id,
    displayName: (data.displayName as string) || (data.email as string) || "Student",
    email: (data.email as string) ?? "",
    lastActiveAt: data.lastActiveAt,
  };
}

async function fetchStudentByUid(uid: string): Promise<StudentOption | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "users", uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.role !== "student") return null;
  return mapStudentDoc(snapshot.id, data);
}

/** Loads students via role query; falls back to per-doc reads from tutor assignments. */
export async function fetchStudents(): Promise<StudentOption[]> {
  const db = getFirebaseDb();
  try {
    const studentsQuery = query(
      collection(db, "users"),
      where("role", "==", "student"),
    );
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs
      .map((studentDoc) => mapStudentDoc(studentDoc.id, studentDoc.data()))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  } catch {
    const assignments = await fetchAssignmentsForTutor();
    const uids = [...new Set(assignments.map((a) => a.assignedToStudentUid))];
    const students = await Promise.all(uids.map((uid) => fetchStudentByUid(uid)));
    return students
      .filter((s): s is StudentOption => s !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
}

export async function fetchAssignmentsForTutor(): Promise<WorksheetAssignment[]> {
  const auth = getFirebaseAuth();
  const tutorUid = auth.currentUser?.uid;
  if (!tutorUid) {
    throw new Error("You must be signed in to view assignments.");
  }

  const db = getFirebaseDb();
  const assignmentsQuery = query(
    collection(db, ASSIGNMENTS_COLLECTION),
    where("tutorUid", "==", tutorUid),
  );
  const snapshot = await getDocs(assignmentsQuery);
  return snapshot.docs
    .map(parseAssignment)
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export async function fetchAssignmentsForStudent(): Promise<WorksheetAssignment[]> {
  const auth = getFirebaseAuth();
  const studentUid = auth.currentUser?.uid;
  if (!studentUid) {
    throw new Error("You must be signed in to view assignments.");
  }

  const db = getFirebaseDb();
  const assignmentsQuery = query(
    collection(db, ASSIGNMENTS_COLLECTION),
    where("assignedToStudentUid", "==", studentUid),
  );
  const snapshot = await getDocs(assignmentsQuery);
  return snapshot.docs
    .map(parseAssignment)
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export interface CreateAssignmentWorkspaceInput {
  boardId: string;
  listId: string;
  /** When omitted, a new card is created in the list. */
  existingCardId?: string;
  /** Title for a newly created workspace card only. */
  newCardTitle?: string;
}

export interface CreateAssignmentInput {
  questionIds: string[];
  tutorUid: string;
  assignedToStudentUid: string;
  title: string;
  tagCodes: string[];
  dueAt: Timestamp;
  workspace?: CreateAssignmentWorkspaceInput;
}

/** YYYY-MM-DD for use with &lt;input type="date" /&gt; */
export function toAssignmentDueDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Default due date: one week from today (local calendar). */
export function defaultAssignmentDueDateInput(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toAssignmentDueDateInputValue(d);
}

/** Converts a date input to end-of-day local time for Firestore. */
export function assignmentDueDateInputToTimestamp(dateInput: string): Timestamp {
  const [y, m, d] = dateInput.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error("Invalid due date.");
  }
  return Timestamp.fromDate(new Date(y, m - 1, d, 23, 59, 59, 999));
}

export async function createAssignment(
  input: CreateAssignmentInput,
): Promise<string> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, ASSIGNMENTS_COLLECTION), {
    questionIds: input.questionIds,
    tutorUid: input.tutorUid,
    assignedToStudentUid: input.assignedToStudentUid,
    title: input.title,
    tagCodes: input.tagCodes,
    dueAt: input.dueAt,
    status: "todo" satisfies AssignmentStatus,
    createdAt: serverTimestamp(),
    workspaceBoardId: input.workspace?.boardId ?? null,
    workspaceListId: input.workspace?.listId ?? null,
    workspaceCardId: null,
  });
  return docRef.id;
}

export async function setAssignmentWorkspaceCard(
  assignmentId: string,
  workspaceCardId: string,
): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), ASSIGNMENTS_COLLECTION, assignmentId), {
    workspaceCardId,
  });
}

export async function fetchAssignmentById(
  assignmentId: string,
): Promise<WorksheetAssignment | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), ASSIGNMENTS_COLLECTION, assignmentId));
  if (!snapshot.exists()) return null;
  return parseAssignment(snapshot as QueryDocumentSnapshot<DocumentData>);
}

export async function markAssignmentCompleted(
  assignmentId: string,
  options?: MarkAssignmentCompletedOptions,
): Promise<void> {
  const assignment = await fetchAssignmentById(assignmentId);
  const db = getFirebaseDb();
  await updateDoc(doc(db, ASSIGNMENTS_COLLECTION, assignmentId), {
    status: "completed",
    completedAt: serverTimestamp(),
  });
  if (!assignment) return;

  const workspace = await resolveWorkspaceTargetForAssignment(assignment, options?.workspace);
  if (!workspace) return;

  await logWorksheetCompletedOnCard(
    workspace.boardId,
    workspace.cardId,
    assignment.title,
    options?.score,
  );
}

export function resolveQuestionsByIds(
  allQuestions: Question[],
  questionIds: string[],
): Question[] {
  const byId = new Map(allQuestions.map((q) => [q.id, q]));
  return questionIds
    .map((id) => byId.get(id))
    .filter((q): q is Question => q !== undefined);
}
