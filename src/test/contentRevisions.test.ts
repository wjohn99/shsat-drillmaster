/**
 * Revision safety: every revision targets an existing record in its own track, preserves the
 * original, cites audit findings, never promotes review status, and never reuses a choice ID
 * for changed content (so stored answers cannot appear to pick new content).
 */
import { describe, expect, it } from "vitest";
import { rawRevisionFiles, type RawQuestionRevision } from "@/data/contentRevisions";
import { loadContentBatches } from "@/data/contentBatches";
import { diagnosticPassages } from "@/data/diagnosticPassages";
import { diagnosticQuestions } from "@/data/diagnosticQuestions";
import { trackerQuestions } from "@/data/trackerQuestions";
import { loadDiagnosticQuestionCatalog, loadRevisedBank } from "@/data/questionCatalog";
import type { Question } from "@/types";
import { readFindingsIndex } from "./contentFixtures";

const batches = loadContentBatches();
const originals = {
  bank: new Map<string, Question>([
    ...trackerQuestions.map((q) => [q.id, q] as const),
    ...batches.questions.map((q) => [q.id, q] as const),
  ]),
  diagnostic: new Map<string, Question>(diagnosticQuestions.map((q) => [q.id, q] as const)),
};
const originalPassages = {
  bank: new Set(batches.passages.map((p) => p.id)),
  diagnostic: new Set(diagnosticPassages.map((p) => p.id)),
};
const findingKeys = new Set(readFindingsIndex().map((f) => f.key));
const files = rawRevisionFiles();

type Choiceish = { id: string; text: string; isCorrect?: boolean };

/** ID -> content signature for choices, inline options and drag items. */
function answerUnits(q: Pick<Question, "choices" | "ic" | "dnd">): Map<string, string> {
  const units = new Map<string, string>();
  for (const c of (q.choices ?? []) as Choiceish[]) units.set(c.id, `${c.text}|${Boolean(c.isCorrect)}`);
  for (const slot of q.ic?.slots ?? []) {
    for (const o of slot.options) {
      units.set(o.id, `${slot.slotId}|${o.text}|${q.ic!.correctMapping[slot.slotId] === o.id}`);
    }
  }
  for (const p of q.dnd?.pool ?? []) {
    const zones = Object.entries(q.dnd!.correctMapping)
      .filter(([, item]) => item === p.id)
      .map(([zone]) => zone)
      .sort()
      .join(",");
    units.set(p.id, `${p.text}|${zones}`);
  }
  return units;
}

function taskSignature(q: Pick<Question, "stem" | "choices" | "ic" | "dnd" | "ee" | "ms" | "cgt">): string {
  return JSON.stringify({
    stem: q.stem,
    units: [...answerUnits(q)].sort(),
    ee: q.ee?.acceptableAnswers ?? null,
    ms: q.ms?.selectCount ?? null,
    cgt: q.cgt?.visual ?? null,
  });
}

