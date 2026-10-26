import { describe, expect, it } from "vitest";
import { mergeSubmittedQuestionIds } from "@/lib/worksheetQuestionHistory";

describe("mergeSubmittedQuestionIds", () => {
  it("unions account history with completed assigned worksheets", () => {
    const merged = mergeSubmittedQuestionIds(
      ["q-stored"],
      [
        {
          assignedToStudentUid: "stu-1",
          status: "completed",
          questionIds: ["q-done", "q-stored"],
        },
      ],
      "stu-1",
    );
    expect(merged.sort()).toEqual(["q-done", "q-stored"]);
  });

  it("ignores worksheets that are still open", () => {
    const merged = mergeSubmittedQuestionIds(
      [],
      [
        {
          assignedToStudentUid: "stu-1",
          status: "todo",
          questionIds: ["q-open"],
        },
      ],
      "stu-1",
    );
    expect(merged).toEqual([]);
  });

  it("ignores another student's completed worksheets", () => {
    const merged = mergeSubmittedQuestionIds(
      ["q-mine"],
      [
        {
          assignedToStudentUid: "stu-other",
          status: "completed",
          questionIds: ["q-theirs"],
        },
      ],
      "stu-1",
    );
    expect(merged).toEqual(["q-mine"]);
  });
});
