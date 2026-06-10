import { getTagLabel } from "@/data/taggingScheme";
import {
  formatModuleForSheet,
  isPassageBasedType,
} from "@/data/questionSubmissionConstants";
import { savePassage } from "@/lib/passageLibrary";
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
    module: formatModuleForSheet(input.module),
    skillTag: input.skillTagCodes.join("; "),
    format: getTagLabel(input.format),
    passage: isPassageBasedType(input.type) ? input.passage.trim() : "",
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

  // text/plain avoids CORS preflight; GAS reads e.postData.contents as JSON.
  const response = await fetch(url, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });

  const text = await response.text();

  // GAS may return JSON on success, or HTML if the redirect chain breaks.
  if (text.trim().startsWith("{")) {
    return parseSheetResponse(text);
  }

  if (!response.ok) {
    throw new Error(`Submission failed (${response.status}). Please try again.`);
  }

  // Redirect succeeded but response body wasn't JSON — row may still have been written.
  return { questionId: "", pending: true };
}

export async function submitQuestion(
  input: QuestionSubmissionInput,
): Promise<QuestionSubmissionResult> {
  if (!SHEET_WEBHOOK_URL?.trim()) {
    throw new Error(
      "The question bank tracker is not linked yet. Submissions are not available until the Google Sheet is configured.",
    );
  }

  if (isPassageBasedType(input.type)) {
    savePassage(input.passageId, input.passage);
  }

  const payload = buildSubmissionPayload(input);

  try {
    return await postToSheet(JSON.stringify(payload));
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Could not reach the question bank tracker. Confirm the Apps Script is deployed, SPREADSHEET_ID is set, and you redeployed after the latest script update.",
      );
    }
    throw error;
  }
}

export function isSheetExportConfigured(): boolean {
  return Boolean(SHEET_WEBHOOK_URL?.trim());
}
