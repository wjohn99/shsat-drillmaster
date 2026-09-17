/**
 * Fall 2026 NYC SHSAT diagnostic form (2027 admissions).
 *
 * Official format (NYC Guide to the SHSAT for 2027 Admissions / NYCPS):
 * - Computer-adaptive on the real exam; this diagnostic is a fixed 100-item form
 *   that matches counts, timing, and navigation rules so a launch form can be imported.
 * - 50 ELA + 50 Math
 * - 180 minutes standard (360 with approved extended time)
 * - Student chooses which section to start; must finish a section before the other
 * - Must answer each item before advancing
 * - Passage sets (RC and Revising/Editing): review allowed until the set is submitted
 * - Standalone ELA and all Math: no return after advancing
 *
 * Form order lives in diagnosticQuestions.ts (imported from Diagnostic_100_for_John.xlsx).
 * Keep questions that share a passage consecutive so they stay one passage set.
 */
import {
  DIAGNOSTIC_FORM_ELA_IDS,
  DIAGNOSTIC_FORM_MATH_IDS,
} from "@/data/diagnosticQuestions";

export const SHSAT_DIAGNOSTIC_SPEC = {
  id: "shsat-2026-diagnostic-v1",
  name: "NYC SHSAT Diagnostic",
  admissionsYear: 2027,
  testSeason: "Fall 2026",
  elaCount: 50,
  mathCount: 50,
  standardMinutes: 180,
  extendedMinutes: 360,
} as const;

export type DiagnosticSubject = "ELA" | "MATH";

/** Ordered ELA item IDs (50). */
export const DIAGNOSTIC_ELA_QUESTION_IDS: string[] = [...DIAGNOSTIC_FORM_ELA_IDS];

/** Ordered Math item IDs (50). */
export const DIAGNOSTIC_MATH_QUESTION_IDS: string[] = [...DIAGNOSTIC_FORM_MATH_IDS];

/** IDs reserved for the diagnostic form — never used in Practice, Worksheets, Bank, or Blitz. */
export const DIAGNOSTIC_RESERVED_QUESTION_IDS: ReadonlySet<string> = new Set([
  ...DIAGNOSTIC_ELA_QUESTION_IDS,
  ...DIAGNOSTIC_MATH_QUESTION_IDS,
]);
