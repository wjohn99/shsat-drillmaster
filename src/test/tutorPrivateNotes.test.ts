import { describe, expect, it } from "vitest";
import {
  LEGACY_TUTOR_NOTES_DOC_ID,
  parseTutorPrivateNote,
  parseTutorPrivateNoteFile,
  sortTutorPrivateNotes,
} from "@/lib/tutorPrivateNotesService";
import { TUTOR_PRIVATE_NOTE_KIND_LABEL } from "@/types/workspace";
import { buildTutorPrivateNoteStoragePath } from "@/lib/workspaceAttachmentStorage";

function snap(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

describe("tutor private notes", () => {
  it("maps a legacy notes document into a session note", () => {
    const note = parseTutorPrivateNote(
      "board-1",
      snap(LEGACY_TUTOR_NOTES_DOC_ID, {
        body: "Imported from Drive",
        files: [{ fileName: "plan.pdf", storagePath: "workspace-tutor/board-1/source/plan.pdf" }],
      }),
    );
    expect(note).toMatchObject({
      id: LEGACY_TUTOR_NOTES_DOC_ID,
      boardId: "board-1",
      kind: "session_notes",
      title: "Tutor notes",
      body: "Imported from Drive",
    });
    expect(note?.files).toEqual([
      {
        kind: "file",
        fileName: "plan.pdf",
        externalUrl: null,
        storagePath: "workspace-tutor/board-1/source/plan.pdf",
        contentType: "application/octet-stream",
        sizeBytes: 0,
      },
    ]);
  });

  it("keeps structured lesson plans and skips deleted docs", () => {
    const live = parseTutorPrivateNote(
      "board-1",
      snap("n1", {
        kind: "lesson_plan",
        title: "Oct 21 lesson plan",
        sessionDate: "2026-10-21",
        body: "Warm-up, then algebra.",
        files: [
          {
            kind: "link",
            fileName: "Drive plan",
            externalUrl: "https://drive.google.com/file/d/abc",
          },
        ],
        createdAtMs: 100,
      }),
    );
    const gone = parseTutorPrivateNote(
      "board-1",
      snap("n2", {
        kind: "lesson_plan",
        title: "Removed",
        body: "old",
        deletedAt: { toMillis: () => 1 },
      }),
    );
    expect(live?.kind).toBe("lesson_plan");
    expect(live?.title).toBe("Oct 21 lesson plan");
    expect(live?.files[0]).toMatchObject({
      kind: "link",
      fileName: "Drive plan",
      externalUrl: "https://drive.google.com/file/d/abc",
    });
    expect(gone).toBeNull();
  });

  it("sorts by session date, then recency, and puts undated notes last", () => {
    const sorted = sortTutorPrivateNotes([
      {
        id: "old",
        boardId: "b",
        kind: "session_notes",
        title: "Older",
        sessionDate: "2026-10-01",
        body: "",
        files: [],
        createdByUid: "",
        createdByName: "",
        createdAtMs: 50,
        updatedAtMs: 50,
      },
      {
        id: "none",
        boardId: "b",
        kind: "observation",
        title: "Undated",
        sessionDate: "",
        body: "",
        files: [],
        createdByUid: "",
        createdByName: "",
        createdAtMs: 999,
        updatedAtMs: 999,
      },
      {
        id: "new",
        boardId: "b",
        kind: "lesson_plan",
        title: "Newer",
        sessionDate: "2026-10-21",
        body: "",
        files: [],
        createdByUid: "",
        createdByName: "",
        createdAtMs: 10,
        updatedAtMs: 10,
      },
    ]);
    expect(sorted.map((row) => row.id)).toEqual(["new", "old", "none"]);
  });

  it("labels kinds for the tutor UI", () => {
    expect(TUTOR_PRIVATE_NOTE_KIND_LABEL.lesson_plan).toBe("Lesson plan");
    expect(TUTOR_PRIVATE_NOTE_KIND_LABEL.next_session).toBe("Next session");
  });

  it("ignores attachments that have no file or link", () => {
    expect(parseTutorPrivateNoteFile({ fileName: "x" })).toBeNull();
    expect(
      parseTutorPrivateNoteFile({
        fileName: "Drive",
        kind: "link",
        externalUrl: "https://drive.google.com/x",
      }),
    ).toMatchObject({ kind: "link", fileName: "Drive" });
  });

  it("puts uploaded tutor files on the private storage path", () => {
    expect(
      buildTutorPrivateNoteStoragePath("board-1", "note-1", "file-1", "Oct 21 Plan.PDF", "application/pdf"),
    ).toBe("workspace-tutor/board-1/notes/note-1_file-1_oct_21_plan.pdf");
  });
});
