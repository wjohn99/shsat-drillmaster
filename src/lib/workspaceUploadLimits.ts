import type { WorkspaceCardAttachment } from "@/types/workspace";

/** Must stay in sync with `storage.rules` and Firestore attachment rules. */
export const WORKSPACE_PDF_MAX_BYTES = 25 * 1024 * 1024;

/** Max PDF attachments on a single card (links have a separate cap). */
export const MAX_PDFS_PER_CARD = 10;

/** Max total attachments (PDFs + links) on one card. */
export const MAX_ATTACHMENTS_PER_CARD = 20;

/** Max stored PDF bytes per student workspace board (~500 MB). */
export const MAX_BOARD_PDF_BYTES = 500 * 1024 * 1024;

/** Max PDF file count per student workspace board. */
export const MAX_BOARD_PDF_COUNT = 250;

export type BoardPdfUsage = {
  pdfCount: number;
  pdfBytes: number;
};

export type UploadValidationResult = { ok: true } | { ok: false; message: string };

export function activeAttachments(attachments: WorkspaceCardAttachment[]): WorkspaceCardAttachment[] {
  return attachments.filter((a) => !a.deletedAt);
}

export function summarizeBoardPdfUsage(
  attachmentsByCard: WorkspaceCardAttachment[][],
): BoardPdfUsage {
  let pdfCount = 0;
  let pdfBytes = 0;
  for (const list of attachmentsByCard) {
    for (const a of activeAttachments(list)) {
      if (a.kind === "file") {
        pdfCount += 1;
        pdfBytes += a.sizeBytes || 0;
      }
    }
  }
  return { pdfCount, pdfBytes };
}

export type WorkspaceFileContentType = "application/pdf" | "image/jpeg" | "image/png";

export function workspaceFileContentType(file: File): WorkspaceFileContentType | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "application/pdf";
  if (file.type === "image/png" || name.endsWith(".png")) return "image/png";
  if (
    file.type === "image/jpeg" ||
    file.type === "image/jpg" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }
  return null;
}

export function validatePdfUpload(
  file: File,
  cardAttachments: WorkspaceCardAttachment[],
  boardUsage: BoardPdfUsage,
): UploadValidationResult {
  if (!workspaceFileContentType(file)) {
    return { ok: false, message: "Only PDF, JPEG, and PNG files are allowed." };
  }

  if (file.size <= 0) {
    return { ok: false, message: "The file is empty." };
  }

  if (file.size > WORKSPACE_PDF_MAX_BYTES) {
    return {
      ok: false,
      message: `File must be ${Math.round(WORKSPACE_PDF_MAX_BYTES / (1024 * 1024))} MB or smaller.`,
    };
  }

  const active = activeAttachments(cardAttachments);
  const pdfsOnCard = active.filter((a) => a.kind === "file").length;

  if (pdfsOnCard >= MAX_PDFS_PER_CARD) {
    return {
      ok: false,
      message: `This card already has the maximum of ${MAX_PDFS_PER_CARD} files.`,
    };
  }

  if (active.length >= MAX_ATTACHMENTS_PER_CARD) {
    return {
      ok: false,
      message: `This card already has the maximum of ${MAX_ATTACHMENTS_PER_CARD} attachments.`,
    };
  }

  if (boardUsage.pdfCount >= MAX_BOARD_PDF_COUNT) {
    return {
      ok: false,
      message: `This student's workspace already has the maximum of ${MAX_BOARD_PDF_COUNT} files.`,
    };
  }

  if (boardUsage.pdfBytes + file.size > MAX_BOARD_PDF_BYTES) {
    const capMb = Math.round(MAX_BOARD_PDF_BYTES / (1024 * 1024));
    return {
      ok: false,
      message: `Upload would exceed the ${capMb} MB file limit for this student's workspace.`,
    };
  }

  return { ok: true };
}

export function validateLinkAttachment(cardAttachments: WorkspaceCardAttachment[]): UploadValidationResult {
  const active = activeAttachments(cardAttachments);
  if (active.length >= MAX_ATTACHMENTS_PER_CARD) {
    return {
      ok: false,
      message: `This card already has the maximum of ${MAX_ATTACHMENTS_PER_CARD} attachments.`,
    };
  }
  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
