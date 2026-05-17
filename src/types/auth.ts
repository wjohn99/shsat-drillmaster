import type { Timestamp } from "firebase/firestore";

export type UserRole = "student" | "tutor";

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  createdAt: Timestamp;
  lastActiveAt?: Timestamp;
}

export interface AuthUser {
  profile: AppUserProfile;
}
