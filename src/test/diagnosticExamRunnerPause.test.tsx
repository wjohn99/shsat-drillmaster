// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Question } from "@/types";
import type { AssembledDiagnosticExam } from "@/lib/shsatDiagnostic";
import { SHSAT_DIAGNOSTIC_SPEC } from "@/data/shsatDiagnosticForm";

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div>Header</div>,
}));

vi.mock("@/components/question/ReportQuestionButton", () => ({
  ReportQuestionButton: () => null,
}));

vi.mock("@/contexts/ExamLockContext", () => ({
  useExamLock: () => ({ setExamLeaveHandler: vi.fn() }),
}));

vi.mock("@/lib/diagnosticProgressService", () => ({
  saveDiagnosticProgress: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/diagnosticExamStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/diagnosticExamStorage")>();
  return {
    ...actual,
    persistDiagnosticSave: vi.fn(),
    loadDiagnosticSave: vi.fn(() => null),
  };
});

import { DiagnosticExamRunner } from "@/components/diagnostic/DiagnosticExamRunner";

afterEach(cleanup);

const SECRET_STEM = "SECRET_DIAGNOSTIC_STEM_SHOULD_HIDE_ON_PAUSE";
const SECRET_PASSAGE = "SECRET_DIAGNOSTIC_PASSAGE_SHOULD_HIDE_ON_PAUSE";

function mathQuestion(id = "pause-q1", stem = SECRET_STEM): Question {
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

const exam: AssembledDiagnosticExam = {
  spec: SHSAT_DIAGNOSTIC_SPEC,
  ela: {
    subject: "ELA",
    questions: [],
    units: [],
    missingIds: [],
    heldIds: [],
  },
  math: {
    subject: "MATH",
    questions: [mathQuestion()],
    units: [{ kind: "standalone", question: mathQuestion(), elaPart: "other" }],
    missingIds: [],
    heldIds: [],
  },
  elaReady: 0,
  mathReady: 1,
  isComplete: false,
};

describe("DiagnosticExamRunner pause privacy", () => {
  it("unmounts the exam item behind an opaque full-screen pause screen", () => {
    render(
      <DiagnosticExamRunner
        exam={exam}
        userId="student-1"
        firstSection="MATH"
        deadlineAt={Date.now() + 60 * 60 * 1000}
        onExit={() => {}}
        onComplete={() => {}}
      />,
    );

    expect(screen.getByText(SECRET_STEM)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Notes$/ }));
    expect((screen.getByLabelText("Diagnostic notes") as HTMLTextAreaElement).placeholder).toBe(
      "Scratch notes for this diagnostic (saved to your account).",
    );
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    const pause = screen.getByTestId("diagnostic-pause-screen");
    expect(pause).toBeTruthy();
    expect(pause.getAttribute("style") ?? "").toMatch(/background-color:\s*hsl\(var\(--background\)\)/);
    expect(screen.getByRole("dialog", { name: "Pause and save this diagnostic?" })).toBeTruthy();
    expect(screen.queryByText(SECRET_STEM)).toBeNull();
    expect(screen.queryByText(SECRET_PASSAGE)).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("marks an answered question in bold without showing whether it was correct", () => {
    const first = mathQuestion("map-q1", "First stem");
    const second = mathQuestion("map-q2", "Second stem");
    const twoItemExam: AssembledDiagnosticExam = {
      ...exam,
      math: {
        subject: "MATH",
        questions: [first, second],
        units: [
          { kind: "standalone", question: first, elaPart: "other" },
          { kind: "standalone", question: second, elaPart: "other" },
        ],
        missingIds: [],
        heldIds: [],
      },
      mathReady: 2,
    };

    render(
      <DiagnosticExamRunner
        exam={twoItemExam}
        userId="student-1"
        firstSection="MATH"
        deadlineAt={Date.now() + 60 * 60 * 1000}
        onExit={() => {}}
        onComplete={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /A\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const answered = screen.getByRole("button", { name: "Question 1, answered, locked" });
    const current = screen.getByRole("button", { name: "Question 2, current" });

    expect(answered.className).toContain("font-bold");
    expect(answered.className).toContain("border-foreground");
    expect(answered.className).not.toContain("bg-success");
    expect(answered.className).not.toContain("bg-destructive");
    expect(current.className).toContain("bg-primary");
    expect(current.className).not.toContain("bg-success");
    expect(screen.getByText("Second stem")).toBeTruthy();
  });
});

describe("DiagnosticExamRunner submit check", () => {
  it("lists unanswered and flagged questions and jumps back to them", () => {
    const first = mathQuestion("check-q1", "First check stem");
    const second = mathQuestion("check-q2", "Second check stem");
    const questions = [first, second];
    const checkExam: AssembledDiagnosticExam = {
      ...exam,
      math: {
        subject: "MATH",
        questions,
        units: [{ kind: "passageSet", passageId: "p1", questions, elaPart: "other" }],
        missingIds: [],
        heldIds: [],
      },
      mathReady: 2,
    };

    render(
      <DiagnosticExamRunner
        exam={checkExam}
        userId="student-1"
        firstSection="MATH"
        deadlineAt={Date.now() + 60 * 60 * 1000}
        onExit={() => {}}
        onComplete={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Question 2, jump available" }));
    fireEvent.click(screen.getByRole("radio", { name: /A\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Flag" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit MATH section" }));

    expect(screen.getByText("1 unanswered, 1 flagged.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Unanswered question 1" }));
    expect(screen.getByText("First check stem")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /A\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Back to submit check" }));
    expect(screen.getByText("No unanswered questions, 1 flagged.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Flagged question 2" })).toBeTruthy();
  });
});
