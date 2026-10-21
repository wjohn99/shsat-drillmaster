import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import {
  buildTutorPrivateNoteStoragePath,
  uploadWorkspaceFile,
} from "@/lib/workspaceAttachmentStorage";
import {
  WORKSPACE_PDF_MAX_BYTES,
  workspaceFileContentType,
} from "@/lib/workspaceUploadLimits";
import {
  TUTOR_PRIVATE_NOTE_KINDS,
  type TutorPrivateNote,
  type TutorPrivateNoteFile,
  type TutorPrivateNoteKind,
} from "@/types/workspace";

export const TUTOR_PRIVATE_COLLECTION = "tutor_private";
export const LEGACY_TUTOR_NOTES_DOC_ID = "notes";
export const MAX_FILES_PER_TUTOR_NOTE = 10;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function timestampMillis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    const ms = (value as { toMillis?: () => number }).toMillis?.();
    if (typeof ms === "number" && Number.isFinite(ms)) return ms;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

export function isTutorPrivateNoteKind(value: unknown): value is TutorPrivateNoteKind {
  return (
    typeof value === "string" &&
    (TUTOR_PRIVATE_NOTE_KINDS as readonly string[]).includes(value)
  );
}

export function parseTutorPrivateNoteFile(raw: unknown): TutorPrivateNoteFile | null {
  const row = asRecord(raw);
  const fileName = typeof row.fileName === "string" ? row.fileName.trim() : "";
  if (!fileName) return null;
  const externalUrl = typeof row.externalUrl === "string" ? row.externalUrl.trim() : "";
  const storagePath = typeof row.storagePath === "string" ? row.storagePath.trim() : "";
  const kind =
    row.kind === "link" || (externalUrl && !storagePath)
      ? "link"
      : storagePath
        ? "file"
        : null;
  if (!kind) return null;
  if (kind === "link" && !externalUrl) return null;
  if (kind === "file" && !storagePath) return null;
  return {
    kind,
    fileName,
    externalUrl: externalUrl || null,
    storagePath: storagePath || null,
    contentType:
      typeof row.contentType === "string" && row.contentType
        ? row.contentType
        : kind === "link"
          ? "text/link"
          : "application/octet-stream",
    sizeBytes: Number(row.sizeBytes) || 0,
  };
}

export function parseTutorPrivateNote(
  boardId: string,
  snapshot: { id: string; data: () => DocumentData } | QueryDocumentSnapshot<DocumentData>,
): TutorPrivateNote | null {
  const data = snapshot.data();
  if (data.deletedAt) return null;
  const files = Array.isArray(data.files)
    ? data.files
        .map(parseTutorPrivateNoteFile)
        .filter((row): row is TutorPrivateNoteFile => row != null)
    : [];
  const body = typeof data.body === "string" ? data.body : "";
  const titleRaw = typeof data.title === "string" ? data.title.trim() : "";
  const isLegacy = snapshot.id === LEGACY_TUTOR_NOTES_DOC_ID && !isTutorPrivateNoteKind(data.kind);
  const title =
    titleRaw ||
    (isLegacy ? "Tutor notes" : "");
  if (!title && !body.trim() && files.length === 0) return null;
  return {
    id: snapshot.id,
    boardId,
    kind: isTutorPrivateNoteKind(data.kind) ? data.kind : "session_notes",
    title: title || "Untitled note",
    sessionDate: typeof data.sessionDate === "string" ? data.sessionDate : "",
    body,
    files,
    createdByUid: typeof data.createdByUid === "string" ? data.createdByUid : "",
    createdByName: typeof data.createdByName === "string" ? data.createdByName : "",
    createdAtMs: timestampMillis(data.createdAt) || timestampMillis(data.createdAtMs),
    updatedAtMs: timestampMillis(data.updatedAt) || timestampMillis(data.updatedAtMs),
  };
}

export function sortTutorPrivateNotes(notes: TutorPrivateNote[]): TutorPrivateNote[] {
  return [...notes].sort((a, b) => {
    const dateA = a.sessionDate || "";
    const dateB = b.sessionDate || "";
    if (dateA !== dateB) {
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.localeCompare(dateA);
    }
    return (b.updatedAtMs || b.createdAtMs) - (a.updatedAtMs || a.createdAtMs);
  });
}

export function serializeTutorPrivateNoteFiles(
  files: TutorPrivateNoteFile[],
): Record<string, unknown>[] {
  return files.map((file) => ({
    kind: file.kind,
    fileName: file.fileName,
    externalUrl: file.externalUrl ?? null,
    storagePath: file.storagePath ?? null,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
  }));
}

function signedInUser() {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to save tutor notes.");
  return user;
}

function notesCollection(boardId: string) {
  return collection(getFirebaseDb(), "workspace_boards", boardId, TUTOR_PRIVATE_COLLECTION);
}

export async function fetchTutorPrivateNotes(boardId: string): Promise<TutorPrivateNote[]> {
  const snapshot = await getDocs(notesCollection(boardId));
  const notes = snapshot.docs
    .map((row) => parseTutorPrivateNote(boardId, row))
    .filter((row): row is TutorPrivateNote => row != null);
  return sortTutorPrivateNotes(notes);
}

