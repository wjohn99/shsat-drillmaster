// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DemoWelcomeDialog } from "@/components/auth/DemoWelcomeDialog";

afterEach(cleanup);

describe("DemoWelcomeDialog", () => {
  beforeEach(() => {
    sessionStorage.setItem("drillmaster.demoWelcome", "pending");
  });

  it("uses a larger window and type for the founding tutor welcome", () => {
    render(<DemoWelcomeDialog />);

    expect(screen.getByRole("heading", { name: "Welcome" }).className).toMatch(/text-3xl/);
    expect(screen.getByText(/thanks for being a founding tutor/i).className).toMatch(/text-lg/);
    expect(screen.getByRole("button", { name: "Continue" }).className).toMatch(/text-base/);

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/max-w-3xl/);
    expect(dialog.className).toMatch(/p-10/);
  });
});
