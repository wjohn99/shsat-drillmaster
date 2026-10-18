import type { WorkspaceListKind } from "@/types/workspace";

export const BLANK_WORKSPACE_BOARD_TEMPLATE_ID = "blank";
export const DEFAULT_WORKSPACE_BOARD_TEMPLATE_ID = BLANK_WORKSPACE_BOARD_TEMPLATE_ID;
export const WORKSPACE_TEMPLATE_STORAGE_PREFIX = "workspace-templates/";

export interface WorkspaceBoardTemplateAttachment {
  fileName: string;
  storagePath: string;
  sizeBytes: number;
  contentType: "application/pdf";
  trelloAttachmentId?: string;
  trelloCardId?: string;
  trelloFileName?: string;
  storageFileName?: string;
}

export interface WorkspaceBoardTemplateCard {
  title: string;
  description: string;
  attachments: WorkspaceBoardTemplateAttachment[];
}

export interface WorkspaceBoardTemplateList {
  title: string;
  kind: WorkspaceListKind;
  cards: WorkspaceBoardTemplateCard[];
}

export interface WorkspaceBoardTemplate {
  id: string;
  label: string;
  description: string;
  lists: WorkspaceBoardTemplateList[];
}

export interface WorkspaceBoardTemplateOption {
  id: string;
  label: string;
  description: string;
}

export function isSharedWorkspaceTemplateStoragePath(
  storagePath: string | null | undefined,
): boolean {
  return Boolean(storagePath?.startsWith(WORKSPACE_TEMPLATE_STORAGE_PREFIX));
}
