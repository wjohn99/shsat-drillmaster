import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/contexts/AuthContext";
import logoIcon from "@/assets/logo-icon.png";

export default function Login() {
  const { profile, loading, error, isConfigured, signInWithGoogle, clearError } = useAuth();
  const location = useLocation();
  const [signingIn, setSigningIn] = useState(false);

  const redirectTo =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/dashboard";

  useEffect(() => {
    clearError();
  }, [clearError]);

  if (!loading && profile) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      // Error surfaced via context
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-black/25" />
      <div className="relative container flex min-h-screen items-center justify-center py-12">
        <Card className="w-full max-w-md border-white/20 bg-background/95 backdrop-blur shadow-xl">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <img src={logoIcon} alt="StepPrep" className="h-12 w-12 object-contain" />
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome to StepPrep</CardTitle>
              <CardDescription className="text-base mt-2">
                Sign in with Google to access your SHSAT Drillmaster dashboard.
                No passwords — secure, one-click access.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
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
              loading={signingIn || loading}
              disabled={!isConfigured}
            />

            <p className="text-center text-sm text-muted-foreground pt-2">
              <Link to="/" className="text-primary hover:underline font-medium">
                Back to home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
