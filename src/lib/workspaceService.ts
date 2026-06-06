import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { fetchStudents } from "@/lib/assignmentService";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import {
  DEFAULT_WORKSPACE_LISTS,
  type WorkspaceBoard,
  type WorkspaceCard,
  type WorkspaceCardSessionMeta,
  type WorkspaceList,
} from "@/types/workspace";
import type { StudentOption } from "@/types/assignment";

const BOARDS_COLLECTION = "workspace_boards";

function parseBoard(
  snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData },
): WorkspaceBoard | null {
  const data = snapshot.data();
  if (data.deletedAt) return null;
  return {
    id: snapshot.id,
    studentUid: data.studentUid as string,
    studentName: (data.studentName as string) ?? "Student",
    studentEmail: (data.studentEmail as string) ?? "",
    createdByUid: data.createdByUid as string,
    createdAt: data.createdAt,
    archivedAt: data.archivedAt ?? null,
    deletedAt: data.deletedAt ?? null,
  };
}

function parseList(
  boardId: string,
  snapshot: QueryDocumentSnapshot<DocumentData>,
): WorkspaceList | null {
  const data = snapshot.data();
  if (data.deletedAt) return null;
  return {
    id: snapshot.id,
    boardId,
    title: (data.title as string) ?? "List",
    position: Number(data.position) || 0,
    kind: data.kind ?? "custom",
    createdAt: data.createdAt,
  };
}

function parseCard(boardId: string, snapshot: QueryDocumentSnapshot<DocumentData>): WorkspaceCard | null {
  const data = snapshot.data();
  if (data.deletedAt) return null;
  return {
    id: snapshot.id,
    boardId,
    listId: data.listId as string,
    title: (data.title as string) ?? "Untitled",
    description: (data.description as string) ?? "",
    sessionMeta: (data.sessionMeta as WorkspaceCardSessionMeta | undefined) ?? undefined,
    position: Number(data.position) || 0,
    completed: Boolean(data.completed),
    dueAt: data.dueAt ?? null,
    assignmentId: (data.assignmentId as string | undefined) ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    deletedAt: data.deletedAt ?? null,
  };
}

export async function fetchAllWorkspaceBoards(): Promise<WorkspaceBoard[]> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, BOARDS_COLLECTION));
  return snapshot.docs
    .map(parseBoard)
    .filter((b): b is WorkspaceBoard => b !== null)
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export async function fetchWorkspaceBoard(boardId: string): Promise<WorkspaceBoard | null> {
  const db = getFirebaseDb();
  const snapshot = await getDoc(doc(db, BOARDS_COLLECTION, boardId));
  if (!snapshot.exists()) return null;
  return parseBoard(snapshot);
}

export async function fetchStudentsWithoutBoard(): Promise<StudentOption[]> {
  const [students, boards] = await Promise.all([fetchStudents(), fetchAllWorkspaceBoards()]);
  const boardStudentUids = new Set(boards.map((b) => b.studentUid));
  return students.filter((s) => !boardStudentUids.has(s.uid));
}

export async function createWorkspaceBoard(student: StudentOption): Promise<string> {
  const auth = getFirebaseAuth();
  const tutorUid = auth.currentUser?.uid;
  if (!tutorUid) {
    throw new Error("You must be signed in to create a workspace board.");
  }

  const existingBoards = await fetchAllWorkspaceBoards();
  if (existingBoards.some((b) => b.studentUid === student.uid)) {
    throw new Error(`${student.displayName} already has a workspace board.`);
  }

  const db = getFirebaseDb();
  const boardRef = doc(db, BOARDS_COLLECTION, student.uid);

  await setDoc(boardRef, {
    studentUid: student.uid,
    studentName: student.displayName,
    studentEmail: student.email,
    createdByUid: tutorUid,
    createdAt: serverTimestamp(),
  });

  const listsRef = collection(db, BOARDS_COLLECTION, student.uid, "lists");
  await Promise.all(
    DEFAULT_WORKSPACE_LISTS.map((list) =>
      addDoc(listsRef, {
        title: list.title,
        kind: list.kind,
        position: list.position,
        createdAt: serverTimestamp(),
      }),
    ),
  );

  return student.uid;
}

export async function fetchWorkspaceLists(boardId: string): Promise<WorkspaceList[]> {
  const db = getFirebaseDb();
  const listsQuery = query(
    collection(db, BOARDS_COLLECTION, boardId, "lists"),
    orderBy("position", "asc"),
  );
  const snapshot = await getDocs(listsQuery);
  return snapshot.docs
    .map((d) => parseList(boardId, d))
    .filter((l): l is WorkspaceList => l !== null);
}

