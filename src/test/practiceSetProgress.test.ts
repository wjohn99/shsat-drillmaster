import { describe, expect, it } from "vitest";
import {
  isPracticeSetType,
  practiceSetScopeId,
  practiceSetTypeFromScopeId,
  restoredPracticeQuestions,
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
