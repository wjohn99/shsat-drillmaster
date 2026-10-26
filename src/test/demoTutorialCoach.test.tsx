// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const skipTutorial = vi.fn();
const nextStep = vi.fn();
const previousStep = vi.fn();

vi.mock("@/contexts/DemoTutorialContext", () => ({
  useDemoTutorial: () => ({
    active: true,
    stepIndex: 0,
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
  skipTutorial.mockClear();
  nextStep.mockClear();
  previousStep.mockClear();
});

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
      <MemoryRouter initialEntries={["/workspace"]}>
        <a
          data-tour="sample-board-link"
          href="/workspace/avery"
          onClick={(event) => {
            event.preventDefault();
            onClick();
          }}
        >
          Avery
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
