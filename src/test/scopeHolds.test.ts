/**
 * Grade 8 scope eligibility: held versions never reach a current pool, originals stay in the
 * archive, and the diagnostic keeps 50/50 only through in-scope replacements.
 */
import { describe, expect, it } from "vitest";
import {
  filterCatalogForViewer,
  loadDiagnosticQuestionCatalog,
  loadFullPracticeCatalog,
  loadHeldAdvancedArchive,
  loadRevisedBank,
} from "@/data/questionCatalog";
import { GRADE8_SCOPE_HOLDS, scopeHoldFor } from "@/data/scopeHolds";
import { assembleDiagnosticExam } from "@/lib/shsatDiagnostic";
import { DIAGNOSTIC_ELA_QUESTION_IDS, DIAGNOSTIC_MATH_QUESTION_IDS } from "@/data/shsatDiagnosticForm";
import type { Question } from "@/types";
import type { UserRole } from "@/types/auth";

const heldBankIds = GRADE8_SCOPE_HOLDS.filter((h) => h.track === "bank").map((h) => h.id);

describe("scope hold list", () => {
  it("covers the 19 audited versions (16 unique IDs)", () => {
    expect(GRADE8_SCOPE_HOLDS).toHaveLength(19);
    expect(new Set(GRADE8_SCOPE_HOLDS.map((h) => h.id)).size).toBe(16);
  });

  it("names records that exist in their track", () => {
    const bank = new Set(loadRevisedBank().questions.map((q) => q.id));
    const diagnostic = new Set(loadDiagnosticQuestionCatalog().questions.map((q) => q.id));
    for (const hold of GRADE8_SCOPE_HOLDS) {
      expect((hold.track === "bank" ? bank : diagnostic).has(hold.id), `${hold.track}:${hold.id}`).toBe(true);
    }
  });

  it("clears only at or above the named content version", () => {
    const hold = GRADE8_SCOPE_HOLDS.find((h) => h.clearedByContentVersion !== null)!;
    const base = { id: hold.id, tags: [] } as unknown as Question;
    expect(scopeHoldFor({ ...base, contentVersion: 1 }, hold.track)).toBeDefined();
    expect(scopeHoldFor({ ...base, contentVersion: hold.clearedByContentVersion! }, hold.track)).toBeUndefined();
    const permanent = GRADE8_SCOPE_HOLDS.find((h) => h.clearedByContentVersion === null)!;
    expect(scopeHoldFor({ ...base, id: permanent.id, contentVersion: 9 }, permanent.track)).toBeDefined();
  });
});

describe("current pools exclude held versions", () => {
  const full = loadFullPracticeCatalog();

  it("full practice catalog (worksheets, assigned sets) serves no held version", () => {
    expect(full.questions.filter((q) => q.scopeHold).map((q) => q.id)).toEqual([]);
    const permanentlyHeld = GRADE8_SCOPE_HOLDS.filter(
      (h) => h.track === "bank" && h.clearedByContentVersion === null,
    ).map((h) => h.id);
    expect(full.questions.filter((q) => permanentlyHeld.includes(q.id)).map((q) => q.id)).toEqual([]);
  });

  it.each(["student", "demo", "tutor", "parent", undefined] as (UserRole | undefined)[])(
    "role %s sees no held version",
    (role) => {
      const catalog = filterCatalogForViewer(full, role);
      expect(catalog.questions.filter((q) => q.scopeHold)).toEqual([]);
      for (const nav of catalog.navigationData) {
        expect(JSON.stringify(nav)).not.toMatch(/"scopeHold"/);
      }
    },
  );

  it("cleared bank holds serve only the in-scope revision", () => {
    for (const hold of GRADE8_SCOPE_HOLDS.filter((h) => h.track === "bank" && h.clearedByContentVersion)) {
      const served = full.questions.find((q) => q.id === hold.id);
      if (served) expect(served.contentVersion).toBeGreaterThanOrEqual(hold.clearedByContentVersion!);
    }
  });

  it("keeps every held original in the archive with its hold attached", () => {
    const archive = loadHeldAdvancedArchive();
    expect(archive).toHaveLength(19);
    for (const { question } of archive) {
      expect(question.scopeHold?.audience).toBe("grade8");
      expect(question.contentVersion ?? 1).toBe(1);
    }
    expect(archive.filter((a) => a.track === "bank").map((a) => a.question.id).sort()).toEqual(
      [...heldBankIds].sort(),
    );
  });
});

describe("diagnostic form safety", () => {
  const exam = assembleDiagnosticExam();

  it("serves no held version", () => {
    const served = [...exam.ela.questions, ...exam.math.questions];
    expect(served.filter((q) => q.scopeHold).map((q) => q.id)).toEqual([]);
  });

  it("keeps the official counts and order, or reports exactly which slots are blocked", () => {
    const blocked = [...exam.ela.heldIds, ...exam.math.heldIds];
    expect(exam.ela.questions.length + exam.ela.heldIds.length).toBe(50);
    expect(exam.math.questions.length + exam.math.heldIds.length).toBe(50);
    expect(exam.isComplete).toBe(blocked.length === 0 && exam.ela.missingIds.length + exam.math.missingIds.length === 0);
    const servedOrder = exam.math.questions.map((q) => q.id);
    expect(servedOrder).toEqual(DIAGNOSTIC_MATH_QUESTION_IDS.filter((id) => !exam.math.heldIds.includes(id)));
    expect(exam.ela.questions.map((q) => q.id)).toEqual(
      DIAGNOSTIC_ELA_QUESTION_IDS.filter((id) => !exam.ela.heldIds.includes(id)),
    );
  });

  it("is complete at 50 + 50 once in-scope replacements exist for every held slot", () => {
    expect(exam.ela.heldIds).toEqual([]);
    expect(exam.math.heldIds).toEqual([]);
    expect(exam.isComplete).toBe(true);
  });
});
