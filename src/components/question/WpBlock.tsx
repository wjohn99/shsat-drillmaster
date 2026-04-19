import type { WpSpec } from "@/types";
import { cn } from "@/lib/utils";

const DEFAULT_HINT = "Read the scenario carefully, then select the best answer.";

type WpBlockProps = {
  spec: WpSpec;
  className?: string;
};

export function WpBlock({ spec, className }: WpBlockProps) {
  const text = spec.instruction?.trim() || DEFAULT_HINT;

  return (
    <div
      className={cn(
        "rounded-md border border-foreground/15 bg-muted/30 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground",
        className
      )}
    >
      {text}
    </div>
  );
}
