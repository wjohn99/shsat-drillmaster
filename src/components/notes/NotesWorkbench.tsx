import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type Ref } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  extendScratchStroke,
  parseScratchPad,
  serializeScratchPad,
  startScratchStroke,
  trimScratchStrokes,
  type ScratchStroke,
  type ScratchTool,
} from "@/lib/scratchPad";

type NotesWorkbenchProps = {
  text: string;
  onTextChange: (value: string) => void;
  scratchPad: string;
  onScratchPadChange: (value: string) => void;
  textPlaceholder: string;
  textAriaLabel: string;
  textRef?: Ref<HTMLTextAreaElement>;
  compact?: boolean;
};

export function NotesWorkbench({
  text,
  onTextChange,
  scratchPad,
  onScratchPadChange,
  textPlaceholder,
  textAriaLabel,
  textRef,
  compact = false,
}: NotesWorkbenchProps) {
  const [surface, setSurface] = useState<"type" | "draw">("type");
  return (
    <div className="space-y-2">
      {compact ? (
        <div className="flex gap-1 md:hidden">
          <Button
            type="button"
            size="sm"
            variant={surface === "type" ? "default" : "outline"}
            className="h-7 rounded-lg px-2 text-xs"
            aria-pressed={surface === "type"}
            onClick={() => setSurface("type")}
          >
            Type
          </Button>
          <Button
            type="button"
            size="sm"
            variant={surface === "draw" ? "default" : "outline"}
            className="h-7 rounded-lg px-2 text-xs"
            aria-pressed={surface === "draw"}
            onClick={() => setSurface("draw")}
          >
            Scratch pad
          </Button>
        </div>
      ) : null}
    <div className={cn("grid gap-3", compact ? "md:grid-cols-2" : "sm:grid-cols-2")}>
      <div className={cn("flex min-h-36 flex-col gap-1.5", compact && surface !== "type" && "hidden md:flex")}>
        <p className="flex h-7 items-center text-sm font-medium">Type</p>
        <Textarea
          ref={textRef}
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder={textPlaceholder}
          aria-label={textAriaLabel}
          className={cn("min-h-36 flex-1 resize-none text-sm", compact ? "h-36" : "h-56")}
        />
      </div>
      <ScratchPad
        value={scratchPad}
        onChange={onScratchPadChange}
        className={compact ? "h-36" : "h-56"}
        rootClassName={compact && surface !== "draw" ? "hidden md:flex" : undefined}
      />
    </div>
    </div>
  );
}

