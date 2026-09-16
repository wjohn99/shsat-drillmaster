import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentSnapshot,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import {
  browserPopupRedirectResolver,
  getRedirectResult,
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

export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/popup-blocked":
      case "auth/operation-not-supported-in-this-environment":
        return "Your browser blocked the Google sign-in window. Allow popups for this site (or open this page in Chrome/Safari), then try again.";
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "Sign-in was cancelled.";
      case "auth/unauthorized-domain":
        return "This site isn't authorized for Google sign-in. Add the domain in Firebase Authentication → Settings → Authorized domains.";
      case "auth/network-request-failed":
        return "Network error during sign-in. Check your connection and try again.";
      default:
        return error.message;
    }
  }
  return error instanceof Error ? error.message : "Sign-in failed. Please try again.";
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutError: Error): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(timeoutError), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

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
  return withTimeout(
    writeUserProfile(firebaseUser),
    15000,
    new Error("Signed in, but loading your profile timed out. Refresh and try again."),
  );
}

async function writeUserProfile(firebaseUser: User): Promise<AppUserProfile> {
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

export async function completeGoogleRedirect(): Promise<AppUserProfile | null> {
  try {
    const result = await withTimeout(
      getRedirectResult(getFirebaseAuth()),
      4000,
      new Error("Sign-in redirect timed out."),
    );
    if (!result?.user) {
      return null;
    }
    return syncUserProfile(result.user);
  } catch (error) {
    if (error instanceof Error && error.message === "Sign-in redirect timed out.") {
      return null;
    }
    throw error;
  }
}

export async function signInWithGoogle(): Promise<AppUserProfile> {
  const auth = getFirebaseAuth();
  const result = await signInWithPopup(
    auth,
    googleAuthProvider,
    browserPopupRedirectResolver,
  );
  return syncUserProfile(result.user);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}
