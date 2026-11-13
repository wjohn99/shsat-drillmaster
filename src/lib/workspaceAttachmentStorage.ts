import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadMetadata,
} from "firebase/storage";

import { resolveDemoHomeworkLink } from "@/lib/demoHomework";
import { getFirebaseStorage } from "@/lib/firebase";
import { type WorkspaceFileContentType } from "@/lib/workspaceUploadLimits";
import type { WorkspaceCardAttachment } from "@/types/workspace";

export { WORKSPACE_PDF_MAX_BYTES } from "@/lib/workspaceUploadLimits";

function extensionForContentType(contentType: WorkspaceFileContentType): string {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "text/html") return ".html";
  return ".pdf";
}

export function sanitizeStorageFileName(
  name: string,
  contentType: WorkspaceFileContentType = "application/pdf",
): string {
  const trimmed = name.trim() || "file";
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  const lower = safe.toLowerCase();
  if (/\.(pdf|png|jpg|jpeg|html|htm)$/.test(lower)) {
    return lower;
  }
  return `${lower}${extensionForContentType(contentType)}`;
}

export function buildWorkspaceAttachmentStoragePath(
  boardId: string,
  cardId: string,
  attachmentId: string,
  fileName: string,
  contentType: WorkspaceFileContentType = "application/pdf",
): string {
  return `workspace/${boardId}/cards/${cardId}/${attachmentId}_${sanitizeStorageFileName(fileName, contentType)}`;
}

export function buildTutorPrivateNoteStoragePath(
  boardId: string,
  noteId: string,
  fileId: string,
  fileName: string,
  contentType: WorkspaceFileContentType = "application/pdf",
): string {
  return `workspace-tutor/${boardId}/notes/${noteId}_${fileId}_${sanitizeStorageFileName(fileName, contentType)}`;
}

export function workspaceFileUploadMetadata(
  contentType: WorkspaceFileContentType,
): UploadMetadata {
  // HTML has to render as a page. An attachment disposition, or a Drive preview
  // frame, blocks the page's own form from sending.
  if (contentType === "text/html") {
    return { contentType, contentDisposition: "inline" };
  }
  return { contentType };
}

export async function uploadWorkspaceFile(
  storagePath: string,
  file: File,
  contentType: WorkspaceFileContentType,
): Promise<void> {
  const storage = getFirebaseStorage();
  await uploadBytes(ref(storage, storagePath), file, workspaceFileUploadMetadata(contentType));
}

export async function uploadWorkspaceFileAndGetUrl(
  storagePath: string,
  file: File,
  contentType: WorkspaceFileContentType,
): Promise<string> {
  await uploadWorkspaceFile(storagePath, file, contentType);
  const storage = getFirebaseStorage();
  return getDownloadURL(ref(storage, storagePath));
}

export async function deleteWorkspaceStorageObject(storagePath: string): Promise<void> {
  const storage = getFirebaseStorage();
  await deleteObject(ref(storage, storagePath));
}

export async function resolveAttachmentDownloadUrl(
  attachment: WorkspaceCardAttachment,
): Promise<string | null> {
  if (attachment.kind === "link" && attachment.externalUrl) {
    return resolveDemoHomeworkLink(attachment.externalUrl);
  }
  if (!attachment.storagePath) {
    return null;
  }
  const storage = getFirebaseStorage();
  return getDownloadURL(ref(storage, attachment.storagePath));
}
