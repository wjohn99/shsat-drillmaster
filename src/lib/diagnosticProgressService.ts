import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { SHSAT_DIAGNOSTIC_SPEC } from "@/data/shsatDiagnosticForm";
import {
  normalizeDiagnosticExamSave,
  type DiagnosticExamSave,
} from "@/lib/diagnosticExamStorage";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

export const DIAGNOSTIC_PROGRESS_COLLECTION = "diagnostic_progress";

export type DiagnosticProgressRow = {
  userId: string;
  save: DiagnosticExamSave;
};

function progressDoc(userId: string) {
  return doc(getFirebaseDb(), DIAGNOSTIC_PROGRESS_COLLECTION, userId);
}

function toFirestorePayload(userId: string, save: DiagnosticExamSave) {
  return {
    userId,
    specId: save.specId,
    startedAt: save.startedAt,
    deadlineAt: save.deadlineAt,
    paused: save.paused,
    remainingSeconds: Math.max(0, Math.floor(Number(save.remainingSeconds) || 0)),
    updatedAt: save.updatedAt,
    firstSection: save.firstSection,
    sectionIndex: save.sectionIndex,
    unitIndex: save.unitIndex,
    questionIndexInUnit: save.questionIndexInUnit,
    answers: save.answers,
    flagged: save.flagged,
    lockedUnitKeys: save.lockedUnitKeys,
    eliminated: save.eliminated,
    notepad: save.notepad,
    clockHidden: save.clockHidden,
    events: save.events,
  };
}

export async function saveDiagnosticProgress(
  userId: string,
  save: DiagnosticExamSave,
): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser?.uid !== userId) {
    throw new Error("You must be signed in to save diagnostic progress.");
  }
  await setDoc(progressDoc(userId), toFirestorePayload(userId, save), { merge: true });
}

export async function fetchDiagnosticProgress(
  userId: string,
): Promise<DiagnosticExamSave | null> {
  const auth = getFirebaseAuth();
  if (auth.currentUser?.uid !== userId) {
    throw new Error("You must be signed in to load diagnostic progress.");
  }
  const snapshot = await getDoc(progressDoc(userId));
  if (!snapshot.exists()) return null;
  return normalizeDiagnosticExamSave(snapshot.data());
}

export async function clearDiagnosticProgress(userId: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser?.uid !== userId) {
    throw new Error("You must be signed in to clear diagnostic progress.");
  }
  await deleteDoc(progressDoc(userId));
}

export async function fetchDiagnosticProgressForTutor(): Promise<DiagnosticProgressRow[]> {
  const auth = getFirebaseAuth();
  if (!auth.currentUser) {
    throw new Error("You must be signed in to view diagnostic progress.");
  }
  const snapshot = await getDocs(collection(getFirebaseDb(), DIAGNOSTIC_PROGRESS_COLLECTION));
  const rows: DiagnosticProgressRow[] = [];
  for (const docSnap of snapshot.docs) {
    const save = normalizeDiagnosticExamSave(docSnap.data());
    if (!save || save.specId !== SHSAT_DIAGNOSTIC_SPEC.id) continue;
    rows.push({ userId: String(docSnap.data().userId ?? docSnap.id), save });
  }
  return rows;
}
