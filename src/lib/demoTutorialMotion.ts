export const TOUR_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const TOUR_MOVE_MS = 520;
export const TOUR_NAV_MS = 860;
export const TOUR_NAV_CLICK_MS = 360;
export const TOUR_CLICK_MS = 140;
export const TOUR_ANCHOR_EPSILON = 2.5;

export type TourAnchor = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function sameTourAnchor(
  a: TourAnchor | null | undefined,
  b: TourAnchor | null | undefined,
  epsilon = TOUR_ANCHOR_EPSILON,
): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < epsilon &&
    Math.abs(a.left - b.left) < epsilon &&
    Math.abs(a.width - b.width) < epsilon &&
    Math.abs(a.height - b.height) < epsilon
  );
}

export const TOUR_HOLE_RADIUS = 16;
export const TOUR_POINTER_TAU = 150;

export function pointerPointFromAnchor(anchor: TourAnchor): { x: number; y: number } {
  return {
    x: anchor.left + Math.min(36, anchor.width * 0.72),
    y: anchor.top + Math.min(28, anchor.height * 0.55),
  };
}

export function tourHoleRadius(anchor: TourAnchor, radius = TOUR_HOLE_RADIUS): number {
  const cap = Math.min(anchor.width, anchor.height) / 2;
  if (anchor.height <= 72) return cap;
  return Math.max(0, Math.min(radius, cap));
}

export type PointerPose = { x: number; y: number };

/** Move part of the way from `current` to `target`. `dt` is the frame delta in ms. */
export function approachPoint(
  current: PointerPose,
  target: PointerPose,
  dt: number,
  timeConstant = TOUR_POINTER_TAU,
): PointerPose {
  const t = 1 - Math.exp(-Math.max(0, dt) / Math.max(1, timeConstant));
  return {
    x: current.x + (target.x - current.x) * t,
    y: current.y + (target.y - current.y) * t,
  };
}

/**
 * Glide toward a new step target. When the page scroll is what moved the hole,
 * shift the cursor with that scroll first so the glide does not fight the page.
 */
export function movePointer(opts: {
  pos: PointerPose | null;
  target: PointerPose;
  previousTarget: PointerPose | null;
  scroll: PointerPose;
  dt: number;
  reduced?: boolean;
}): PointerPose {
  const { pos, target, previousTarget, scroll, dt, reduced } = opts;
  if (!pos || reduced || !previousTarget) return target;
  const targetDx = target.x - previousTarget.x;
  const targetDy = target.y - previousTarget.y;
  const scrollExplains = Math.hypot(targetDx + scroll.x, targetDy + scroll.y) < 8;
  const base = scrollExplains ? { x: pos.x + targetDx, y: pos.y + targetDy } : pos;
  const dist = Math.hypot(target.x - base.x, target.y - base.y);
  return approachPoint(base, target, dt, dist < 24 ? 30 : TOUR_POINTER_TAU);
}

export type TourCardPlacement = {
  top: number;
  left: number;
  arrow: "up" | "down" | null;
  arrowLeft: number;
};

function rangesOverlap(a0: number, a1: number, b0: number, b1: number, pad: number): boolean {
  return a0 < b1 + pad && a1 + pad > b0;
}

function cardHitsAnchor(
  anchor: TourAnchor,
  card: { top: number; left: number; width: number; height: number },
  pad = 12,
): boolean {
  return (
    rangesOverlap(anchor.left, anchor.left + anchor.width, card.left, card.left + card.width, pad) &&
    rangesOverlap(anchor.top, anchor.top + anchor.height, card.top, card.top + card.height, pad)
  );
}

/**
 * Keep the dialogue attached to the hole.
 * A header button gets the card directly underneath. A tall column that
 * fills the screen gets the card beside it.
 */
