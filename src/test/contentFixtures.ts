import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { loadDiagnosticQuestionCatalog, loadRevisedBank } from "@/data/questionCatalog";
import type { ContentTrack, Passage, Question } from "@/types";

export const ROOT = path.resolve(__dirname, "../..");
export const AUDIT_DIR = path.join(ROOT, "content/audit/2026-10-17");

export interface TrackContent {
  track: ContentTrack;
  questions: Question[];
  passages: Passage[];
}

/** Current content for each track: originals with revisions applied, held versions included. */
export function currentContent(): TrackContent[] {
  const bank = loadRevisedBank();
  const diagnostic = loadDiagnosticQuestionCatalog();
  return [
    { track: "bank", questions: bank.questions, passages: bank.passages },
    { track: "diagnostic", questions: diagnostic.questions, passages: diagnostic.passages },
  ];
}

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

/** Minimal CSV parser (quoted fields, embedded commas/newlines/quotes). */
export function readCsv(file: string): Record<string, string>[] {
  const text = readFileSync(file, "utf8");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0] !== "");
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

export interface LedgerEntry {
  key: string;
  disposition: "fixed" | "already-fixed" | "held" | "deferred" | "rejected";
  revision: string | null;
  note: string;
}

export function readLedger(): { file: string; entry: LedgerEntry }[] {
  const dir = path.join(AUDIT_DIR, "ledger");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .flatMap((f) => readJson<LedgerEntry[]>(path.join(dir, f)).map((entry) => ({ file: f, entry })));
}

export interface FindingIndexEntry {
  key: string;
  source: string;
  track: string;
  ids: string[];
  recommendation: string;
  required: boolean;
  severity: string;
  summary: string;
}

export function readFindingsIndex(): FindingIndexEntry[] {
  return readJson<{ findings: FindingIndexEntry[] }>(path.join(AUDIT_DIR, "findings-index.json")).findings;
}
