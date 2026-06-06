import { getTagLabel } from "@/data/taggingScheme";
import {
  formatModuleForSheet,
  formatSectionForSheet,
} from "@/data/questionSubmissionConstants";
import type {
  QuestionSubmissionInput,
  QuestionSubmissionPayload,
  QuestionSubmissionResult,
} from "@/types/questionSubmission";
import { DEFAULT_SUBMISSION_STATUS } from "@/types/questionSubmission";

const SHEET_WEBHOOK_URL = import.meta.env.VITE_QUESTION_SUBMISSION_SHEET_URL as
  | string
  | undefined;

function buildSubmissionPayload(input: QuestionSubmissionInput): QuestionSubmissionPayload {
  return {
    type: input.type,
    passageId: input.passageId.trim(),
    author: input.author.trim(),
    section: formatSectionForSheet(input.section),
    module: formatModuleForSheet(input.module),
    skillTag: getTagLabel(input.skillTagCode),
    format: getTagLabel(input.format),
    question: input.question.trim(),
    choiceA: input.choiceA.trim(),
    choiceB: input.choiceB.trim(),
    choiceC: input.choiceC.trim(),
    choiceD: input.choiceD.trim(),
    correctAnswer: input.correctAnswer,
    explanation: input.explanation.trim(),
    commonTrap: input.commonTrap.trim(),
    reviewer: "",
    status: DEFAULT_SUBMISSION_STATUS,
  };
}

function parseSheetResponse(text: string): QuestionSubmissionResult {
  const result = JSON.parse(text) as {
    ok?: boolean;
    questionId?: string;
    error?: string;
  };

  if (!result.ok || !result.questionId) {
    throw new Error(result.error || "Submission failed. Please try again.");
  }

  return { questionId: result.questionId };
}

async function postToSheet(body: string): Promise<QuestionSubmissionResult> {
  const url = SHEET_WEBHOOK_URL!.trim();

  try {
    const response = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Submission failed (${response.status}). Please try again.`);
    }

    return parseSheetResponse(text);
  } catch (error) {
    // GAS web apps often block reading the response (CORS). The row may still
    // have been written — retry with no-cors so the POST at least reaches the sheet.
    if (error instanceof TypeError || error instanceof SyntaxError) {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
      });

      return { questionId: "", pending: true };
    }

    throw error;
  }
}

export async function submitQuestion(
  input: QuestionSubmissionInput,
): Promise<QuestionSubmissionResult> {
  if (!SHEET_WEBHOOK_URL?.trim()) {
    throw new Error(
      "The question bank tracker is not linked yet. Submissions are not available until the Google Sheet is configured.",
    );
  }

  const payload = buildSubmissionPayload(input);
  return postToSheet(JSON.stringify(payload));
}

export function isSheetExportConfigured(): boolean {
  return Boolean(SHEET_WEBHOOK_URL?.trim());
}
