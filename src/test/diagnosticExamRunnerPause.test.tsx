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

function mathQuestion(): Question {
  return {
    id: "pause-q1",
    subject: "MATH",
    module: "1",
    subtype: "MC4_A-D",
    stem: SECRET_STEM,
    choices: [
      { id: "A", label: "A", text: "one", isCorrect: true },
      { id: "B", label: "B", text: "two", isCorrect: false },
      { id: "C", label: "C", text: "three", isCorrect: false },
      { id: "D", label: "D", text: "four", isCorrect: false },
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
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    const pause = screen.getByTestId("diagnostic-pause-screen");
    expect(pause).toBeTruthy();
    expect(pause.getAttribute("style") ?? "").toMatch(/background-color:\s*hsl\(var\(--background\)\)/);
    expect(screen.getByRole("dialog", { name: "Pause and save this diagnostic?" })).toBeTruthy();
    expect(screen.queryByText(SECRET_STEM)).toBeNull();
    expect(screen.queryByText(SECRET_PASSAGE)).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
