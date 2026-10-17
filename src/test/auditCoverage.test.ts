/**
 * Audit reconciliation (content/audit/2026-10-17): every audited version still exists, every
 * finding has exactly one ledger disposition, and every "fixed" finding points at a revision
 * that cites it. Plus linked-item and near-duplicate safety.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rawRevisionFiles } from "@/data/contentRevisions";
import { loadContentBatches } from "@/data/contentBatches";
import { diagnosticQuestions } from "@/data/diagnosticQuestions";
import { trackerQuestions } from "@/data/trackerQuestions";
import { loadFullPracticeCatalog, loadRevisedBank } from "@/data/questionCatalog";
import { AUDIT_DIR, readCsv, readFindingsIndex, readLedger } from "./contentFixtures";

const index = readFindingsIndex();
const ledger = readLedger();

describe("coverage of the 442 audited versions", () => {
  const rows = readCsv(path.join(AUDIT_DIR, "all-reviewed-versions.csv"));
  const bankIds = new Set([...trackerQuestions, ...loadContentBatches().questions].map((q) => q.id));
  const diagnosticIds = new Set(diagnosticQuestions.map((q) => q.id));

  it("lists 442 versions / 402 unique IDs (342 bank + 100 diagnostic)", () => {
    expect(rows).toHaveLength(442);
    expect(new Set(rows.map((r) => r.id)).size).toBe(402);
    expect(rows.filter((r) => r.version === "bank")).toHaveLength(342);
    expect(rows.filter((r) => r.version === "diagnostic")).toHaveLength(100);
  });

  it("every audited version still exists in its track (no retained original lost)", () => {
    const lost = rows.filter((r) => !(r.version === "bank" ? bankIds : diagnosticIds).has(r.id));
    expect(lost.map((r) => `${r.version}:${r.id}`)).toEqual([]);
  });

  it("source has no IDs the audit never saw (drift since the audited commit)", () => {
    const audited = new Set(rows.map((r) => `${r.version}:${r.id}`));
    const unseen = [
      ...[...bankIds].map((id) => `bank:${id}`),
      ...[...diagnosticIds].map((id) => `diagnostic:${id}`),
    ].filter((key) => !audited.has(key));
    expect(unseen).toEqual([]);
  });
});

describe("finding ledger", () => {
  const revisionKeys = new Map<string, Set<string>>();
  for (const { file } of rawRevisionFiles()) {
    for (const rec of [...(file.questions ?? []), ...(file.passages ?? [])]) {
      const ref = `${file.track}:${rec.id}@${rec.contentVersion}`;
      revisionKeys.set(ref, new Set(rec.auditFindings));
    }
  }

  it("has exactly one entry for every finding in the index", () => {
    const counts = new Map<string, number>();
    for (const { entry } of ledger) counts.set(entry.key, (counts.get(entry.key) ?? 0) + 1);
    const missing = index.filter((f) => !counts.has(f.key)).map((f) => f.key);
    const duplicated = [...counts].filter(([, n]) => n > 1).map(([key]) => key);
    const unknown = [...counts.keys()].filter((key) => !index.some((f) => f.key === key));
    expect({ missing, duplicated, unknown }).toEqual({ missing: [], duplicated: [], unknown: [] });
  });

  it.each(ledger.map(({ file, entry }) => [`${file} ${entry.key}`, entry] as const))("%s", (_label, entry) => {
    expect(["fixed", "already-fixed", "held", "deferred", "rejected"]).toContain(entry.disposition);
    expect(entry.note.trim().length).toBeGreaterThan(5);
    if (entry.disposition === "fixed" && entry.revision) {
      const cited = revisionKeys.get(entry.revision);
      expect(cited, `revision ${entry.revision} not found`).toBeDefined();
      expect(cited!.has(entry.key), `${entry.revision} does not cite ${entry.key}`).toBe(true);
    }
    if (entry.disposition === "fixed" && !entry.revision) {
      expect(entry.key.startsWith("PROMPT:") || entry.key.startsWith("SCOPE:"), "content fixes need a revision").toBe(true);
    }
  });

  it("every required content finding is fixed, held, already fixed, or explicitly reasoned", () => {
    const byKey = new Map(ledger.map(({ entry }) => [entry.key, entry]));
    const silent = index
      .filter((f) => f.required)
      .filter((f) => {
        const e = byKey.get(f.key);
        return !e || ((e.disposition === "deferred" || e.disposition === "rejected") && e.note.length < 30);
      });
    expect(silent.map((f) => f.key)).toEqual([]);
  });
});

describe("linked and near-duplicate items", () => {
  const served = loadFullPracticeCatalog().questions;

  it("no served bank question depends on another question's Part A", () => {
    const dependent = served.filter((q) => /\bPart [AB]\b/.test(q.stem));
    expect(dependent.map((q) => q.id)).toEqual([]);
  });

  it("ELA-RC-136 is answerable on its own", () => {
    const q136 = served.find((q) => q.id === "ELA-RC-136");
    expect(q136).toBeDefined();
    expect(q136!.stem).not.toMatch(/Part A|previous question|question above/i);
  });

  it("MATH-DAT-003 and MATH-DAT-107 are no longer near-duplicates", () => {
    const bank = new Map(loadRevisedBank().questions.map((q) => [q.id, q]));
    const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
    const a = words(bank.get("MATH-DAT-003")!.stem);
    const b = words(bank.get("MATH-DAT-107")!.stem);
    const overlap = [...a].filter((w) => b.has(w)).length / Math.min(a.size, b.size);
    expect(overlap).toBeLessThan(0.6);
  });
});