function ScratchPad({
  value,
  onChange,
  className,
  rootClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  rootClassName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<ScratchStroke[]>(parseScratchPad(value));
  const drawingRef = useRef<ScratchStroke | null>(null);
  const undoRef = useRef<ScratchStroke[][]>([]);
  const lastSentRef = useRef(value);
  const toolRef = useRef<ScratchTool>("pen");
  const [tool, setTool] = useState<ScratchTool>("pen");
  const [drawing, setDrawing] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [hasInk, setHasInk] = useState(() => parseScratchPad(value).length > 0);
  const paintRef = useRef<() => void>(() => {});

  toolRef.current = tool;

  const paint = () => {
    const canvas = canvasRef.current;
    if (!canvas || import.meta.env.MODE === "test") return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      return;
    }
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const bitmapWidth = Math.round(width * ratio);
    const bitmapHeight = Math.round(height * ratio);
    if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
      canvas.width = bitmapWidth;
      canvas.height = bitmapHeight;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const ink = getComputedStyle(canvas).color || "#1e293b";
    const strokes = drawingRef.current
      ? [...strokesRef.current, drawingRef.current]
      : strokesRef.current;
    for (const stroke of strokes) drawStroke(ctx, stroke, width, height, ink);
  };
  paintRef.current = paint;

  useEffect(() => {
    paintRef.current();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => paintRef.current());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    paintRef.current();
  }, [rootClassName]);

  useEffect(() => {
    if (drawingRef.current) return;
    if (value === lastSentRef.current) return;
    const parsed = parseScratchPad(value);
    strokesRef.current = parsed;
    undoRef.current = [];
    lastSentRef.current = value;
    setUndoCount(0);
    setHasInk(parsed.length > 0);
    paintRef.current();
  }, [value]);

  const commit = (strokes: ScratchStroke[]) => {
    drawingRef.current = null;
    setDrawing(false);
    const next = trimScratchStrokes(strokes);
    undoRef.current.push(strokesRef.current);
    if (undoRef.current.length > 30) undoRef.current.shift();
    strokesRef.current = next;
    const serialized = serializeScratchPad(next);
    lastSentRef.current = serialized;
    setUndoCount(undoRef.current.length);
    setHasInk(next.length > 0);
    onChange(serialized);
    paint();
  };

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1000,
      y: ((event.clientY - rect.top) / rect.height) * 1000,
    };
  };

  return (
    <div className={cn("flex min-h-36 flex-col gap-1.5", rootClassName)}>
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="text-sm font-medium">Scratch pad</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={tool === "pen" ? "default" : "outline"}
            className="h-7 rounded-lg px-2 text-xs"
            aria-pressed={tool === "pen"}
            onClick={() => setTool("pen")}
          >
            Pen
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tool === "eraser" ? "default" : "outline"}
            className="h-7 rounded-lg px-2 text-xs"
            aria-pressed={tool === "eraser"}
            onClick={() => setTool("eraser")}
          >
            Eraser
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-lg px-2 text-xs"
            disabled={undoCount === 0}
            onClick={() => {
              const previous = undoRef.current.pop();
              if (!previous) return;
              strokesRef.current = previous;
              const serialized = serializeScratchPad(previous);
              lastSentRef.current = serialized;
              setUndoCount(undoRef.current.length);
              setHasInk(previous.length > 0);
              onChange(serialized);
              paint();
            }}
          >
            Undo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-lg px-2 text-xs"
            disabled={!hasInk}
            onClick={() => commit([])}
          >
            Clear
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "relative min-h-36 flex-1 overflow-hidden rounded-md border bg-background",
          className,
        )}
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--border)) 0.8px, transparent 0.9px)",
          backgroundSize: "18px 18px",
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label="Scratch pad"
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none text-foreground"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            const point = pointFromEvent(event);
            if (!point) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            drawingRef.current = startScratchStroke(toolRef.current, point);
            setDrawing(true);
            setHasInk(true);
            paint();
          }}
          onPointerMove={(event) => {
            if (!drawingRef.current) return;
            const point = pointFromEvent(event);
            if (!point) return;
            drawingRef.current = extendScratchStroke(drawingRef.current, point);
            paint();
          }}
          onPointerUp={(event) => {
            const stroke = drawingRef.current;
            drawingRef.current = null;
            setDrawing(false);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            if (!stroke || stroke.points.length === 0) return;
            commit([...strokesRef.current, stroke]);
          }}
          onPointerCancel={() => {
            drawingRef.current = null;
            setDrawing(false);
            paint();
          }}
        />
        {!hasInk ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Draw to work out the math
          </p>
        ) : null}
      </div>
    </div>
  );
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: ScratchStroke,
  width: number,
  height: number,
  ink: string,
) {
  const points = stroke.points.map((point) => ({
    x: (point.x / 1000) * width,
    y: (point.y / 1000) * height,
  }));
  if (points.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = stroke.size;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) {
    ctx.arc(points[0].x, points[0].y, Math.max(0.8, stroke.size / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  for (let index = 1; index < points.length - 1; index += 1) {
    const midX = (points[index].x + points[index + 1].x) / 2;
    const midY = (points[index].y + points[index + 1].y) / 2;
    ctx.quadraticCurveTo(points[index].x, points[index].y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}
