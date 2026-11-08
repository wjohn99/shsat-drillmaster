import { describe, expect, it } from "vitest";
import {
  extendScratchStroke,
  parseScratchPad,
  scratchPadHasInk,
  serializeScratchPad,
  startScratchStroke,
  trimScratchStrokes,
  type ScratchStroke,
} from "@/lib/scratchPad";

describe("scratch pad", () => {
  it("round-trips a pen stroke and an eraser stroke", () => {
    const pen = extendScratchStroke(startScratchStroke("pen", { x: 10, y: 20 }), { x: 80, y: 90 });
    const eraser = extendScratchStroke(startScratchStroke("eraser", { x: 40, y: 40 }), { x: 70, y: 40 });
    const encoded = serializeScratchPad([pen, eraser]);
    expect(scratchPadHasInk(encoded)).toBe(true);
    expect(parseScratchPad(encoded)).toEqual([pen, eraser]);
    expect(serializeScratchPad([])).toBe("");
    expect(parseScratchPad("")).toEqual([]);
    expect(parseScratchPad("not json")).toEqual([]);
  });

  it("skips points that barely move", () => {
    const started = startScratchStroke("pen", { x: 100, y: 100 });
    const skipped = extendScratchStroke(started, { x: 103, y: 101 });
    expect(skipped.points).toHaveLength(1);
    const kept = extendScratchStroke(started, { x: 130, y: 140 });
    expect(kept.points).toEqual([
      { x: 100, y: 100 },
      { x: 130, y: 140 },
    ]);
  });

  it("drops the oldest strokes once the pad is too long", () => {
    const strokes: ScratchStroke[] = Array.from({ length: 90 }, (_, index) =>
      startScratchStroke("pen", { x: index, y: index }),
    );
    const trimmed = trimScratchStrokes(strokes);
    expect(trimmed.length).toBeLessThanOrEqual(80);
    expect(trimmed[trimmed.length - 1]?.points[0]?.x).toBe(89);
  });
});
