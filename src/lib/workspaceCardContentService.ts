import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type {
  CardFeedItem,
  WorkspaceAttachmentKind,
  WorkspaceCardActivity,
  WorkspaceCardActivityType,
  WorkspaceCardAttachment,
  WorkspaceCardComment,
  WorkspaceAttachmentSubmission,
} from "@/types/workspace";

const BOARDS_COLLECTION = "workspace_boards";

function cardCollection(boardId: string, cardId: string, sub: string) {
  return collection(getFirebaseDb(), BOARDS_COLLECTION, boardId, "cards", cardId, sub);
}

function parseAttachmentKind(data: DocumentData): WorkspaceAttachmentKind {
  if (data.kind === "link") return "link";
  if (data.kind === "file") return "file";
  if (typeof data.externalUrl === "string" && data.externalUrl.length > 0) return "link";
  return "file";
}

function parseAttachment(
  boardId: string,
  cardId: string,
  snapshot: QueryDocumentSnapshot<DocumentData>,
): WorkspaceCardAttachment | null {
  const data = snapshot.data();
  if (data.deletedAt) return null;
  const kind = parseAttachmentKind(data);
  return {
    id: snapshot.id,
    boardId,
    cardId,
    kind,
    fileName: (data.fileName as string) ?? "Link",
    externalUrl: (data.externalUrl as string | undefined) ?? null,
    storagePath: (data.storagePath as string | undefined) ?? null,
    contentType: (data.contentType as string) ?? (kind === "link" ? "text/link" : "application/octet-stream"),
    sizeBytes: Number(data.sizeBytes) || 0,
    uploadedByUid: data.uploadedByUid as string,
    uploadedByName: (data.uploadedByName as string) ?? "User",
    dueAt: data.dueAt ?? null,
    createdAt: data.createdAt,
    deletedAt: data.deletedAt ?? null,
  };
}

function parseSubmission(
  boardId: string,
  cardId: string,
  attachmentId: string,
  snapshot: QueryDocumentSnapshot<DocumentData>,
): WorkspaceAttachmentSubmission {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    boardId,
    cardId,
    attachmentId,
    submissionUrl: (data.submissionUrl as string) ?? "",
    notes: (data.notes as string) ?? "",
    submittedByUid: data.submittedByUid as string,
    submittedByName: (data.submittedByName as string) ?? "Student",
    submittedAt: data.submittedAt,
  };
}

function attachmentSubmissionsCollection(
  boardId: string,
  cardId: string,
  attachmentId: string,
) {
  return collection(
    getFirebaseDb(),
    BOARDS_COLLECTION,
    boardId,
    "cards",
    cardId,
    "attachments",
    attachmentId,
    "submissions",
  );
}

function parseComment(
  boardId: string,
  cardId: string,
  snapshot: QueryDocumentSnapshot<DocumentData>,
): WorkspaceCardComment | null {
  const data = snapshot.data();
  if (data.deletedAt) return null;
  return {
    id: snapshot.id,
    boardId,
    cardId,
    body: (data.body as string) ?? "",
    authorUid: data.authorUid as string,
    authorName: (data.authorName as string) ?? "User",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    deletedAt: data.deletedAt ?? null,
  };
}

function parseActivity(
  boardId: string,
  cardId: string,
  snapshot: QueryDocumentSnapshot<DocumentData>,
): WorkspaceCardActivity {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    boardId,
    cardId,
    type: data.type as WorkspaceCardActivityType,
    message: (data.message as string) ?? "",
    actorUid: data.actorUid as string,
    actorName: (data.actorName as string) ?? "User",
    createdAt: data.createdAt,
  };
}

export function normalizeAttachmentUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("URL is required.");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getAttachmentHref(attachment: WorkspaceCardAttachment): string | null {
  if (attachment.kind === "link" && attachment.externalUrl) {
    return attachment.externalUrl;
  }
  return null;
}

async function logCardActivity(
  boardId: string,
  cardId: string,
  type: WorkspaceCardActivityType,
  message: string,
): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(cardCollection(boardId, cardId, "activity"), {
    type,
    message,
    actorUid: user.uid,
    actorName: user.displayName || user.email || "User",
    createdAt: serverTimestamp(),
  });
}

export async function fetchCardAttachments(
  boardId: string,
  cardId: string,
): Promise<WorkspaceCardAttachment[]> {
  const q = query(cardCollection(boardId, cardId, "attachments"), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => parseAttachment(boardId, cardId, d))
    .filter((a): a is WorkspaceCardAttachment => a !== null);
}

/** Paste a Drive/Dropbox/etc. link — no Firebase Storage required. */
export async function logWorksheetAssignedToCard(
  boardId: string,
  cardId: string,
  worksheetTitle: string,
  dueDateLabel?: string,
): Promise<void> {
  const duePart = dueDateLabel ? ` (due ${dueDateLabel})` : "";
  await logCardActivity(
    boardId,
    cardId,
    "worksheet_assigned",
    `assigned worksheet "${worksheetTitle}"${duePart} to this card`,
  );
}

export async function logWorksheetCompletedOnCard(
  boardId: string,
  cardId: string,
  worksheetTitle: string,
  score?: { correct: number; total: number },
): Promise<void> {
  const scorePart =
    score && score.total > 0 ? ` (${score.correct}/${score.total} correct)` : "";
  await logCardActivity(
    boardId,
    cardId,
    "worksheet_completed",
    `completed worksheet "${worksheetTitle}"${scorePart}`,
  );
}

