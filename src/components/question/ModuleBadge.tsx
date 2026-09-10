import type { QuestionModule } from "@/types";
import { moduleBadgeColor, moduleLabel } from "@/lib/questionModule";
import { cn } from "@/lib/utils";

type ModuleBadgeProps = {
  module: QuestionModule;
  className?: string;
};

export function ModuleBadge({ module, className }: ModuleBadgeProps) {
  return (
    <div
      className={cn(
        "flex h-6 items-center justify-center rounded-full px-2 text-xs font-bold text-white",
        className,
      )}
      style={{ backgroundColor: moduleBadgeColor(module) }}
      title={moduleLabel(module)}
    >
      {moduleLabel(module)}
    </div>
  );
}
