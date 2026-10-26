import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExamLock } from "@/contexts/ExamLockContext";
import { useDemoTutorial } from "@/contexts/DemoTutorialContext";
import {
  DEMO_TUTORIAL_DISMISS_CARD,
  DEMO_TUTORIAL_STEPS,
  FIRST_SAMPLE_BOARD,
  tutorialOpensSessionCard,
  worksheetsStateForTutorial,
  type DemoTutorialStep,
} from "@/lib/demoTutorial";
import {
  pointerPointFromAnchor,
  sameTourAnchor,
  TOUR_CLICK_MS,
  TOUR_MOVE_MS,
  tourMotionMs,
  tourTransition,
  type TourAnchor,
} from "@/lib/demoTutorialMotion";
import {
  measureTourInsets,
  scrollTourTargetIntoView,
  tourTargetNeedsScroll,
} from "@/lib/demoTutorialScroll";
import { cn } from "@/lib/utils";

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

function studentUidFromBoardPath(path: string | null): string | null {
  if (!path) return null;
  const match = /^\/workspace\/([^/]+)$/.exec(path);
  return match?.[1] ?? null;
}

function isOnStep(pathname: string, step: DemoTutorialStep, sampleBoardPath: string | null): boolean {
  if (step.route === FIRST_SAMPLE_BOARD) {
    return sampleBoardPath != null && pathname === sampleBoardPath;
  }
  return pathname === step.route;
}

function visibleTarget(name: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  let best: HTMLElement | null = null;
  let bestArea = 0;
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width <= 8 || rect.height <= 8) continue;
    const area = rect.width * rect.height;
    if (area >= bestArea) {
      best = node;
      bestArea = area;
    }
  }
  return best;
}

function anyTarget(name: string): HTMLElement | null {
  return visibleTarget(name) ?? document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resolveClickTarget(step: DemoTutorialStep): string | null {
  if (step.via && anyTarget(step.via)) return step.via;
  if (step.navFallback && anyTarget(step.navFallback)) return step.navFallback;
  return step.via ?? step.navFallback ?? null;
}

export function clickTourTarget(node: HTMLElement): void {
  if (node.tagName === "DETAILS") {
    const summary = node.querySelector("summary");
    if (summary instanceof HTMLElement) {
      summary.click();
      return;
    }
    (node as HTMLDetailsElement).open = true;
    return;
  }
  if (node.matches("a, button, summary, [role='button']")) {
    node.click();
    return;
  }
  const inner = node.querySelector<HTMLElement>("a, button, summary, [role='button']");
  (inner ?? node).click();
}

function DemoPointer({
  x,
  y,
  clicking,
  instant,
  hidden,
}: {
  x: number;
  y: number;
  clicking: boolean;
  instant: boolean;
  hidden: boolean;
}) {
  if (hidden) return null;
  const reduced = prefersReducedMotion();
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[203] will-change-transform"
      style={{
        top: 0,
        left: 0,
        transform: `translate3d(${x}px, ${y}px, 0)`,
        transition: tourTransition(reduced, instant, ["transform"]),
      }}
    >
      <span
        className="relative block origin-top-left"
        style={{
          transform: `scale(${clicking ? 0.9 : 1})`,
          transition: `transform ${tourMotionMs(reduced, TOUR_CLICK_MS)}ms ease-out`,
        }}
      >
        <span
          className={cn(
            "absolute -left-2 -top-2 h-10 w-10 rounded-full border-2 border-primary/70 bg-primary/15",
            clicking ? "opacity-100" : "opacity-0",
          )}
          style={{
            transition: `opacity ${tourMotionMs(reduced, TOUR_CLICK_MS)}ms ease-out, transform ${tourMotionMs(reduced, 280)}ms ease-out`,
            transform: clicking ? "scale(1)" : "scale(0.7)",
          }}
        />
        <svg width="28" height="28" viewBox="0 0 24 24">
          <path
            d="M5.2 3.4v16.2l4.1-4.2 2.8 6.5 2.2-.9-2.9-6.7 5.6-.1z"
            fill="#fff"
            stroke="#0f172a"
            strokeLinejoin="round"
            strokeWidth="1.35"
          />
        </svg>
      </span>
    </div>
  );
}

