// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { emptyStudentRoadmap, formatNextSessionLabel } from "@/lib/studentRoadmap";

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div>Header</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: { uid: "parent-1", role: "parent", displayName: "Pat Parent" },
    loading: false,
  }),
}));

vi.mock("@/lib/parentLinkService", () => ({
  fetchParentLink: vi.fn(),
}));

vi.mock("@/lib/assignmentService", () => ({
  fetchAssignmentsForParent: vi.fn(async () => []),
}));

vi.mock("@/lib/practiceSessionService", () => ({
  fetchPracticeSessionsForParent: vi.fn(async () => []),
}));

vi.mock("@/lib/diagnosticProgressService", () => ({
  fetchDiagnosticProgressDocument: vi.fn(async () => null),
}));

vi.mock("@/lib/workspaceService", () => ({
  fetchWorkspaceBoard: vi.fn(),
}));

vi.mock("@/lib/shsatDiagnostic", () => ({
  assembleDiagnosticExam: () => null,
}));

import { ParentDashboard } from "@/components/dashboard/ParentDashboard";
import { fetchParentLink } from "@/lib/parentLinkService";
import { fetchWorkspaceBoard } from "@/lib/workspaceService";

describe("parent dashboard next session", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the next session date without opening the board", async () => {
    const roadmap = {
      ...emptyStudentRoadmap(),
      nextSessionDate: "2026-10-22",
      nextSessionTime: "16:00",
      nextSessionNotes: "Review the homework worksheet.",
    };
    vi.mocked(fetchParentLink).mockResolvedValue({
      parentUid: "parent-1",
      parentEmail: "parent@example.com",
      studentEmail: "student@school.edu",
      studentUid: "student-1",
      studentName: "Avery Chen",
      status: "approved",
    });
    vi.mocked(fetchWorkspaceBoard).mockResolvedValue({
      id: "student-1",
      studentUid: "student-1",
      roadmap,
      diagnosticAssigned: false,
    } as never);

    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Next session")).toBeTruthy();
    expect(screen.getByText(formatNextSessionLabel(roadmap))).toBeTruthy();
    expect(screen.getByText("Review the homework worksheet.")).toBeTruthy();
  });

  it("says the session is not scheduled when the board has no date", async () => {
    vi.mocked(fetchParentLink).mockResolvedValue({
      parentUid: "parent-1",
      parentEmail: "parent@example.com",
      studentEmail: "student@school.edu",
      studentUid: "student-1",
      studentName: "Avery Chen",
      status: "approved",
    });
    vi.mocked(fetchWorkspaceBoard).mockResolvedValue({
      id: "student-1",
      studentUid: "student-1",
      roadmap: emptyStudentRoadmap(),
      diagnosticAssigned: false,
    } as never);

    render(
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Not scheduled")).toBeTruthy();
  });
});
