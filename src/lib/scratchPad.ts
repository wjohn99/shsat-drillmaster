export const SCRATCH_SPACE = 1000;
export const PEN_SIZE = 2.5;
export const ERASER_SIZE = 18;
const MAX_STROKES = 80;
const MAX_POINTS = 1600;
const MAX_SERIALIZED = 60_000;
const MIN_STEP = 6;

export type ScratchTool = "pen" | "eraser";

export type ScratchPoint = { x: number; y: number };

export type ScratchStroke = {
  tool: ScratchTool;
  size: number;
  points: ScratchPoint[];
};

type StoredStroke = {
  t?: unknown;
  z?: unknown;
  p?: unknown;
};

function clampCoord(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(SCRATCH_SPACE, Math.round(value)));
}

export function clampScratchPoint(point: ScratchPoint): ScratchPoint {
  return { x: clampCoord(point.x), y: clampCoord(point.y) };
}

export function startScratchStroke(tool: ScratchTool, point: ScratchPoint): ScratchStroke {
  return {
    tool,
    size: tool === "eraser" ? ERASER_SIZE : PEN_SIZE,
    points: [clampScratchPoint(point)],
  };
}

export function extendScratchStroke(stroke: ScratchStroke, point: ScratchPoint): ScratchStroke {
  const next = clampScratchPoint(point);
  const last = stroke.points[stroke.points.length - 1];
  if (last && Math.hypot(next.x - last.x, next.y - last.y) < MIN_STEP) return stroke;
  return { ...stroke, points: [...stroke.points, next] };
}

function pointCount(strokes: ScratchStroke[]): number {
  return strokes.reduce((total, stroke) => total + stroke.points.length, 0);
}

export function trimScratchStrokes(strokes: ScratchStroke[]): ScratchStroke[] {
  const next = strokes.slice(-MAX_STROKES);
  while (next.length > 1 && pointCount(next) > MAX_POINTS) next.shift();
  return next;
}

export function serializeScratchPad(strokes: ScratchStroke[]): string {
  const trimmed = trimScratchStrokes(strokes).filter((stroke) => stroke.points.length > 0);
  if (trimmed.length === 0) return "";
  let payload = trimmed;
  let encoded = encode(payload);
  while (payload.length > 1 && encoded.length > MAX_SERIALIZED) {
    payload = payload.slice(1);
    encoded = encode(payload);
  }
  return encoded.length > MAX_SERIALIZED ? "" : encoded;
}

function encode(strokes: ScratchStroke[]): string {
  return JSON.stringify(
    strokes.map((stroke) => ({
      t: stroke.tool === "eraser" ? "e" : "p",
      z: stroke.size,
      p: stroke.points.flatMap((point) => [point.x, point.y]),
    })),
  );
}

function pointsFromFlat(raw: unknown): ScratchPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: ScratchPoint[] = [];
  for (let index = 0; index + 1 < raw.length; index += 2) {
    const x = Number(raw[index]);
    const y = Number(raw[index + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    points.push(clampScratchPoint({ x, y }));
  }
  return points;
}

export function parseScratchPad(raw: string): ScratchStroke[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const strokes: ScratchStroke[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const stored = item as StoredStroke;
      const points = pointsFromFlat(stored.p);
      if (points.length === 0) continue;
      const tool: ScratchTool = stored.t === "e" ? "eraser" : "pen";
      const size = Number(stored.z);
      strokes.push({
        tool,
        size: Number.isFinite(size) && size > 0 ? size : tool === "eraser" ? ERASER_SIZE : PEN_SIZE,
        points,
      });
    }
    return trimScratchStrokes(strokes);
  } catch {
    return [];
  }
}

export function scratchPadHasInk(raw: string): boolean {
  return parseScratchPad(raw).length > 0;
}
