import { describe, expect, it } from "vitest";
import {
  pointerPointFromAnchor,
  sameTourAnchor,
  TOUR_MOVE_MS,
  tourMotionMs,
  tourTransition,
} from "@/lib/demoTutorialMotion";

describe("demo tutorial motion", () => {
  it("treats tiny highlight jitter as the same window", () => {
    const a = { top: 120, left: 40, width: 200, height: 48 };
    expect(sameTourAnchor(a, { ...a, top: 121, left: 41 })).toBe(true);
    expect(sameTourAnchor(a, { ...a, top: 180 })).toBe(false);
    expect(sameTourAnchor(null, a)).toBe(false);
  });

  it("keeps pointer motion and highlight motion on the same curve", () => {
    expect(tourMotionMs(true, TOUR_MOVE_MS)).toBe(0);
    expect(tourMotionMs(false, TOUR_MOVE_MS)).toBe(TOUR_MOVE_MS);
    expect(tourTransition(false, false, ["transform"])).toContain(`${TOUR_MOVE_MS}ms`);
    expect(tourTransition(false, true, ["transform"])).toBe("none");
    expect(pointerPointFromAnchor({ top: 10, left: 20, width: 100, height: 40 })).toEqual({
      x: 20 + 36,
      y: 10 + 22,
    });
  });
});
