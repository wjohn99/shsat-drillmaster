import { CountUp } from "@/components/home/CountUp";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

type AnimatedStatProps = {
  value: number;
  suffix?: string;
  label: string;
  delayIndex?: number;
};

export function AnimatedStat({
  value,
  suffix = "",
  label,
  delayIndex = 0,
}: AnimatedStatProps) {
  const { ref, visible, className } = useScrollReveal({
    delayIndex,
    variant: "scale",
  });

  return (
    <div ref={ref} className={cn(className, "text-center")}>
      <div className="mb-2 text-4xl font-bold text-brand-cream md:text-5xl">
        <CountUp end={value} suffix={suffix} active={visible} />
      </div>
      <div className="text-sm text-white/75 md:text-base">{label}</div>
    </div>
  );
}
