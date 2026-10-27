// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Timestamp } from "firebase/firestore";
import type { WorksheetAssignment } from "@/types/assignment";
import type { WorkspaceCard } from "@/types/workspace";

const dueAt = {
  toDate: () => new Date(2026, 10, 2),
  toMillis: () => Date.UTC(2026, 10, 2),
} as Timestamp;

const assignment: WorksheetAssignment = {
  id: "assign-1",
  questionIds: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"],
  tutorUid: "tutor-1",
  assignedToStudentUid: "demo-1-avery",
  status: "todo",
  createdAt: dueAt,
  dueAt,
  title: "Worksheet: Linear Equations & Inequalities, Expressions & Manipulations",
  tagCodes: ["ALG-LIN", "ALG-EXP"],
  revealAnswers: true,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: {
      uid: "tutor-1",
      role: "demo",
      displayName: "Demo tutor",
      email: "demo@example.com",
      photoURL: null,
    },
  }),
}));

vi.mock("@/contexts/ViewAsStudentContext", () => ({
  useViewAsStudent: () => ({ viewAs: null }),
}));

vi.mock("@/lib/assignmentService", () => ({
  fetchAssignmentById: vi.fn(async () => assignment),
  defaultAssignmentDueDateInput: () => "2026-11-02",
  assignmentDueDateInputToTimestamp: () => dueAt,
}));

vi.mock("@/lib/worksheetProgressService", () => ({
  fetchWorksheetProgress: vi.fn(async () => null),
}));

vi.mock("@/lib/workspaceService", () => ({
  updateWorkspaceCard: vi.fn(),
  deleteWorkspaceCard: vi.fn(),
}));

vi.mock("@/lib/workspaceCardContentService", () => ({
  fetchCardAttachments: vi.fn(async () => []),
  fetchLatestSubmissionsForAttachments: vi.fn(async () => ({})),
  subscribeCardFeed: vi.fn((_boardId: string, _cardId: string, cb: (items: unknown[]) => void) => {
    cb([]);
    return () => undefined;
  }),
  addCardLinkAttachment: vi.fn(),
  addCardPdfAttachment: vi.fn(),
  createCardComment: vi.fn(),
  renameCardAttachment: vi.fn(),
  resolveAttachmentDownloadUrl: vi.fn(),
  softDeleteCardAttachment: vi.fn(),
  softDeleteCardComment: vi.fn(),
  submitAttachmentPdfWork: vi.fn(),
  submitAttachmentWork: vi.fn(),
}));

import { CardDetailModal } from "@/components/workspace/CardDetailModal";

const card: WorkspaceCard = {
  id: "card-session-2",
  boardId: "demo-1-avery",
  listId: "list-sessions",
  title: "10.12.26 Session 2",
  description: "Worked linear equations.",
  position: 0,
  completed: false,
  assignmentId: "assign-1",
  createdAt: dueAt,
  updatedAt: dueAt,
};

describe("CardDetailModal assigned worksheet", () => {
  it("shows the Assigned Worksheet block tutors see on a session card", async () => {
    render(
      <MemoryRouter>
        <CardDetailModal
          boardId="demo-1-avery"
          card={card}
          listTitle="Session summaries"
          open
          tourId="session-card"
          tourLock
          tourActive
          onOpenChange={vi.fn()}
          onUpdated={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Worksheets")).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.getByText("Worksheet: Linear Equations & Inequalities, Expressions & Manipulations"),
      ).toBeTruthy();
    });
    expect(screen.getByText(/10 questions/)).toBeTruthy();
    expect(screen.getByText(/Due Nov 2, 2026/)).toBeTruthy();
    expect(document.querySelector("[data-tour='assigned-worksheet']")).toBeTruthy();
  });

  it("renders when a board opens with no card selected", () => {
    expect(() => {
      render(
        <MemoryRouter>
          <CardDetailModal
            boardId="demo-1-avery"
            card={null}
            open={false}
            onOpenChange={vi.fn()}
            onUpdated={vi.fn()}
          />
        </MemoryRouter>,
      );
    }).not.toThrow();
  });
});
