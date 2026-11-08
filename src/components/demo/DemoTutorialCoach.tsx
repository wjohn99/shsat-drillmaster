import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
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
  isTutorialStepLocation,
  tutorialOpensSessionCard,
  tutorialSearch,
  worksheetsStateForTutorial,
  type DemoTutorialStep,
} from "@/lib/demoTutorial";
import {
  approachTourAnchor,
  easeOutCubic,
  followTourAnchor,
  movePointer,
  placeTourCard,
  planTourMove,
  pointerPointFromAnchor,
  sameTourAnchor,
  tourHoleRadius,
  TOUR_CLICK_MS,
  TOUR_NAV_CLICK_MS,
  TOUR_NAV_MS,
  tourMotionMs,
  type PointerPose,
  type TourAnchor,
} from "@/lib/demoTutorialMotion";
import {
  measureTourInsets,
  scrollTourTargetIntoView,
  windowScrollDestination,
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

function setWindowScroll(left: number, top: number) {
  const root = document.scrollingElement ?? document.documentElement;
  try {
    window.scrollTo({ left, top, behavior: "instant" as ScrollBehavior });
  } catch {
    root.scrollTop = top;
    root.scrollLeft = left;
  }
}

const SPOTLIGHT_BLEED = 8;

function anchorFromNode(node: HTMLElement): TourAnchor {
  const rect = node.getBoundingClientRect();
  const pad = 4;
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

type WindowScrollAnim = {
  startTop: number;
  startLeft: number;
  destTop: number;
  destLeft: number;
  startTime: number;
  duration: number;
};

function DemoPointer({
  pointerRef,
  clicking,
  hidden,
}: {
  pointerRef: RefObject<HTMLDivElement | null>;
  clicking: boolean;
  hidden: boolean;
}) {
  const reduced = prefersReducedMotion();
  return (
    <div
      ref={pointerRef}
      aria-hidden
      className={cn(
        "pointer-events-none fixed z-[203] will-change-transform",
        hidden ? "opacity-0" : "opacity-100",
      )}
      style={{ top: 0, left: 0 }}
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
  const [sampleBoardPath, setSampleBoardPath] = useState<string | null>(null);
  const [pointerClicking, setPointerClicking] = useState(false);
  const [spotlightOn, setSpotlightOn] = useState(false);
  const movingRef = useRef(false);
  const shownRef = useRef<TourAnchor | null>(null);
  const pageKeyRef = useRef("");
  const targetMissingRef = useRef(true);
  const spotlightOnRef = useRef(false);
  const pointerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<SVGSVGElement>(null);
  const holeRef = useRef<SVGRectElement>(null);
  const maskRef = useRef<SVGRectElement>(null);
  const veilRef = useRef<SVGRectElement>(null);
  const [pointerReady, setPointerReady] = useState(false);
  const pointerReadyRef = useRef(false);
  const pointerPosRef = useRef<PointerPose | null>(null);
  const pointerAimRef = useRef<PointerPose | null>(null);
  const pointerTargetRef = useRef<PointerPose | null>(null);
  const pointerLockRef = useRef<PointerPose | null>(null);
  const holeAimRef = useRef<TourAnchor | null>(null);
  const navTravelRef = useRef<{
    fromHole: TourAnchor;
    toHole: TourAnchor;
    fromPointer: PointerPose;
    toPointer: PointerPose;
    start: number;
    duration: number;
  } | null>(null);
  const paintedRef = useRef<TourAnchor | null>(null);
  const cardAnchorRef = useRef<TourAnchor | null>(null);
  const cardPaintedRef = useRef<TourAnchor | null>(null);
  const cardBoxRef = useRef({ stepId: "", width: 360, height: 180, top: 96, bottom: 120 });
  const cardRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const step = DEMO_TUTORIAL_STEPS[stepIndex];
  const last = stepIndex >= DEMO_TUTORIAL_STEPS.length - 1;
  const onStepPage = isTutorialStepLocation(
    location.pathname,
    location.search,
    step,
    sampleBoardPath,
  );
  const ready = Boolean(active && step && onStepPage);

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

      if (isTutorialStepLocation(location.pathname, location.search, step, boardPath)) return;
      if (step.route === "/worksheets" && step.worksheetsBuild) {
        const uid = studentUidFromBoardPath(boardPath);
        navigate(
          "/worksheets",
          uid
            ? { state: worksheetsStateForTutorial(uid, boardPath ?? "/workspace") }
            : undefined,
        );
        return;
      }
      navigate({
        pathname: step.route,
        search: tutorialSearch(step) ?? "",
      });
    };

    go();
    if (step.route !== FIRST_SAMPLE_BOARD || sampleBoardPath) return;
    const timer = window.setInterval(go, 300);
    return () => window.clearInterval(timer);
  }, [active, location.pathname, location.search, navigate, sampleBoardPath, skipTutorial, step]);

  const setSpotlight = (on: boolean) => {
    if (spotlightOnRef.current === on) return;
    spotlightOnRef.current = on;
    setSpotlightOn(on);
  };

  const settleCard = (anchor: TourAnchor) => {
    const card = cardRef.current;
    const arrow = arrowRef.current;
    if (!card) return;
    if (cardBoxRef.current.stepId !== (step?.id ?? "")) {
      const insets = measureTourInsets();
      cardBoxRef.current = {
        stepId: step?.id ?? "",
        width: card.offsetWidth || 360,
        height: card.offsetHeight || 180,
        top: insets.top,
        bottom: insets.bottom,
      };
    }
    const box = cardBoxRef.current;
    const place = placeTourCard(
      anchor,
      { width: box.width, height: box.height },
      { width: window.innerWidth, height: window.innerHeight },
      { top: box.top, bottom: box.bottom },
    );
    card.style.transform = `translate3d(${place.left}px, ${place.top}px, 0)`;
    if (arrow) {
      arrow.hidden = place.arrow == null;
      arrow.style.left = `${place.arrowLeft}px`;
      arrow.style.top = place.arrow === "up" ? "-7px" : "auto";
      arrow.style.bottom = place.arrow === "down" ? "-7px" : "auto";
      arrow.classList.toggle("border-l", place.arrow === "up");
      arrow.classList.toggle("border-t", place.arrow === "up");
      arrow.classList.toggle("border-b", place.arrow === "down");
      arrow.classList.toggle("border-r", place.arrow === "down");
    }
  };

  const paintSpotlight = (shown: TourAnchor | null) => {
    const hole = holeRef.current;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const coverW = viewWidth + SPOTLIGHT_BLEED * 2;
    const coverH = viewHeight + SPOTLIGHT_BLEED * 2;
    const spotlight = spotlightRef.current;
    if (spotlight) {
      spotlight.style.left = `${-SPOTLIGHT_BLEED}px`;
      spotlight.style.top = `${-SPOTLIGHT_BLEED}px`;
      spotlight.style.width = `${coverW}px`;
      spotlight.style.height = `${coverH}px`;
      spotlight.setAttribute("width", String(coverW));
      spotlight.setAttribute("height", String(coverH));
      spotlight.removeAttribute("viewBox");
    }
    maskRef.current?.setAttribute("width", String(coverW));
    maskRef.current?.setAttribute("height", String(coverH));
    veilRef.current?.setAttribute("width", String(coverW));
    veilRef.current?.setAttribute("height", String(coverH));
    if (!hole) return;

    if (!shown) {
      hole.dataset.open = "false";
      hole.setAttribute("width", "0");
      hole.setAttribute("height", "0");
      return;
    }

    const radius = tourHoleRadius(shown);
    hole.dataset.open = "true";
    hole.dataset.radius = String(Math.round(radius));
    hole.setAttribute("x", String(shown.left + SPOTLIGHT_BLEED));
    hole.setAttribute("y", String(shown.top + SPOTLIGHT_BLEED));
    hole.setAttribute("width", String(shown.width));
    hole.setAttribute("height", String(shown.height));
    hole.setAttribute("rx", String(radius));
    hole.setAttribute("ry", String(radius));

    if (!movingRef.current && !pointerLockRef.current) {
      pointerTargetRef.current = pointerPointFromAnchor(shown);
    }
  };

  const stepPointer = (scroll: PointerPose, dt: number) => {
    const target = pointerTargetRef.current;
    const el = pointerRef.current;
    if (!target || !el) return;
    const next = movePointer({
      pos: pointerPosRef.current,
      target,
      previousTarget: pointerAimRef.current,
      scroll,
      dt,
      reduced: prefersReducedMotion(),
    });
    pointerPosRef.current = next;
    pointerAimRef.current = target;
    el.style.transition = "none";
    el.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
    if (!pointerReadyRef.current) {
      pointerReadyRef.current = true;
      setPointerReady(true);
    }
  };

  useLayoutEffect(() => {
    const pageKey = `${location.pathname}${location.search}`;
    if (pageKeyRef.current !== "" && pageKeyRef.current !== pageKey && cardRef.current) {
      cardRef.current.style.opacity = "0";
    }
    const missing = !ready || !step || !visibleTarget(step.target);
    if (missing) {
      targetMissingRef.current = true;
      paintSpotlight(null);
      return;
    }
    targetMissingRef.current = false;
    if (shownRef.current) paintSpotlight(shownRef.current);
  });

  useEffect(() => {
    if (!active || !step) {
      shownRef.current = null;
      targetMissingRef.current = true;
      setSpotlight(false);
      return;
    }

    let raf = 0;
    let stopped = false;
    let planned = false;
    let corrections = 0;
    let anim: WindowScrollAnim | null = null;
    let spotlightMove: { from: TourAnchor; to: TourAnchor; start: number; duration: number } | null =
      null;
    let lastNow = performance.now();
    const pageKey = `${location.pathname}${location.search}`;
    let cardHidden = pageKeyRef.current !== "" && pageKeyRef.current !== pageKey;
    if (cardHidden && cardRef.current) cardRef.current.style.opacity = "0";
    let lastScroll = {
      x: document.scrollingElement?.scrollLeft || window.scrollX || 0,
      y: document.scrollingElement?.scrollTop || window.scrollY || 0,
    };

    const currentWindowScroll = () => {
      const root = document.scrollingElement ?? document.documentElement;
      return {
        top: root.scrollTop || window.scrollY || 0,
        left: root.scrollLeft || window.scrollX || 0,
      };
    };

    const beginTransition = (node: HTMLElement, now: number) => {
      if (movingRef.current) return;
      scrollTourTargetIntoView(node, { behavior: "auto", scope: "nested" });
      const measured = anchorFromNode(node);
      const current = currentWindowScroll();
      const dest = windowScrollDestination(node);
      const scrollBy = dest
        ? { x: dest.left - current.left, y: dest.top - current.top }
        : { x: 0, y: 0 };
      const plan = planTourMove({
        from: shownRef.current,
        measured,
        scrollBy,
        reduced: prefersReducedMotion(),
      });
      if (!plan) {
        if (dest) setWindowScroll(dest.left, dest.top);
        shownRef.current = anchorFromNode(node);
        cardAnchorRef.current = shownRef.current;
        spotlightMove = null;
        anim = null;
        return;
      }
      cardAnchorRef.current = plan.to;
      if (cardRef.current && (cardHidden || Math.hypot(scrollBy.x, scrollBy.y) > 160)) {
        cardRef.current.style.opacity = "0";
        cardHidden = true;
      }
      spotlightMove = { from: plan.from, to: plan.to, start: now, duration: plan.duration };
      anim = dest
        ? {
            startTop: current.top,
            startLeft: current.left,
            destTop: dest.top,
            destLeft: dest.left,
            startTime: now,
            duration: plan.duration,
          }
        : null;
      shownRef.current = plan.from;
    };

    const tick = (now: number) => {
      if (stopped) return;
      const dt = Math.min(48, now - lastNow);
      lastNow = now;

      if (anim) {
        const t = Math.min(1, (now - anim.startTime) / anim.duration);
        const eased = easeOutCubic(t);
        setWindowScroll(
          anim.startLeft + (anim.destLeft - anim.startLeft) * eased,
          anim.startTop + (anim.destTop - anim.startTop) * eased,
        );
        if (t >= 1) anim = null;
      }

      const node = ready ? visibleTarget(step.target) : null;
      const scrollNow = currentWindowScroll();
      const scroll = { x: scrollNow.left - lastScroll.x, y: scrollNow.top - lastScroll.y };
      lastScroll = { x: scrollNow.left, y: scrollNow.top };
      if (!node) {
        targetMissingRef.current = true;
        setSpotlight(false);
        paintSpotlight(null);
        paintedRef.current = null;
        cardPaintedRef.current = null;
        raf = requestAnimationFrame(tick);
        return;
      }

      if (!planned) {
        planned = true;
        beginTransition(node, now);
      }

      let shown: TourAnchor;
      const travel = navTravelRef.current;
      const aimed = holeAimRef.current;
      if (travel) {
        const t = easeOutCubic(Math.min(1, (now - travel.start) / travel.duration));
        shown = approachTourAnchor(travel.fromHole, travel.toHole, t);
      } else if (aimed) {
        shown = followTourAnchor(shownRef.current, aimed, { glue: false, dt, timeConstant: 180 });
      } else if (spotlightMove) {
        const t = easeOutCubic(Math.min(1, (now - spotlightMove.start) / spotlightMove.duration));
        const landed = spotlightMove.to;
        shown = approachTourAnchor(spotlightMove.from, spotlightMove.to, t);
        if (t >= 1) {
          spotlightMove = null;
          anim = null;
          const live = anchorFromNode(node);
          const err = Math.hypot(live.top - landed.top, live.left - landed.left);
          shownRef.current = landed;
          if (err > 32 && corrections < 1 && !movingRef.current) {
            corrections += 1;
            beginTransition(node, now);
            shown = shownRef.current ?? landed;
          } else {
            shown = live;
            cardAnchorRef.current = live;
          }
        }
      } else {
        const measured = anchorFromNode(node);
        shown = followTourAnchor(shownRef.current, measured, {
          glue: prefersReducedMotion() || !shownRef.current,
          dt,
        });
      }
      shownRef.current = shown;
      targetMissingRef.current = false;
      pageKeyRef.current = pageKey;
      setSpotlight(true);
      const placeAt = cardAnchorRef.current ?? shown;
      if (!sameTourAnchor(paintedRef.current, shown)) {
        paintSpotlight(shown);
        paintedRef.current = shown;
      }
      if (!travel && !aimed && !sameTourAnchor(cardPaintedRef.current, placeAt)) {
        settleCard(placeAt);
        cardPaintedRef.current = placeAt;
      }
      if (cardHidden && !spotlightMove && !travel && !aimed && cardRef.current) {
        cardHidden = false;
        cardRef.current.style.opacity = "1";
      }
      const point = pointerPointFromAnchor(shown);
      if (travel) {
        const t = easeOutCubic(Math.min(1, (now - travel.start) / travel.duration));
        const pose = {
          x: travel.fromPointer.x + (travel.toPointer.x - travel.fromPointer.x) * t,
          y: travel.fromPointer.y + (travel.toPointer.y - travel.fromPointer.y) * t,
        };
        pointerPosRef.current = pose;
        pointerAimRef.current = pose;
        pointerTargetRef.current = pose;
        const pointer = pointerRef.current;
        if (pointer) {
          pointer.style.transition = "none";
          pointer.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0)`;
        }
        if (!pointerReadyRef.current) {
          pointerReadyRef.current = true;
          setPointerReady(true);
        }
      } else if (pointerLockRef.current) {
        pointerTargetRef.current = pointerLockRef.current;
        stepPointer(scroll, dt);
      } else if (spotlightMove || aimed) {
        pointerPosRef.current = point;
        pointerAimRef.current = point;
        pointerTargetRef.current = point;
        const pointer = pointerRef.current;
        if (pointer) {
          pointer.style.transition = "none";
          pointer.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
        }
        if (!pointerReadyRef.current) {
          pointerReadyRef.current = true;
          setPointerReady(true);
        }
      } else {
        pointerTargetRef.current = point;
        stepPointer(scroll, dt);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [active, ready, step, location.pathname, location.search]);

  const playClickOn = async (name: string): Promise<boolean> => {
    const node = anyTarget(name);
    if (!node) return false;
    scrollTourTargetIntoView(node, { behavior: "auto", scope: "nested" });
    const liveNode = anyTarget(name) ?? node;
    const anchor = anchorFromNode(liveNode);
    const point = pointerPointFromAnchor(anchor);
    const fromHole = shownRef.current ?? anchor;
    const fromPointer = pointerPosRef.current ?? pointerPointFromAnchor(fromHole);
    holeAimRef.current = anchor;
    pointerLockRef.current = point;
    pointerTargetRef.current = point;
    navTravelRef.current = {
      fromHole,
      toHole: anchor,
      fromPointer,
      toPointer: point,
      start: performance.now(),
      duration: tourMotionMs(prefersReducedMotion(), TOUR_NAV_MS) || 1,
    };
    setSpotlight(true);
    if (!pointerReadyRef.current) {
      pointerReadyRef.current = true;
      setPointerReady(true);
    }
    await sleep(tourMotionMs(prefersReducedMotion(), TOUR_NAV_MS));
    setPointerClicking(true);
    await sleep(tourMotionMs(prefersReducedMotion(), TOUR_NAV_CLICK_MS));
    const live = anyTarget(name) ?? liveNode;
    clickTourTarget(live);
    holeAimRef.current = null;
    pointerLockRef.current = null;
    navTravelRef.current = null;
    setPointerClicking(false);
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

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <svg
        ref={spotlightRef}
        data-tour-spotlight=""
        data-state={spotlightOn ? "on" : "off"}
        aria-hidden
        className="pointer-events-none fixed"
        style={{ left: -SPOTLIGHT_BLEED, top: -SPOTLIGHT_BLEED, width: "calc(100vw + 16px)", height: "calc(100dvh + 16px)" }}
      >
        <defs>
          <mask id="demo-tour-spotlight-mask" maskUnits="userSpaceOnUse">
            <rect ref={maskRef} x="0" y="0" fill="white" />
            <rect ref={holeRef} data-tour-hole="" data-open="false" fill="black" x="0" y="0" width="0" height="0" />
          </mask>
        </defs>
        <rect ref={veilRef} x="0" y="0" fill="rgba(15,23,42,0.42)" mask="url(#demo-tour-spotlight-mask)" />
      </svg>
      <div className="absolute inset-0" />

      <DemoPointer pointerRef={pointerRef} clicking={pointerClicking} hidden={!pointerReady} />

      <div
        ref={cardRef}
        className="pointer-events-auto fixed left-0 top-0 z-[201] w-[min(360px,calc(100vw-2rem))] rounded-xl border bg-background p-4 text-foreground shadow-xl will-change-transform"
        style={{
          transition: `opacity ${tourMotionMs(reducedMotion, 180)}ms ease-out`,
        }}
        role="dialog"
        aria-labelledby="demo-tutorial-title"
      >
        <span
          ref={arrowRef}
          aria-hidden
          hidden
          className="absolute h-3.5 w-3.5 rotate-45 border-border bg-background"
        />
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
