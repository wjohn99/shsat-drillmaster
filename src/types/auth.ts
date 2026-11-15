import type { Timestamp } from "firebase/firestore";

export type UserRole = "student" | "tutor" | "parent" | "demo";

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  createdAt: Timestamp;
  lastActiveAt?: Timestamp;
  /** Tutor-only. When true, the app opens demo account mode on this login. */
  demoMode?: boolean;
  /** Student opened the diagnostic signup link. Lets them start without a board. */
  diagnosticAssigned?: boolean;
}

export interface AuthUser {
  profile: AppUserProfile;
}
