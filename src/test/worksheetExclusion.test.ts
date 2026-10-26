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
  it("leaves out questions this student already submitted when the tutor blocks repeats", () => {
    const excluded = new Set(["q-used"]);
    const pool = listWorksheetPool(questions, new Set(["ALG-1"]), excluded);
    expect(pool.map((item) => item.id)).toEqual(["q-keep"]);
  });

  it("keeps previously submitted questions in the pool when repeats are allowed", () => {
    const pool = listWorksheetPool(questions, new Set(["ALG-1"]), new Set());
    expect(pool.map((item) => item.id)).toEqual(["q-keep", "q-used"]);
  });

  it("does not put a submitted question on a hand-picked worksheet when repeats are blocked", () => {
    const picked = worksheetQuestionsFromIds(questions, ["q-keep", "q-used"], new Set(["q-used"]));
    expect(picked.map((item) => item.id)).toEqual(["q-keep"]);
  });

  it("fills a random set from the remaining pool", () => {
    const picked = pickWorksheetQuestions(questions, new Set(["ALG-1"]), 10, new Set(["q-used"]));
    expect(picked.map((item) => item.id)).toEqual(["q-keep"]);
  });
});
