// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Question } from "@/types";
import { showsSkillToImprove } from "@/lib/questionExplanation";
import { QuestionSolutionPanel } from "@/components/question/QuestionSolutionPanel";

const auth = vi.hoisted(() => ({ role: "tutor" }));

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div>Header</div>,
}));

vi.mock("@/components/question/QuestionReviewPanel", () => ({
  QuestionReviewPanel: () => null,
}));

vi.mock("@/components/question/ProvisionalBadge", () => ({
  ProvisionalBadge: () => null,
}));

vi.mock("@/components/question/ReportQuestionButton", () => ({
  ReportQuestionButton: () => null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { role: auth.role } }),
}));

vi.mock("@/contexts/QuestionsContext", () => ({
  useQuestions: () => ({ passages: [] }),
}));

vi.mock("@/lib/worksheetProgressService", () => ({
  saveWorksheetProgress: vi.fn().mockResolvedValue(undefined),
  clearWorksheetProgress: vi.fn().mockResolvedValue(undefined),
}));

import { SessionQuestionRunner } from "@/components/session/SessionQuestionRunner";

afterEach(() => {
  cleanup();
  auth.role = "tutor";
});

const skillQuestion: Question = {
  id: "q1",
  subject: "MATH",
  module: "1",
  subtype: "MC4_A-D",
  stem: "What is 2 + 2?",
  choices: [
    { id: "q1-A", label: "A", text: "4", isCorrect: true },
    { id: "q1-B", label: "B", text: "5", isCorrect: false },
  ],
  tags: [{ id: "alg", domain: "MATH", code: "ALG-LIN", label: "Linear equations" }],
  createdAt: "2026-01-01",
};

describe("showsSkillToImprove", () => {
  it("is for tutors, demo tutors, and parents", () => {
    expect(showsSkillToImprove("tutor")).toBe(true);
    expect(showsSkillToImprove("demo")).toBe(true);
    expect(showsSkillToImprove("parent")).toBe(true);
    expect(showsSkillToImprove("student")).toBe(false);
  });
});

describe("QuestionSolutionPanel skills", () => {
  it("shows the skill list when a question has no written explanation", () => {
    render(<QuestionSolutionPanel question={skillQuestion} showSkillToImprove />);
    expect(screen.getByText("Skill to improve")).toBeTruthy();
    expect(screen.getByText("Linear equations")).toBeTruthy();
  });
});

describe("worksheet and practice-set answers", () => {
  it.each(["tutor", "demo"])("shows skills after a %s checks an answer", (role) => {
    auth.role = role;
    render(
      <SessionQuestionRunner
        questions={[skillQuestion]}
        sessionTitle="Practice set"
        storageKeyPrefix="test"
        onExit={() => {}}
        onComplete={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /B\./ }));
    fireEvent.click(screen.getByRole("button", { name: /Check answer/ }));
    expect(screen.getByText("Skill to improve")).toBeTruthy();
    expect(screen.getByText("Linear equations")).toBeTruthy();
  });

  it("hides skills from a student after they check an answer", () => {
    auth.role = "student";
    render(
      <SessionQuestionRunner
        questions={[skillQuestion]}
        sessionTitle="Practice set"
        storageKeyPrefix="test"
        onExit={() => {}}
        onComplete={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /B\./ }));
    fireEvent.click(screen.getByRole("button", { name: /Check answer/ }));
    expect(screen.getByText("Incorrect.")).toBeTruthy();
    expect(screen.queryByText("Skill to improve")).toBeNull();
    expect(screen.queryByText("Linear equations")).toBeNull();
  });
});
