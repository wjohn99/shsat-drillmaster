import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { profile, error, isConfigured, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  if (profile) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = () => {
    void (async () => {
      setSigningIn(true);
      try {
        await signInWithGoogle();
      } catch {
        // Error surfaced via context
      } finally {
        setSigningIn(false);
      }
    })();
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-navy px-12 py-12 text-white md:flex">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-cream">
          StepPrep
        </p>
        <div className="max-w-sm">
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight">
            SHSAT Drillmaster
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            Diagnostics, worksheets, and skill practice for tutors and students.
          </p>
        </div>
        <p className="text-sm text-white/50">Built by tutors. For tutors.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="glass-surface w-full max-w-sm rounded-3xl border p-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground md:hidden">
            StepPrep
          </p>
          <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Use Google to open your dashboard. No password.
          </p>

          <div className="mt-8 space-y-4">
            {!isConfigured && (
              <Alert variant="destructive">
                <AlertTitle>Firebase not configured</AlertTitle>
                <AlertDescription>
                  Copy <code className="text-xs">.env.example</code> to{" "}
                  <code className="text-xs">.env</code> and add your Firebase project keys.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Sign-in error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <GoogleSignInButton
              onClick={handleSignIn}
              loading={signingIn}
              disabled={!isConfigured || signingIn}
            />

            <p className="pt-2 text-sm text-muted-foreground">
              <Link to="/" className="font-medium text-foreground underline-offset-4 hover:underline">
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
