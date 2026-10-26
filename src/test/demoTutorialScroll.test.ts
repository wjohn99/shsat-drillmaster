// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  deltaToFitRect,
  measureTourInsets,
  scrollTourTargetIntoView,
} from "@/lib/demoTutorialScroll";

function mockRect(
  el: HTMLElement,
  rect: { top: number; left: number; width: number; height: number },
) {
  el.getBoundingClientRect = () =>
    ({
      ...rect,
      bottom: rect.top + rect.height,
      right: rect.left + rect.width,
      x: rect.left,
      y: rect.top,
      toJSON() {
        return rect;
      },
    }) as DOMRect;
}

describe("deltaToFitRect", () => {
  const view = { top: 120, left: 20, width: 700, height: 500 };

  it("scrolls down when the target sits under the tour bar", () => {
    const delta = deltaToFitRect({ top: 680, left: 40, width: 180, height: 48 }, view);
    expect(delta.y).toBeGreaterThan(400);
  });

  it("scrolls up when the target sits under the header", () => {
    const delta = deltaToFitRect({ top: 24, left: 40, width: 180, height: 48 }, view);
    expect(delta.y).toBeLessThan(-60);
  });

  it("does not move a target already in the safe area", () => {
    const delta = deltaToFitRect({ top: 180, left: 80, width: 200, height: 60 }, view);
    expect(delta).toEqual({ x: 0, y: 0 });
  });

  it("pins a tall target to the top of the safe area", () => {
    const delta = deltaToFitRect({ top: 400, left: 40, width: 200, height: 900 }, view);
    expect(delta.y).toBe(280);
  });
});

describe("scrollTourTargetIntoView", () => {
  const originalInnerHeight = window.innerHeight;
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.scrollTop = 0;
    Object.defineProperty(window, "innerHeight", { value: originalInnerHeight, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: originalInnerWidth, configurable: true });
  });

  it("accounts for the header and the tour bar when measuring insets", () => {
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    const header = document.createElement("header");
    mockRect(header, { top: 0, left: 0, width: 800, height: 88 });
    document.body.append(header);
    const bar = document.createElement("div");
    bar.setAttribute("data-tour-chrome", "bar");
    mockRect(bar, { top: 704, left: 0, width: 800, height: 96 });
    document.body.append(bar);
    const insets = measureTourInsets();
    expect(insets.top).toBeGreaterThanOrEqual(108);
    expect(insets.bottom).toBeGreaterThanOrEqual(116);
  });

  it("scrolls the page until a low target is in the safe window", () => {
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 4000,
      configurable: true,
    });
    document.documentElement.scrollTop = 0;

    const target = document.createElement("div");
    document.body.append(target);
    mockRect(target, { top: 920, left: 80, width: 220, height: 44 });

    const moved = scrollTourTargetIntoView(target);
    expect(moved).toBe(true);
    expect(document.documentElement.scrollTop).toBeGreaterThan(500);
  });

  it("scrolls a nested pane even when the target is inside a fixed dialog", () => {
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });

    const dialog = document.createElement("div");
    dialog.style.position = "fixed";
    const pane = document.createElement("div");
    pane.style.overflowY = "auto";
    Object.defineProperty(pane, "scrollHeight", { value: 900, configurable: true });
    Object.defineProperty(pane, "clientHeight", { value: 320, configurable: true });
    pane.scrollTop = 0;
    const target = document.createElement("div");
    pane.append(target);
    dialog.append(pane);
    document.body.append(dialog);

    mockRect(pane, { top: 90, left: 40, width: 480, height: 320 });
    mockRect(target, { top: 560, left: 56, width: 400, height: 72 });

    const moved = scrollTourTargetIntoView(target);
    expect(moved).toBe(true);
    expect(pane.scrollTop).toBeGreaterThan(100);
  });

  it("scrolls the page up when the target is tucked under the header", () => {
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 4000,
      configurable: true,
    });
    document.documentElement.scrollTop = 640;

    const target = document.createElement("div");
    document.body.append(target);
    mockRect(target, { top: 18, left: 80, width: 220, height: 44 });

    const moved = scrollTourTargetIntoView(target);
    expect(moved).toBe(true);
    expect(document.documentElement.scrollTop).toBeLessThan(640);
  });
});
