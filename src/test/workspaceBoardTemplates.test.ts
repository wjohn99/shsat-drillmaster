import { describe, expect, it } from "vitest";
import {
  getWorkspaceBoardTemplate,
  WORKSPACE_BOARD_TEMPLATE_OPTIONS,
  workspaceBoardTemplateAttachmentCount,
} from "@/lib/workspaceBoardTemplates";
import {
  isSharedWorkspaceTemplateStoragePath,
  BLANK_WORKSPACE_BOARD_TEMPLATE_ID,
  DEFAULT_WORKSPACE_BOARD_TEMPLATE_ID,
} from "@/lib/workspaceBoardTemplateTypes";
import { summarizeBoardPdfUsage } from "@/lib/workspaceUploadLimits";
import type { WorkspaceCardAttachment } from "@/types/workspace";

describe("workspace board templates", () => {
  it("defaults to a blank board and lists Blank first", () => {
    expect(DEFAULT_WORKSPACE_BOARD_TEMPLATE_ID).toBe(BLANK_WORKSPACE_BOARD_TEMPLATE_ID);
    expect(WORKSPACE_BOARD_TEMPLATE_OPTIONS.map((option) => option.id)).toEqual([
      BLANK_WORKSPACE_BOARD_TEMPLATE_ID,
      "shsat",
    ]);
  });

  it("keeps the SHSAT Trello template shape, including practice-test PDFs", () => {
    const shsat = getWorkspaceBoardTemplate("shsat");
    expect(shsat).toBeTruthy();
    expect(shsat?.lists.map((list) => list.title)).toEqual([
      "Session Summaries",
      "SHSAT Practice Tests",
      "Info",
    ]);
    expect(workspaceBoardTemplateAttachmentCount(shsat!)).toBe(16);
    for (const list of shsat!.lists) {
      for (const card of list.cards) {
        for (const attachment of card.attachments) {
          expect(isSharedWorkspaceTemplateStoragePath(attachment.storagePath)).toBe(true);
          expect(attachment.storagePath).toMatch(
            /^workspace-templates\/[a-z0-9_-]+\/[A-Za-z0-9._-]+$/,
          );
        }
      }
    }
  });

  it("does not count shared template PDFs against a student board quota", () => {
    const shared: WorkspaceCardAttachment = {
      id: "a1",
      boardId: "student",
      cardId: "card",
      kind: "file",
      fileName: "Form A",
      storagePath: "workspace-templates/shsat/form-a.pdf",
      contentType: "application/pdf",
      sizeBytes: 1_000_000,
      uploadedByUid: "tutor",
      uploadedByName: "Tutor",
      createdAt: {} as WorkspaceCardAttachment["createdAt"],
    };
    const own: WorkspaceCardAttachment = {
      ...shared,
      id: "a2",
      storagePath: "workspace/student/cards/card/file.pdf",
      sizeBytes: 2_000_000,
    };
    expect(summarizeBoardPdfUsage([[shared, own]])).toEqual({
      pdfCount: 1,
      pdfBytes: 2_000_000,
    });
  });
});
