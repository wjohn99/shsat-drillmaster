import { describe, expect, it } from "vitest";
import {
  listWorksheetPool,
  pickWorksheetQuestions,
  worksheetQuestionsFromIds,
} from "@/lib/worksheetTagCatalog";
import type { Question } from "@/types";

function question(id: string, code: string): Question {
  return {
    id,
    subject: "MATH",
    module: "1",
    subtype: "MC4_A-D",
    stem: id,
    tags: [{ id: code, domain: "MATH", code, label: code }],
  };
}

const questions = [
  question("q-keep", "ALG-1"),
  question("q-used", "ALG-1"),
  question("q-other", "GEO-1"),
];

describe("worksheet assignment exclusion", () => {
  it("leaves out questions already assigned to this student", () => {
    const excluded = new Set(["q-used"]);
    const pool = listWorksheetPool(questions, new Set(["ALG-1"]), excluded);
    expect(pool.map((item) => item.id)).toEqual(["q-keep"]);
  });

  it("keeps a question that was assigned to someone else off this exclusion set", () => {
    const pool = listWorksheetPool(questions, new Set(["ALG-1"]), new Set());
    expect(pool.map((item) => item.id)).toEqual(["q-keep", "q-used"]);
  });

  it("does not put an already assigned question on a hand-picked worksheet", () => {
    const picked = worksheetQuestionsFromIds(questions, ["q-keep", "q-used"], new Set(["q-used"]));
    expect(picked.map((item) => item.id)).toEqual(["q-keep"]);
  });

  it("fills a random set from the remaining pool", () => {
    const picked = pickWorksheetQuestions(questions, new Set(["ALG-1"]), 10, new Set(["q-used"]));
    expect(picked.map((item) => item.id)).toEqual(["q-keep"]);
  });
});
