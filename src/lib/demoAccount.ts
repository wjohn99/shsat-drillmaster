import { doc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

const DEMO_MODE_STORAGE_PREFIX = "drillmaster.demoMode:";

export function demoModeStorageKey(uid: string): string {
  return `${DEMO_MODE_STORAGE_PREFIX}${uid}`;
}

export function readStoredDemoMode(uid: string): boolean | null {
  try {
    const value = localStorage.getItem(demoModeStorageKey(uid));
    if (value === "1") return true;
    if (value === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function writeStoredDemoMode(uid: string, enabled: boolean): void {
  try {
    localStorage.setItem(demoModeStorageKey(uid), enabled ? "1" : "0");
  } catch {
    // Private mode can block storage. Session state still works.
  }
}

export async function persistDemoModeSetting(uid: string, enabled: boolean): Promise<void> {
  writeStoredDemoMode(uid, enabled);
  await setDoc(doc(getFirebaseDb(), "users", uid), { demoMode: enabled }, { merge: true });
}
