import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentSnapshot,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import type { AppUserProfile, UserRole } from "@/types/auth";
import {
  getFirebaseAuth,
  getFirebaseDb,
  googleAuthProvider,
} from "@/lib/firebase";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isEmailWhitelisted(email: string): Promise<boolean> {
  const db = getFirebaseDb();
  const whitelistRef = doc(db, "tutor_whitelist", normalizeEmail(email));
  const snapshot = await getDoc(whitelistRef);
  return snapshot.exists();
}

export async function resolveUserRole(email: string): Promise<UserRole> {
  return (await isEmailWhitelisted(email)) ? "tutor" : "student";
}

function parseUserProfile(snapshot: DocumentSnapshot): AppUserProfile {
  const data = snapshot.data();
  if (!data) {
    throw new Error("User profile document is empty.");
  }

  return {
    uid: data.uid as string,
    email: data.email as string,
    displayName: (data.displayName as string) ?? "",
    photoURL: (data.photoURL as string | null) ?? null,
    role: data.role as UserRole,
    createdAt: data.createdAt,
    lastActiveAt: data.lastActiveAt,
  };
}

export async function syncUserProfile(firebaseUser: User): Promise<AppUserProfile> {
  const email = firebaseUser.email;
  if (!email) {
    throw new Error("Your Google account must have an email address to sign in.");
  }

  const db = getFirebaseDb();
  const userRef = doc(db, "users", firebaseUser.uid);
  const existing = await getDoc(userRef);
  const role = await resolveUserRole(email);

  const profileData = {
    uid: firebaseUser.uid,
    email,
    displayName: firebaseUser.displayName ?? "",
    photoURL: firebaseUser.photoURL,
    role,
    lastActiveAt: serverTimestamp(),
    ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  await setDoc(userRef, profileData, { merge: true });

  const updated = await getDoc(userRef);
  return parseUserProfile(updated);
}

export async function fetchUserProfile(uid: string): Promise<AppUserProfile | null> {
  const db = getFirebaseDb();
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) {
    return null;
  }
  return parseUserProfile(snapshot);
}

export function subscribeToAuthState(
  onUser: (user: User | null) => void,
  onError?: (error: Error) => void,
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(
    auth,
    onUser,
    (error) => onError?.(error),
  );
}

export async function signInWithGoogle(): Promise<AppUserProfile> {
  const auth = getFirebaseAuth();
  const result = await signInWithPopup(auth, googleAuthProvider);
  return syncUserProfile(result.user);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}
