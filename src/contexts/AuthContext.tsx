import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppUserProfile } from "@/types/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  signInWithGoogle as authSignInWithGoogle,
  signOut as authSignOut,
  subscribeToAuthState,
  syncUserProfile,
} from "@/lib/authService";

interface AuthContextValue {
  profile: AppUserProfile | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToAuthState(
      async (firebaseUser) => {
        setLoading(true);
        setError(null);

        try {
          if (!firebaseUser) {
            setProfile(null);
            return;
          }

          const synced = await syncUserProfile(firebaseUser);
          setProfile(synced);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to restore your session.";
          setError(message);
          setProfile(null);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setProfile(null);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const userProfile = await authSignInWithGoogle();
      setProfile(userProfile);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await authSignOut();
      setProfile(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign-out failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      profile,
      loading,
      error,
      isConfigured: isFirebaseConfigured,
      signInWithGoogle,
      signOut,
      clearError,
    }),
    [profile, loading, error, signInWithGoogle, signOut, clearError],
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
