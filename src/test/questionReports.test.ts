import { describe, expect, it } from "vitest";
import { filterQuestions } from "@/lib/questionFilters";
import {
  canManageQuestionReports,
  canReportQuestions,
  questionReportDocId,
} from "@/lib/questionReportService";
import type { Question } from "@/types";

describe("question reports", () => {
  it("builds a stable report document id", () => {
    expect(questionReportDocId("MATH-ALG-004", "uid1")).toBe("MATH-ALG-004__uid1");
    expect(questionReportDocId("a/b", "uid1")).toBe("a_b__uid1");
  });

  it("lets students, tutors, and demo accounts report", () => {
    expect(canReportQuestions("student")).toBe(true);
    expect(canReportQuestions("tutor")).toBe(true);
    expect(canReportQuestions("demo")).toBe(true);
    expect(canReportQuestions("parent")).toBe(false);
    expect(canManageQuestionReports("tutor")).toBe(true);
    expect(canManageQuestionReports("student")).toBe(false);
  });

  it("filters the bank to questions with open reports", () => {
    const questions = [
      { id: "q1", subject: "MATH", module: "1", subtype: "MC4_A-D", stem: "one", tags: [], createdAt: "2026-01-01" },
      { id: "q2", subject: "MATH", module: "1", subtype: "MC4_A-D", stem: "two", tags: [], createdAt: "2026-01-01" },
    ] as Question[];
    const filtered = filterQuestions(
      { reviewQueue: ["reported"] },
      questions,
      undefined,
      new Set(["q2"]),
    );
    expect(filtered.map((q) => q.id)).toEqual(["q2"]);
  });
});