export function placeTourCard(
  anchor: TourAnchor,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  insets: { top: number; bottom: number },
): TourCardPlacement {
  const gap = 16;
  const margin = 16;
  const safeBottom = viewport.height - insets.bottom;
  const maxLeft = viewport.width - margin - card.width;
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), Math.max(min, max));
  const centeredLeft = clamp(anchor.left + anchor.width / 2 - card.width / 2, margin, maxLeft);
  const besideTop = clamp(anchor.top, margin, safeBottom - card.height);

  const candidates: Array<{ top: number; left: number; arrow: "up" | "down" | null }> = [
    {
      left: centeredLeft,
      top: anchor.top + anchor.height + gap,
      arrow: "up",
    },
    {
      left: centeredLeft,
      top: anchor.top - gap - card.height,
      arrow: "down",
    },
    {
      left: anchor.left + anchor.width + gap,
      top: besideTop,
      arrow: null,
    },
    {
      left: anchor.left - gap - card.width,
      top: besideTop,
      arrow: null,
    },
  ];

  const fits = (candidate: { top: number; left: number }) => {
    const box = { ...candidate, width: card.width, height: card.height };
    return (
      box.left >= margin - 1 &&
      box.left + box.width <= viewport.width - margin + 1 &&
      box.top >= margin - 1 &&
      box.top + box.height <= safeBottom + 1 &&
      !cardHitsAnchor(anchor, box)
    );
  };

  const chosen = candidates.find(fits) ?? {
    left: clamp(anchor.left + anchor.width + gap, margin, maxLeft),
    top: clamp(besideTop, margin, safeBottom - card.height),
    arrow: null as "up" | "down" | null,
  };
  const arrowLeft = Math.min(
    card.width - 28,
    Math.max(20, anchor.left + anchor.width / 2 - chosen.left - 7),
  );
  return { top: chosen.top, left: chosen.left, arrow: chosen.arrow, arrowLeft };
}

export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

/** Move `current` toward `target`. `t` is 0 at current and 1 at the target. */
export function approachTourAnchor(current: TourAnchor, target: TourAnchor, t: number): TourAnchor {
  const k = Math.min(1, Math.max(0, t));
  return {
    top: current.top + (target.top - current.top) * k,
    left: current.left + (target.left - current.left) * k,
    width: current.width + (target.width - current.width) * k,
    height: current.height + (target.height - current.height) * k,
  };
}

/** Where `measured` will sit in the viewport after scrolling by `scrollBy`. */
export function restingTourAnchor(measured: TourAnchor, scrollBy: { x: number; y: number }): TourAnchor {
  return {
    top: measured.top - scrollBy.y,
    left: measured.left - scrollBy.x,
    width: measured.width,
    height: measured.height,
  };
}

export function tourMoveDuration(distance: number): number {
  return Math.min(880, Math.max(560, distance * 0.55));
}

/**
 * One eased move from the hole the tutor is looking at to where the next
 * target will rest after the page scroll. Null when the hole can stay put.
 */
export function planTourMove(opts: {
  from: TourAnchor | null;
  measured: TourAnchor;
  scrollBy: { x: number; y: number };
  reduced?: boolean;
}): { from: TourAnchor; to: TourAnchor; duration: number } | null {
  const to = restingTourAnchor(opts.measured, opts.scrollBy);
  if (!opts.from || opts.reduced) return null;
  const travel = Math.hypot(
    to.left - opts.from.left,
    to.top - opts.from.top,
    (to.width - opts.from.width) * 0.5,
    (to.height - opts.from.height) * 0.5,
  );
  const scrollDist = Math.hypot(opts.scrollBy.x, opts.scrollBy.y);
  if (travel < 2 && scrollDist < 2) return null;
  return { from: opts.from, to, duration: tourMoveDuration(Math.max(travel, scrollDist)) };
}

/**
 * Follow the live rect. Glue only when there is no previous hole or motion
 * should be instant. A step change glides, including while the page scrolls.
 */
export function followTourAnchor(
  current: TourAnchor | null,
  measured: TourAnchor,
  opts: { glue: boolean; dt: number; timeConstant?: number },
): TourAnchor {
  if (opts.glue || !current) return measured;
  const tau = opts.timeConstant ?? 170;
  const t = 1 - Math.exp(-Math.max(0, opts.dt) / tau);
  return approachTourAnchor(current, measured, t);
}

export function tourMotionMs(reduced: boolean, ms: number): number {
  return reduced ? 0 : ms;
}

export function tourTransition(
  reduced: boolean,
  instant: boolean,
  properties: string[],
  ms = TOUR_MOVE_MS,
): string {
  if (reduced || instant) return "none";
  return properties.map((property) => `${property} ${ms}ms ${TOUR_EASE}`).join(", ");
}
