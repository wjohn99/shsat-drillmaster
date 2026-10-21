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
import { linkParentAccount } from "@/lib/parentLinkService";
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
      case "permission-denied":
        return "This Google account could not be saved as a demo login. Use the Demo tab. If it was already a tutor account, sign in as a tutor.";
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

const PARENT_SIGN_IN_KEY = "drillmaster.parentSignIn";

export interface ParentSignInIntent {
  studentEmail?: string;
  returning?: boolean;
  tutor?: boolean;
  demo?: boolean;
}

const DEMO_WELCOME_KEY = "drillmaster.demoWelcome";

export function markDemoWelcomePending(): void {
  sessionStorage.setItem(DEMO_WELCOME_KEY, "pending");
}

/** Shows the welcome on a new visit, and leaves a dismissed box dismissed for this tab. */
export function ensureDemoWelcomePending(): void {
  try {
    if (sessionStorage.getItem(DEMO_WELCOME_KEY) == null) {
      sessionStorage.setItem(DEMO_WELCOME_KEY, "pending");
    }
  } catch {
    // Private mode can block storage. The box can still open on an explicit sign-in.
  }
}

export function isDemoWelcomePending(): boolean {
  return sessionStorage.getItem(DEMO_WELCOME_KEY) === "pending";
}

export function dismissDemoWelcome(): void {
  sessionStorage.setItem(DEMO_WELCOME_KEY, "seen");
}

export function stageParentSignIn(intent: ParentSignInIntent): void {
  const stored = intent.tutor
    ? { tutor: true }
    : intent.demo
      ? { demo: true }
      : intent.studentEmail
        ? { studentEmail: normalizeEmail(intent.studentEmail) }
        : { returning: true };
  sessionStorage.setItem(PARENT_SIGN_IN_KEY, JSON.stringify(stored));
}

export function clearStagedParentSignIn(): void {
  sessionStorage.removeItem(PARENT_SIGN_IN_KEY);
}

function readParentIntent(): ParentSignInIntent | null {
  try {
    const raw = sessionStorage.getItem(PARENT_SIGN_IN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ParentSignInIntent>;
    if (parsed.tutor) return { tutor: true };
    if (parsed.demo) return { demo: true };
    if (parsed.returning && !parsed.studentEmail) return { returning: true };
    if (!parsed.studentEmail) return null;
    return {
      studentEmail: normalizeEmail(parsed.studentEmail),
    };
  } catch {
    return null;
  }
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
    demoMode: data.demoMode === true,
  };
}

const profileSyncs = new Map<string, Promise<AppUserProfile>>();

export function syncUserProfile(firebaseUser: User): Promise<AppUserProfile> {
  const current = profileSyncs.get(firebaseUser.uid);
  if (current) return current;

  // Popup sign-in notifies the auth listener and also returns the user.
  // Both used to write the new profile. The second write changed createdAt and
  // Firestore rejected it, so a red error flashed as the first write logged them in.
  const promise = withTimeout(
    writeUserProfile(firebaseUser),
    15000,
    new Error("Signed in, but loading your profile timed out. Refresh and try again."),
  ).finally(() => {
    if (profileSyncs.get(firebaseUser.uid) === promise) {
      profileSyncs.delete(firebaseUser.uid);
    }
  });
  profileSyncs.set(firebaseUser.uid, promise);
  return promise;
}

async function writeUserProfile(firebaseUser: User): Promise<AppUserProfile> {
  const email = firebaseUser.email;
  if (!email) {
    throw new Error("Your Google account must have an email address to sign in.");
  }

  const db = getFirebaseDb();
  const userRef = doc(db, "users", firebaseUser.uid);
  const intent = readParentIntent();
  const existing = await getDoc(userRef);
  const existingRole = existing.exists() ? (existing.data().role as UserRole) : null;
  const emailNorm = normalizeEmail(email);
  const whitelisted = await isEmailWhitelisted(emailNorm);

  let role: UserRole;
  if (intent?.tutor) {
    clearStagedParentSignIn();
    if (!whitelisted) {
      await discardParentSignIn(firebaseUser, existing.exists());
      throw new Error("This Google account is not on the tutor list. No account was created.");
    }
    role = "tutor";
  } else if (intent?.demo) {
    if (existingRole === "demo" || existingRole === "student") {
      role = "demo";
    } else if (existingRole) {
      clearStagedParentSignIn();
      await discardParentSignIn(firebaseUser, true);
      throw new Error(
        "This Google account already has an account. Sign in as a student, parent, or tutor. No demo account was created.",
      );
    } else if (whitelisted) {
      clearStagedParentSignIn();
      await discardParentSignIn(firebaseUser, false);
      throw new Error(
        "This Google account is on the tutor list. Sign in as a tutor. No demo account was created.",
      );
    } else {
      role = "demo";
    }
  } else if (whitelisted) {
    clearStagedParentSignIn();
    role = "tutor";
  } else if (intent?.returning && !intent.studentEmail) {
    clearStagedParentSignIn();
    if (existingRole === "student") {
      await firebaseSignOut(getFirebaseAuth());
      throw new Error(
        "This Google account is a student. Sign in as a student, or use the parent's own Google account.",
      );
    }
    if (existingRole !== "parent") {
      await discardParentSignIn(firebaseUser, existing.exists());
      throw new Error(
        "This Google account is not a parent account yet. Enter the student's email, then click Sign in with Google. No account was created.",
      );
    }
    role = "parent";
  } else if (intent?.studentEmail) {
    if (intent.studentEmail === emailNorm) {
      clearStagedParentSignIn();
      await discardParentSignIn(firebaseUser, existing.exists());
      throw new Error(
        "This Google account matches the student email. Use the parent's own Google account.",
      );
    }
    if (existingRole === "student") {
      clearStagedParentSignIn();
      await firebaseSignOut(getFirebaseAuth());
      throw new Error(
        "This Google account is a student. Sign in as a student, or use the parent's own Google account.",
      );
    }
    try {
      await linkParentAccount(intent.studentEmail);
    } catch (err) {
      clearStagedParentSignIn();
      await discardParentSignIn(firebaseUser, existing.exists());
      throw err;
    }
    clearStagedParentSignIn();
    const linked = await getDoc(userRef);
    if (!linked.exists()) {
      throw new Error("Parent account was not created.");
    }
    return parseUserProfile(linked);
  } else if (existingRole === "parent") {
    role = "parent";
  } else if (existingRole === "demo") {
    role = "demo";
  } else {
    role = "student";
  }

  const profileData = {
    uid: firebaseUser.uid,
    email,
    displayName: firebaseUser.displayName ?? "",
    photoURL: firebaseUser.photoURL,
    role,
    lastActiveAt: serverTimestamp(),
    ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
  };

  clearStagedParentSignIn();
  await setDoc(userRef, profileData, { merge: true });

  const updated = await getDoc(userRef);
  return parseUserProfile(updated);
}

async function discardParentSignIn(firebaseUser: User, hadProfile: boolean): Promise<void> {
  if (!hadProfile) {
    try {
      await firebaseUser.delete();
      return;
    } catch {
      // Fall through to sign-out when the new login cannot be removed.
    }
  }
  await firebaseSignOut(getFirebaseAuth());
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

export async function signInWithGoogle(intent?: ParentSignInIntent): Promise<AppUserProfile> {
  if (intent) {
    stageParentSignIn(intent);
  } else {
    clearStagedParentSignIn();
  }
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
