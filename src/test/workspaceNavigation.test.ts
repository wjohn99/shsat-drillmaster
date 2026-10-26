import { describe, expect, it } from "vitest";
import { parseWorkspaceCardParam, workspaceBoardPath } from "@/lib/workspaceNavigation";

describe("workspaceBoardPath", () => {
  it("opens a board without a card", () => {
    expect(workspaceBoardPath("student-1")).toBe("/workspace/student-1");
  });

  it("opens the card from a notification", () => {
    expect(workspaceBoardPath("student-1", "card-hi")).toBe(
      "/workspace/student-1?card=card-hi",
    );
  });
});

describe("parseWorkspaceCardParam", () => {
  it("reads the card id from search", () => {
    expect(parseWorkspaceCardParam("?card=card-hi")).toBe("card-hi");
    expect(parseWorkspaceCardParam("card=card-hi")).toBe("card-hi");
  });

  it("returns null when the card param is missing", () => {
    expect(parseWorkspaceCardParam("")).toBeNull();
    expect(parseWorkspaceCardParam("?attempt=self")).toBeNull();
  });
});
