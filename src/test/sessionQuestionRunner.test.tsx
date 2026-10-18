// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Question } from "@/types";

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div>Header</div>,
}));

vi.mock("@/components/question/QuestionReviewPanel", () => ({
  QuestionReviewPanel: () => null,
}));

vi.mock("@/components/question/ProvisionalBadge", () => ({
  ProvisionalBadge: () => null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { role: "student" } }),
}));

vi.mock("@/contexts/QuestionsContext", () => ({
  useQuestions: () => ({ passages: [] }),
}));

import { SessionQuestionRunner } from "@/components/session/SessionQuestionRunner";

afterEach(cleanup);

function mcQuestion(id: string, stem: string): Question {
  return {
    id,
    subject: "MATH",
    module: "1",
    subtype: "MC4_A-D",
    stem,
    choices: [
      { id: `${id}-A`, label: "A", text: "one", isCorrect: true },
      { id: `${id}-B`, label: "B", text: "two", isCorrect: false },
      { id: `${id}-C`, label: "C", text: "three", isCorrect: false },
      { id: `${id}-D`, label: "D", text: "four", isCorrect: false },
    ],
    tags: [],
    createdAt: "2026-01-01",
  };
}

const questions = [
  mcQuestion("q1", "First stem"),
  mcQuestion("q2", "Second stem"),
];

function renderRunner() {
  return render(
    <SessionQuestionRunner
      questions={questions}
      sessionTitle="Practice set"
      storageKeyPrefix="test"
      onExit={() => {}}
      onComplete={() => {}}
    />,
  );
}

describe("SessionQuestionRunner eliminate-choice", () => {
  it("lets a student strike a choice and keeps it when they return to the question", () => {
    renderRunner();
    expect(screen.getAllByRole("button", { name: "Eliminate" })).toHaveLength(4);

    fireEvent.click(screen.getAllByRole("button", { name: "Eliminate" })[1]);
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
    expect(screen.getByText("B.").closest("label")?.className).toMatch(/line-through/);

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByText("Second stem")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Eliminate" })).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: "1" }));
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
    expect(screen.getByText("B.").closest("label")?.className).toMatch(/line-through/);
  });

  it("hides Eliminate after Check answer", () => {
    renderRunner();
    fireEvent.click(screen.getByLabelText(/A\./));
    fireEvent.click(screen.getByRole("button", { name: /Check answer/ }));
    expect(screen.queryByRole("button", { name: "Eliminate" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });
});
