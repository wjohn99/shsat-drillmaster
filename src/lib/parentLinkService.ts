import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { FirebaseError } from "firebase/app";
import { getFirebaseApp, getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const PARENT_LINKS_COLLECTION = "parent_links";

export type ParentLinkStatus = "pending" | "approved";

export interface ParentLink {
  parentUid: string;
  parentEmail: string;
  studentEmail: string;
  studentUid: string | null;
  studentName: string | null;
  status: ParentLinkStatus;
}

function parseParentLink(id: string, data: Record<string, unknown>): ParentLink {
  const status = data.status === "approved" ? "approved" : "pending";
  return {
    parentUid: (data.parentUid as string) || id,
    parentEmail: (data.parentEmail as string) ?? "",
    studentEmail: (data.studentEmail as string) ?? "",
    studentUid: (data.studentUid as string | undefined) ?? null,
    studentName: (data.studentName as string | undefined) ?? null,
    status,
  };
}

export async function fetchParentLink(parentUid: string): Promise<ParentLink | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), PARENT_LINKS_COLLECTION, parentUid));
  if (!snapshot.exists()) return null;
  return parseParentLink(snapshot.id, snapshot.data());
}

function parentLinkError(error: unknown): Error {
  const raw = error instanceof Error ? error.message.trim() : "";
  const message = raw.replace(/\s*\[\d+\]\s*$/, "");
  if (/not a student account/i.test(message)) {
    return new Error("The email you entered is not a valid student account. No parent account was created.");
  }
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error : new Error("Could not sign in.");
  }
  const generic =
    message.length === 0 ||
    /^(internal|not-found|unavailable|firebase error)$/i.test(message) ||
    message.startsWith("Firebase: Error");
  if (!generic) return new Error(message);
  if (error.code === "functions/not-found" || error.code === "functions/unavailable" || error.code === "functions/internal") {
    return new Error("Parent sign-in is not available yet. The account check still needs to be deployed.");
  }
  return new Error(message || "Could not sign in.");
}

export async function linkParentAccount(studentEmail: string): Promise<void> {
  const functions = getFunctions(getFirebaseApp(), "us-central1");
  const callable = httpsCallable(functions, "linkParentAccount");
  try {
    await callable({ studentEmail: normalizeEmail(studentEmail) });
  } catch (error) {
    throw parentLinkError(error);
  }
}

export async function savePendingParentLink(input: {
  parentUid: string;
  parentEmail: string;
  studentEmail: string;
}): Promise<void> {
  const ref = doc(getFirebaseDb(), PARENT_LINKS_COLLECTION, input.parentUid);
  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().status === "approved") {
    return;
  }

  const studentEmail = normalizeEmail(input.studentEmail);
  const parentEmail = normalizeEmail(input.parentEmail);
  await setDoc(
    ref,
    {
      parentUid: input.parentUid,
      parentEmail,
      studentEmail,
      status: "pending",
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}

export async function fetchPendingParentLinks(): Promise<ParentLink[]> {
  const snapshot = await getDocs(
    query(collection(getFirebaseDb(), PARENT_LINKS_COLLECTION), where("status", "==", "pending")),
  );
  return snapshot.docs
    .map((row) => parseParentLink(row.id, row.data()))
    .sort((a, b) => a.parentEmail.localeCompare(b.parentEmail));
}

const PARENT_READERS_COLLECTION = "student_parent_readers";

export async function parentReaderUidsForStudent(studentUid: string): Promise<string[]> {
  try {
    const snapshot = await getDoc(doc(getFirebaseDb(), PARENT_READERS_COLLECTION, studentUid));
    if (!snapshot.exists()) return [];
    const ids = snapshot.data().parentUids;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function approveParentLink(input: {
  parentUid: string;
  studentUid: string;
  studentName: string;
}): Promise<void> {
  const db = getFirebaseDb();
  const existing = await getDoc(doc(db, PARENT_LINKS_COLLECTION, input.parentUid));
  if (!existing.exists()) {
    throw new Error("Parent request was not found.");
  }
  const requestedEmail = normalizeEmail(String(existing.data().studentEmail ?? ""));
  const studentSnap = await getDoc(doc(db, "users", input.studentUid));
  const student = studentSnap.data();
  const accountEmail = normalizeEmail(String(student?.email ?? ""));
  if (!studentSnap.exists() || student?.role !== "student" || !accountEmail || accountEmail !== requestedEmail) {
    throw new Error("That email is not a student account.");
  }
  if (existing.data().status !== "approved") {
    await updateDoc(doc(db, PARENT_LINKS_COLLECTION, input.parentUid), {
      status: "approved",
      studentUid: input.studentUid,
      studentName: input.studentName,
      updatedAt: serverTimestamp(),
    });
  }
  await setDoc(
    doc(db, PARENT_READERS_COLLECTION, input.studentUid),
    {
      studentUid: input.studentUid,
      parentUids: arrayUnion(input.parentUid),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await grantParentReadAccess(input.parentUid, input.studentUid);
}

async function grantParentReadAccess(parentUid: string, studentUid: string): Promise<void> {
  const tutorUid = getFirebaseAuth().currentUser?.uid;
  if (!tutorUid) return;

  const db = getFirebaseDb();
  const [assignmentSnap, assignmentSessionSnap, diagnosticSnap] = await Promise.all([
    getDocs(query(collection(db, "assignments"), where("tutorUid", "==", tutorUid))),
    getDocs(
      query(
        collection(db, "practice_sessions"),
        where("tutorUid", "==", tutorUid),
        where("sessionType", "==", "assignment"),
      ),
    ),
    getDocs(
      query(collection(db, "practice_sessions"), where("sessionType", "==", "diagnostic")),
    ),
  ]);

  const refs = [
    ...assignmentSnap.docs.filter((row) => row.data().assignedToStudentUid === studentUid),
    ...assignmentSessionSnap.docs.filter((row) => row.data().userId === studentUid),
    ...diagnosticSnap.docs.filter((row) => row.data().userId === studentUid),
  ].map((row) => row.ref);
  for (let index = 0; index < refs.length; index += 400) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(index, index + 400)) {
      batch.update(ref, { readerUids: arrayUnion(parentUid) });
    }
    await batch.commit();
  }
}
