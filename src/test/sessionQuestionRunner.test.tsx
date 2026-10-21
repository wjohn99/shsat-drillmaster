// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/components/question/ReportQuestionButton", () => ({
  ReportQuestionButton: () => null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { role: "student" } }),
}));

vi.mock("@/contexts/QuestionsContext", () => ({
  useQuestions: () => ({ passages: [] }),
}));

vi.mock("@/lib/worksheetProgressService", () => ({
  saveWorksheetProgress: vi.fn().mockResolvedValue(undefined),
  clearWorksheetProgress: vi.fn().mockResolvedValue(undefined),
}));

import { SessionQuestionRunner } from "@/components/session/SessionQuestionRunner";
import { saveWorksheetProgress } from "@/lib/worksheetProgressService";
import type { WorksheetProgressSave } from "@/lib/worksheetProgressStorage";

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

describe("SessionQuestionRunner answer lock", () => {
  it("does not let a student change an answer after Check answer, including after leaving the question", () => {
    renderRunner();
    fireEvent.click(screen.getByRole("radio", { name: /B\./ }));
    fireEvent.click(screen.getByRole("button", { name: /Check answer/ }));
    expect(screen.getByText("Incorrect.")).toBeTruthy();
    expect(screen.getByRole("radio", { name: /B\./ }).getAttribute("aria-checked")).toBe("true");

    fireEvent.click(screen.getByRole("radio", { name: /A\./ }));
    expect(screen.getByRole("radio", { name: /A\./ }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("radio", { name: /B\./ }).getAttribute("aria-checked")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    expect(screen.getByText("Incorrect.")).toBeTruthy();
    expect(screen.getByRole("radio", { name: /B\./ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Check answer/ })).toBeNull();
  });
});

const progressKey = {
  userId: "student-1",
  scopeId: "assign-1",
  runSource: "assignment" as const,
  assignmentId: "assign-1",
  title: "Practice set",
  tagCodes: [],
  tutorUid: "tutor-1",
};

function savedProgress(overrides: Partial<WorksheetProgressSave> = {}): WorksheetProgressSave {
  return {
    userId: "student-1",
    scopeId: "assign-1",
    runSource: "assignment",
    assignmentId: "assign-1",
    title: "Practice set",
    tagCodes: [],
    questionIds: ["q1", "q2"],
    currentQuestionIndex: 1,
    answers: { q2: "q2-B" },
    flagged: [],
    lockedQuestionIds: ["q2"],
    eliminated: {},
    events: [
      {
        questionId: "q2",
        subject: "MATH",
        module: "1",
        correct: false,
        elapsedSeconds: 4,
        tags: [],
        answer: "q2-B",
      },
    ],
    notepad: "",
    revealAnswers: true,
    tutorUid: "tutor-1",
    startedAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

describe("SessionQuestionRunner account progress", () => {
  it("restores the saved question and locked answer", () => {
    render(
      <SessionQuestionRunner
        questions={questions}
        sessionTitle="Practice set"
        storageKeyPrefix="test"
        onExit={() => {}}
        onComplete={() => {}}
        progressKey={progressKey}
        initialProgress={savedProgress()}
      />,
    );
    expect(screen.getByText("Second stem")).toBeTruthy();
    expect(screen.getByText("Question 2 of 2")).toBeTruthy();
    expect(screen.getByRole("radio", { name: /B\./ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: /Finish worksheet/ })).toBeTruthy();
  });

  it("saves locked answers to the account when the student exits", async () => {
    vi.mocked(saveWorksheetProgress).mockClear();
    render(
      <SessionQuestionRunner
        questions={questions}
        sessionTitle="Practice set"
        storageKeyPrefix="test"
        onExit={() => {}}
        onComplete={() => {}}
        progressKey={progressKey}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /A\./ }));
    fireEvent.click(screen.getByRole("button", { name: /Check answer/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Exit$/ }));
    await waitFor(() => expect(saveWorksheetProgress).toHaveBeenCalled());
    const save = vi.mocked(saveWorksheetProgress).mock.calls.at(-1)?.[0];
    expect(save?.answers.q1).toBe("q1-A");
    expect(save?.lockedQuestionIds).toContain("q1");
    expect(save?.scopeId).toBe("assign-1");
  });
});

describe("SessionQuestionRunner notes", () => {
  it("opens an inline notepad without covering the question, and restores saved notes", () => {
    render(
      <SessionQuestionRunner
        questions={questions}
        sessionTitle="Practice set"
        storageKeyPrefix="test"
        onExit={() => {}}
        onComplete={() => {}}
        progressKey={progressKey}
        initialProgress={savedProgress({ notepad: "Mark the trap in choice C" })}
      />,
    );
    expect(screen.getByText("Second stem")).toBeTruthy();
    expect(screen.queryByLabelText("Worksheet notes")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Notes$/ }));
    const notes = screen.getByLabelText("Worksheet notes") as HTMLTextAreaElement;
    expect(notes.value).toBe("Mark the trap in choice C");
    expect(screen.getByText("Second stem")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hide notes" })).toBeTruthy();
  });

  it("saves notes to the account on exit", async () => {
    vi.mocked(saveWorksheetProgress).mockClear();
    render(
      <SessionQuestionRunner
        questions={questions}
        sessionTitle="Practice set"
        storageKeyPrefix="test"
        onExit={() => {}}
        onComplete={() => {}}
        progressKey={progressKey}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Notes$/ }));
    fireEvent.change(screen.getByLabelText("Worksheet notes"), {
      target: { value: "Come back to ratios" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Exit$/ }));
    await waitFor(() => expect(saveWorksheetProgress).toHaveBeenCalled());
    const save = vi.mocked(saveWorksheetProgress).mock.calls.at(-1)?.[0];
    expect(save?.notepad).toBe("Come back to ratios");
  });
});
