import { describe, expect, it } from "vitest";
import {
  WORKSHEET_SELF_SCOPE_ID,
  normalizeWorksheetProgressSave,
  pickNewerWorksheetProgress,
  worksheetProgressDocId,
  worksheetProgressIsStarted,
} from "@/lib/worksheetProgressStorage";

describe("worksheet progress storage", () => {
  it("builds a stable document id", () => {
    expect(worksheetProgressDocId("uid1", "assign-9")).toBe("uid1__assign-9");
    expect(worksheetProgressDocId("uid1", WORKSHEET_SELF_SCOPE_ID)).toBe("uid1__self");
  });

  it("treats a fresh empty save as not started", () => {
    const save = normalizeWorksheetProgressSave({
      userId: "uid1",
      scopeId: "assign-9",
      runSource: "assignment",
      questionIds: ["q1"],
      currentQuestionIndex: 0,
      answers: {},
      flagged: [],
      lockedQuestionIds: [],
      eliminated: {},
      events: [],
      startedAt: 10,
      updatedAt: 10,
    });
    expect(worksheetProgressIsStarted(save)).toBe(false);
  });

  it("treats notes-only progress as started", () => {
    const save = normalizeWorksheetProgressSave({
      userId: "uid1",
      scopeId: "assign-9",
      questionIds: ["q1"],
      currentQuestionIndex: 0,
      answers: {},
      flagged: [],
      lockedQuestionIds: [],
      eliminated: {},
      events: [],
      notepad: "Review the figure",
    });
    expect(worksheetProgressIsStarted(save)).toBe(true);
    expect(save?.notepad).toBe("Review the figure");
  });

  it("treats a locked or answered save as started", () => {
    const save = normalizeWorksheetProgressSave({
      userId: "uid1",
      scopeId: "assign-9",
      answers: { q1: "q1-B" },
      lockedQuestionIds: ["q1"],
      questionIds: ["q1"],
      currentQuestionIndex: 0,
      events: [],
    });
    expect(worksheetProgressIsStarted(save)).toBe(true);
    expect(save?.answers.q1).toBe("q1-B");
  });

  it("keeps the newer of two saves", () => {
    const older = normalizeWorksheetProgressSave({
      userId: "uid1",
      scopeId: "assign-9",
      answers: { q1: "old" },
      updatedAt: 1,
    });
    const newer = normalizeWorksheetProgressSave({
      userId: "uid1",
      scopeId: "assign-9",
      answers: { q1: "new" },
      updatedAt: 5,
    });
    expect(pickNewerWorksheetProgress(older, newer)?.answers.q1).toBe("new");
    expect(pickNewerWorksheetProgress(newer, older)?.answers.q1).toBe("new");
  });
});
