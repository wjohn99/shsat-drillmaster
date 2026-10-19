import { describe, expect, it } from "vitest";
import { getSelectedChoiceIds } from "@/lib/questionExplanation";
import type { Question } from "@/types";

const question: Question = {
  id: "MATH-ALG-114",
  subject: "MATH",
  module: "2",
  subtype: "MC4_A-D",
  stem: "The value of 3x − 5 is 16 when x = a. What is the value of 3x − 5 when x = 2a?",
  choices: [
    { id: "MATH-ALG-114-v2-a", label: "A", text: "14", isCorrect: false },
    { id: "MATH-ALG-114-v2-b", label: "B", text: "17", isCorrect: false },
    { id: "MATH-ALG-114-v2-c", label: "C", text: "32", isCorrect: false },
    { id: "MATH-ALG-114-v2-d", label: "D", text: "37", isCorrect: true },
  ],
  tags: [],
  createdAt: "2026-10-11T12:00:00Z",
  contentVersion: 2,
};

describe("getSelectedChoiceIds", () => {
  it("matches the current choice id", () => {
    expect(getSelectedChoiceIds(question, "MATH-ALG-114-v2-c")).toEqual(["MATH-ALG-114-v2-c"]);
  });

  it("matches a pre-rewrite choice id onto the current letter", () => {
    expect(getSelectedChoiceIds(question, "MATH-ALG-114-c")).toEqual(["MATH-ALG-114-v2-c"]);
  });

  it("matches a stored letter", () => {
    expect(getSelectedChoiceIds(question, "C")).toEqual(["MATH-ALG-114-v2-c"]);
  });

  it("returns empty when nothing maps", () => {
    expect(getSelectedChoiceIds(question, "not-a-choice")).toEqual([]);
  });
});
