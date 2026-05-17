import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
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

const ASSIGNMENTS_COLLECTION = "assignments";

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

export interface CreateAssignmentInput {
  questionIds: string[];
  tutorUid: string;
  assignedToStudentUid: string;
  title: string;
  tagCodes: string[];
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
    status: "todo" satisfies AssignmentStatus,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function markAssignmentCompleted(assignmentId: string): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, ASSIGNMENTS_COLLECTION, assignmentId), {
    status: "completed",
    completedAt: serverTimestamp(),
  });
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