describe("revision files", () => {
  it("exist and declare a track", () => {
    for (const { path, file } of files) {
      expect(["bank", "diagnostic"], path).toContain(file.track);
    }
  });

  const questionRevisions = files.flatMap(({ path, file }) =>
    (file.questions ?? []).map((rev) => ({ path, track: file.track, rev })),
  );

  it("revise each ID at most once per version within a track", () => {
    const seen = new Set<string>();
    for (const { track, rev } of questionRevisions) {
      const key = `${track}:${rev.id}@${rev.contentVersion}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it.each(questionRevisions.map((r) => [`${r.track}:${r.rev.id}`, r] as const))(
    "%s",
    (_label, { track, rev }: { track: "bank" | "diagnostic"; rev: RawQuestionRevision }) => {
      const original = originals[track].get(rev.id);
      expect(original, "revision targets an ID that does not exist in this track").toBeDefined();
      expect(rev.subject).toBe(original!.subject);
      expect(rev.contentVersion).toBe((original!.contentVersion ?? 1) + 1);
      expect(["feedback", "substantive", "scope-rewrite", "metadata"]).toContain(rev.changeType);
      expect(rev.auditFindings.length).toBeGreaterThan(0);
      for (const key of rev.auditFindings) expect(findingKeys.has(key), `unknown finding ${key}`).toBe(true);
      expect(rev.revisionNotes.trim().length).toBeGreaterThan(10);
      expect(rev.reviewStatus, "a revision is never human approval").not.toBe("final");
      expect(JSON.stringify(rev)).not.toBe(JSON.stringify(original));

      const before = answerUnits(original!);
      const after = answerUnits(rev as unknown as Question);
      if (rev.changeType === "feedback" || rev.changeType === "metadata") {
        expect(taskSignature(rev as unknown as Question), "feedback revisions keep the task and key").toBe(
          taskSignature(original!),
        );
      } else {
        for (const [id, signature] of after) {
          if (before.has(id)) {
            expect(signature, `changed content reuses ID ${id}; give it a new -v2 ID`).toBe(before.get(id));
          }
        }
      }
      if (track === "diagnostic") {
        expect(rev.passageId ?? null).toBe(original!.passageId ?? null);
      }
    },
  );

  it("passage revisions target existing passages in their track", () => {
    for (const { file } of files) {
      for (const passage of file.passages ?? []) {
        expect(originalPassages[file.track].has(passage.id), `${file.track}:${passage.id}`).toBe(true);
        expect(passage.contentVersion).toBeGreaterThanOrEqual(2);
        expect(passage.auditFindings.length).toBeGreaterThan(0);
        for (const key of passage.auditFindings) {
          expect(findingKeys.has(key), `${passage.id}: unknown finding ${key}`).toBe(true);
        }
      }
    }
  });
});

describe("version separation", () => {
  const bank = new Map(loadRevisedBank().questions.map((q) => [q.id, q]));
  const diagnostic = new Map(loadDiagnosticQuestionCatalog().questions.map((q) => [q.id, q]));

  it.each([
    ["MATH-ALG-004", "25", "20"],
    ["MATH-APP-011", "64", "60"],
    ["MATH-GEO-010", "189", "126"],
  ])("%s keeps bank answer %s and diagnostic answer %s", (id, bankAnswer, diagnosticAnswer) => {
    const key = (q: Question | undefined) => q?.choices?.find((c) => c.isCorrect)?.text ?? "";
    expect(key(bank.get(id))).toContain(bankAnswer);
    expect(key(diagnostic.get(id))).toContain(diagnosticAnswer);
  });

  it("keeps the diagnostic ELA-REB-004 'wakes' version separate from the bank", () => {
    expect(diagnostic.get("ELA-REB-004")?.stem).toContain("wakes");
  });

  it("diagnostic revisions never add or remove form IDs", () => {
    expect([...diagnostic.keys()].sort()).toEqual(diagnosticQuestions.map((q) => q.id).sort());
  });
});

describe("review status", () => {
  const bank = loadRevisedBank().questions;

  it("never promotes a provisional batch item to final", () => {
    const provisionalBatchIds = new Set(
      batches.questions.filter((q) => q.reviewStatus === "provisional").map((q) => q.id),
    );
    const promoted = bank.filter((q) => provisionalBatchIds.has(q.id) && q.reviewStatus === "final");
    expect(promoted.map((q) => q.id)).toEqual([]);
  });

  it("documents records whose missing status currently reads as final (not human approval)", () => {
    // Tracker-only and original diagnostic records carry no reviewStatus. questionReviewStatus()
    // reads that as "final". This is a product decision to make, not an approval; see the report.
    const trackerOnly = trackerQuestions.filter((q) => !batches.questions.some((b) => b.id === q.id));
    expect(trackerOnly.every((q) => q.reviewStatus === undefined)).toBe(true);
    expect(diagnosticQuestions.every((q) => q.reviewStatus === undefined)).toBe(true);
  });
});