export type TutorPrivateNoteDraft = {
  kind: TutorPrivateNoteKind;
  title: string;
  sessionDate: string;
  body: string;
  files: TutorPrivateNoteFile[];
};

function assertDraft(draft: TutorPrivateNoteDraft): {
  title: string;
  body: string;
  sessionDate: string;
} {
  const title = draft.title.trim();
  const body = draft.body;
  if (!title) throw new Error("Give this note a title.");
  if (title.length > 200) throw new Error("Title must be 200 characters or fewer.");
  if (body.length > 100000) throw new Error("That note is too long to save.");
  if (draft.files.length > MAX_FILES_PER_TUTOR_NOTE) {
    throw new Error(`A note can have at most ${MAX_FILES_PER_TUTOR_NOTE} attachments.`);
  }
  return {
    title,
    body,
    sessionDate: draft.sessionDate.trim().slice(0, 32),
  };
}

export async function createTutorPrivateNote(
  boardId: string,
  draft: TutorPrivateNoteDraft,
): Promise<string> {
  const user = signedInUser();
  const parsed = assertDraft(draft);
  const noteRef = doc(notesCollection(boardId));
  await setDoc(noteRef, {
    kind: draft.kind,
    title: parsed.title,
    sessionDate: parsed.sessionDate,
    body: parsed.body,
    files: serializeTutorPrivateNoteFiles(draft.files),
    createdByUid: user.uid,
    createdByName: (user.displayName || user.email || "Tutor").slice(0, 200),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return noteRef.id;
}

export async function updateTutorPrivateNote(
  boardId: string,
  noteId: string,
  draft: TutorPrivateNoteDraft,
): Promise<void> {
  signedInUser();
  const parsed = assertDraft(draft);
  await updateDoc(doc(getFirebaseDb(), "workspace_boards", boardId, TUTOR_PRIVATE_COLLECTION, noteId), {
    kind: draft.kind,
    title: parsed.title,
    sessionDate: parsed.sessionDate,
    body: parsed.body,
    files: serializeTutorPrivateNoteFiles(draft.files),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTutorPrivateNote(boardId: string, noteId: string): Promise<void> {
  signedInUser();
  await updateDoc(doc(getFirebaseDb(), "workspace_boards", boardId, TUTOR_PRIVATE_COLLECTION, noteId), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function normalizeNoteLinkUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("URL is required.");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function tutorPrivateNoteLinkFile(title: string, url: string): TutorPrivateNoteFile {
  const fileName = title.trim() || "Link";
  return {
    kind: "link",
    fileName,
    externalUrl: normalizeNoteLinkUrl(url),
    storagePath: null,
    contentType: "text/link",
    sizeBytes: 0,
  };
}

export async function uploadTutorPrivateNoteFile(
  boardId: string,
  noteId: string,
  file: File,
): Promise<TutorPrivateNoteFile> {
  signedInUser();
  const contentType = workspaceFileContentType(file);
  if (!contentType) {
    throw new Error("Only PDF, JPEG, and PNG files are allowed.");
  }
  if (file.size <= 0) throw new Error("The file is empty.");
  if (file.size > WORKSPACE_PDF_MAX_BYTES) {
    throw new Error(
      `File must be ${Math.round(WORKSPACE_PDF_MAX_BYTES / (1024 * 1024))} MB or smaller.`,
    );
  }
  const fileId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = buildTutorPrivateNoteStoragePath(
    boardId,
    noteId,
    fileId,
    file.name,
    contentType,
  );
  await uploadWorkspaceFile(storagePath, file, contentType);
  return {
    kind: "file",
    fileName: file.name.trim() || "File",
    externalUrl: null,
    storagePath,
    contentType,
    sizeBytes: file.size,
  };
}

export async function resolveTutorPrivateNoteFileUrl(
  file: TutorPrivateNoteFile,
): Promise<string | null> {
  if (file.kind === "link" && file.externalUrl) return file.externalUrl;
  if (!file.storagePath) return null;
  return getDownloadURL(ref(getFirebaseStorage(), file.storagePath));
}

export async function saveTutorPrivateNoteWithUploads(
  boardId: string,
  noteId: string | null,
  draft: TutorPrivateNoteDraft,
  pendingFiles: File[],
): Promise<string> {
  signedInUser();
  assertDraft(draft);
  if (draft.files.length + pendingFiles.length > MAX_FILES_PER_TUTOR_NOTE) {
    throw new Error(`A note can have at most ${MAX_FILES_PER_TUTOR_NOTE} attachments.`);
  }

  if (!noteId && pendingFiles.length === 0) {
    return createTutorPrivateNote(boardId, draft);
  }

  const id = noteId ?? (await createTutorPrivateNote(boardId, draft));
  if (pendingFiles.length === 0) {
    await updateTutorPrivateNote(boardId, id, draft);
    return id;
  }

  const uploaded: TutorPrivateNoteFile[] = [];
  for (const file of pendingFiles) {
    uploaded.push(await uploadTutorPrivateNoteFile(boardId, id, file));
  }
  await updateTutorPrivateNote(boardId, id, { ...draft, files: [...draft.files, ...uploaded] });
  return id;
}
