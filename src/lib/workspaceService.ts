import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { fetchStudents } from "@/lib/assignmentService";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { DEFAULT_WORKSPACE_BOARD_COLOR } from "@/lib/workspaceBoardColors";
import {
  emptyStudentRoadmap,
  mergeRoadmapForWrite,
  parseStudentRoadmap,
  serializeStudentRoadmap,
} from "@/lib/studentRoadmap";
import type {
  StudentRoadmap,
  WorkspaceBoard,
  WorkspaceCard,
  WorkspaceCardSessionMeta,
  WorkspaceList,
} from "@/types/workspace";
import type { StudentOption } from "@/types/assignment";

const BOARDS_COLLECTION = "workspace_boards";
const WRITE_BATCH_LIMIT = 400;

export class WorkspaceConflictError extends Error {
  constructor(
    message = "This student board was updated in another window. Reload to avoid overwriting newer notes.",
  ) {
    super(message);
    this.name = "WorkspaceConflictError";
  }
}

export function isWorkspaceConflictError(err: unknown): err is WorkspaceConflictError {
  return err instanceof WorkspaceConflictError || (err instanceof Error && err.name === "WorkspaceConflictError");
}

function timestampMillis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    const ms = (value as { toMillis?: () => number }).toMillis?.();
    if (typeof ms === "number" && Number.isFinite(ms)) return ms;
  }
  return 0;
}

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
    color: (data.color as string | undefined) ?? undefined,
    createdByUid: data.createdByUid as string,
    createdAt: data.createdAt,
    archivedAt: data.archivedAt ?? null,
    deletedAt: data.deletedAt ?? null,
    diagnosticExtendedTime: Boolean(data.diagnosticExtendedTime),
    roadmap: parseStudentRoadmap(data.roadmap),
    roadmapUpdatedAt: data.roadmapUpdatedAt ?? null,
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
    trelloCardId: (data.trelloCardId as string | undefined) ?? undefined,
    commentCount: data.commentCount == null ? undefined : Number(data.commentCount) || 0,
    attachmentCount: data.attachmentCount == null ? undefined : Number(data.attachmentCount) || 0,
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

export async function createWorkspaceBoard(
  student: StudentOption,
  opts?: { color?: string },
): Promise<string> {
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
  const now = Timestamp.now();

  const alreadyExisted = await runTransaction(db, async (tx) => {
    const existing = await tx.get(boardRef);
    if (existing.exists()) {
      if (existing.data()?.deletedAt) {
        throw new Error(
          `${student.displayName}'s workspace board is marked deleted. Restore it from Firestore instead of creating a new one.`,
        );
      }
      return true;
    }
    tx.set(boardRef, {
      studentUid: student.uid,
      studentName: student.displayName,
      studentEmail: student.email,
      color: opts?.color ?? DEFAULT_WORKSPACE_BOARD_COLOR,
      createdByUid: tutorUid,
      createdAt: now,
      roadmap: serializeStudentRoadmap(emptyStudentRoadmap()),
      roadmapUpdatedAt: now,
      updatedAt: now,
    });
    return false;
  });

  if (alreadyExisted) {
    throw new Error(`${student.displayName} already has a workspace board.`);
  }

  // New boards start with no lists. Trello import may also land on boards that
  // already have lists and cards; the importer matches Trello list count and names.
  return student.uid;
}

export async function updateWorkspaceBoardDiagnosticExtendedTime(
  boardId: string,
  enabled: boolean,
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, BOARDS_COLLECTION, boardId), {
    diagnosticExtendedTime: enabled,
    updatedAt: serverTimestamp(),
  });
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

