// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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
    expect(screen.getAllByText(/Student chose B/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Correct answer: A/)).toBeTruthy();
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
  });

  it("maps a pre-rewrite choice id onto the current wrong choice", () => {
    const revised: Question = {
      ...question,
      id: "MATH-ALG-114",
      choices: [
        { id: "MATH-ALG-114-v2-a", label: "A", text: "14", isCorrect: false },
        { id: "MATH-ALG-114-v2-b", label: "B", text: "17", isCorrect: false },
        { id: "MATH-ALG-114-v2-c", label: "C", text: "32", isCorrect: false },
        { id: "MATH-ALG-114-v2-d", label: "D", text: "37", isCorrect: true },
      ],
    };
    render(
      <SessionItemReview
        questions={[revised]}
        events={[
          {
            questionId: "MATH-ALG-114",
            subject: "MATH",
            module: "2",
            correct: false,
            elapsedSeconds: 20,
            tags: [],
            answer: "MATH-ALG-114-c",
          },
        ]}
        viewerRole="tutor"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Question 1, Incorrect/ }));
    expect(screen.getAllByText(/Student chose C/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("32").length).toBeGreaterThan(0);
    expect(screen.getByText(/Correct answer: D/)).toBeTruthy();
  });

  it("tells the tutor when a scored item has no stored pick", () => {
    render(
      <SessionItemReview
        questions={[question]}
        events={[
          {
            questionId: "q1",
            subject: "MATH",
            module: "1",
            correct: false,
            elapsedSeconds: 12,
            tags: [],
          },
        ]}
        viewerRole="tutor"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Question 1, Incorrect/ }));
    expect(
      screen.getByText(/did not store which choice the student picked/),
    ).toBeTruthy();
  });

  it("builds a worksheet from the skills selected in the footer", () => {
    function WorksheetLanding() {
      const location = useLocation();
      return <pre>{JSON.stringify(location.state)}</pre>;
    }

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <Routes>
          <Route
            path="/review"
            element={
              <SessionItemReview
                questions={[
                  {
                    ...question,
                    tags: [
                      {
                        id: "alg",
                        domain: "MATH",
                        code: "ALG-LIN",
                        label: "Linear equations",
                      },
                      {
                        id: "word",
                        domain: "MATH",
                        code: "ALG-WP",
                        label: "Word problems",
                      },
                    ],
                  },
                ]}
                events={events}
                viewerRole="tutor"
                skillWorksheetStudentUid="student-1"
                skillWorksheetReturnTo="/workspace/student-1"
              />
            }
          />
          <Route path="/worksheets" element={<WorksheetLanding />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Question 1, Incorrect/ }));
    expect(
      screen.getByText("Select one or more skills, then build a worksheet for this student."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Build worksheet" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Linear equations" }));
    fireEvent.click(screen.getByRole("button", { name: "Word problems" }));
    fireEvent.click(screen.getByRole("link", { name: "Build worksheet" }));
    expect(screen.getByText(/"assignToStudentUid":"student-1"/)).toBeTruthy();
    expect(screen.getByText(/"suggestedTagCodes":\["ALG-LIN","ALG-WP"\]/)).toBeTruthy();
    expect(screen.getByText(/"returnTo":"\/workspace\/student-1"/)).toBeTruthy();
  });
});
