import { describe, expect, it } from "vitest";
import {
  WORKSHEET_SELF_SCOPE_ID,
} from "@/lib/worksheetProgressStorage";
import {
  parseWorksheetAttemptParam,
  worksheetAttemptSearch,
} from "@/types/worksheetsNavigation";

describe("worksheet attempt URL", () => {
  it("round-trips an assignment id and custom practice scope", () => {
    expect(parseWorksheetAttemptParam(worksheetAttemptSearch("assign-9"))).toBe("assign-9");
    expect(parseWorksheetAttemptParam(worksheetAttemptSearch(WORKSHEET_SELF_SCOPE_ID))).toBe(
      WORKSHEET_SELF_SCOPE_ID,
    );
  });

  it("reads the attempt from a full worksheets URL search string", () => {
    expect(parseWorksheetAttemptParam("?attempt=assign-9&x=1")).toBe("assign-9");
    expect(parseWorksheetAttemptParam("")).toBeNull();
    expect(parseWorksheetAttemptParam("?foo=bar")).toBeNull();
  });
});
