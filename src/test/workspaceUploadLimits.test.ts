import { describe, expect, it } from "vitest";
import { buildWorkspaceAttachmentStoragePath } from "@/lib/workspaceAttachmentStorage";
import {
  validatePdfUpload,
  WORKSPACE_FILE_TYPE_ERROR,
  workspaceFileBaseName,
  workspaceFileContentType,
} from "@/lib/workspaceUploadLimits";

function file(name: string, type = ""): File {
  return new File(["<p>Hi</p>"], name, { type });
}

describe("workspace HTML uploads", () => {
  it("accepts html and htm files for tutors and students", () => {
    expect(workspaceFileContentType(file("Lesson.html", "text/html"))).toBe("text/html");
    expect(workspaceFileContentType(file("notes.HTM"))).toBe("text/html");
    expect(workspaceFileBaseName("Week 3.html")).toBe("Week 3");
  });

  it("does not treat other files as HTML just because the browser says so", () => {
    expect(workspaceFileContentType(file("script.js", "text/html"))).toBeNull();
    expect(
      validatePdfUpload(file("notes.txt"), [], { pdfCount: 0, pdfBytes: 0 }),
    ).toEqual({ ok: false, message: WORKSPACE_FILE_TYPE_ERROR });
  });

  it("stores an HTML upload with an html extension", () => {
    expect(
      buildWorkspaceAttachmentStoragePath("board-1", "card-1", "file-1", "Lesson Plan.HTML", "text/html"),
    ).toBe("workspace/board-1/cards/card-1/file-1_lesson_plan.html");
  });
});
