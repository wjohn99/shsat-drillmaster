/**
 * Answer integrity for every current question in both tracks, run through the app's real
 * scorer (`isQuestionAnswerCorrect`) rather than a schema check.
 */
import { describe, expect, it } from "vitest";
import { canSubmitQuestionAnswer, isQuestionAnswerCorrect } from "@/lib/sessionGrading";
import { serializeAtaAnswer } from "@/lib/indyAta";
import { serializeIcSelections } from "@/lib/indyIc";
import { serializeDndPlacements } from "@/lib/indyDnd";
import { getQuestionSolutionExplanation, questionHasExplanationContent } from "@/lib/questionExplanation";
import type { Question } from "@/types";
import { currentContent } from "./contentFixtures";

const tracks = currentContent();

function correctRaw(q: Question): string | undefined {
  if (q.subtype === "INDY-IC" && q.ic) return serializeIcSelections({ ...q.ic.correctMapping });
  if (q.subtype === "INDY-DND" && q.dnd) {
    const empty = Object.fromEntries(q.dnd.zones.map((z) => [z.id, null as string | null]));
    return serializeDndPlacements({ ...empty, ...q.dnd.correctMapping });
  }
  if (q.ee && (q.subtype === "INDY-EE" || !q.choices?.length)) return q.ee.acceptableAnswers[0];
  if ((q.subtype === "INDY-MS" || q.subtype === "INDY-ATA") && q.choices) {
    return serializeAtaAnswer(q.choices.filter((c) => c.isCorrect).map((c) => c.id));
  }
  return q.choices?.find((c) => c.isCorrect)?.id;
}

describe.each(tracks)("$track content", ({ track, questions, passages }) => {
  it("has the expected record count", () => {
    expect(questions.length).toBe(track === "bank" ? 342 : 100);
  });

  it("has unique IDs", () => {
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
  });

  it.each(questions.map((q) => [q.id, q] as const))("%s: correct answer scores correct", (_id, q) => {
    const raw = correctRaw(q);
    expect(raw, "no gradable correct answer").toBeTruthy();
    expect(canSubmitQuestionAnswer(q, raw)).toBe(true);
    expect(isQuestionAnswerCorrect(q, raw)).toBe(true);
  });

  it.each(questions.map((q) => [q.id, q] as const))("%s: answer payload is well formed", (_id, q) => {
    if (q.subtype === "INDY-MS") {
      const correct = q.choices?.filter((c) => c.isCorrect) ?? [];
      expect(q.ms?.selectCount).toBe(correct.length);
      expect(correct.length).toBeGreaterThanOrEqual(2);
      // Each single wrong swap fails.
      const wrong = q.choices?.find((c) => !c.isCorrect);
      if (wrong) {
        const swapped = [...correct.slice(1).map((c) => c.id), wrong.id];
        expect(isQuestionAnswerCorrect(q, serializeAtaAnswer(swapped))).toBe(false);
      }
      // Too few selections fail.
      expect(isQuestionAnswerCorrect(q, serializeAtaAnswer([correct[0].id]))).toBe(false);
    } else if (q.choices?.length) {
      expect(q.choices.filter((c) => c.isCorrect)).toHaveLength(1);
      expect(new Set(q.choices.map((c) => c.id)).size).toBe(q.choices.length);
      expect(new Set(q.choices.map((c) => c.text.trim())).size).toBe(q.choices.length);
      for (const c of q.choices.filter((choice) => !choice.isCorrect)) {
        expect(isQuestionAnswerCorrect(q, c.id)).toBe(false);
      }
    }
    if (q.ic) {
      for (const slot of q.ic.slots) {
        const ids = slot.options.map((o) => o.id);
        expect(ids).toContain(q.ic.correctMapping[slot.slotId]);
        expect(new Set(ids).size).toBe(ids.length);
        const wrong = slot.options.find((o) => o.id !== q.ic!.correctMapping[slot.slotId]);
        if (wrong) {
          const bad = { ...q.ic.correctMapping, [slot.slotId]: wrong.id };
          expect(isQuestionAnswerCorrect(q, serializeIcSelections(bad))).toBe(false);
        }
      }
      const segmentSlots = q.ic.segments.filter((s) => s.type === "slot").map((s) => s.slotId);
      expect(new Set(segmentSlots)).toEqual(new Set(q.ic.slots.map((s) => s.slotId)));
    }
    if (q.dnd) {
      const pool = new Set(q.dnd.pool.map((p) => p.id));
      const zones = new Set(q.dnd.zones.map((z) => z.id));
      for (const [zone, item] of Object.entries(q.dnd.correctMapping)) {
        expect(zones.has(zone), `zone ${zone}`).toBe(true);
        expect(pool.has(item), `pool item ${item}`).toBe(true);
      }
    }
    if (q.ee) {
      expect(q.ee.acceptableAnswers.length).toBeGreaterThan(0);
      for (const accepted of q.ee.acceptableAnswers) {
        expect(isQuestionAnswerCorrect(q, accepted), `accepted form ${accepted}`).toBe(true);
      }
      expect(isQuestionAnswerCorrect(q, "987654321")).toBe(false);
    }
  });

  it.each(questions.filter((q) => q.passageId).map((q) => [q.id, q] as const))(
    "%s: passage resolves",
    (_id, q) => {
      expect(passages.some((p) => p.id === q.passageId)).toBe(true);
    },
  );

  // Held versions are never served; their feedback fixes wait for the hold review (see ledger).
  it.each(questions.filter((q) => !q.scopeHold).map((q) => [q.id, q] as const))(
    "%s: served version has explanation content",
    (_id, q) => {
      expect(questionHasExplanationContent(q)).toBe(true);
    },
  );
});

describe("feedback fallbacks the review screens rely on", () => {
  const bank = tracks[0].questions;
  const diagnostic = tracks[1].questions;

  it("MATH-APP-001 resolves its explanation from the nested wp spec", () => {
    const q = bank.find((item) => item.id === "MATH-APP-001");
    expect(q).toBeDefined();
    expect(getQuestionSolutionExplanation(q!)?.length ?? 0).toBeGreaterThan(40);
  });

  it("MATH-DAT-DX09 (INDY-EE with a table) is scorable and explained", () => {
    const q = diagnostic.find((item) => item.id === "MATH-DAT-DX09");
    expect(q?.subtype).toBe("INDY-EE");
    expect(q?.cgt?.visual).toBeDefined();
    expect(isQuestionAnswerCorrect(q!, q!.ee!.acceptableAnswers[0])).toBe(true);
    expect(getQuestionSolutionExplanation(q!)?.length ?? 0).toBeGreaterThan(40);
  });

  it("every diagnostic choice without its own explanation falls back to a substantive solution", () => {
    const missing = diagnostic.filter(
      (q) => q.choices?.some((c) => !c.explanation?.trim()) && !(getQuestionSolutionExplanation(q)?.length ?? 0),
    );
    expect(missing.map((q) => q.id)).toEqual([]);
  });
});

describe("numeric entry on a non-EE subtype", () => {
  it("scores an INDY-CGT question that carries an ee spec and no choices (regression)", () => {
    const q = tracks[0].questions.find((item) => item.id === "MATH-DAT-115");
    expect(q?.subtype).toBe("INDY-CGT");
    expect(q?.choices?.length ?? 0).toBe(0);
    expect(isQuestionAnswerCorrect(q!, q!.ee!.acceptableAnswers[0])).toBe(true);
    expect(canSubmitQuestionAnswer(q!, q!.ee!.acceptableAnswers[0])).toBe(true);
    expect(canSubmitQuestionAnswer(q!, "")).toBe(false);
  });
});
