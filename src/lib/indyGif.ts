import type { GifSpec } from "@/types";

export function snapToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function serializeGifPlot(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseGifPlot(raw: string | undefined): { x: number; y: number } | null {
  if (raw == null || raw === "") return null;
  const parts = raw.split(",").map((p) => Number.parseFloat(p.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  return { x: parts[0], y: parts[1] };
}

export function isGifAnswerCorrect(spec: GifSpec, answer: string): boolean {
  if (spec.mode !== "plotPoint") return false;
  const pt = parseGifPlot(answer);
  if (!pt) return false;
  const d = Math.hypot(pt.x - spec.correctX, pt.y - spec.correctY);
  return d <= spec.tolerance;
}
