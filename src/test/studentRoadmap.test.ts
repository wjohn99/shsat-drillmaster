import { describe, expect, it } from "vitest";
import {
  emptyStudentRoadmap,
  formatProgressUpdateLine,
  latestProgressUpdate,
  newRoadmapProgressUpdate,
  parseStudentRoadmap,
  serializeStudentRoadmap,
} from "@/lib/studentRoadmap";

describe("roadmap progress updates", () => {
  it("starts empty, keeps a note-only row, and drops rows with no update text", () => {
    expect(emptyStudentRoadmap().progressUpdates).toEqual([]);
    const parsed = parseStudentRoadmap({
      progressUpdates: [
        { next: "Only a next step" },
        {
          changed: "Finished homework",
          createdAtMs: Date.UTC(2026, 9, 10),
        },
        {
          id: "u1",
          date: "2026-10-19",
          changed: "Finished the algebra worksheet.",
          next: "A short reading set.",
          createdAtMs: Date.UTC(2026, 9, 19),
        },
      ],
    });
    expect(parsed.progressUpdates.map((row) => row.changed)).toEqual([
      "Finished the algebra worksheet.",
      "Finished homework",
    ]);
  });

  it("keeps newest first and writes a round-trip", () => {
    const older = newRoadmapProgressUpdate({
      changed: "Started linear equations.",
      next: "Finish the worksheet.",
      createdByUid: "t1",
      createdByName: "John",
      now: Date.UTC(2026, 9, 12),
    });
    const newer = newRoadmapProgressUpdate({
      changed: "Finished the worksheet.",
      next: "A reading set on Session 2.",
      createdByUid: "t1",
      createdByName: "John",
      now: Date.UTC(2026, 9, 19),
    });
    const parsed = parseStudentRoadmap(
      serializeStudentRoadmap({
        ...emptyStudentRoadmap(),
        progressUpdates: [older, newer],
      }),
    );
    expect(parsed.progressUpdates.map((row) => row.changed)).toEqual([
      "Finished the worksheet.",
      "Started linear equations.",
    ]);
    expect(latestProgressUpdate(parsed.progressUpdates)?.next).toBe(
      "A reading set on Session 2.",
    );
    expect(formatProgressUpdateLine(newer)).toContain("Next: A reading set on Session 2.");
    expect(formatProgressUpdateLine({ ...newer, next: "" })).toContain("Finished the worksheet.");
    expect(formatProgressUpdateLine({ ...newer, next: "" })).not.toContain("Next:");
  });
});
