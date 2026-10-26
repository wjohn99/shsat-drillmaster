// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Timestamp } from "firebase/firestore";
import { BoardListColumn } from "@/components/workspace/BoardListColumn";
import type { WorksheetAssignment } from "@/types/assignment";
import type { WorkspaceCard, WorkspaceList } from "@/types/workspace";

const dueAt = {
  toDate: () => new Date(2026, 10, 2),
  toMillis: () => Date.UTC(2026, 10, 2),
} as Timestamp;

const list: WorkspaceList = {
  id: "list-sessions",
  boardId: "demo-1-avery",
  title: "Session summaries",
  kind: "sessions",
  position: 0,
  createdAt: dueAt,
};

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

describe("assigned worksheet on a session card", () => {
  it("shows the Assigned badge on the list card", () => {
    render(
      <BoardListColumn
        boardId="demo-1-avery"
        list={list}
        cards={[card]}
        assignmentById={new Map([[assignment.id, assignment]])}
        readOnly
        canCreateListsAndCards={false}
        onCardClick={vi.fn()}
        onCardsChanged={vi.fn()}
        onListChanged={vi.fn()}
      />,
    );

    expect(screen.getByText("10.12.26 Session 2")).toBeTruthy();
    expect(screen.getByText("Assigned")).toBeTruthy();
    expect(document.querySelector("[data-tour='assigned-worksheet']")).toBeTruthy();
  });
});
