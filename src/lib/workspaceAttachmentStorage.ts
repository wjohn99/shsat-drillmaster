import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadMetadata,
} from "firebase/storage";

import { getFirebaseStorage } from "@/lib/firebase";
import type { WorkspaceCardAttachment } from "@/types/workspace";

export { WORKSPACE_PDF_MAX_BYTES } from "@/lib/workspaceUploadLimits";

export function isPdfFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

export function sanitizeStorageFileName(name: string): string {
  const trimmed = name.trim() || "document.pdf";
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
}

export function buildWorkspaceAttachmentStoragePath(
  boardId: string,
  cardId: string,
  attachmentId: string,
  fileName: string,
): string {
  return `workspace/${boardId}/cards/${cardId}/${attachmentId}_${sanitizeStorageFileName(fileName)}`;
}

export async function uploadWorkspacePdf(
  storagePath: string,
  file: File,
): Promise<void> {
  const storage = getFirebaseStorage();
  const metadata: UploadMetadata = {
    contentType: "application/pdf",
  };
  await uploadBytes(ref(storage, storagePath), file, metadata);
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
