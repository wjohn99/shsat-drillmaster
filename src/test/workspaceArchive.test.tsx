// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { WorkspaceBoard } from "@/types/workspace";

const { authState, fetchAllWorkspaceBoards, setWorkspaceBoardArchived, ensureDemoSandbox } =
  vi.hoisted(() => ({
    authState: { role: "tutor", uid: "tutor-1" },
    fetchAllWorkspaceBoards: vi.fn(),
    setWorkspaceBoardArchived: vi.fn(),
    ensureDemoSandbox: vi.fn(),
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
  }),
}));

vi.mock("@/lib/assignmentService", () => ({
  fetchAssignmentsForTutor: vi.fn(async () => []),
  fetchTutors: vi.fn(async () => [
    { uid: "tutor-1", displayName: "John", email: "tutor@example.com" },
  ]),
}));

vi.mock("@/lib/practiceSessionService", () => ({
  fetchPracticeSessionsForTutor: vi.fn(async () => []),
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
    setWorkspaceBoardArchived,
  };
});

import { TutorWorkspaceHome } from "@/components/workspace/TutorWorkspaceHome";

function board(partial: Partial<WorkspaceBoard> & Pick<WorkspaceBoard, "id" | "studentName">): WorkspaceBoard {
  return {
    studentUid: partial.id,
    studentEmail: `${partial.id}@example.com`,
    createdByUid: "tutor-1",
    assignedTutorUid: "tutor-1",
    assignedTutorName: "John",
    createdAt: { toMillis: () => 1 } as WorkspaceBoard["createdAt"],
    archivedAt: null,
    roadmap: {
      startingPoint: "",
      currentScores: "",
      targetComposite: null,
      targetSchool: "",
      testDate: "",
      currentPriority: "",
      longTermPriorities: "",
      strengthsNotes: "",
      growthNotes: "",
      nextSessionDate: "",
      nextSessionTime: "",
      nextSessionNotes: "",
      followUps: [],
      progressUpdates: [],
      status: null,
      statusManual: false,
    },
    ...partial,
  };
}

const active = board({ id: "active-student", studentName: "Active Student" });
const archived = board({
  id: "finished-student",
  studentName: "Finished Student",
  archivedAt: { toMillis: () => 10 } as WorkspaceBoard["archivedAt"],
});

afterEach(() => {
  cleanup();
  authState.role = "tutor";
  authState.uid = "tutor-1";
  fetchAllWorkspaceBoards.mockReset();
  setWorkspaceBoardArchived.mockReset();
  ensureDemoSandbox.mockReset();
});

describe("archived boards", () => {
  it("keeps a finished student out of the active list until the board is restored", async () => {
    fetchAllWorkspaceBoards.mockResolvedValue([active, archived]);
    setWorkspaceBoardArchived.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <TutorWorkspaceHome />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "Open Active Student" })).toBeTruthy();
    expect(screen.queryByText("Finished Student")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show 1" }));
    expect(screen.getByText("Finished Student")).toBeTruthy();
    expect(screen.getByText("Cards, comments, and files are saved.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Restore board" }));

    await waitFor(() => {
      expect(setWorkspaceBoardArchived).toHaveBeenCalledWith("finished-student", false);
    });
    expect(screen.getByRole("link", { name: "Open Finished Student" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show 1" })).toBeNull();
  });

  it("uses the same archive list for a demo account", async () => {
    authState.role = "demo";
    ensureDemoSandbox.mockResolvedValue([active, archived]);

    render(
      <MemoryRouter>
        <TutorWorkspaceHome />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "Open Active Student" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add student" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show 1" }));
    expect(screen.getByRole("button", { name: "Restore board" })).toBeTruthy();
  });
});
