import { useCallback, useRef } from "react";
import type { GifPlotPointSpec } from "@/types";
import { cn } from "@/lib/utils";
import { snapToStep } from "@/lib/indyGif";

const VB = 420;
const PAD = 44;
const PLOT = VB - 2 * PAD;

function formatCoord(n: number): string {
  const t = n.toFixed(4).replace(/\.?0+$/, "");
  return t === "-0" ? "0" : t;
}

type GraphFigureBlockProps = {
  spec: GifPlotPointSpec;
  /** Serialized as `x,y` or null when unset */
  value: string | null;
  onChange: (serialized: string) => void;
  disabled?: boolean;
  showSolution?: boolean;
};

export function GraphFigureBlock({
  spec,
  value,
  onChange,
  disabled = false,
  showSolution = false,
}: GraphFigureBlockProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { xMin, xMax, yMin, yMax, correctX, correctY, showGrid, gridStep } = spec;

  const toSvg = useCallback(
    (x: number, y: number) => {
      const sx = PAD + ((x - xMin) / (xMax - xMin)) * PLOT;
      const sy = PAD + PLOT - ((y - yMin) / (yMax - yMin)) * PLOT;
      return { sx, sy };
    },
    [xMin, xMax, yMin, yMax]
  );

  const clientToMath = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const cur = pt.matrixTransform(ctm.inverse());
      const svgX = cur.x;
      const svgY = cur.y;
      if (
        svgX < PAD ||
        svgX > PAD + PLOT ||
        svgY < PAD ||
        svgY > PAD + PLOT
      ) {
        return null;
      }
      const x = xMin + ((svgX - PAD) / PLOT) * (xMax - xMin);
      const y = yMax - ((svgY - PAD) / PLOT) * (yMax - yMin);
      return { x, y };
    },
    [xMin, xMax, yMin, yMax]
  );

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;
    const m = clientToMath(e.clientX, e.clientY);
    if (!m) return;
    let { x, y } = m;
    if (spec.snapToGrid != null && spec.snapToGrid > 0) {
      x = snapToStep(x, spec.snapToGrid);
      y = snapToStep(y, spec.snapToGrid);
    }
    onChange(`${x},${y}`);
  };

  const userPt =
    value != null && value !== ""
      ? (() => {
          const parts = value.split(",").map((p) => Number.parseFloat(p.trim()));
          if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
          return { x: parts[0], y: parts[1] };
        })()
      : null;

  const correctSvg = toSvg(correctX, correctY);
  const userSvg = userPt ? toSvg(userPt.x, userPt.y) : null;
  const userWithinTolerance =
    userPt != null &&
    Math.hypot(userPt.x - correctX, userPt.y - correctY) <= spec.tolerance;

  const step =
    gridStep ??
    (() => {
      const xr = xMax - xMin;
      const yr = yMax - yMin;
      const s = Math.max(xr, yr) / 8;
      if (!Number.isFinite(s) || s <= 0) return 1;
      const p = Math.pow(10, Math.floor(Math.log10(s)));
      return Math.max(p, 0.25);
    })();

  const gridLinesX: number[] = [];
  const gridLinesY: number[] = [];
  if (showGrid) {
    for (let g = Math.ceil(xMin / step) * step; g <= xMax + 1e-9; g += step) {
      if (g >= xMin - 1e-9) gridLinesX.push(g);
    }
    for (let g = Math.ceil(yMin / step) * step; g <= yMax + 1e-9; g += step) {
      if (g >= yMin - 1e-9) gridLinesY.push(g);
    }
  }

  const axisX0 = yMin <= 0 && yMax >= 0 ? toSvg(xMin, 0).sy : null;
  const axisY0 = xMin <= 0 && xMax >= 0 ? toSvg(0, yMin).sx : null;

  return (
    <div className="space-y-3">
      {spec.instruction ? (
        <p className="text-sm text-muted-foreground">{spec.instruction}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Click the coordinate plane to plot your answer.
        </p>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB} ${VB}`}
        className={cn(
          "h-auto max-h-[min(480px,75vh)] w-full max-w-lg cursor-crosshair rounded-md border border-border bg-background",
          disabled && "cursor-default opacity-90"
        )}
        onClick={handleClick}
        role="img"
        aria-label="Interactive coordinate plane; click to plot a point"
      >
        <rect
          x={PAD}
          y={PAD}
          width={PLOT}
          height={PLOT}
          fill="hsl(var(--muted) / 0.35)"
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />

        {showGrid &&
          gridLinesX.map((gx) => {
            const { sx } = toSvg(gx, yMin);
            return (
              <line
                key={`gx-${gx}`}
                x1={sx}
                x2={sx}
                y1={PAD}
                y2={PAD + PLOT}
                stroke="hsl(var(--foreground) / 0.08)"
                strokeWidth={1}
              />
            );
          })}
        {showGrid &&
          gridLinesY.map((gy) => {
            const { sy } = toSvg(xMin, gy);
            return (
              <line
                key={`gy-${gy}`}
                x1={PAD}
                x2={PAD + PLOT}
                y1={sy}
                y2={sy}
                stroke="hsl(var(--foreground) / 0.08)"
                strokeWidth={1}
              />
            );
          })}

        {axisX0 != null && (
          <line
            x1={PAD}
            x2={PAD + PLOT}
            y1={axisX0}
            y2={axisX0}
            stroke="hsl(var(--foreground) / 0.35)"
            strokeWidth={1.5}
          />
        )}
        {axisY0 != null && (
          <line
            x1={axisY0}
            x2={axisY0}
            y1={PAD}
            y2={PAD + PLOT}
            stroke="hsl(var(--foreground) / 0.35)"
            strokeWidth={1.5}
          />
        )}

        <text x={PAD + PLOT / 2} y={VB - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
          x
        </text>
        <text
          x={12}
          y={PAD + PLOT / 2}
          textAnchor="middle"
          className="fill-muted-foreground text-[11px]"
          transform={`rotate(-90, 12, ${PAD + PLOT / 2})`}
        >
          y
        </text>

        {showSolution && (
          <g>
            <circle
              cx={correctSvg.sx}
              cy={correctSvg.sy}
              r={9}
              fill="none"
              stroke="hsl(var(--success))"
              strokeWidth={2.5}
            />
            <circle
              cx={correctSvg.sx}
              cy={correctSvg.sy}
              r={3}
              fill="hsl(var(--success))"
            />
          </g>
        )}

        {userSvg && (
          <circle
            cx={userSvg.sx}
            cy={userSvg.sy}
            r={7}
            fill={
              showSolution
                ? userWithinTolerance
                  ? "hsl(var(--success) / 0.45)"
                  : "hsl(var(--destructive) / 0.35)"
                : "hsl(var(--primary) / 0.9)"
            }
            stroke={
              showSolution
                ? userWithinTolerance
                  ? "hsl(var(--success))"
                  : "hsl(var(--destructive))"
                : "hsl(var(--primary))"
            }
            strokeWidth={2}
          />
        )}
      </svg>
      {userPt ? (
        <p className="text-xs text-muted-foreground">
          Plotted: ({formatCoord(userPt.x)}, {formatCoord(userPt.y)})
        </p>
      ) : null}
    </div>
  );
}
