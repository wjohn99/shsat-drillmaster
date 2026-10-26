import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export const WORKSHEET_QUESTION_HISTORY_COLLECTION = "worksheet_question_history";

const ARRAY_UNION_CHUNK = 400;

export function mergeSubmittedQuestionIds(
  storedIds: Iterable<string> | null | undefined,
  completedAssignments: Array<{
    assignedToStudentUid: string;
    status: string;
    questionIds: string[];
  }>,
  studentUid: string,
): string[] {
  const ids = new Set<string>();
  for (const id of storedIds ?? []) {
    if (id) ids.add(String(id));
  }
  for (const row of completedAssignments) {
    if (row.assignedToStudentUid !== studentUid) continue;
    if (row.status !== "completed") continue;
    for (const id of row.questionIds ?? []) {
      if (id) ids.add(String(id));
    }
  }
  return [...ids];
}

export async function readStoredSubmittedWorksheetQuestionIds(
  studentUid: string,
): Promise<string[]> {
  const snapshot = await getDoc(
    doc(getFirebaseDb(), WORKSHEET_QUESTION_HISTORY_COLLECTION, studentUid),
  );
  if (!snapshot.exists()) return [];
  const raw = snapshot.data()?.questionIds;
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
}

export async function recordSubmittedWorksheetQuestions(
  studentUid: string,
  questionIds: string[],
): Promise<void> {
  const unique = [...new Set(questionIds.map(String).filter(Boolean))];
  if (!studentUid || unique.length === 0) return;

  const ref = doc(getFirebaseDb(), WORKSHEET_QUESTION_HISTORY_COLLECTION, studentUid);
  for (let i = 0; i < unique.length; i += ARRAY_UNION_CHUNK) {
    const chunk = unique.slice(i, i + ARRAY_UNION_CHUNK);
    await setDoc(
      ref,
      {
        studentUid,
        questionIds: arrayUnion(...chunk),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}
