import { describe, expect, it } from "vitest";
import {
  approachTourAnchor,
  easeOutCubic,
  followTourAnchor,
  movePointer,
  placeTourCard,
  planTourMove,
  pointerPointFromAnchor,
  restingTourAnchor,
  sameTourAnchor,
  tourHoleRadius,
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

  it("glides toward a target on the same page and snaps when the page changed", () => {
    const from = { top: 40, left: 20, width: 100, height: 40 };
    const to = { top: 240, left: 20, width: 100, height: 80 };
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    const mid = approachTourAnchor(from, to, 0.5);
    expect(mid.top).toBe(140);
    expect(mid.height).toBe(60);
    expect(followTourAnchor(from, to, { glue: true, dt: 16 }).top).toBe(to.top);
    const glided = followTourAnchor(from, to, { glue: false, dt: 16 });
    expect(glided.top).toBeGreaterThan(from.top);
    expect(glided.top).toBeLessThan(to.top);
  });

  it("rounds the spotlight hole without collapsing a short target", () => {
    expect(tourHoleRadius({ top: 0, left: 0, width: 320, height: 640 })).toBe(16);
    expect(tourHoleRadius({ top: 0, left: 0, width: 20, height: 40 })).toBe(10);
    expect(tourHoleRadius({ top: 0, left: 0, width: 148, height: 44 })).toBe(22);
  });

  it("glides the cursor toward the next step instead of jumping there", () => {
    const started = movePointer({
      pos: { x: 40, y: 80 },
      target: { x: 640, y: 220 },
      previousTarget: { x: 40, y: 80 },
      scroll: { x: 0, y: 0 },
      dt: 16,
    });
    expect(started.x).toBeGreaterThan(40);
    expect(started.x).toBeLessThan(160);
    expect(started.y).toBeGreaterThan(80);
    expect(started.y).toBeLessThan(140);

    const locked = movePointer({
      pos: { x: 100, y: 200 },
      target: { x: 100, y: 170 },
      previousTarget: { x: 100, y: 200 },
      scroll: { x: 0, y: 30 },
      dt: 16,
    });
    expect(locked.y).toBeGreaterThan(165);
    expect(locked.y).toBeLessThan(175);
  });

  it("keeps the dialogue off a tall filter column", () => {
    const anchor = { top: 92, left: 8, width: 336, height: 700 };
    const card = { width: 360, height: 210 };
    const place = placeTourCard(anchor, card, { width: 1280, height: 860 }, { top: 108, bottom: 96 });
    expect(place.left).toBeGreaterThanOrEqual(anchor.left + anchor.width + 12);
    expect(place.top).toBe(anchor.top);
    expect(place.top + card.height).toBeLessThanOrEqual(860 - 96 + 1);
    const overlaps =
      place.left < anchor.left + anchor.width + 12 &&
      place.left + card.width + 12 > anchor.left &&
      place.top < anchor.top + anchor.height + 12 &&
      place.top + card.height + 12 > anchor.top;
    expect(overlaps).toBe(false);
  });

  it("glides the next section into place instead of jumping to it", () => {
    const from = { top: 180, left: 80, width: 420, height: 160 };
    const measured = { top: 980, left: 80, width: 420, height: 140 };
    expect(restingTourAnchor(measured, { x: 0, y: 760 }).top).toBe(220);
    const plan = planTourMove({ from, measured, scrollBy: { x: 0, y: 760 } });
    expect(plan).not.toBeNull();
    expect(plan?.from).toEqual(from);
    expect(plan?.to.top).toBe(220);
    expect(plan!.duration).toBeGreaterThanOrEqual(420);
    expect(planTourMove({ from, measured: from, scrollBy: { x: 0, y: 0 } })).toBeNull();
    expect(planTourMove({ from: null, measured, scrollBy: { x: 0, y: 400 } })).toBeNull();
  });

  it("places the dialogue under a header button", () => {
    const anchor = { top: 18, left: 420, width: 140, height: 36 };
    const card = { width: 360, height: 180 };
    const place = placeTourCard(anchor, card, { width: 1280, height: 860 }, { top: 120, bottom: 96 });
    expect(place.arrow).toBe("up");
    expect(place.top).toBe(anchor.top + anchor.height + 16);
    expect(place.left).toBeLessThan(anchor.left + anchor.width);
    expect(place.left + card.width).toBeGreaterThan(anchor.left);
  });

  it("places the dialogue below a wide highlight when the sides are tight", () => {
    const anchor = { top: 160, left: 40, width: 900, height: 80 };
    const place = placeTourCard(
      anchor,
      { width: 360, height: 180 },
      { width: 1000, height: 800 },
      { top: 80, bottom: 80 },
    );
    expect(place.top).toBeGreaterThanOrEqual(anchor.top + anchor.height);
    expect(place.arrow).toBe("up");
  });
});
