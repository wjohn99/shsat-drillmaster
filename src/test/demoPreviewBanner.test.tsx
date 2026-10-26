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
    isDemoMode: true,
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

afterEach(cleanup);

function renderHeader(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  );
}

describe("demo preview Exit demo button", () => {
  it("stays right-aligned on workspace and on other tabs", () => {
    const { unmount } = renderHeader("/workspace");
    const workspaceBanner = screen.getByTestId("demo-preview-banner");
    expect(workspaceBanner.className).toContain("justify-end");
    expect(screen.getByRole("button", { name: "Exit demo" })).toBeTruthy();
    expect(screen.getByText("Workspace shows sample students only.").className).toContain("mr-auto");
    unmount();

    renderHeader("/worksheets");
    const otherBanner = screen.getByTestId("demo-preview-banner");
    expect(otherBanner.className).toContain("justify-end");
    expect(screen.queryByText("Workspace shows sample students only.")).toBeNull();
    expect(screen.getByRole("button", { name: "Exit demo" }).className).toContain("shrink-0");
  });
});
