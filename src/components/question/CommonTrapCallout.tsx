import { AlertTriangle } from "lucide-react";

type CommonTrapCalloutProps = {
  commonTrap: string;
};

export function CommonTrapCallout({ commonTrap }: CommonTrapCalloutProps) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        Common trap
      </div>
      <p className="text-sm leading-relaxed text-amber-950/90 dark:text-amber-100/90">{commonTrap}</p>
    </div>
  );
}
