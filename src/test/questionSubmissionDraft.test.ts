// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  emptyQuestionSubmissionDraft,
  loadQuestionSubmissionDraft,
  loadQuestionSubmissionReceipts,
  questionSubmissionDraftHasContent,
  recordQuestionSubmissionReceipt,
  saveQuestionSubmissionDraft,
} from "@/lib/questionSubmissionDraft";

const uid = "tutor-1";

describe("question submission draft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("ignores a form that only has the author and default format", () => {
    const draft = { ...emptyQuestionSubmissionDraft, author: "Ada" };
    expect(questionSubmissionDraftHasContent(draft)).toBe(false);
    saveQuestionSubmissionDraft(uid, draft);
    expect(loadQuestionSubmissionDraft(uid)).toBeNull();
  });

  it("restores the question after it is saved", () => {
    const draft = { ...emptyQuestionSubmissionDraft, question: "What is 2 + 2?", section: "MATH" as const };
    saveQuestionSubmissionDraft(uid, draft);
    expect(loadQuestionSubmissionDraft(uid)?.question).toBe("What is 2 + 2?");
    expect(loadQuestionSubmissionDraft(uid)?.section).toBe("MATH");
  });

  it("drops a corrupt draft", () => {
    localStorage.setItem("drillmaster.questionSubmission.draft.tutor-1", "{");
    expect(loadQuestionSubmissionDraft(uid)).toBeNull();
  });

  it("keeps an In Review receipt and a sent receipt with no id", () => {
    recordQuestionSubmissionReceipt(uid, {
      questionId: "ELA-RC-004",
      question: "Which sentence best states the main idea?",
      submittedAt: 1_700_000_000_000,
    });
    recordQuestionSubmissionReceipt(uid, {
      questionId: "",
      pending: true,
      question: "A second question that did not get an id.",
      submittedAt: 1_700_000_100_000,
    });
    const receipts = loadQuestionSubmissionReceipts(uid);
    expect(receipts).toHaveLength(2);
    expect(receipts[0]).toMatchObject({ status: "Sent", pending: true, questionId: "" });
    expect(receipts[1]).toMatchObject({
      status: "In Review",
      pending: false,
      questionId: "ELA-RC-004",
    });
  });
});
