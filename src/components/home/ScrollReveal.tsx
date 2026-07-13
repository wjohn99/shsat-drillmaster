import type { ElementType, ReactNode } from "react";

import {
  useScrollReveal,
  type ScrollRevealVariant,
} from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

type ScrollRevealProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delayIndex?: number;
  variant?: ScrollRevealVariant;
  threshold?: number;
};

export function ScrollReveal({
  as: Component = "div",
  children,
  className,
  delayIndex = 0,
  variant = "up",
  threshold,
}: ScrollRevealProps) {
  const { ref, visible, className: revealClass } = useScrollReveal<HTMLDivElement>({
    delayIndex,
    variant,
    threshold,
  });

  return (
    <Component ref={ref} className={cn(revealClass, className)} data-visible={visible || undefined}>
      {children}
    </Component>
  );
}
