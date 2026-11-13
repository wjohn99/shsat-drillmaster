import { cn } from "@/lib/utils";

/** 3px subject marker. Sits on the left edge of a relative parent. */
export function SubjectStripe({ subject }: { subject: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 left-0 w-[3px]",
        subject === "MATH" ? "bg-math" : "bg-ela",
      )}
    />
  );
}
