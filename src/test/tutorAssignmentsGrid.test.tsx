// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Timestamp } from "firebase/firestore";
import type { WorksheetAssignment } from "@/types/assignment";

const fetchAssignmentsForTutor = vi.fn();
const fetchStudents = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { uid: "tutor-1", role: "tutor", displayName: "Tutor" } }),
}));

vi.mock("@/lib/assignmentService", () => ({
  fetchAssignmentsForTutor: () => fetchAssignmentsForTutor(),
  fetchStudents: () => fetchStudents(),
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
  beforeEach(() => {
    fetchAssignmentsForTutor.mockReset();
    fetchStudents.mockReset();
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
  });
});
