// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SessionItemReview } from "@/components/session/SessionItemReview";
import type { Question } from "@/types";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { role: "tutor" } }),
}));

vi.mock("@/components/question/ReportQuestionButton", () => ({
  ReportQuestionButton: () => null,
}));

afterEach(cleanup);

const question: Question = {
  id: "q1",
  subject: "MATH",
  module: "1",
  subtype: "MC4_A-D",
  stem: "What is 2 + 2?",
  choices: [
    { id: "q1-A", label: "A", text: "4", isCorrect: true },
    { id: "q1-B", label: "B", text: "5", isCorrect: false },
    { id: "q1-C", label: "C", text: "6", isCorrect: false },
    { id: "q1-D", label: "D", text: "7", isCorrect: false },
  ],
  tags: [],
  createdAt: "2026-01-01",
};

const events: SessionAnalyticsEvent[] = [
  {
    questionId: "q1",
    subject: "MATH",
    module: "1",
    correct: false,
    elapsedSeconds: 12,
    tags: [],
    answer: "q1-B",
  },
];

describe("SessionItemReview", () => {
  it("opens the missed question with the student answer and the key", () => {
    render(
      <SessionItemReview
        questions={[question]}
        events={events}
        viewerRole="tutor"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Question 1, Incorrect/ }));
    expect(screen.getByText("What is 2 + 2?")).toBeTruthy();
    expect(screen.getByText("Student answer and key for this item.")).toBeTruthy();
    expect(screen.getByText(/Student chose B/)).toBeTruthy();
    expect(screen.getByText(/Correct answer: A/)).toBeTruthy();
  });
});