export async function addCardLinkAttachment(
  boardId: string,
  cardId: string,
  title: string,
  url: string,
  dueAt?: Timestamp | null,
): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to add a link.");

  const fileName = title.trim() || "Link";
  const externalUrl = normalizeAttachmentUrl(url);

  const payload: Record<string, unknown> = {
    kind: "link",
    fileName,
    externalUrl,
    contentType: "text/link",
    sizeBytes: 0,
    uploadedByUid: user.uid,
    uploadedByName: user.displayName || user.email || "Tutor",
    createdAt: serverTimestamp(),
  };
  if (dueAt) payload.dueAt = dueAt;

  const docRef = await addDoc(cardCollection(boardId, cardId, "attachments"), payload);

  const dueLabel = dueAt?.toDate
    ? dueAt.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";
  const duePart = dueLabel ? ` (due ${dueLabel})` : "";
  await logCardActivity(
    boardId,
    cardId,
    "attachment_added",
    `added link "${fileName}"${duePart} to this card`,
  );

  return docRef.id;
}

export async function fetchLatestSubmissionForAttachment(
  boardId: string,
  cardId: string,
  attachmentId: string,
): Promise<WorkspaceAttachmentSubmission | null> {
  const q = query(
    attachmentSubmissionsCollection(boardId, cardId, attachmentId),
    orderBy("submittedAt", "desc"),
    limit(1),
  );
  const snapshot = await getDocs(q);
  const first = snapshot.docs[0];
  if (!first) return null;
  return parseSubmission(boardId, cardId, attachmentId, first);
}

export async function fetchLatestSubmissionsForAttachments(
  boardId: string,
  cardId: string,
  attachments: WorkspaceCardAttachment[],
): Promise<Record<string, WorkspaceAttachmentSubmission | null>> {
  const entries = await Promise.all(
    attachments.map(async (attachment) => {
      const submission = await fetchLatestSubmissionForAttachment(
        boardId,
        cardId,
        attachment.id,
      );
      return [attachment.id, submission] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function submitAttachmentWork(
  boardId: string,
  cardId: string,
  attachmentId: string,
  attachmentLabel: string,
  submissionUrl: string,
  notes?: string,
): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to submit work.");

  const url = normalizeAttachmentUrl(submissionUrl);
  const trimmedNotes = notes?.trim() ?? "";

  await addDoc(attachmentSubmissionsCollection(boardId, cardId, attachmentId), {
    submissionUrl: url,
    notes: trimmedNotes,
    submittedByUid: user.uid,
    submittedByName: user.displayName || user.email || "Student",
    submittedAt: serverTimestamp(),
  });

  await logCardActivity(
    boardId,
    cardId,
    "attachment_submitted",
    `submitted completed work for "${attachmentLabel}"`,
  );
}

/** Soft-delete — link/file metadata kept in Firestore for recovery. */
export async function softDeleteCardAttachment(
  boardId: string,
  cardId: string,
  attachmentId: string,
  fileName: string,
): Promise<void> {
  await updateDoc(
    doc(getFirebaseDb(), BOARDS_COLLECTION, boardId, "cards", cardId, "attachments", attachmentId),
    { deletedAt: serverTimestamp() },
  );
  await logCardActivity(
    boardId,
    cardId,
    "attachment_removed",
    `removed attachment "${fileName}"`,
  );
}

export async function fetchCardComments(
  boardId: string,
  cardId: string,
): Promise<WorkspaceCardComment[]> {
  const q = query(cardCollection(boardId, cardId, "comments"), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => parseComment(boardId, cardId, d))
    .filter((c): c is WorkspaceCardComment => c !== null);
}

export function subscribeCardFeed(
  boardId: string,
  cardId: string,
  onChange: (items: CardFeedItem[]) => void,
): Unsubscribe {
  const commentsQ = query(cardCollection(boardId, cardId, "comments"), orderBy("createdAt", "asc"));
  const activityQ = query(cardCollection(boardId, cardId, "activity"), orderBy("createdAt", "asc"));

  let comments: WorkspaceCardComment[] = [];
  let activities: WorkspaceCardActivity[] = [];

  const emit = () => {
    const items: CardFeedItem[] = [
      ...comments.map((data) => ({ kind: "comment" as const, data })),
      ...activities.map((data) => ({ kind: "activity" as const, data })),
    ].sort((a, b) => {
      const aMs = a.data.createdAt?.toMillis?.() ?? 0;
      const bMs = b.data.createdAt?.toMillis?.() ?? 0;
      return aMs - bMs;
    });
    onChange(items);
  };

  const unsubComments = onSnapshot(commentsQ, (snap) => {
    comments = snap.docs
      .map((d) => parseComment(boardId, cardId, d))
      .filter((c): c is WorkspaceCardComment => c !== null);
    emit();
  });

  const unsubActivity = onSnapshot(activityQ, (snap) => {
    activities = snap.docs.map((d) => parseActivity(boardId, cardId, d));
    emit();
  });

  return () => {
    unsubComments();
    unsubActivity();
  };
}

export async function createCardComment(
  boardId: string,
  cardId: string,
  body: string,
): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to comment.");
  const trimmed = body.trim();
  if (!trimmed) return;

  await addDoc(cardCollection(boardId, cardId, "comments"), {
    body: trimmed,
    authorUid: user.uid,
    authorName: user.displayName || user.email || "User",
    createdAt: serverTimestamp(),
  });
}

/** Soft-delete comment — recoverable in Firestore. */
export async function softDeleteCardComment(
  boardId: string,
  cardId: string,
  commentId: string,
): Promise<void> {
  await updateDoc(
    doc(getFirebaseDb(), BOARDS_COLLECTION, boardId, "cards", cardId, "comments", commentId),
    { deletedAt: serverTimestamp() },
  );
}
