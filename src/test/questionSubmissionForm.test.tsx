// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    loading: false,
    profile: { uid: "tutor-1", displayName: "Ada Lovelace", role: "tutor" },
  }),
}));

vi.mock("@/lib/questionSubmissionService", () => ({
  isSheetExportConfigured: () => true,
  submitQuestion: vi.fn(),
}));

import { QuestionSubmissionForm } from "@/components/submission/QuestionSubmissionForm";

describe("question submission form draft", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("restores the question after the tutor leaves the page", async () => {
    const first = render(<QuestionSubmissionForm />);
    fireEvent.change(await screen.findByLabelText("Question"), {
      target: { value: "What is 2 + 2?" },
    });
    first.unmount();

    render(<QuestionSubmissionForm />);
    expect(await screen.findByText("Draft restored.")).toBeTruthy();
    expect((screen.getByLabelText("Question") as HTMLTextAreaElement).value).toBe("What is 2 + 2?");
  });
});
