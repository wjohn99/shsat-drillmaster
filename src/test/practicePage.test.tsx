// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { WorksheetProgressSave } from "@/lib/worksheetProgressStorage";

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div>Header</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { uid: "student-1", role: "student" } }),
}));

vi.mock("@/contexts/ViewAsStudentContext", () => ({
  useViewAsStudent: () => ({ viewAs: null }),
}));

vi.mock("@/lib/practiceSessionService", () => ({
  fetchPracticeSessionsForStudent: vi.fn(),
}));

vi.mock("@/lib/worksheetProgressService", () => ({
  fetchWorksheetProgressForUser: vi.fn(),
}));

vi.mock("@/lib/workspaceService", () => ({
  fetchWorkspaceBoard: vi.fn(async () => ({ diagnosticAssigned: true })),
}));

vi.mock("@/lib/diagnosticProgressService", () => ({
  fetchDiagnosticProgress: vi.fn(async () => null),
}));

import Practice from "@/pages/Practice";
import { fetchPracticeSessionsForStudent } from "@/lib/practiceSessionService";
import { fetchWorksheetProgressForUser } from "@/lib/worksheetProgressService";

function stamp(iso: string) {
  const date = new Date(iso);
  return { toMillis: () => date.getTime(), toDate: () => date };
}

function savedMathSet(): WorksheetProgressSave {
  return {
    userId: "student-1",
    scopeId: "practice-set:math",
    runSource: "self",
    assignmentId: null,
    title: "Practice set",
    tagCodes: ["ALG-EQ"],
    questionIds: ["q1", "q2", "q3", "q4", "q5"],
    currentQuestionIndex: 2,
    answers: { q1: "a", q2: "b" },
    flagged: [],
    lockedQuestionIds: ["q1", "q2"],
    eliminated: {},
    events: [],
    notepad: "",
    scratchPad: "",
    revealAnswers: true,
    tutorUid: null,
    startedAt: 1,
    updatedAt: 2,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Practice page", () => {
  it("describes the topic filter, resumes an unfinished set, and dates diagnostic sittings", async () => {
    vi.mocked(fetchPracticeSessionsForStudent).mockResolvedValue([
      { id: "later", completedAt: stamp("2026-11-09T15:00:00") },
      { id: "earlier", completedAt: stamp("2026-03-02T10:00:00") },
    ] as never);
    vi.mocked(fetchWorksheetProgressForUser).mockResolvedValue([savedMathSet()]);

    render(
      <MemoryRouter>
        <Practice />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Choose passage skills and a module, then set how many questions.")).toBeTruthy();
    expect(screen.queryByText(/Adaptive practice/)).toBeNull();
    expect(screen.queryByText(/Estimated time/)).toBeNull();
    expect(screen.getAllByText("Next: topics, module, and set size.")).toHaveLength(3);
    expect(screen.getByText("Unfinished set, question 3 of 5.")).toBeTruthy();

    const resume = screen.getByRole("link", { name: /Resume/ });
    expect(resume.getAttribute("href")).toBe("/practice-set?type=math&resume=1");
    expect(screen.getByRole("link", { name: "New set" }).getAttribute("href")).toBe("/practice/math");
    expect(screen.getAllByRole("link", { name: /Start practice/ })).toHaveLength(3);

    const results = screen.getAllByRole("link", { name: /^Results,/ });
    expect(results.map((link) => link.textContent)).toEqual([
      "Results, Mar 2, 2026",
      "Results, Nov 9, 2026",
    ]);
  });
});
