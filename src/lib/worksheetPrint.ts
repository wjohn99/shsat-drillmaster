import type { Passage, Question } from "@/types";
import { clusterQuestionsByPassage } from "@/lib/worksheetTagCatalog";

export const WORKSHEET_PRINT_STORAGE_KEY = "drillmaster.worksheetPrint.v1";
const PRINT_TTL_MS = 2 * 60 * 60 * 1000;

export type WorksheetPrintPayload = {
  title: string;
  subtitle?: string;
  questions: Question[];
  passages: Passage[];
};

type StoredPrintPayload = {
  createdAt: number;
  payload: WorksheetPrintPayload;
};

function passagesUsedByQuestions(questions: Question[], passages: Passage[]): Passage[] {
  const ids = new Set(
    questions.map((question) => question.passageId).filter((id): id is string => Boolean(id)),
  );
  return passages.filter((passage) => ids.has(passage.id));
}

export function openWorksheetPrintTab(input: WorksheetPrintPayload): void {
  if (input.questions.length === 0) return;
  const questions = clusterQuestionsByPassage(input.questions);
  const stored: StoredPrintPayload = {
    createdAt: Date.now(),
    payload: {
      title: input.title,
      subtitle: input.subtitle,
      questions,
      passages: passagesUsedByQuestions(questions, input.passages),
    },
  };
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(`${WORKSHEET_PRINT_STORAGE_KEY}:${id}`, JSON.stringify(stored));
  } catch {
    throw new Error("Could not open print view.");
  }
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  window.open(
    `${base}worksheets/print?id=${encodeURIComponent(id)}`,
    "_blank",
    "noopener",
  );
}

export function readWorksheetPrintPayload(id: string | null): WorksheetPrintPayload | null {
  if (!id) return null;
  const raw = localStorage.getItem(`${WORKSHEET_PRINT_STORAGE_KEY}:${id}`);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredPrintPayload;
    if (!stored?.payload?.questions?.length) return null;
    if (Date.now() - stored.createdAt > PRINT_TTL_MS) {
      localStorage.removeItem(`${WORKSHEET_PRINT_STORAGE_KEY}:${id}`);
      return null;
    }
    return stored.payload;
  } catch {
    return null;
  }
}

export type WorksheetPrintBlock =
  | { kind: "question"; question: Question; number: number }
  | {
      kind: "passage";
      passage: Passage;
      questions: Array<{ question: Question; number: number }>;
    };

export function buildWorksheetPrintBlocks(
  questions: Question[],
  passages: Passage[],
): WorksheetPrintBlock[] {
  const clustered = clusterQuestionsByPassage(questions);
  const passageById = new Map(passages.map((passage) => [passage.id, passage]));
  const numberById = new Map(clustered.map((question, index) => [question.id, index + 1]));
  const blocks: WorksheetPrintBlock[] = [];
  const usedPassages = new Set<string>();

  for (const question of clustered) {
    const number = numberById.get(question.id) ?? blocks.length + 1;
    if (!question.passageId) {
      blocks.push({ kind: "question", question, number });
      continue;
    }
    if (usedPassages.has(question.passageId)) continue;
    usedPassages.add(question.passageId);
    const grouped = clustered.filter((item) => item.passageId === question.passageId);
    const passage = passageById.get(question.passageId);
    if (!passage) {
      for (const item of grouped) {
        blocks.push({
          kind: "question",
          question: item,
          number: numberById.get(item.id) ?? 0,
        });
      }
      continue;
    }
    blocks.push({
      kind: "passage",
      passage,
      questions: grouped.map((item) => ({
        question: item,
        number: numberById.get(item.id) ?? 0,
      })),
    });
  }

  return blocks;
}
