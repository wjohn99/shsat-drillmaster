import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchWorkspaceCards = vi.fn();
const linkAssignmentToWorkspace = vi.fn();
const createAssignment = vi.fn();
const setAssignmentWorkspaceCard = vi.fn();
const logWorksheetAssignedToCard = vi.fn();

vi.mock("@/lib/workspaceService", () => ({
  fetchWorkspaceCards: (...args: unknown[]) => fetchWorkspaceCards(...args),
  linkAssignmentToWorkspace: (...args: unknown[]) => linkAssignmentToWorkspace(...args),
}));

vi.mock("@/lib/assignmentService", () => ({
  createAssignment: (...args: unknown[]) => createAssignment(...args),
  setAssignmentWorkspaceCard: (...args: unknown[]) => setAssignmentWorkspaceCard(...args),
  defaultAssignmentDueDateInput: () => "2026-11-02",
  assignmentDueDateInputToTimestamp: () => ({
    toDate: () => new Date("2026-11-02T12:00:00"),
  }),
}));

vi.mock("@/lib/workspaceCardContentService", () => ({
  logWorksheetAssignedToCard: (...args: unknown[]) => logWorksheetAssignedToCard(...args),
}));

vi.mock("@/data/questionCatalog", () => ({
  loadQuestionCatalogSync: () => ({
    questions: [{ id: "fallback-alg", tags: [{ code: "ALG-LIN" }] }],
  }),
}));

import { ensureDemoTutorialAssignmentOnSessionCard } from "@/lib/demoTutorialAssignment";

const sessionCard = {
  id: "card-session-2",
  title: "10.12.26 Session 2",
  listId: "list-sessions",
  assignmentId: null,
};

describe("ensureDemoTutorialAssignmentOnSessionCard", () => {
  beforeEach(() => {
    fetchWorkspaceCards.mockReset();
    linkAssignmentToWorkspace.mockReset();
    createAssignment.mockReset();
    setAssignmentWorkspaceCard.mockReset();
    logWorksheetAssignedToCard.mockReset();
  });

  it("skips when Session 2 already has an assignment", async () => {
    fetchWorkspaceCards.mockResolvedValue([
      { ...sessionCard, assignmentId: "assign-existing" },
    ]);
    const result = await ensureDemoTutorialAssignmentOnSessionCard({
      tutorUid: "tutor-1",
      boardId: "demo-tutor-1-avery",
      studentUid: "demo-tutor-1-avery",
      questionIds: ["q1"],
    });
    expect(result).toEqual({
      created: false,
      cardId: "card-session-2",
      assignmentId: "assign-existing",
    });
    expect(createAssignment).not.toHaveBeenCalled();
  });

  it("creates a worksheet assignment and pins it to Session 2", async () => {
    fetchWorkspaceCards.mockResolvedValue([sessionCard]);
    createAssignment.mockResolvedValue("assign-new");
    linkAssignmentToWorkspace.mockResolvedValue("card-session-2");
    setAssignmentWorkspaceCard.mockResolvedValue(undefined);
    logWorksheetAssignedToCard.mockResolvedValue(undefined);

    const result = await ensureDemoTutorialAssignmentOnSessionCard({
      tutorUid: "tutor-1",
      boardId: "demo-tutor-1-avery",
      studentUid: "demo-tutor-1-avery",
      questionIds: ["q1", "q2"],
    });

    expect(result).toEqual({
      created: true,
      cardId: "card-session-2",
      assignmentId: "assign-new",
    });
    expect(createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        questionIds: ["q1", "q2"],
        assignedToStudentUid: "demo-tutor-1-avery",
        title: expect.stringMatching(/Linear Equations/),
        workspace: expect.objectContaining({ existingCardId: "card-session-2" }),
      }),
    );
    expect(linkAssignmentToWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: "assign-new",
        existingCardId: "card-session-2",
      }),
    );
    expect(setAssignmentWorkspaceCard).toHaveBeenCalledWith("assign-new", "card-session-2");
    expect(logWorksheetAssignedToCard).toHaveBeenCalled();
  });
});
