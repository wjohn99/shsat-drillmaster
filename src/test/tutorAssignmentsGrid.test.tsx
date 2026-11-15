// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Timestamp } from "firebase/firestore";
import type { WorksheetAssignment } from "@/types/assignment";

const fetchAssignmentsForTutor = vi.fn();
const fetchStudents = vi.fn();
const removeOpenAssignment = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { uid: "tutor-1", role: "tutor", displayName: "Tutor" } }),
}));

vi.mock("@/lib/assignmentService", () => ({
  fetchAssignmentsForTutor: () => fetchAssignmentsForTutor(),
  fetchStudents: () => fetchStudents(),
  removeOpenAssignment: (...args: unknown[]) => removeOpenAssignment(...args),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/lib/demoSandbox", () => ({
  fetchDemoStudents: vi.fn(),
}));

import { TutorAssignmentsGrid } from "@/components/worksheets/TutorAssignmentsGrid";

const stamp = {
  toDate: () => new Date(2026, 10, 20),
  toMillis: () => Date.UTC(2026, 10, 20),
} as Timestamp;

function assignment(id: string, status: WorksheetAssignment["status"], title: string): WorksheetAssignment {
  return {
    id,
    questionIds: ["q1"],
    tutorUid: "tutor-1",
    assignedToStudentUid: "student-1",
    status,
    createdAt: stamp,
    dueAt: stamp,
    title,
    tagCodes: [],
    revealAnswers: true,
  };
}

describe("TutorAssignmentsGrid completed section", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    fetchAssignmentsForTutor.mockReset();
    fetchStudents.mockReset();
    removeOpenAssignment.mockReset();
    fetchStudents.mockResolvedValue([{ uid: "student-1", displayName: "Avery", email: "avery@example.com" }]);
  });

  it("keeps completed assignments collapsed until the tutor opens them", async () => {
    fetchAssignmentsForTutor.mockResolvedValue([
      assignment("open-1", "todo", "Open algebra set"),
      assignment("done-1", "completed", "Finished reading set"),
      assignment("done-2", "completed", "Finished math set"),
    ]);

    render(
      <TutorAssignmentsGrid
        onReviewAssignment={() => {}}
        onPrintAssignment={() => {}}
      />,
    );

    expect(await screen.findByText("Open algebra set")).toBeTruthy();
    expect(screen.queryByText("Finished reading set")).toBeNull();
    expect(screen.queryByText("Finished math set")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Completed assignments/ }));
    expect(await screen.findByText("Finished reading set")).toBeTruthy();
    expect(screen.getByText("Finished math set")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1);
  });

  it("removes an open worksheet after confirm and leaves completed results", async () => {
    fetchAssignmentsForTutor.mockResolvedValue([
      assignment("open-1", "todo", "Open algebra set"),
      assignment("done-1", "completed", "Finished reading set"),
    ]);
    removeOpenAssignment.mockResolvedValue(undefined);

    render(
      <TutorAssignmentsGrid
        onReviewAssignment={() => {}}
        onPrintAssignment={() => {}}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/Avery will no longer see Open algebra set/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(removeOpenAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ id: "open-1", status: "todo" }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Open algebra set")).toBeNull();
    });
    expect(screen.getByRole("button", { name: /Completed assignments/ })).toBeTruthy();
  });
});
