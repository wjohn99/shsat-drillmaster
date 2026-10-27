import { describe, expect, it } from "vitest";
import { worksheetIdsAfterLink, worksheetIdsOnCard } from "@/lib/cardWorksheets";

describe("worksheets on a card", () => {
  it("keeps a worksheet that was saved before cards held a list", () => {
    expect(worksheetIdsOnCard({ assignmentId: "first" })).toEqual(["first"]);
  });

  it("adds another worksheet without dropping the first", () => {
    const existing = worksheetIdsOnCard({ assignmentId: "first" });
    expect(worksheetIdsAfterLink(existing, "second")).toEqual(["first", "second"]);
    expect(
      worksheetIdsOnCard({
        assignmentId: "first",
        assignmentIds: ["first", "second"],
      }),
    ).toEqual(["first", "second"]);
  });

  it("does not add the same worksheet twice", () => {
    expect(worksheetIdsAfterLink(["first", "second"], "first")).toEqual(["first", "second"]);
  });
});
