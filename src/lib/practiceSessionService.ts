import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { computeSessionAnalytics } from "@/lib/sessionAnalytics";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type {
  PracticeSessionRecord,
  PracticeSessionType,
  SavePracticeSessionInput,
} from "@/types/practiceSession";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

const PRACTICE_SESSIONS_COLLECTION = "practice_sessions";

function parseEvent(raw: unknown): SessionAnalyticsEvent {
  const e = raw as SessionAnalyticsEvent;
  return {
    questionId: e.questionId,
    subject: e.subject,
    difficulty: e.difficulty,
    correct: Boolean(e.correct),
    elapsedSeconds: Number(e.elapsedSeconds) || 0,
    tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
  };
}

function parsePracticeSession(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): PracticeSessionRecord {
  const data = snapshot.data();
  const rawEvents = (data.events as unknown[]) ?? [];
  return {
    id: snapshot.id,
    userId: data.userId as string,
    sessionType: data.sessionType as PracticeSessionType,
    assignmentId: (data.assignmentId as string | null) ?? null,
    tutorUid: (data.tutorUid as string | null) ?? null,
    title: (data.title as string) ?? "Practice session",
    tagCodes: (data.tagCodes as string[]) ?? [],
    questionIds: (data.questionIds as string[]) ?? [],
    questionsAnswered: Number(data.questionsAnswered) || 0,
    correctCount: Number(data.correctCount) || 0,
    accuracyPct: Number(data.accuracyPct) || 0,
    totalTimeSeconds: Number(data.totalTimeSeconds) || 0,
    events: rawEvents.map(parseEvent),
    completedAt: data.completedAt,
  };
}

export async function savePracticeSession(
  input: SavePracticeSessionInput,
): Promise<string> {
  const auth = getFirebaseAuth();
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("You must be signed in to save practice results.");
  }

  const summary = computeSessionAnalytics(input.events);
  const totalTimeSeconds = input.events.reduce((s, e) => s + e.elapsedSeconds, 0);

  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, PRACTICE_SESSIONS_COLLECTION), {
    userId,
    sessionType: input.sessionType,
    assignmentId: input.assignmentId ?? null,
    tutorUid: input.tutorUid ?? null,
    title: input.title,
    tagCodes: input.tagCodes,
    questionIds: input.questionIds,
    questionsAnswered: summary.total,
    correctCount: summary.correct,
    accuracyPct: summary.accuracyPct,
    totalTimeSeconds: Number(totalTimeSeconds.toFixed(1)),
    events: input.events,
    completedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function fetchPracticeSessionsForStudent(
  sessionTypes?: PracticeSessionType[],
): Promise<PracticeSessionRecord[]> {
  const auth = getFirebaseAuth();
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("You must be signed in to view practice history.");
  }

  const db = getFirebaseDb();
  const sessionsQuery = query(
    collection(db, PRACTICE_SESSIONS_COLLECTION),
    where("userId", "==", userId),
  );
  const snapshot = await getDocs(sessionsQuery);
  let rows = snapshot.docs.map(parsePracticeSession);

  if (sessionTypes && sessionTypes.length > 0) {
    const allowed = new Set(sessionTypes);
    rows = rows.filter((r) => allowed.has(r.sessionType));
  }

  return rows.sort(
    (a, b) => (b.completedAt?.toMillis?.() ?? 0) - (a.completedAt?.toMillis?.() ?? 0),
  );
}

/** Most recent saved attempt for an assignment (student — current user). */
export async function fetchLatestAssignmentSessionForStudent(
  assignmentId: string,
): Promise<PracticeSessionRecord | null> {
  const sessions = await fetchPracticeSessionsForStudent(["assignment"]);
  return sessions.find((s) => s.assignmentId === assignmentId) ?? null;
}

/** Most recent student attempt on an assignment (tutor view). */
export async function fetchLatestAssignmentSessionForTutor(
  assignmentId: string,
): Promise<PracticeSessionRecord | null> {
  const sessions = await fetchPracticeSessionsForTutor();
  return sessions.find((s) => s.assignmentId === assignmentId) ?? null;
}

export async function fetchPracticeSessionsForTutor(): Promise<PracticeSessionRecord[]> {
  const auth = getFirebaseAuth();
  const tutorUid = auth.currentUser?.uid;
  if (!tutorUid) {
    throw new Error("You must be signed in to view class practice data.");
  }

  const db = getFirebaseDb();
  const sessionsQuery = query(
    collection(db, PRACTICE_SESSIONS_COLLECTION),
    where("tutorUid", "==", tutorUid),
    where("sessionType", "==", "assignment"),
  );
  const snapshot = await getDocs(sessionsQuery);
  return snapshot.docs
    .map(parsePracticeSession)
    .sort(
      (a, b) => (b.completedAt?.toMillis?.() ?? 0) - (a.completedAt?.toMillis?.() ?? 0),
    );
}
