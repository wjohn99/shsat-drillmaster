import { describe, expect, it } from "vitest";
import {
  diagnosticSubmitCheckLine,
  missedQuestionIds,
  practiceMissedQuestionsHref,
  practiceMissedQuestionsLabel,
} from "@/lib/diagnosticSubmitCheck";

describe("diagnostic submit check", () => {
  it("counts unanswered and flagged questions in one line", () => {
    expect(diagnosticSubmitCheckLine(4, 2)).toBe("4 unanswered, 2 flagged.");
    expect(diagnosticSubmitCheckLine(0, 2)).toBe("No unanswered questions, 2 flagged.");
    expect(diagnosticSubmitCheckLine(1, 0)).toBe("1 unanswered, none flagged.");
    expect(diagnosticSubmitCheckLine(0, 0)).toBe("No unanswered questions, none flagged.");
  });

  it("keeps missed questions in sitting order", () => {
    expect(
      missedQuestionIds([
        { questionId: "a", correct: true },
        { questionId: "b", correct: false },
        { questionId: "b", correct: false },
        { questionId: "c", correct: false },
      ]),
    ).toEqual(["b", "c"]);
    expect(practiceMissedQuestionsLabel(1)).toBe("Practice 1 missed question");
    expect(practiceMissedQuestionsHref(["b", "c"])).toBe("/practice-set?questionIds=b%2Cc");
  });
});