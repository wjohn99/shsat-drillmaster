import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import {
  normalizeWorksheetProgressSave,
  worksheetProgressDocId,
  type WorksheetProgressSave,
} from "@/lib/worksheetProgressStorage";

export const WORKSHEET_PROGRESS_COLLECTION = "worksheet_progress";

function progressDoc(userId: string, scopeId: string) {
  return doc(getFirebaseDb(), WORKSHEET_PROGRESS_COLLECTION, worksheetProgressDocId(userId, scopeId));
}

function toFirestorePayload(save: WorksheetProgressSave) {
  return {
    userId: save.userId,
    scopeId: save.scopeId,
    runSource: save.runSource,
    assignmentId: save.assignmentId,
    title: save.title,
    tagCodes: save.tagCodes,
    questionIds: save.questionIds,
    currentQuestionIndex: save.currentQuestionIndex,
    answers: save.answers,
    flagged: save.flagged,
    lockedQuestionIds: save.lockedQuestionIds,
    eliminated: save.eliminated,
    events: save.events,
    revealAnswers: save.revealAnswers,
    tutorUid: save.tutorUid,
    startedAt: save.startedAt,
    updatedAt: save.updatedAt,
  };
}

export async function saveWorksheetProgress(save: WorksheetProgressSave): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser?.uid !== save.userId) {
    throw new Error("You must be signed in to save worksheet progress.");
  }
  await setDoc(progressDoc(save.userId, save.scopeId), toFirestorePayload(save));
}

export async function fetchWorksheetProgress(
  userId: string,
  scopeId: string,
): Promise<WorksheetProgressSave | null> {
  const auth = getFirebaseAuth();
  if (auth.currentUser?.uid !== userId) {
    throw new Error("You must be signed in to load worksheet progress.");
  }
  const snapshot = await getDoc(progressDoc(userId, scopeId));
  if (!snapshot.exists()) return null;
  return normalizeWorksheetProgressSave(snapshot.data());
}

export async function fetchWorksheetProgressForUser(
  userId: string,
): Promise<WorksheetProgressSave[]> {
  const auth = getFirebaseAuth();
  if (auth.currentUser?.uid !== userId) {
    throw new Error("You must be signed in to load worksheet progress.");
  }
  const snapshot = await getDocs(
    query(
      collection(getFirebaseDb(), WORKSHEET_PROGRESS_COLLECTION),
      where("userId", "==", userId),
    ),
  );
  return snapshot.docs
    .map((docSnap) => normalizeWorksheetProgressSave(docSnap.data()))
    .filter((save): save is WorksheetProgressSave => save != null);
}

export async function clearWorksheetProgress(userId: string, scopeId: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser?.uid !== userId) {
    throw new Error("You must be signed in to clear worksheet progress.");
  }
  await deleteDoc(progressDoc(userId, scopeId));
}
