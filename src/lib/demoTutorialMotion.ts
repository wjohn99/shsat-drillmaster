export const TOUR_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const TOUR_MOVE_MS = 520;
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

export function pointerPointFromAnchor(anchor: TourAnchor): { x: number; y: number } {
  return {
    x: anchor.left + Math.min(36, anchor.width * 0.72),
    y: anchor.top + Math.min(28, anchor.height * 0.55),
  };
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