export async function updateWorkspaceBoardRoadmap(
  boardId: string,
  roadmap: StudentRoadmap,
  opts?: { expectedUpdatedAtMs?: number | null },
): Promise<{ roadmapUpdatedAtMs: number }> {
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("You must be signed in to save the roadmap.");

  const db = getFirebaseDb();
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  const now = Timestamp.now();
  let merged: Record<string, unknown> | null = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(boardRef);
    if (!snap.exists()) throw new Error("Workspace board not found.");
    const data = snap.data();
    if (data.deletedAt) throw new Error("This workspace board is no longer active.");

    const serverMs = timestampMillis(data.roadmapUpdatedAt);
    const expectedMs = opts?.expectedUpdatedAtMs ?? 0;
    if (serverMs > 0 && expectedMs > 0 && serverMs !== expectedMs) {
      throw new WorkspaceConflictError();
    }

    merged = mergeRoadmapForWrite(data.roadmap, roadmap);
    tx.update(boardRef, {
      roadmap: merged,
      roadmapUpdatedAt: now,
      updatedAt: now,
    });
  });

  if (merged) {
    try {
      await addDoc(collection(db, BOARDS_COLLECTION, boardId, "roadmap_revisions"), {
        savedAt: now,
        savedByUid: uid,
        roadmap: merged,
      });
    } catch {
      // Live roadmap is already saved. Revision history needs deployed rules.
    }
  }

  return { roadmapUpdatedAtMs: now.toMillis() };
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
  const position = inList.length > 0 ? Math.min(...inList.map((c) => c.position)) - 1 : 0;

  const payload: Record<string, unknown> = {
    listId,
    title: title.trim().slice(0, 200),
    description: "",
    position,
    completed: false,
    commentCount: 0,
    attachmentCount: 0,
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

/** Persist a new top-to-bottom order for cards (typically within one list). */
export async function reorderWorkspaceCards(
  boardId: string,
  orderedCardIds: string[],
): Promise<void> {
  const db = getFirebaseDb();
  await Promise.all(
    orderedCardIds.map((cardId, index) =>
      updateDoc(doc(db, BOARDS_COLLECTION, boardId, "cards", cardId), {
        position: index,
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

export async function updateWorkspaceCard(
  boardId: string,
  cardId: string,
  input: UpdateWorkspaceCardInput,
): Promise<void> {
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("You must be signed in to update a card.");

  const db = getFirebaseDb();
  const cardRef = doc(db, BOARDS_COLLECTION, boardId, "cards", cardId);
  const now = Timestamp.now();
  const recordsContent =
    input.title !== undefined || input.description !== undefined || input.sessionMeta !== undefined;

  if (!recordsContent) {
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (input.completed !== undefined) payload.completed = input.completed;
    if (input.listId !== undefined) payload.listId = input.listId;
    if (input.assignmentId !== undefined) payload.assignmentId = input.assignmentId;
    if (input.dueAt !== undefined) payload.dueAt = input.dueAt;
    await updateDoc(cardRef, payload);
    return;
  }

  let snapshot: {
    title: string;
    description: string;
    sessionMeta: Record<string, unknown>;
  } | null = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(cardRef);
    if (!snap.exists()) throw new Error("Card not found.");
    const data = snap.data();
    if (data.deletedAt) throw new Error("This card is no longer active.");

    const nextTitle = input.title !== undefined ? input.title : ((data.title as string) ?? "");
    const nextDescription =
      input.description !== undefined ? input.description : ((data.description as string) ?? "");
    const existingMeta =
      data.sessionMeta && typeof data.sessionMeta === "object"
        ? (data.sessionMeta as Record<string, unknown>)
        : {};
    const nextMeta =
      input.sessionMeta !== undefined
        ? {
            ...existingMeta,
            ...stripUndefinedFields(input.sessionMeta as unknown as Record<string, unknown>),
          }
        : existingMeta;

    const payload: Record<string, unknown> = { updatedAt: now };
    if (input.title !== undefined) payload.title = input.title;
    if (input.description !== undefined) payload.description = input.description;
    if (input.sessionMeta !== undefined) payload.sessionMeta = nextMeta;
    if (input.completed !== undefined) payload.completed = input.completed;
    if (input.listId !== undefined) payload.listId = input.listId;
    if (input.assignmentId !== undefined) payload.assignmentId = input.assignmentId;
    if (input.dueAt !== undefined) payload.dueAt = input.dueAt;

    tx.update(cardRef, payload);
    snapshot = { title: nextTitle, description: nextDescription, sessionMeta: nextMeta };
  });

  if (snapshot) {
    try {
      await addDoc(collection(db, BOARDS_COLLECTION, boardId, "cards", cardId, "revisions"), {
        savedAt: now,
        savedByUid: uid,
        title: snapshot.title,
        description: snapshot.description,
        sessionMeta: snapshot.sessionMeta,
      });
    } catch {
      // Live card is already saved. Revision history needs deployed rules.
    }
  }
}

/** Soft-deletes a card. Notes, comments, and files stay in Firestore. */
export async function deleteWorkspaceCard(boardId: string, cardId: string): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, BOARDS_COLLECTION, boardId, "cards", cardId), {
    deletedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
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
    title: title.trim().slice(0, 200),
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
  const listRef = doc(db, BOARDS_COLLECTION, boardId, "lists", listId);
  const snap = await getDoc(listRef);
  if (!snap.exists() || snap.data()?.deletedAt) {
    throw new Error("That list is no longer on the board.");
  }
  await updateDoc(listRef, {
    title: input.title,
    updatedAt: serverTimestamp(),
  });
}

/** Soft-deletes a list and all cards in that list. Documents stay in Firestore. */
export async function deleteWorkspaceList(boardId: string, listId: string): Promise<void> {
  const db = getFirebaseDb();
  const listRef = doc(db, BOARDS_COLLECTION, boardId, "lists", listId);
  const cards = (await fetchWorkspaceCards(boardId)).filter((c) => c.listId === listId);
  const now = Timestamp.now();

  for (let i = 0; i < cards.length; i += WRITE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const card of cards.slice(i, i + WRITE_BATCH_LIMIT)) {
      batch.update(doc(db, BOARDS_COLLECTION, boardId, "cards", card.id), {
        deletedAt: now,
        updatedAt: now,
      });
    }
    await batch.commit();
  }

  await updateDoc(listRef, { deletedAt: now, updatedAt: now });
}
