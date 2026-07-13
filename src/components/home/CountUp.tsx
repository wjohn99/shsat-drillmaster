import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type CountUpProps = {
  end: number;
  suffix?: string;
  active: boolean;
  duration?: number;
  className?: string;
};

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

export function CountUp({
  end,
  suffix = "",
  active,
  duration = 1400,
  className,
}: CountUpProps) {
  const [value, setValue] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!active || hasRun.current) return;
    hasRun.current = true;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(end);
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      setValue(Math.round(easeOutCubic(progress) * end));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [active, duration, end]);

  return (
    <span className={cn("tabular-nums", className)}>
      {value}
      {suffix}
    </span>
  );
}
