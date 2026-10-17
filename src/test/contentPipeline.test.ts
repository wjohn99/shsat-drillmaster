/**
 * Pipeline gate (content/PIPELINE.md): every batch created after 2026-10-17 must have an
 * independent review recorded on every question, and a fact-check note when it has passages.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT, readJson } from "./contentFixtures";

const PIPELINE_START = "2026-10-17";

type Review = { reviewer?: string; reviewedAt?: string; verdict?: string; issuesFound?: number; notes?: string };
type Batch = {
  questions: { id: string; revisedBy?: string[]; independentReview?: Review }[];
  passages?: { id: string }[];
  factCheck?: string[];
};

const batchDir = path.join(ROOT, "content/batches");
const gated = readdirSync(batchDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}/.test(d.name) && d.name.slice(0, 10) > PIPELINE_START)
  .map((d) => ({ name: d.name, batch: readJson<Batch>(path.join(batchDir, d.name, "questions.json")) }));

describe("content pipeline gate", () => {
  it("applies to batches dated after the pipeline start", () => {
    expect(PIPELINE_START).toBe("2026-10-17");
  });

  it.each(gated.map((g) => [g.name, g.batch] as const))("%s passed independent review", (_name, batch) => {
    for (const q of batch.questions) {
      const review = q.independentReview;
      expect(review, `${q.id} has no independentReview`).toBeDefined();
      expect(review!.verdict, `${q.id} review verdict`).toBe("pass");
      expect(review!.reviewer?.trim(), `${q.id} reviewer`).toBeTruthy();
      expect(review!.reviewedAt, `${q.id} reviewedAt`).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(q.revisedBy ?? [], `${q.id}: the reviewer cannot be the writer`).not.toContain(review!.reviewer);
    }
    if (batch.passages?.length) {
      expect(batch.factCheck?.length, "batches with passages need factCheck notes").toBeGreaterThan(0);
    }
  });
});
