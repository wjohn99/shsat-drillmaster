export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TourView {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TourInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const HEADER_FALLBACK = 96;
const BAR_FALLBACK = 112;
const EDGE_PAD = 20;
const TOP_BIAS = 28;

export function measureTourInsets(): TourInsets {
  const header = document.querySelector("header");
  const bar = document.querySelector<HTMLElement>("[data-tour-chrome='bar']");
  const headerBottom = header ? header.getBoundingClientRect().bottom : HEADER_FALLBACK;
  const barTop = bar ? bar.getBoundingClientRect().top : window.innerHeight - BAR_FALLBACK;
  return {
    top: Math.max(0, Math.ceil(headerBottom)) + EDGE_PAD,
    bottom: Math.max(0, Math.ceil(window.innerHeight - barTop)) + EDGE_PAD,
    left: EDGE_PAD,
    right: EDGE_PAD,
  };
}

/**
 * How far to scroll so `rect` sits in `view`.
 * Undersized targets go near the top of the safe area so the highlight
 * is not clipped by the header or the tour bar.
 */
export function deltaToFitRect(rect: TourRect, view: TourView): { x: number; y: number } {
  const viewRight = view.left + view.width;
  const viewBottom = view.top + view.height;
  const rectRight = rect.left + rect.width;
  const rectBottom = rect.top + rect.height;

  let y = 0;
  if (view.height <= 0) {
    y = 0;
  } else if (rect.height >= view.height - 1) {
    y = rect.top - view.top;
  } else {
    const fullyVisible = rect.top >= view.top - 0.5 && rectBottom <= viewBottom + 0.5;
    if (!fullyVisible) {
      const room = view.height - rect.height;
      const desiredTop = view.top + Math.min(TOP_BIAS, Math.max(0, room * 0.2));
      y = rect.top - desiredTop;
    }
  }

  let x = 0;
  if (view.width <= 0) {
    x = 0;
  } else if (rect.width >= view.width - 1) {
    x = rect.left - view.left;
  } else {
    const fullyVisible = rect.left >= view.left - 0.5 && rectRight <= viewRight + 0.5;
    if (!fullyVisible) {
      const desiredLeft = view.left + Math.min(16, Math.max(0, (view.width - rect.width) / 2));
      x = rect.left - desiredLeft;
    }
  }

  return { x, y };
}

function overflowCanScroll(style: CSSStyleDeclaration, axis: "x" | "y"): boolean {
  const value = axis === "x" ? style.overflowX : style.overflowY;
  return value === "auto" || value === "scroll" || value === "overlay";
}

export function scrollableAncestors(node: HTMLElement): HTMLElement[] {
  const list: HTMLElement[] = [];
  let parent = node.parentElement;
  while (parent && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const canY =
      overflowCanScroll(style, "y") && parent.scrollHeight > parent.clientHeight + 1;
    const canX =
      overflowCanScroll(style, "x") && parent.scrollWidth > parent.clientWidth + 1;
    if (canX || canY) list.push(parent);
    parent = parent.parentElement;
  }
  return list;
}

function isInFixedLayer(node: HTMLElement): boolean {
  let el: HTMLElement | null = node;
  while (el && el !== document.body) {
    const position = window.getComputedStyle(el).position;
    if (position === "fixed") return true;
    el = el.parentElement;
  }
  return false;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function windowView(insets: TourInsets): TourView {
  return {
    top: insets.top,
    left: insets.left,
    width: Math.max(0, window.innerWidth - insets.left - insets.right),
    height: Math.max(0, window.innerHeight - insets.top - insets.bottom),
  };
}

function scrollerView(scroller: HTMLElement, insets: TourInsets): TourView {
  const box = scroller.getBoundingClientRect();
  const top = Math.max(box.top + 8, insets.top);
  const left = Math.max(box.left + 8, insets.left);
  const bottom = Math.min(box.bottom - 8, window.innerHeight - insets.bottom);
  const right = Math.min(box.right - 8, window.innerWidth - insets.right);
  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function applyElementScroll(
  scroller: HTMLElement,
  nextTop: number,
  nextLeft: number,
  behavior: ScrollBehavior,
): void {
  if (behavior === "smooth" && typeof scroller.scrollTo === "function") {
    try {
      scroller.scrollTo({ top: nextTop, left: nextLeft, behavior: "smooth" });
      return;
    } catch {
      // jsdom and some overflow panes only accept the assigned properties.
    }
  }
  scroller.scrollTop = nextTop;
  scroller.scrollLeft = nextLeft;
}

function scrollElementBy(
  scroller: HTMLElement,
  x: number,
  y: number,
  behavior: ScrollBehavior,
): boolean {
  const style = window.getComputedStyle(scroller);
  const canY = overflowCanScroll(style, "y");
  const canX = overflowCanScroll(style, "x");
  const maxY = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const maxX = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const nextTop = canY ? clamp(scroller.scrollTop + y, 0, maxY) : scroller.scrollTop;
  const nextLeft = canX ? clamp(scroller.scrollLeft + x, 0, maxX) : scroller.scrollLeft;
  if (Math.abs(nextTop - scroller.scrollTop) < 1 && Math.abs(nextLeft - scroller.scrollLeft) < 1) {
    return false;
  }
  applyElementScroll(scroller, nextTop, nextLeft, behavior);
  return true;
}

function scrollWindowBy(x: number, y: number, behavior: ScrollBehavior): boolean {
  if (Math.abs(x) < 1 && Math.abs(y) < 1) return false;
  const root = document.scrollingElement ?? document.documentElement;
  const maxY = Math.max(0, root.scrollHeight - window.innerHeight);
  const maxX = Math.max(0, root.scrollWidth - window.innerWidth);
  const currentTop = root.scrollTop || window.scrollY || 0;
  const currentLeft = root.scrollLeft || window.scrollX || 0;
  const nextTop = clamp(currentTop + y, 0, maxY);
  const nextLeft = clamp(currentLeft + x, 0, maxX);
  if (Math.abs(nextTop - currentTop) < 1 && Math.abs(nextLeft - currentLeft) < 1) {
    return false;
  }
  if (behavior === "smooth") {
    try {
      window.scrollTo({ top: nextTop, left: nextLeft, behavior: "smooth" });
    } catch {
      applyElementScroll(root as HTMLElement, nextTop, nextLeft, "auto");
    }
  } else {
    applyElementScroll(root as HTMLElement, nextTop, nextLeft, "auto");
  }
  return true;
}

export function scrollTourTargetIntoView(
  node: HTMLElement,
  opts?: { behavior?: ScrollBehavior },
): boolean {
  const behavior = opts?.behavior ?? "auto";
  const insets = measureTourInsets();
  let scrolled = false;

  for (const scroller of scrollableAncestors(node)) {
    const delta = deltaToFitRect(node.getBoundingClientRect(), scrollerView(scroller, insets));
    if (scrollElementBy(scroller, delta.x, delta.y, behavior)) scrolled = true;
  }

  if (!isInFixedLayer(node)) {
    const delta = deltaToFitRect(node.getBoundingClientRect(), windowView(insets));
    if (scrollWindowBy(delta.x, delta.y, behavior)) scrolled = true;
  }

  return scrolled;
}

export function tourTargetNeedsScroll(node: HTMLElement): boolean {
  const insets = measureTourInsets();
  if (
    scrollableAncestors(node).some((scroller) => {
      const delta = deltaToFitRect(node.getBoundingClientRect(), scrollerView(scroller, insets));
      return Math.abs(delta.x) >= 2 || Math.abs(delta.y) >= 2;
    })
  ) {
    return true;
  }
  if (isInFixedLayer(node)) return false;
  const windowDelta = deltaToFitRect(node.getBoundingClientRect(), windowView(insets));
  return Math.abs(windowDelta.x) >= 2 || Math.abs(windowDelta.y) >= 2;
}
