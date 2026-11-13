import { describe, expect, it } from "vitest";
import { buildDiagnosticCompareRows } from "@/lib/diagnosticCompare";
import { diagnosticResumePlace } from "@/lib/shsatDiagnostic";
import type { AssembledDiagnosticExam } from "@/lib/shsatDiagnostic";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

function event(
  partial: Pick<SessionAnalyticsEvent, "questionId" | "subject" | "module" | "correct" | "tags">,
): SessionAnalyticsEvent {
  return { elapsedSeconds: 10, ...partial };
}

describe("diagnostic compare", () => {
  it("shows the latest percentage minus the first", () => {
    const first = [
      event({ questionId: "a", subject: "ELA", module: "1", correct: false, tags: ["RC-MAIN"] }),
      event({ questionId: "b", subject: "MATH", module: "2", correct: true, tags: ["ALG-EQ"] }),
    ];
    const latest = [
      event({ questionId: "a", subject: "ELA", module: "1", correct: true, tags: ["RC-MAIN"] }),
      event({ questionId: "b", subject: "MATH", module: "2", correct: true, tags: ["ALG-EQ"] }),
    ];
    const rows = buildDiagnosticCompareRows(first, latest);
    expect(rows.find((row) => row.label === "Accuracy")).toEqual({
      label: "Accuracy",
      first: "50%",
      latest: "100%",
      change: "+50",
    });
    expect(rows.find((row) => row.label === "ELA")).toMatchObject({
      first: "0%",
      latest: "100%",
      change: "+100",
    });
    expect(rows.find((row) => row.label === "Math")?.change).toBe("0");
  });
});

describe("diagnostic resume place", () => {
  it("names the saved question inside the current section", () => {
    const questions = [{ id: "q1" }, { id: "q2" }, { id: "q3" }];
    const exam = {
      ela: {
        subject: "ELA",
        questions,
        units: questions.map((question) => ({
          kind: "standalone",
          question,
          elaPart: "other",
        })),
      },
      math: { subject: "MATH", questions: [], units: [] },
    } as unknown as AssembledDiagnosticExam;
    expect(
      diagnosticResumePlace(exam, {
        firstSection: "ELA",
        sectionIndex: 0,
        unitIndex: 1,
        questionIndexInUnit: 0,
      }),
    ).toBe("ELA, question 2 of 3");
  });
});
