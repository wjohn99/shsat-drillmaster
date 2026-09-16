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
  authErrorMessage,
  completeGoogleRedirect,
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

    let cancelled = false;
    const bootTimeout = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
      }
    }, 8000);

    void completeGoogleRedirect()
      .then((redirected) => {
        if (!cancelled && redirected) {
          setProfile(redirected);
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
            setProfile(null);
            return;
          }

          setError(null);
          const synced = await syncUserProfile(firebaseUser);
          if (!cancelled) setProfile(synced);
        } catch (err) {
          if (cancelled) return;
          setError(authErrorMessage(err));
          setProfile(null);
        } finally {
          window.clearTimeout(bootTimeout);
          if (!cancelled) setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setProfile(null);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimeout);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const userProfile = await authSignInWithGoogle();
      setProfile(userProfile);
    } catch (err) {
      setError(authErrorMessage(err));
      throw err;
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
