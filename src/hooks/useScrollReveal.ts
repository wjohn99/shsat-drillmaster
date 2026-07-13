import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type ScrollRevealVariant =
  | "up"
  | "down"
  | "left"
  | "right"
  | "scale"
  | "clip"
  | "blur";

type ScrollRevealOptions = {
  delayIndex?: number;
  threshold?: number;
  variant?: ScrollRevealVariant;
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
) {
  const { delayIndex = 0, threshold = 0.12, variant = "up" } = options;
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  const delayClass =
    delayIndex > 0 ? `scroll-reveal-delay-${Math.min(delayIndex, 8)}` : undefined;

  return {
    ref,
    visible,
    className: cn(
      "scroll-reveal",
      `scroll-reveal--${variant}`,
      visible && "scroll-reveal-visible",
      delayClass,
    ),
  };
}

/**
 * Sets --hero-scroll (0→1) on the hero section for parallax + fade on scroll.
 * Disabled on mobile and when reduced motion is preferred.
 */
export function useHeroParallax<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const node = ref.current;
    if (!node) return;

    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / (rect.height * 0.85)));
      node.style.setProperty("--hero-scroll", progress.toFixed(4));
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    const mq = window.matchMedia("(max-width: 768px)");
    const applyMode = () => {
      if (mq.matches) {
        node.style.setProperty("--hero-scroll", "0");
      } else {
        update();
      }
    };

    applyMode();
    mq.addEventListener("change", applyMode);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mq.removeEventListener("change", applyMode);
      cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}
