import { describe, expect, it } from "vitest";
import { assignmentAllowsSkip } from "@/lib/assignmentService";
import { reachedQuestionIndex } from "@/lib/worksheetSkip";

describe("worksheet skip", () => {
  it("treats a missing skip setting as ordered questions", () => {
    expect(assignmentAllowsSkip(null)).toBe(false);
    expect(assignmentAllowsSkip({})).toBe(false);
    expect(assignmentAllowsSkip({ allowSkip: false })).toBe(false);
    expect(assignmentAllowsSkip({ allowSkip: true })).toBe(true);
  });

  it("keeps the furthest question the student already opened", () => {
    expect(
      reachedQuestionIndex({
        questionIds: ["q1", "q2", "q3"],
        currentQuestionIndex: 0,
        maxReachedIndex: 2,
      }),
    ).toBe(2);
    expect(
      reachedQuestionIndex({
        questionIds: ["q1", "q2", "q3"],
        currentQuestionIndex: 0,
        lockedQuestionIds: ["q2"],
      }),
    ).toBe(1);
    expect(
      reachedQuestionIndex({
        questionIds: ["q1", "q2"],
        currentQuestionIndex: 0,
      }),
    ).toBe(0);
  });
});
