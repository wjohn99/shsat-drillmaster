import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadMetadata,
} from "firebase/storage";

import { getFirebaseStorage } from "@/lib/firebase";
import { type WorkspaceFileContentType } from "@/lib/workspaceUploadLimits";
import type { WorkspaceCardAttachment } from "@/types/workspace";

export { WORKSPACE_PDF_MAX_BYTES } from "@/lib/workspaceUploadLimits";

function extensionForContentType(contentType: WorkspaceFileContentType): string {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/jpeg") return ".jpg";
  return ".pdf";
}

export function sanitizeStorageFileName(
  name: string,
  contentType: WorkspaceFileContentType = "application/pdf",
): string {
  const trimmed = name.trim() || "file";
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  const lower = safe.toLowerCase();
  if (/\.(pdf|png|jpg|jpeg)$/.test(lower)) {
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

export async function uploadWorkspaceFile(
  storagePath: string,
  file: File,
  contentType: WorkspaceFileContentType,
): Promise<void> {
  const storage = getFirebaseStorage();
  const metadata: UploadMetadata = { contentType };
  await uploadBytes(ref(storage, storagePath), file, metadata);
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
    return attachment.externalUrl;
  }
  if (!attachment.storagePath) {
    return null;
  }
  const storage = getFirebaseStorage();
  return getDownloadURL(ref(storage, attachment.storagePath));
}
