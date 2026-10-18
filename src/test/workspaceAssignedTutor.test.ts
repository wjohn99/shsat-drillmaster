import { describe, expect, it } from "vitest";
import { studentUidsAssignedToTutor } from "@/lib/workspaceService";

describe("studentUidsAssignedToTutor", () => {
  it("keeps students assigned to the tutor, including created-by fallback", () => {
    const boards = [
      { studentUid: "s1", assignedTutorUid: "t1", createdByUid: "t0" },
      { studentUid: "s2", assignedTutorUid: "t2", createdByUid: "t1" },
      { studentUid: "s3", createdByUid: "t1" },
    ];
    expect([...studentUidsAssignedToTutor(boards, "t1")].sort()).toEqual(["s1", "s3"]);
  });

  it("returns an empty set when no tutor is signed in", () => {
    expect(
      studentUidsAssignedToTutor([{ studentUid: "s1", createdByUid: "t1" }], undefined).size,
    ).toBe(0);
  });
});