export function DemoTutorialCoach() {
  const { active, stepIndex, nextStep, previousStep, skipTutorial, maybeAutoStart } =
    useDemoTutorial();
  const { locked } = useExamLock();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<TourAnchor | null>(null);
  const [highlightInstant, setHighlightInstant] = useState(true);
  const [sampleBoardPath, setSampleBoardPath] = useState<string | null>(null);
  const [pointer, setPointer] = useState({ x: 48, y: 48, clicking: false, instant: true });
  const [pointerHidden, setPointerHidden] = useState(true);
  const firstPointerRef = useRef(true);
  const movingRef = useRef(false);
  const scrollingRef = useRef(false);
  const scrollIdleTimerRef = useRef(0);
  const anchorRef = useRef<TourAnchor | null>(null);
  const step = DEMO_TUTORIAL_STEPS[stepIndex];
  const last = stepIndex >= DEMO_TUTORIAL_STEPS.length - 1;
  const onStepPage = step ? isOnStep(location.pathname, step, sampleBoardPath) : false;
  const ready = Boolean(active && step && onStepPage);

  useEffect(() => {
    if (active) firstPointerRef.current = true;
  }, [active]);

  useEffect(() => {
    if (locked) return;
    if (location.pathname !== "/dashboard") return;
    maybeAutoStart();
  }, [location.pathname, locked, maybeAutoStart]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      skipTutorial();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active, skipTutorial]);

  useEffect(() => {
    if (!active) return;
    if (!step) {
      skipTutorial();
      return;
    }

    const go = () => {
      const found = sampleBoardPathFromDom();
      if (found && found !== sampleBoardPath) setSampleBoardPath(found);
      const boardPath = found || sampleBoardPath;

      if (step.route === FIRST_SAMPLE_BOARD) {
        if (!boardPath) {
          if (location.pathname !== "/workspace") navigate("/workspace");
          return;
        }
        if (location.pathname !== boardPath) navigate(boardPath);
        return;
      }

      if (location.pathname === step.route) return;
      if (step.route === "/worksheets") {
        const uid = studentUidFromBoardPath(boardPath);
        navigate(
          "/worksheets",
          uid
            ? { state: worksheetsStateForTutorial(uid, boardPath ?? "/workspace") }
            : undefined,
        );
        return;
      }
      navigate(step.route);
    };

    go();
    if (step.route !== FIRST_SAMPLE_BOARD || sampleBoardPath) return;
    const timer = window.setInterval(go, 300);
    return () => window.clearInterval(timer);
  }, [active, location.pathname, navigate, sampleBoardPath, skipTutorial, step]);

  useLayoutEffect(() => {
    if (!active) {
      anchorRef.current = null;
      setAnchor(null);
      setHighlightInstant(true);
      return;
    }
    if (!step) return;

    let frame = 0;
    let enableFrame = 0;
    let attempts = 0;
    let scrolledThisStep = false;
    const reduced = prefersReducedMotion();
    const scrollBehavior: ScrollBehavior = reduced ? "auto" : "smooth";

    const applyAnchor = (next: TourAnchor, instant: boolean) => {
      if (sameTourAnchor(anchorRef.current, next) && !instant) return;
      const first = !anchorRef.current;
      anchorRef.current = next;
      setAnchor(next);
      if (reduced) {
        setHighlightInstant(true);
        return;
      }
      if (first) {
        setHighlightInstant(true);
        enableFrame = requestAnimationFrame(() => {
          enableFrame = requestAnimationFrame(() => setHighlightInstant(false));
        });
        return;
      }
      setHighlightInstant(instant || scrollingRef.current);
    };

    const measure = (instant = false) => {
      if (!ready) return;
      const node = anyTarget(step.target);
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 2 && rect.height <= 2) return;
      const pad = 8;
      applyAnchor(
        {
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        },
        instant,
      );
    };

    const bringIntoView = () => {
      const node = anyTarget(step.target);
      if (!node) return;
      const needsScroll = tourTargetNeedsScroll(node);
      if (!movingRef.current && needsScroll && (!scrolledThisStep || attempts === 6)) {
        scrolledThisStep = true;
        scrollTourTargetIntoView(node, { behavior: scrollBehavior });
      }
      measure(scrollingRef.current);
    };

    bringIntoView();
    const timer = window.setInterval(() => {
      attempts += 1;
      bringIntoView();
      const found = anyTarget(step.target);
      if ((found && attempts >= 10) || attempts >= 40) window.clearInterval(timer);
    }, 180);
    const onMove = () => {
      scrollingRef.current = true;
      setHighlightInstant(true);
      window.clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = window.setTimeout(() => {
        scrollingRef.current = false;
        if (!prefersReducedMotion()) setHighlightInstant(false);
      }, 160);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => measure(true));
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(scrollIdleTimerRef.current);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(enableFrame);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [active, ready, step]);

  useEffect(() => {
    if (!anchor || movingRef.current) return;
    const point = pointerPointFromAnchor(anchor);
    const instant = firstPointerRef.current || prefersReducedMotion() || highlightInstant;
    firstPointerRef.current = false;
    setPointerHidden(false);
    setPointer({ x: point.x, y: point.y, clicking: false, instant });
  }, [anchor, highlightInstant]);

  const playClickOn = async (name: string): Promise<boolean> => {
    const node = anyTarget(name);
    if (!node) return false;
    const reduced = prefersReducedMotion();
    scrollTourTargetIntoView(node, { behavior: reduced ? "auto" : "smooth" });
    const liveNode = anyTarget(name) ?? node;
    const rect = liveNode.getBoundingClientRect();
    const point = pointerPointFromAnchor({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    setPointerHidden(false);
    setPointer({ x: point.x, y: point.y, clicking: false, instant: reduced });
    await sleep(tourMotionMs(reduced, TOUR_MOVE_MS));
    setPointer((prev) => ({ ...prev, clicking: true, instant: false }));
    await sleep(tourMotionMs(reduced, TOUR_CLICK_MS + 40));
    const live = anyTarget(name) ?? liveNode;
    clickTourTarget(live);
    await sleep(tourMotionMs(reduced, 120));
    setPointer((prev) => ({ ...prev, clicking: false }));
    await sleep(tourMotionMs(reduced, 80));
    return true;
  };

  const dismissSessionCard = async () => {
    window.dispatchEvent(new Event(DEMO_TUTORIAL_DISMISS_CARD));
    await sleep(tourMotionMs(prefersReducedMotion(), 220));
  };

  const goNext = async () => {
    if (movingRef.current) return;
    if (last) {
      skipTutorial();
      return;
    }
    const upcoming = DEMO_TUTORIAL_STEPS[stepIndex + 1];
    movingRef.current = true;
    try {
      if (tutorialOpensSessionCard(step) && !tutorialOpensSessionCard(upcoming)) {
        await dismissSessionCard();
      }
      if (upcoming) {
        const clickName = resolveClickTarget(upcoming);
        if (clickName) {
          try {
            await playClickOn(clickName);
          } catch {
            const live = anyTarget(clickName);
            if (live) clickTourTarget(live);
          }
          if (tutorialOpensSessionCard(upcoming)) {
            await sleep(tourMotionMs(prefersReducedMotion(), 180));
          }
        }
      }
    } finally {
      movingRef.current = false;
    }
    nextStep();
  };

  const goBack = async () => {
    if (movingRef.current || stepIndex === 0) return;
    const previous = DEMO_TUTORIAL_STEPS[stepIndex - 1];
    movingRef.current = true;
    try {
      if (tutorialOpensSessionCard(step) && !tutorialOpensSessionCard(previous)) {
        await dismissSessionCard();
      }
    } finally {
      movingRef.current = false;
    }
    previousStep();
  };

  if (!active || !step) return null;

  const reducedMotion = prefersReducedMotion();
  const cardWidth = 360;
  const cardHeight = 230;
  const gap = 16;
  const insets = measureTourInsets();
  const barReserve = insets.bottom;
  let cardTop = insets.top;
  let cardLeft = 24;
  let arrow: "up" | "down" | null = null;
  if (anchor) {
    const spaceBelow = window.innerHeight - (anchor.top + anchor.height) - barReserve;
    const spaceRight = window.innerWidth - (anchor.left + anchor.width);
    const maxTop = window.innerHeight - cardHeight - barReserve;
    const minTop = insets.top;
    if (spaceRight > cardWidth + gap && anchor.top > insets.top) {
      cardTop = Math.min(maxTop, Math.max(minTop, anchor.top));
      cardLeft = Math.min(window.innerWidth - cardWidth - 16, anchor.left + anchor.width + gap);
      arrow = null;
    } else {
      const below = spaceBelow > cardHeight + gap || spaceBelow >= anchor.top - minTop;
      cardTop = below
        ? Math.min(maxTop, anchor.top + anchor.height + gap)
        : Math.max(minTop, anchor.top - cardHeight - gap);
      cardLeft = Math.min(Math.max(16, anchor.left), window.innerWidth - cardWidth - 16);
      arrow = below ? "up" : "down";
    }
  }

  const arrowLeft = anchor
    ? Math.min(cardWidth - 28, Math.max(20, anchor.left + anchor.width / 2 - cardLeft - 7))
    : 24;
  const geometryTransition = tourTransition(reducedMotion, highlightInstant, [
    "transform",
    "width",
    "height",
  ]);

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {anchor ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-primary/90 will-change-transform"
          style={{
            top: 0,
            left: 0,
            width: anchor.width,
            height: anchor.height,
            transform: `translate3d(${anchor.left}px, ${anchor.top}px, 0)`,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.42)",
            transition: geometryTransition,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/35" />
      )}
      <div className="absolute inset-0" />

      <DemoPointer
        x={pointer.x}
        y={pointer.y}
        clicking={pointer.clicking}
        instant={pointer.instant}
        hidden={pointerHidden}
      />

      <div
        className="pointer-events-auto fixed z-[201] w-[min(360px,calc(100vw-2rem))] rounded-xl border bg-background p-4 text-foreground shadow-xl will-change-transform"
        style={{
          top: 0,
          left: 0,
          transform: `translate3d(${cardLeft}px, ${cardTop}px, 0)`,
          opacity: ready ? 1 : 0.72,
          transition: `${geometryTransition}, opacity ${tourMotionMs(reducedMotion, 280)}ms ${reducedMotion ? "linear" : "ease"}`,
        }}
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
        <div key={step.id} className={reducedMotion ? undefined : "animate-in fade-in duration-300"}>
          <h2 id="demo-tutorial-title" className="mt-1 text-base font-semibold">
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        </div>
      </div>

      <div
        data-tour-chrome="bar"
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-[202] border-t-2 border-foreground/15 bg-background px-4 pt-3 shadow-[0_-16px_40px_-12px_rgba(15,23,42,0.45)] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 border-2 border-foreground bg-background px-4 text-sm font-semibold shadow-sm"
            onClick={skipTutorial}
          >
            <X className="mr-2 h-4 w-4" aria-hidden />
            Exit tour
            <span
              aria-hidden
              className="ml-2 rounded border border-foreground/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Esc
            </span>
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 px-4"
              onClick={() => void goBack()}
              disabled={stepIndex === 0}
            >
              Back
            </Button>
            <Button
              type="button"
              className="h-11 min-h-11 px-5"
              onClick={() => void goNext()}
            >
              {last ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
