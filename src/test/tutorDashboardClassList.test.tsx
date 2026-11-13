// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { authState, ensureDemoSandbox, fetchAllWorkspaceBoards, fetchAssignmentsForTutor, fetchStudents } =
  vi.hoisted(() => ({
    authState: { role: "tutor", uid: "tutor-1" },
    ensureDemoSandbox: vi.fn(),
    fetchAllWorkspaceBoards: vi.fn(),
    fetchAssignmentsForTutor: vi.fn(),
    fetchStudents: vi.fn(),
  }));

vi.mock("@/contexts/ViewAsStudentContext", () => ({
  useViewAsStudent: () => ({
    viewAs: null,
    enterViewAsStudent: vi.fn(),
    exitViewAsStudent: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: {
      uid: authState.uid,
      role: authState.role,
      displayName: "John",
      email: "tutor@example.com",
      photoURL: null,
    },
    isDemoMode: false,
    demoBusy: false,
    enterDemoMode: vi.fn(),
    exitDemoMode: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/DemoTutorialContext", () => ({
  useDemoTutorial: () => ({
    startTutorial: vi.fn(),
    maybeAutoStart: vi.fn(),
  }),
}));

vi.mock("@/contexts/QuestionReportsContext", () => ({
  useQuestionReports: () => ({ openReports: [] }),
}));

vi.mock("@/contexts/ExamLockContext", () => ({
  useExamLock: () => ({ locked: false, requestLeave: vi.fn() }),
}));

vi.mock("@/lib/assignmentService", () => ({
  fetchAssignmentsForTutor,
  fetchStudents,
}));

vi.mock("@/lib/practiceSessionService", () => ({
  fetchPracticeSessionsForTutor: vi.fn(async () => []),
}));

vi.mock("@/lib/diagnosticProgressService", () => ({
  fetchDiagnosticProgressForTutor: vi.fn(async () => []),
}));

vi.mock("@/lib/demoSandbox", () => ({
  ensureDemoSandbox,
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/lib/workspaceService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/workspaceService")>(
    "@/lib/workspaceService",
  );
  return {
    ...actual,
    fetchAllWorkspaceBoards,
  };
});

import { TutorDashboard } from "@/components/dashboard/TutorDashboard";

function endOfDay(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(23, 59, 59, 999);
  return { toMillis: () => date.getTime() };
}

function board(id: string, name: string, archived: boolean) {
  return {
    id,
    studentUid: id,
    studentName: name,
    studentEmail: `${id}@example.com`,
    createdByUid: "tutor-1",
    assignedTutorUid: "tutor-1",
    demoAccount: false,
    archivedAt: archived ? { toMillis: () => 10 } : null,
  };
}

function assignment(id: string, studentUid: string, title: string, dueOffset: number) {
  return {
    id,
    assignedToStudentUid: studentUid,
    tutorUid: "tutor-1",
    status: "todo" as const,
    title,
    dueAt: endOfDay(dueOffset),
    createdAt: { toMillis: () => dueOffset + 10 },
    questionIds: ["q1"],
    tagCodes: [],
    revealAnswers: true,
  };
}

afterEach(() => {
  cleanup();
  authState.role = "tutor";
  authState.uid = "tutor-1";
  vi.clearAllMocks();
});

describe("tutor dashboard class list", () => {
  it("opens the soonest worksheet, filters to due today, and counts archived students", async () => {
    fetchStudents.mockResolvedValue([
      { uid: "student-a", displayName: "Avery Chen", email: "avery@example.com" },
      { uid: "student-b", displayName: "Blair Diaz", email: "blair@example.com" },
    ]);
    fetchAssignmentsForTutor.mockResolvedValue([
      assignment("later", "student-a", "Later geometry", 7),
      assignment("today", "student-a", "Today algebra", 0),
      assignment("blair", "student-b", "Blair next week", 5),
    ]);
    fetchAllWorkspaceBoards.mockResolvedValue([
      board("student-a", "Avery Chen", false),
      board("student-b", "Blair Diaz", false),
      board("student-c", "Casey Finn", true),
    ]);

    render(
      <MemoryRouter>
        <TutorDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("button", { name: "Due today (1)" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Open worksheet: Today algebra" }).length).toBe(2);
    expect(screen.getAllByRole("link", { name: "Open worksheet: Blair next week" }).length).toBe(1);
    expect(screen.getAllByText("Avery Chen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Blair Diaz").length).toBeGreaterThan(0);
    expect(screen.queryByText("Casey Finn")).toBeNull();

    const students = screen.getByText("Students");
    expect(students.nextElementSibling?.textContent).toBe("2");
    expect(students.parentElement?.textContent).toContain("1 finished student, still saved");

    fireEvent.click(screen.getByRole("button", { name: "Due today (1)" }));

    await waitFor(() => {
      expect(screen.queryByText("Blair Diaz")).toBeNull();
    });
    expect(screen.getAllByText("Avery Chen").length).toBeGreaterThan(0);
    expect(screen.getByText("Students with a worksheet due today")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Due today (1)" }));
    expect((await screen.findAllByText("Blair Diaz")).length).toBeGreaterThan(0);
  });

  it("keeps a finished class visible as a saved count", async () => {
    fetchStudents.mockResolvedValue([]);
    fetchAssignmentsForTutor.mockResolvedValue([]);
    fetchAllWorkspaceBoards.mockResolvedValue([board("student-c", "Casey Finn", true)]);

    render(
      <MemoryRouter>
        <TutorDashboard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("No active students. 1 finished student is still saved."),
    ).toBeTruthy();
    const students = screen.getByText("Students");
    expect(students.nextElementSibling?.textContent).toBe("1");
    expect(students.parentElement?.textContent).toContain("Finished, still saved");
    expect(screen.queryByRole("button", { name: /Due today/ })).toBeNull();
  });

  it("uses the same due-today list and archived count for a demo class", async () => {
    authState.role = "demo";
    ensureDemoSandbox.mockResolvedValue([
      board("demo-tutor-1-avery", "Avery Chen", false),
      board("demo-tutor-1-casey", "Casey Finn", true),
    ]);
    fetchAssignmentsForTutor.mockResolvedValue([
      assignment("today", "demo-tutor-1-avery", "Today algebra", 0),
    ]);

    render(
      <MemoryRouter>
        <TutorDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("button", { name: "Due today (1)" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Open worksheet: Today algebra" }).length).toBe(2);
    expect(screen.queryByText("Casey Finn")).toBeNull();
    const students = screen.getByText("Students");
    expect(students.nextElementSibling?.textContent).toBe("1");
    expect(students.parentElement?.textContent).toContain("1 finished student, still saved");
  });
});
