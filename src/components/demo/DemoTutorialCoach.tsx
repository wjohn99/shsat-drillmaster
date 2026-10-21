import { useEffect, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useExamLock } from "@/contexts/ExamLockContext";
import { useDemoTutorial } from "@/contexts/DemoTutorialContext";
import { DEMO_TUTORIAL_STEPS, FIRST_SAMPLE_BOARD, type DemoTutorialStep } from "@/lib/demoTutorial";
import { cn } from "@/lib/utils";

interface Anchor {
  top: number;
  left: number;
  width: number;
  height: number;
}

function sampleBoardPathFromDom(): string | null {
  const link = document.querySelector<HTMLAnchorElement>('[data-tour="sample-board-link"]');
  const href = link?.getAttribute("href");
  if (!href) return null;
  let path = href;
  try {
    if (href.startsWith("http")) path = new URL(href).pathname;
  } catch {
    return null;
  }
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (basename && path.startsWith(basename)) {
    path = path.slice(basename.length) || "/";
  }
  return path;
}

function isOnStep(pathname: string, step: DemoTutorialStep, sampleBoardPath: string | null): boolean {
  if (step.route === FIRST_SAMPLE_BOARD) {
    return sampleBoardPath != null && pathname === sampleBoardPath;
  }
  return pathname === step.route;
}

function visibleTarget(name: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 8 && rect.height > 8) return node;
  }
  return null;
}

export function DemoTutorialCoach() {
  const { active, stepIndex, nextStep, previousStep, skipTutorial, maybeAutoStart } =
    useDemoTutorial();
  const { locked } = useExamLock();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [sampleBoardPath, setSampleBoardPath] = useState<string | null>(null);
  const step = DEMO_TUTORIAL_STEPS[stepIndex];
  const last = stepIndex >= DEMO_TUTORIAL_STEPS.length - 1;
  const onStepPage = step ? isOnStep(location.pathname, step, sampleBoardPath) : false;

  useEffect(() => {
    if (locked) return;
    if (location.pathname !== "/dashboard") return;
    maybeAutoStart();
  }, [location.pathname, locked, maybeAutoStart]);

  useEffect(() => {
    if (!active) return;
    if (!step) {
      skipTutorial();
      return;
    }

    const go = () => {
      if (step.route === FIRST_SAMPLE_BOARD) {
        const found = sampleBoardPathFromDom();
        if (found && found !== sampleBoardPath) setSampleBoardPath(found);
        const target = found || sampleBoardPath;
        if (!target) {
          if (location.pathname !== "/workspace") navigate("/workspace");
          return;
        }
        if (location.pathname !== target) navigate(target);
        return;
      }
      if (location.pathname !== step.route) navigate(step.route);
    };

    go();
    if (step.route !== FIRST_SAMPLE_BOARD || sampleBoardPath) return;
    const timer = window.setInterval(go, 300);
    return () => window.clearInterval(timer);
  }, [active, last, location.pathname, navigate, sampleBoardPath, skipTutorial, step]);

  useLayoutEffect(() => {
    if (!active || !step || !onStepPage) {
      setAnchor(null);
      return;
    }

    let frame = 0;
    const measure = () => {
      const node = visibleTarget(step.target);
      if (!node) {
        setAnchor(null);
        return;
      }
      node.scrollIntoView({ block: "nearest", inline: "nearest" });
      const rect = node.getBoundingClientRect();
      const pad = 6;
      setAnchor({
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
    };

    measure();
    const timer = window.setInterval(measure, 250);
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [active, location.pathname, onStepPage, step]);

  if (!active || !step) return null;

  const cardWidth = 340;
  const cardHeight = 210;
  const gap = 14;
  let cardTop = 24;
  let cardLeft = 24;
  let arrow: "up" | "down" | null = null;
  if (anchor) {
    const spaceBelow = window.innerHeight - (anchor.top + anchor.height);
    const below = spaceBelow > cardHeight + gap || spaceBelow >= anchor.top;
    cardTop = below
      ? Math.min(window.innerHeight - cardHeight - 16, anchor.top + anchor.height + gap)
      : Math.max(16, anchor.top - cardHeight - gap);
    cardLeft = Math.min(
      Math.max(16, anchor.left),
      window.innerWidth - cardWidth - 16,
    );
    arrow = below ? "up" : "down";
  }

  const arrowLeft = anchor
    ? Math.min(
        cardWidth - 28,
        Math.max(20, anchor.left + anchor.width / 2 - cardLeft - 7),
      )
    : 24;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0" />
      {anchor ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-primary"
          style={{
            top: anchor.top,
            left: anchor.left,
            width: anchor.width,
            height: anchor.height,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/55" />
      )}
      <div
        className="fixed z-[81] w-[min(340px,calc(100vw-2rem))] rounded-xl border bg-background p-4 text-foreground shadow-xl"
        style={{ top: cardTop, left: cardLeft }}
        role="dialog"
        aria-labelledby="demo-tutorial-title"
      >
        {anchor && arrow ? (
          <span
            aria-hidden
            className={cn(
              "absolute h-3.5 w-3.5 rotate-45 border-border bg-background",
              arrow === "up" ? "-top-[7px] border-l border-t" : "-bottom-[7px] border-b border-r",
            )}
            style={{ left: arrowLeft }}
          />
        ) : null}
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Step {stepIndex + 1} of {DEMO_TUTORIAL_STEPS.length}
        </p>
        <h2 id="demo-tutorial-title" className="mt-1 text-base font-semibold">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={skipTutorial}>
            Skip
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={previousStep}
              disabled={stepIndex === 0}
            >
              Back
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (last) skipTutorial();
                else nextStep();
              }}
            >
              {last ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
