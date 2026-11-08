// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DiagnosticSectionMap,
  type DiagnosticMapCell,
} from "@/components/diagnostic/DiagnosticSectionMap";

function cell(partial: Partial<DiagnosticMapCell> & Pick<DiagnosticMapCell, "id" | "number">): DiagnosticMapCell {
  return {
    current: false,
    answered: false,
    locked: true,
    flagged: false,
    canJump: false,
    ...partial,
  };
}

describe("DiagnosticSectionMap during an exam", () => {
  it("marks answered questions in bold and keeps green and red off the grid", () => {
    render(
      <DiagnosticSectionMap
        subject="ELA"
        answered={1}
        total={3}
        jumpHint="Items lock when you advance."
        cells={[
          cell({ id: "q1", number: 1, current: true, answered: true, locked: false }),
          cell({ id: "q2", number: 2, answered: true }),
          cell({ id: "q3", number: 3 }),
        ]}
        onJump={vi.fn()}
      />,
    );

    const current = screen.getByRole("button", { name: "Question 1, current, answered" });
    const answered = screen.getByRole("button", { name: "Question 2, answered, locked" });
    const blank = screen.getByRole("button", { name: "Question 3, locked" });

    expect(current.className).toContain("font-bold");
    expect(current.className).toContain("bg-primary");
    expect(answered.className).toContain("font-bold");
    expect(answered.className).toContain("border-foreground");
    expect(blank.className).toContain("font-medium");
    expect(blank.className).not.toContain("border-foreground");

    for (const button of [current, answered, blank]) {
      expect(button.className).not.toContain("bg-success");
      expect(button.className).not.toContain("bg-destructive");
    }

    expect(screen.getByText("Answered")).toBeTruthy();
    expect(screen.queryByText("Correct")).toBeNull();
    expect(screen.queryByText("Incorrect")).toBeNull();
  });
});
