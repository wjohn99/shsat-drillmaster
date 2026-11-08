// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const skipTutorial = vi.fn();
const nextStep = vi.fn();
const previousStep = vi.fn();
const tutorial = vi.hoisted(() => ({ stepIndex: 0 }));

vi.mock("@/contexts/DemoTutorialContext", () => ({
  useDemoTutorial: () => ({
    active: true,
    stepIndex: tutorial.stepIndex,
    nextStep,
    previousStep,
    skipTutorial,
    maybeAutoStart: vi.fn(),
  }),
}));

vi.mock("@/contexts/ExamLockContext", () => ({
  useExamLock: () => ({ locked: false }),
}));

import { clickTourTarget, DemoTutorialCoach } from "@/components/demo/DemoTutorialCoach";

afterEach(() => {
  cleanup();
  tutorial.stepIndex = 0;
  skipTutorial.mockClear();
  nextStep.mockClear();
  previousStep.mockClear();
});

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

describe("DemoTutorialCoach", () => {
  it("keeps a clear Exit tour control on the bottom bar", () => {
    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <DemoTutorialCoach />
      </MemoryRouter>,
    );
    const exit = screen.getByRole("button", { name: "Exit tour" });
    expect(exit.className).toMatch(/border-2/);
    expect(exit.closest("[data-tour-chrome='bar']")).toBeTruthy();
    fireEvent.click(exit);
    expect(skipTutorial).toHaveBeenCalledTimes(1);
  });

  it("clicks the next step target, then advances", async () => {
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as typeof window.matchMedia;

    const onClick = vi.fn();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <a
          data-tour="nav-question-bank"
          href="/question-bank"
          onClick={(event) => {
            event.preventDefault();
            onClick();
          }}
        >
          Question Bank
        </a>
        <DemoTutorialCoach />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(nextStep).toHaveBeenCalledTimes(1));
  });

  it("clicks the card button inside a session-2 tour target", () => {
    const onOpen = vi.fn();
    render(
      <div data-tour="session-2-card">
        <div role="button" onClick={onOpen}>
          10.12.26 Session 2
        </div>
      </div>,
    );
    const node = document.querySelector<HTMLElement>('[data-tour="session-2-card"]');
    expect(node).toBeTruthy();
    clickTourTarget(node!);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("drops the highlight when Back lands before the step target exists", async () => {
    tutorial.stepIndex = 10;
    const { rerender } = render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <div data-tour="sample-boards">Boards</div>
        <DemoTutorialCoach />
      </MemoryRouter>,
    );
    const boards = document.querySelector<HTMLElement>('[data-tour="sample-boards"]');
    expect(boards).toBeTruthy();
    mockRect(boards!, { top: 180, left: 48, width: 360, height: 160 });

    await waitFor(() => {
      const hole = document.querySelector<HTMLElement>("[data-tour-hole]");
      expect(document.querySelector("[data-tour-spotlight]")?.getAttribute("data-state")).toBe("on");
      expect(hole?.dataset.open).toBe("true");
      expect(hole?.getAttribute("rx")).toBe("16");
    });

    tutorial.stepIndex = 9;
    rerender(
      <MemoryRouter initialEntries={["/workspace"]}>
        <div data-tour="sample-boards">Boards</div>
        <DemoTutorialCoach />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const spot = document.querySelector<HTMLElement>("[data-tour-spotlight]");
      expect(spot?.getAttribute("data-state")).toBe("off");
      expect(document.querySelector<HTMLElement>("[data-tour-hole]")?.dataset.open).toBe("false");
      expect(document.querySelector(".ring-primary\\/90")).toBeNull();
    });
  });

  it("exits on Escape", () => {
    render(
      <MemoryRouter initialEntries={["/workspace"]}>
        <DemoTutorialCoach />
      </MemoryRouter>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(skipTutorial).toHaveBeenCalledTimes(1);
  });
});
