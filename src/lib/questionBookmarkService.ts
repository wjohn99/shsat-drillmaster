import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Question } from "@/types";

function bookmarksCollection(userId: string) {
  return collection(getFirebaseDb(), "users", userId, "bookmarks");
}

export async function fetchBookmarkedQuestionIds(userId: string): Promise<Set<string>> {
  const snapshot = await getDocs(bookmarksCollection(userId));
  return new Set(snapshot.docs.map((d) => d.id));
}

export async function setQuestionBookmark(
  userId: string,
  questionId: string,
  bookmarked: boolean,
): Promise<void> {
  const ref = doc(getFirebaseDb(), "users", userId, "bookmarks", questionId);
  if (bookmarked) {
    await setDoc(ref, { questionId, savedAt: serverTimestamp() });
  } else {
    await deleteDoc(ref);
  }
}

/** Overlay per-user bookmark state onto the static question catalog. */
export function applyBookmarksToQuestions(
  catalog: Question[],
  bookmarkedIds: Set<string>,
): Question[] {
  return catalog.map((q) => ({
    ...q,
    userBookmarked: bookmarkedIds.has(q.id),
  }));
}
