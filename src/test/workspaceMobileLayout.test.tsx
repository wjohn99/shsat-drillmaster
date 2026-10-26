// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: {
      uid: "tutor-1",
      role: "tutor",
      displayName: "John",
      email: "tutor@example.com",
      photoURL: null,
    },
    isDemoMode: false,
    demoBusy: false,
    exitDemoMode: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/ViewAsStudentContext", () => ({
  useViewAsStudent: () => ({
    viewAs: null,
    enterViewAsStudent: vi.fn(),
    exitViewAsStudent: vi.fn(),
  }),
}));

vi.mock("@/contexts/DemoTutorialContext", () => ({
  useDemoTutorial: () => ({ maybeAutoStart: vi.fn() }),
}));

vi.mock("@/contexts/ExamLockContext", () => ({
  useExamLock: () => ({ locked: false, requestLeave: vi.fn() }),
}));

import { Header } from "@/components/layout/Header";
import { StudentQuickActions } from "@/components/workspace/StudentQuickActions";

afterEach(cleanup);

describe("workspace mobile layout", () => {
  it("keeps home-card actions visible in one compact row on desktop", () => {
    const { container } = render(
      <MemoryRouter>
        <StudentQuickActions
          compact
          studentUid="s1"
          studentName="Avery"
          showOpenBoard={false}
          showFirstDiagnostic={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Assign worksheet" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "View as student" })).toBeTruthy();
    const row = container.firstElementChild;
    expect(row?.className).toContain("flex");
    expect(row?.className).toContain("flex-wrap");
    expect(row?.className).toContain("max-sm:grid-cols-2");
    expect(row?.className).not.toMatch(/(^|\s)grid(\s|$)/);
    expect(row?.className).not.toContain("hidden");
    expect(screen.getByRole("link", { name: "Assign worksheet" }).className).toContain("h-8");
    expect(screen.getByRole("link", { name: "Assign worksheet" }).className).toContain("text-xs");
  });

  it("uses the hamburger menu below the desktop breakpoint so Fold inner does not cram nav pills", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    const menu = screen.getByRole("button", { name: "Open menu" });
    expect(menu.className).toContain("lg:hidden");
    expect(menu.className).not.toMatch(/\bmd:hidden\b/);

    const nav = document.querySelector("[data-tour='tutor-nav']");
    expect(nav?.className).toContain("lg:flex");
    expect(nav?.className).toContain("hidden");
  });
});
