// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { TutorPrivateNote } from "@/types/workspace";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/lib/tutorPrivateNotesService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tutorPrivateNotesService")>(
    "@/lib/tutorPrivateNotesService",
  );
  return {
    ...actual,
    fetchTutorPrivateNotes: vi.fn(),
    saveTutorPrivateNoteWithUploads: vi.fn().mockResolvedValue("n1"),
    deleteTutorPrivateNote: vi.fn().mockResolvedValue(undefined),
    resolveTutorPrivateNoteFileUrl: vi.fn(),
  };
});

import { TutorPrivatePanel } from "@/components/workspace/TutorPrivatePanel";
import { fetchTutorPrivateNotes } from "@/lib/tutorPrivateNotesService";

const fetchNotes = vi.mocked(fetchTutorPrivateNotes);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function sampleNote(partial?: Partial<TutorPrivateNote>): TutorPrivateNote {
  return {
    id: "n1",
    boardId: "sebastien",
    kind: "lesson_plan",
    title: "Oct 21 lesson plan",
    sessionDate: "2026-10-21",
    body: "Warm-up, then algebra.",
    files: [],
    createdByUid: "tutor",
    createdByName: "Tutor",
    createdAtMs: 1,
    updatedAtMs: 1,
    ...partial,
  };
}

describe("TutorPrivatePanel", () => {
  it("is always visible to tutors, even with no notes yet", async () => {
    fetchNotes.mockResolvedValue([]);
    render(<TutorPrivatePanel boardId="sebastien" />);

    expect(screen.getByText("Tutor Notes & Lesson Planning")).toBeTruthy();
    expect(screen.getByText("Tutor only")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add note" })).toBeTruthy();
    });
    expect(
      screen.getByText(/Students and families cannot see this/),
    ).toBeTruthy();
  });

  it("lists saved lesson plans without adding a board column", async () => {
    fetchNotes.mockResolvedValue([sampleNote()]);
    render(<TutorPrivatePanel boardId="sebastien" />);

    await waitFor(() => {
      expect(screen.getByText("Oct 21 lesson plan")).toBeTruthy();
    });
    expect(screen.getByText("Lesson plan")).toBeTruthy();
    expect(screen.queryByText("Add a list")).toBeNull();
  });

  it("opens a private composer from Add note", async () => {
    fetchNotes.mockResolvedValue([]);
    render(<TutorPrivatePanel boardId="sebastien" />);
    await waitFor(() => screen.getByRole("button", { name: "Add note" }));
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    expect(screen.getByRole("heading", { name: "Add tutor note" })).toBeTruthy();
    expect(screen.getByText("Private to tutors. Students and families cannot see this note.")).toBeTruthy();
    expect(screen.getByLabelText("Title")).toBeTruthy();
  });
});
