import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  JED_REVIEW_EMAIL,
  type QuestionReviewEntry,
  type QuestionReviewState,
} from "@/types/questionReview";

function reviewsCollection() {
  return collection(getFirebaseDb(), "question_reviews");
}

function reviewDoc(questionId: string) {
  return doc(getFirebaseDb(), "question_reviews", questionId);
}

function entriesCollection(questionId: string) {
  return collection(getFirebaseDb(), "question_reviews", questionId, "entries");
}

function entryDoc(questionId: string, tutorUid: string) {
  return doc(getFirebaseDb(), "question_reviews", questionId, "entries", tutorUid);
}

function toMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "toMillis" in value) {
    return (value as Timestamp).toMillis();
  }
  return 0;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function normalizeReviewEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

export function isJedReviewer(email?: string | null): boolean {
  return normalizeReviewEmail(email) === JED_REVIEW_EMAIL;
}

export function canReviewQuestions(role?: string | null): boolean {
  return role === "tutor";
}

function parseEntry(snap: DocumentSnapshot): QuestionReviewEntry {
  const data = snap.data() ?? {};
  return {
    tutorUid: asString(data.tutorUid) || snap.id,
    tutorName: asString(data.tutorName),
    tutorEmail: asString(data.tutorEmail),
    approved: data.approved === true,
    comment: asString(data.comment),
    suggestedEdits: asString(data.suggestedEdits),
    createdAtMs: toMs(data.createdAtMs) || toMs(data.createdAt),
    updatedAtMs: toMs(data.updatedAtMs) || toMs(data.updatedAt),
  };
}

function parseSummary(
  snap: DocumentSnapshot,
  entries: QuestionReviewEntry[] = [],
): QuestionReviewState {
  const data = snap.data() ?? {};
  const reviewerUids = asStringList(data.reviewerUids);
  return {
    questionId: asString(data.questionId) || snap.id,
    reviewerUids,
    awaitingJedApproval: data.awaitingJedApproval === true || reviewerUids.length > 0,
    jedApproved: data.jedApproved === true,
    jedApprovedAtMs: toMs(data.jedApprovedAtMs) || undefined,
    jedApprovedByUid: asString(data.jedApprovedByUid) || undefined,
    jedApprovedByEmail: asString(data.jedApprovedByEmail) || undefined,
    entries,
    updatedAtMs: toMs(data.updatedAtMs) || toMs(data.updatedAt),
  };
}

function emptyState(questionId: string): QuestionReviewState {
  return {
    questionId,
    reviewerUids: [],
    awaitingJedApproval: false,
    jedApproved: false,
    entries: [],
    updatedAtMs: 0,
  };
}

export async function fetchAllQuestionReviewStates(): Promise<Map<string, QuestionReviewState>> {
  const states = new Map<string, QuestionReviewState>();
  if (!isFirebaseConfigured) return states;

  const snapshot = await getDocs(reviewsCollection());
  for (const docSnap of snapshot.docs) {
    states.set(docSnap.id, parseSummary(docSnap));
  }
  return states;
}

export async function fetchQuestionReview(questionId: string): Promise<QuestionReviewState> {
  if (!isFirebaseConfigured) return emptyState(questionId);

  const [summarySnap, entriesSnap] = await Promise.all([
    getDoc(reviewDoc(questionId)),
    getDocs(entriesCollection(questionId)),
  ]);
  const entries = entriesSnap.docs.map(parseEntry);
  if (!summarySnap.exists()) {
    return {
      ...emptyState(questionId),
      reviewerUids: entries.map((entry) => entry.tutorUid),
      awaitingJedApproval: entries.length > 0,
      entries,
    };
  }
  return parseSummary(summarySnap, entries);
}

export function subscribeToQuestionReview(
  questionId: string,
  onChange: (state: QuestionReviewState) => void,
): () => void {
  if (!isFirebaseConfigured) {
    onChange(emptyState(questionId));
    return () => undefined;
  }

  let summary: QuestionReviewState | null = null;
  let entries: QuestionReviewEntry[] = [];

  const emit = () => {
    if (summary) {
      onChange({ ...summary, entries });
      return;
    }
    onChange({
      ...emptyState(questionId),
      reviewerUids: entries.map((entry) => entry.tutorUid),
      awaitingJedApproval: entries.length > 0,
      entries,
    });
  };

  const unsubSummary = onSnapshot(reviewDoc(questionId), (snap) => {
    summary = snap.exists() ? parseSummary(snap) : null;
    emit();
  });
  const unsubEntries = onSnapshot(entriesCollection(questionId), (snap) => {
    entries = snap.docs.map(parseEntry);
    emit();
  });

  return () => {
    unsubSummary();
    unsubEntries();
  };
}

export async function saveTutorQuestionReview(input: {
  questionId: string;
  tutorUid: string;
  tutorName: string;
  tutorEmail: string;
  comment: string;
  suggestedEdits: string;
}): Promise<QuestionReviewState> {
  const now = Date.now();
  const comment = input.comment.trim();
  const suggestedEdits = input.suggestedEdits.trim();

  const existingEntry = await getDoc(entryDoc(input.questionId, input.tutorUid));
  const createdAtMs = existingEntry.exists()
    ? toMs(existingEntry.data()?.createdAtMs) || now
    : now;

  await setDoc(entryDoc(input.questionId, input.tutorUid), {
    tutorUid: input.tutorUid,
    tutorName: input.tutorName,
    tutorEmail: input.tutorEmail,
    approved: true,
    comment,
    suggestedEdits,
    createdAtMs,
    updatedAtMs: now,
    updatedAt: serverTimestamp(),
  });

  const summaryRef = reviewDoc(input.questionId);
  const summarySnap = await getDoc(summaryRef);
  if (!summarySnap.exists()) {
    await setDoc(summaryRef, {
      questionId: input.questionId,
      reviewerUids: [input.tutorUid],
      awaitingJedApproval: true,
      jedApproved: false,
      updatedAtMs: now,
      updatedAt: serverTimestamp(),
    });
  } else if (summarySnap.data()?.jedApproved !== true) {
    await updateDoc(summaryRef, {
      questionId: input.questionId,
      reviewerUids: arrayUnion(input.tutorUid),
      awaitingJedApproval: true,
      updatedAtMs: now,
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(summaryRef, {
      questionId: input.questionId,
      reviewerUids: arrayUnion(input.tutorUid),
      updatedAtMs: now,
      updatedAt: serverTimestamp(),
    });
  }

  return fetchQuestionReview(input.questionId);
}

export async function approveQuestionAsJed(input: {
  questionId: string;
  jedUid: string;
  jedEmail: string;
}): Promise<QuestionReviewState> {
  if (!isJedReviewer(input.jedEmail)) {
    throw new Error("Only Jed can remove the provisional tag.");
  }

  const now = Date.now();
  const summaryRef = reviewDoc(input.questionId);
  const summarySnap = await getDoc(summaryRef);
  const existing = summarySnap.exists() ? summarySnap.data() : {};

  await setDoc(
    summaryRef,
    {
      questionId: input.questionId,
      reviewerUids: asStringList(existing?.reviewerUids),
      awaitingJedApproval: false,
      jedApproved: true,
      jedApprovedAtMs: now,
      jedApprovedByUid: input.jedUid,
      jedApprovedByEmail: normalizeReviewEmail(input.jedEmail),
      updatedAtMs: now,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return fetchQuestionReview(input.questionId);
}
