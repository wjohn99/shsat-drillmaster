import type { Passage, Question } from "@/types";
import { diagnosticPassages } from "@/data/diagnosticPassages";
import { loadDiagnosticQuestionCatalog } from "@/data/questionCatalog";
import {
  DIAGNOSTIC_ELA_QUESTION_IDS,
  DIAGNOSTIC_MATH_QUESTION_IDS,
  SHSAT_DIAGNOSTIC_SPEC,
  type DiagnosticSubject,
} from "@/data/shsatDiagnosticForm";
import type { DiagnosticExamSave } from "@/lib/diagnosticExamStorage";
import { canSubmitQuestionAnswer, isQuestionAnswerCorrect } from "@/lib/sessionGrading";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

export type ElaPart = "reading" | "revising-editing" | "other";

export type DiagnosticUnit =
  | { kind: "standalone"; question: Question; elaPart: ElaPart }
  | { kind: "passageSet"; passageId: string; questions: Question[]; elaPart: ElaPart };

export interface DiagnosticSection {
  subject: DiagnosticSubject;
  questions: Question[];
  units: DiagnosticUnit[];
  missingIds: string[];
}

export interface AssembledDiagnosticExam {
  spec: typeof SHSAT_DIAGNOSTIC_SPEC;
  ela: DiagnosticSection;
  math: DiagnosticSection;
  elaReady: number;
  mathReady: number;
  isComplete: boolean;
}

function classifyElaPart(question: Question): ElaPart {
  if (question.subject !== "ELA") return "other";
  const codes = question.tags.map((t) => t.code);
  if (codes.some((c) => c.startsWith("RC-"))) return "reading";
  if (codes.some((c) => c.startsWith("RE-"))) return "revising-editing";
  return question.passageId ? "reading" : "other";
}

function resolveIds(
  ids: string[],
  byId: Map<string, Question>,
  expectedSubject: DiagnosticSubject,
): { questions: Question[]; missingIds: string[] } {
  const questions: Question[] = [];
  const missingIds: string[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    const question = byId.get(trimmed);
    if (!question || question.subject !== expectedSubject) {
      missingIds.push(trimmed);
      continue;
    }
    questions.push(question);
  }

  return { questions, missingIds };
}

export function groupDiagnosticUnits(questions: Question[]): DiagnosticUnit[] {
  const units: DiagnosticUnit[] = [];
  let i = 0;
  while (i < questions.length) {
    const current = questions[i];
    if (current.passageId) {
      const passageId = current.passageId;
      const group: Question[] = [];
      while (i < questions.length && questions[i].passageId === passageId) {
        group.push(questions[i]);
        i += 1;
      }
      units.push({
        kind: "passageSet",
        passageId,
        questions: group,
        elaPart: classifyElaPart(group[0]),
      });
    } else {
      units.push({
        kind: "standalone",
        question: current,
        elaPart: classifyElaPart(current),
      });
      i += 1;
    }
  }
  return units;
}

export function assembleDiagnosticExam(): AssembledDiagnosticExam {
  const catalog = loadDiagnosticQuestionCatalog().questions;
  const byId = new Map(catalog.map((q) => [q.id, q]));
  const elaResolved = resolveIds(DIAGNOSTIC_ELA_QUESTION_IDS, byId, "ELA");
  const mathResolved = resolveIds(DIAGNOSTIC_MATH_QUESTION_IDS, byId, "MATH");

  const ela: DiagnosticSection = {
    subject: "ELA",
    questions: elaResolved.questions,
    units: groupDiagnosticUnits(elaResolved.questions),
    missingIds: elaResolved.missingIds,
  };
  const math: DiagnosticSection = {
    subject: "MATH",
    questions: mathResolved.questions,
    units: groupDiagnosticUnits(mathResolved.questions),
    missingIds: mathResolved.missingIds,
  };

  return {
    spec: SHSAT_DIAGNOSTIC_SPEC,
    ela,
    math,
    elaReady: ela.questions.length,
    mathReady: math.questions.length,
    isComplete:
      ela.questions.length === SHSAT_DIAGNOSTIC_SPEC.elaCount &&
      math.questions.length === SHSAT_DIAGNOSTIC_SPEC.mathCount &&
      ela.missingIds.length === 0 &&
      math.missingIds.length === 0,
  };
}

export function unitQuestions(unit: DiagnosticUnit): Question[] {
  return unit.kind === "passageSet" ? unit.questions : [unit.question];
}

export function locateUnitQuestion(
  units: DiagnosticUnit[],
  questionId: string,
): { unitIndex: number; questionIndexInUnit: number } | null {
  for (let unitIndex = 0; unitIndex < units.length; unitIndex += 1) {
    const indexInUnit = unitQuestions(units[unitIndex]).findIndex((q) => q.id === questionId);
    if (indexInUnit >= 0) return { unitIndex, questionIndexInUnit: indexInUnit };
  }
  return null;
}

export function flattenSectionQuestions(section: DiagnosticSection): Question[] {
  return section.questions;
}

/** 1-based index among passage sets only (standalones are excluded). */
export function passageSetProgress(
  units: DiagnosticUnit[],
  unitIndex: number,
): { current: number; total: number } | null {
  if (units[unitIndex]?.kind !== "passageSet") return null;
  let current = 0;
  let total = 0;
  for (let i = 0; i < units.length; i += 1) {
    if (units[i].kind !== "passageSet") continue;
    total += 1;
    if (i === unitIndex) current = total;
  }
  return current > 0 ? { current, total } : null;
}

export function elaPartLabel(part: ElaPart): string {
  if (part === "reading") return "Reading Comprehension";
  if (part === "revising-editing") return "Revising & Editing";
  return "ELA";
}

export function passageForQuestion(
  question: Question,
  passages: Passage[] = diagnosticPassages,
): Passage | undefined {
  if (!question.passageId) return undefined;
  return passages.find((p) => p.id === question.passageId);
}

export function diagnosticExamQuestions(exam: AssembledDiagnosticExam): Question[] {
  return [...exam.ela.questions, ...exam.math.questions];
}

export function currentDiagnosticSection(
  exam: AssembledDiagnosticExam,
  save: Pick<DiagnosticExamSave, "firstSection" | "sectionIndex">,
) {
  const ordered = save.firstSection === "ELA" ? [exam.ela, exam.math] : [exam.math, exam.ela];
  return ordered[save.sectionIndex] ?? ordered[0];
}

export function countAnsweredDiagnosticItems(
  exam: AssembledDiagnosticExam,
  answers: Record<string, string>,
): { answered: number; total: number } {
  const questions = diagnosticExamQuestions(exam);
  const answered = questions.filter((q) => canSubmitQuestionAnswer(q, answers[q.id])).length;
  return { answered, total: questions.length };
}

export function buildDiagnosticCompletionEvents(
  exam: AssembledDiagnosticExam,
  answers: Record<string, string>,
  existingEvents: SessionAnalyticsEvent[] = [],
): SessionAnalyticsEvent[] {
  const byId = new Map(existingEvents.map((event) => [event.questionId, event]));
  return diagnosticExamQuestions(exam).map((question) => {
    const existing = byId.get(question.id);
    const answer = answers[question.id] ?? existing?.answer;
    return {
      questionId: question.id,
      subject: question.subject,
      module: question.module,
      correct: isQuestionAnswerCorrect(question, answer),
      elapsedSeconds: existing?.elapsedSeconds ?? 0,
      tags: question.tags.map((tag) => tag.code),
      ...(answer ? { answer } : {}),
    };
  });
}
