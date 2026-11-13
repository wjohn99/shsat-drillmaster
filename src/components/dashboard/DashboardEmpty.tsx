import type { LucideIcon } from "lucide-react";

export function DashboardEmpty({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-cream text-brand-navy">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
