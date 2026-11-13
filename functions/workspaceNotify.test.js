const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isDemoWorkspaceBoard,
  newTutorProgressUpdates,
  parentLinkMatchesStudent,
  parentNotifyAudience,
  workspaceNotifyAudience,
  isSendableEmail,
  workspaceBoardUrl,
  normalizeEmail,
} = require("./workspaceNotify");

const board = {
  id: "student-1",
  studentUid: "student-1",
  studentEmail: "student@school.edu",
  assignedTutorUid: "tutor-1",
  assignedTutorEmail: "tutor@stepprep.com",
};

describe("workspaceNotifyAudience", () => {
  it("emails the assigned tutor when the board student posts", () => {
    assert.equal(workspaceNotifyAudience(board, "student-1"), "assigned_tutor");
  });

  it("emails that board's student when a tutor posts", () => {
    assert.equal(workspaceNotifyAudience(board, "tutor-1"), "board_student");
  });

  it("emails that board's student when any other tutor posts on it", () => {
    assert.equal(workspaceNotifyAudience(board, "tutor-2"), "board_student");
  });

  it("does not email a different student's address, only this board's student", () => {
    const otherBoard = { ...board, id: "student-2", studentUid: "student-2", studentEmail: "other@school.edu" };
    assert.equal(workspaceNotifyAudience(otherBoard, "tutor-1"), "board_student");
    assert.notEqual(otherBoard.studentEmail, board.studentEmail);
  });

  it("skips demo boards", () => {
    assert.equal(workspaceNotifyAudience({ ...board, demoAccount: true }, "student-1"), null);
    assert.equal(isDemoWorkspaceBoard({ demoAccount: true }), true);
  });

  it("skips missing actor or student", () => {
    assert.equal(workspaceNotifyAudience(board, ""), null);
    assert.equal(workspaceNotifyAudience({ ...board, studentUid: "" }, "tutor-1"), null);
  });
});

describe("isSendableEmail", () => {
  it("accepts real addresses and rejects sample demo mail", () => {
    assert.equal(isSendableEmail("Student@School.edu"), true);
    assert.equal(isSendableEmail("avery.chen.sample@example.com"), false);
    assert.equal(isSendableEmail("not-an-email"), false);
  });
});

describe("workspaceBoardUrl", () => {
  it("opens the student's own board path", () => {
    assert.equal(
      workspaceBoardUrl("https://stepprephub.com/", board),
      "https://stepprephub.com/workspace/student-1",
    );
  });

  it("opens the card that had the activity", () => {
    assert.equal(
      workspaceBoardUrl("https://stepprephub.com/", board, "card-hi"),
      "https://stepprephub.com/workspace/student-1?card=card-hi",
    );
  });
});

describe("parentNotifyAudience", () => {
  it("emails parents linked to this student when a tutor posts", () => {
    assert.equal(parentNotifyAudience(board, "tutor-1"), "linked_parents");
  });

  it("does not email parents when the student comments, uploads, or submits", () => {
    assert.equal(parentNotifyAudience(board, "student-1"), null);
  });

  it("does not email parents on a demo board", () => {
    assert.equal(parentNotifyAudience({ ...board, demoAccount: true }, "tutor-1"), null);
  });

  it("only matches a parent link for this student", () => {
    assert.equal(
      parentLinkMatchesStudent({ status: "approved", studentUid: "student-1" }, "student-1"),
      true,
    );
    assert.equal(
      parentLinkMatchesStudent({ status: "approved", studentUid: "student-2" }, "student-1"),
      false,
    );
    assert.equal(
      parentLinkMatchesStudent({ status: "pending", studentUid: "student-1" }, "student-1"),
      false,
    );
  });
});

describe("newTutorProgressUpdates", () => {
  const liveBoard = board;

  it("returns a new tutor progress update and ignores the student's own note", () => {
    const added = newTutorProgressUpdates(
      { progressUpdates: [{ id: "old", changed: "Earlier", createdByUid: "tutor-1" }] },
      {
        progressUpdates: [
          { id: "old", changed: "Earlier", createdByUid: "tutor-1", createdAtMs: 1 },
          {
            id: "new",
            changed: "Finished the algebra set.",
            next: "Reading set",
            createdByUid: "tutor-1",
            createdByName: "Ada",
            createdAtMs: 2,
          },
          {
            id: "student-note",
            changed: "I submitted my worksheet.",
            createdByUid: "student-1",
            createdAtMs: 3,
          },
        ],
      },
      liveBoard,
    );
    assert.deepEqual(
      added.map((row) => row.id),
      ["new"],
    );
    assert.equal(added[0].next, "Reading set");
  });

  it("does not email when the roadmap is saved without a new update", () => {
    const rows = [{ id: "old", changed: "Earlier", createdByUid: "tutor-1", createdAtMs: 1 }];
    assert.deepEqual(newTutorProgressUpdates({ progressUpdates: rows }, { progressUpdates: rows }, liveBoard), []);
  });

  it("skips demo boards", () => {
    assert.deepEqual(
      newTutorProgressUpdates(
        {},
        { progressUpdates: [{ id: "new", changed: "Hi", createdByUid: "tutor-1" }] },
        { ...liveBoard, demoAccount: true },
      ),
      [],
    );
  });
});

describe("normalizeEmail", () => {
  it("lowercases for comparisons", () => {
    assert.equal(normalizeEmail("Tutor@StepPrep.com"), "tutor@stepprep.com");
  });
});