export async function fetchWorkspaceCards(boardId: string): Promise<WorkspaceCard[]> {
  const db = getFirebaseDb();
  const cardsQuery = query(
    collection(db, BOARDS_COLLECTION, boardId, "cards"),
    orderBy("position", "asc"),
  );
  const snapshot = await getDocs(cardsQuery);
  return snapshot.docs
    .map((d) => parseCard(boardId, d))
    .filter((c): c is WorkspaceCard => c !== null);
}

export async function createWorkspaceCard(
  boardId: string,
  listId: string,
  title: string,
  opts?: { assignmentId?: string; dueAt?: Timestamp | null },
): Promise<string> {
  const db = getFirebaseDb();
  const existing = await fetchWorkspaceCards(boardId);
  const inList = existing.filter((c) => c.listId === listId);
  const position = inList.length > 0 ? Math.max(...inList.map((c) => c.position)) + 1 : 0;

  const payload: Record<string, unknown> = {
    listId,
    title,
    description: "",
    position,
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (opts?.assignmentId) payload.assignmentId = opts.assignmentId;
  if (opts?.dueAt) payload.dueAt = opts.dueAt;

  const docRef = await addDoc(collection(db, BOARDS_COLLECTION, boardId, "cards"), payload);
  return docRef.id;
}

export interface UpdateWorkspaceCardInput {
  title?: string;
  description?: string;
  sessionMeta?: WorkspaceCardSessionMeta;
  completed?: boolean;
  listId?: string;
  assignmentId?: string | null;
  dueAt?: Timestamp | null;
}

function stripUndefinedFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj) as [keyof T, unknown][]) {
    if (value !== undefined) {
      out[key] = value as T[keyof T];
    }
  }
  return out;
}

export async function updateWorkspaceCard(
  boardId: string,
  cardId: string,
  input: UpdateWorkspaceCardInput,
): Promise<void> {
  const db = getFirebaseDb();
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.sessionMeta !== undefined) {
    payload.sessionMeta = stripUndefinedFields(
      input.sessionMeta as unknown as Record<string, unknown>,
    );
  }
  if (input.completed !== undefined) payload.completed = input.completed;
  if (input.listId !== undefined) payload.listId = input.listId;
  if (input.assignmentId !== undefined) payload.assignmentId = input.assignmentId;
  if (input.dueAt !== undefined) payload.dueAt = input.dueAt;

  await updateDoc(doc(db, BOARDS_COLLECTION, boardId, "cards", cardId), payload);
}

export interface LinkAssignmentToWorkspaceInput {
  boardId: string;
  listId: string;
  assignmentId: string;
  dueAt: Timestamp;
  /** When set, links this card without changing its title. */
  existingCardId?: string;
  /** Used only when creating a new card in the list. */
  newCardTitle?: string;
}

/** Pins a worksheet assignment onto a workspace list (new or existing card). */
export async function linkAssignmentToWorkspace(
  input: LinkAssignmentToWorkspaceInput,
): Promise<string> {
  const { boardId, listId, assignmentId, dueAt, existingCardId, newCardTitle } = input;

  if (existingCardId) {
    await updateWorkspaceCard(boardId, existingCardId, {
      assignmentId,
      dueAt,
    });
    return existingCardId;
  }

  return createWorkspaceCard(boardId, listId, newCardTitle?.trim() || "Worksheet", {
    assignmentId,
    dueAt,
  });
}

/** Prefer a list titled Homework; otherwise the first list on the board. */
export function pickDefaultHomeworkListId(lists: WorkspaceList[]): string | null {
  if (lists.length === 0) return null;
  const homework = lists.find((l) => l.title.trim().toLowerCase() === "homework");
  return homework?.id ?? lists[0].id;
}

export async function createWorkspaceList(
  boardId: string,
  title: string,
): Promise<string> {
  const db = getFirebaseDb();
  const lists = await fetchWorkspaceLists(boardId);
  const position = lists.length > 0 ? Math.max(...lists.map((l) => l.position)) + 1 : 0;

  const docRef = await addDoc(collection(db, BOARDS_COLLECTION, boardId, "lists"), {
    title,
    kind: "custom",
    position,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateWorkspaceList(
  boardId: string,
  listId: string,
  input: { title: string },
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, BOARDS_COLLECTION, boardId, "lists", listId), {
    title: input.title,
    updatedAt: serverTimestamp(),
  });
}

/** Soft-deletes a list and all cards in that list. */
export async function deleteWorkspaceList(boardId: string, listId: string): Promise<void> {
  const db = getFirebaseDb();
  const listRef = doc(db, BOARDS_COLLECTION, boardId, "lists", listId);
  const cards = (await fetchWorkspaceCards(boardId)).filter((c) => c.listId === listId);

  await updateDoc(listRef, { deletedAt: serverTimestamp() });

  await Promise.all(
    cards.map((card) =>
      updateDoc(doc(db, BOARDS_COLLECTION, boardId, "cards", card.id), {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}
