import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ParentSignInIntent } from "@/lib/authService";
import type { AppUserProfile, UserRole } from "@/types/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  authErrorMessage,
  completeGoogleRedirect,
  markDemoWelcomePending,
  signInWithGoogle as authSignInWithGoogle,
  signOut as authSignOut,
  subscribeToAuthState,
  syncUserProfile,
} from "@/lib/authService";
import {
  persistDemoModeSetting,
  readStoredDemoMode,
  writeStoredDemoMode,
} from "@/lib/demoAccount";

interface AuthContextValue {
  profile: AppUserProfile | null;
  accountRole: UserRole | null;
  isDemoMode: boolean;
  demoBusy: boolean;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  signInWithGoogle: (intent?: ParentSignInIntent) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoMode: () => Promise<void>;
  exitDemoMode: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accountProfile, setAccountProfile] = useState<AppUserProfile | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const applyAccountProfile = useCallback((next: AppUserProfile | null) => {
    setAccountProfile(next);
    if (!next || next.role !== "tutor") {
      setIsDemoMode(false);
      return;
    }
    setIsDemoMode(readStoredDemoMode(next.uid) ?? next.demoMode === true);
  }, []);

  const profile = useMemo<AppUserProfile | null>(() => {
    if (!accountProfile) return null;
    if (isDemoMode && accountProfile.role === "tutor") {
      return { ...accountProfile, role: "demo" };
    }
    return accountProfile;
  }, [accountProfile, isDemoMode]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const bootTimeout = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
      }
    }, 8000);

    void completeGoogleRedirect()
      .then((redirected) => {
        if (!cancelled && redirected) {
          if (redirected.role === "demo") markDemoWelcomePending();
          applyAccountProfile(redirected);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(authErrorMessage(err));
      });

    const unsubscribe = subscribeToAuthState(
      async (firebaseUser) => {
        try {
          if (!firebaseUser) {
            applyAccountProfile(null);
            return;
          }

          setError(null);
          const synced = await syncUserProfile(firebaseUser);
          if (!cancelled) applyAccountProfile(synced);
        } catch (err) {
          if (cancelled) return;
          setError(authErrorMessage(err));
          applyAccountProfile(null);
        } finally {
          window.clearTimeout(bootTimeout);
          if (!cancelled) setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        applyAccountProfile(null);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimeout);
      unsubscribe();
    };
  }, [applyAccountProfile]);

  const signInWithGoogle = useCallback(
    async (intent?: ParentSignInIntent) => {
      setError(null);
      try {
        const userProfile = await authSignInWithGoogle(intent);
        if (userProfile.role === "demo") markDemoWelcomePending();
        applyAccountProfile(userProfile);
      } catch (err) {
        setError(authErrorMessage(err));
        throw err;
      }
    },
    [applyAccountProfile],
  );

  const signOut = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await authSignOut();
      applyAccountProfile(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-out failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [applyAccountProfile]);

  const clearError = useCallback(() => setError(null), []);

  const enterDemoMode = useCallback(async () => {
    if (!accountProfile || accountProfile.role !== "tutor") {
      throw new Error("Only tutor accounts can open demo account mode.");
    }
    setDemoBusy(true);
    setError(null);
    try {
      await persistDemoModeSetting(accountProfile.uid, true).catch(() => {
        writeStoredDemoMode(accountProfile.uid, true);
      });
      markDemoWelcomePending();
      setIsDemoMode(true);
    } finally {
      setDemoBusy(false);
    }
  }, [accountProfile]);

  const exitDemoMode = useCallback(async () => {
    if (!accountProfile) return;
    setDemoBusy(true);
    setError(null);
    try {
      await persistDemoModeSetting(accountProfile.uid, false).catch(() => {
        writeStoredDemoMode(accountProfile.uid, false);
      });
      setIsDemoMode(false);
    } finally {
      setDemoBusy(false);
    }
  }, [accountProfile]);

  const value = useMemo(
    () => ({
      profile,
      accountRole: accountProfile?.role ?? null,
      isDemoMode: Boolean(isDemoMode && accountProfile?.role === "tutor"),
      demoBusy,
      loading,
      error,
      isConfigured: isFirebaseConfigured,
      signInWithGoogle,
      signOut,
      enterDemoMode,
      exitDemoMode,
      clearError,
    }),
    [
      accountProfile?.role,
      clearError,
      demoBusy,
      enterDemoMode,
      error,
      exitDemoMode,
      isDemoMode,
      loading,
      profile,
      signInWithGoogle,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
