import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { UserRole } from "@/types/auth";
import type {
  QuestionReport,
  QuestionReportReason,
  QuestionReportRole,
  QuestionReportSource,
} from "@/types/questionReport";
import { QUESTION_REPORT_COMMENT_MAX, QUESTION_REPORT_REASONS } from "@/types/questionReport";

export const QUESTION_REPORTS_COLLECTION = "question_reports";
export { QUESTION_REPORT_COMMENT_MAX };

function reportsCollection() {
  return collection(getFirebaseDb(), QUESTION_REPORTS_COLLECTION);
}

export function questionReportDocId(questionId: string, reporterUid: string): string {
  return `${questionId.replace(/\//g, "_")}__${reporterUid}`;
}

function reportDoc(questionId: string, reporterUid: string) {
  return doc(getFirebaseDb(), QUESTION_REPORTS_COLLECTION, questionReportDocId(questionId, reporterUid));
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isReason(value: unknown): value is QuestionReportReason {
  return QUESTION_REPORT_REASONS.some((item) => item.id === value);
}

function isReportRole(value: unknown): value is QuestionReportRole {
  return value === "student" || value === "tutor" || value === "demo";
}

export function canReportQuestions(role?: UserRole | null): boolean {
  return role === "student" || role === "tutor" || role === "demo";
}

export function canManageQuestionReports(role?: UserRole | null): boolean {
  return role === "tutor";
}

function parseReport(snap: DocumentSnapshot): QuestionReport | null {
  if (!snap.exists()) return null;
  const data = snap.data() ?? {};
  const reason = data.reason;
  const reporterRole = data.reporterRole;
  if (!isReason(reason) || !isReportRole(reporterRole)) return null;
  const status = data.status === "resolved" ? "resolved" : "open";
  return {
    id: snap.id,
    questionId: asString(data.questionId),
    reporterUid: asString(data.reporterUid),
    reporterName: asString(data.reporterName),
    reporterEmail: asString(data.reporterEmail),
    reporterRole,
    reason,
    comment: asString(data.comment),
    source: asString(data.source) as QuestionReportSource,
    status,
    createdAtMs: asNumber(data.createdAtMs),
    updatedAtMs: asNumber(data.updatedAtMs),
    ...(asNumber(data.resolvedAtMs) ? { resolvedAtMs: asNumber(data.resolvedAtMs) } : {}),
    ...(asString(data.resolvedByUid) ? { resolvedByUid: asString(data.resolvedByUid) } : {}),
    ...(asString(data.resolvedByName) ? { resolvedByName: asString(data.resolvedByName) } : {}),
    ...(asNumber(data.contentVersion) ? { contentVersion: asNumber(data.contentVersion) } : {}),
  };
}

export async function fetchMyQuestionReport(
  questionId: string,
): Promise<QuestionReport | null> {
  if (!isFirebaseConfigured) return null;
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) return null;
  const snap = await getDoc(reportDoc(questionId, uid));
  return parseReport(snap);
}

export async function fetchQuestionReports(questionId: string): Promise<QuestionReport[]> {
  if (!isFirebaseConfigured) return [];
  const snapshot = await getDocs(
    query(reportsCollection(), where("questionId", "==", questionId)),
  );
  return snapshot.docs
    .map((docSnap) => parseReport(docSnap))
    .filter((row): row is QuestionReport => row !== null)
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
}

export function subscribeOpenQuestionReports(
  onChange: (reports: QuestionReport[]) => void,
): Unsubscribe {
  const q = query(reportsCollection(), where("status", "==", "open"));
  return onSnapshot(
    q,
    (snapshot) => {
      const reports = snapshot.docs
        .map((docSnap) => parseReport(docSnap))
        .filter((row): row is QuestionReport => row !== null)
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onChange(reports);
    },
    () => onChange([]),
  );
}

export async function submitQuestionReport(input: {
  questionId: string;
  reason: QuestionReportReason;
  comment: string;
  source: QuestionReportSource;
  reporterName: string;
  reporterEmail: string;
  reporterRole: QuestionReportRole;
  contentVersion?: number;
}): Promise<QuestionReport> {
  const auth = getFirebaseAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("You must be signed in to report a question.");
  }
  const comment = input.comment.trim();
  if (!comment) {
    throw new Error("Add a short note about what is wrong.");
  }
  if (comment.length > QUESTION_REPORT_COMMENT_MAX) {
    throw new Error("Keep the note under 2,000 characters.");
  }
  const now = Date.now();
  const ref = reportDoc(input.questionId, uid);
  const existing = await getDoc(ref);
  const createdAtMs = existing.exists() ? asNumber(existing.data()?.createdAtMs) || now : now;
  const payload = {
    questionId: input.questionId,
    reporterUid: uid,
    reporterName: input.reporterName.trim().slice(0, 200),
    reporterEmail: input.reporterEmail.trim().slice(0, 320),
    reporterRole: input.reporterRole,
    reason: input.reason,
    comment: comment.slice(0, QUESTION_REPORT_COMMENT_MAX),
    source: input.source,
    status: "open" as const,
    createdAtMs,
    updatedAtMs: now,
    ...(input.contentVersion ? { contentVersion: input.contentVersion } : {}),
  };
  await setDoc(ref, payload);
  const saved = await getDoc(ref);
  const parsed = parseReport(saved);
  if (!parsed) {
    throw new Error("Could not save the report.");
  }
  return parsed;
}

export async function resolveQuestionReport(input: {
  reportId: string;
  resolvedByUid: string;
  resolvedByName: string;
}): Promise<void> {
  const now = Date.now();
  await updateDoc(doc(getFirebaseDb(), QUESTION_REPORTS_COLLECTION, input.reportId), {
    status: "resolved",
    resolvedAtMs: now,
    resolvedByUid: input.resolvedByUid,
    resolvedByName: input.resolvedByName.trim().slice(0, 200),
    updatedAtMs: now,
  });
}
