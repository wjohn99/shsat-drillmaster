import { describe, expect, it } from "vitest";
import {
  isPracticeSetType,
  PINNED_PRACTICE_SCOPE_ID,
  practiceSetIsResumable,
  practiceSetScopeId,
  practiceSetTypeFromScopeId,
  restoredPracticeQuestions,
  sameQuestionOrder,
  unfinishedSetLabel,
} from "@/lib/practiceSetProgress";

describe("practice set progress", () => {
  it("scopes each skill card to its own saved set", () => {
    expect(practiceSetScopeId("math")).toBe("practice-set:math");
    expect(practiceSetTypeFromScopeId("practice-set:reading-comprehension")).toBe(
      "reading-comprehension",
    );
    expect(practiceSetTypeFromScopeId("self")).toBeNull();
    expect(isPracticeSetType("diagnostic")).toBe(false);
  });

  it("resumes a set that is still on question 1", () => {
    expect(practiceSetIsResumable({ questionIds: ["q1"] })).toBe(true);
    expect(practiceSetIsResumable({ questionIds: [] })).toBe(false);
    expect(practiceSetIsResumable(null)).toBe(false);
    expect(sameQuestionOrder(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameQuestionOrder(["a"], ["b"])).toBe(false);
    expect(PINNED_PRACTICE_SCOPE_ID).toBe("practice-set:pinned");
  });

  it("describes the question the student would return to", () => {
    expect(unfinishedSetLabel(0, 10)).toBe("Unfinished set, question 1 of 10.");
    expect(unfinishedSetLabel(4, 10)).toBe("Unfinished set, question 5 of 10.");
  });

  it("resumes only when every saved question is still available", () => {
    const byId = new Map([
      ["a", { id: "a" }],
      ["b", { id: "b" }],
    ]);
    expect(restoredPracticeQuestions(["b", "a"], byId)?.map((question) => question.id)).toEqual([
      "b",
      "a",
    ]);
    expect(restoredPracticeQuestions(["a", "missing"], byId)).toBeNull();
    expect(restoredPracticeQuestions([], byId)).toBeNull();
  });
});
