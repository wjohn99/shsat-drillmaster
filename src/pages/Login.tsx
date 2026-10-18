import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeEmail } from "@/lib/authService";
import { cn } from "@/lib/utils";

type SignInAudience = "student" | "parent" | "tutor" | "demo";

const SIGN_IN_OPTIONS = [
  { id: "student", label: "Student" },
  { id: "parent", label: "Parent" },
  { id: "tutor", label: "Tutor" },
  { id: "demo", label: "Demo" },
] as const;

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function Login() {
  const { profile, error, isConfigured, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [audience, setAudience] = useState<SignInAudience>("student");
  const [studentEmail, setStudentEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (profile) {
    return <Navigate to="/dashboard" replace />;
  }

  const studentEmailBlank = studentEmail.trim().length === 0;
  const studentEmailReady = isEmail(studentEmail);

  const handleSignIn = () => {
    void (async () => {
      setFormError(null);
      if (audience === "parent" && !studentEmailBlank && !studentEmailReady) {
        setFormError("Enter the student's email.");
        return;
      }

      setSigningIn(true);
      try {
        if (audience === "tutor") {
          await signInWithGoogle({ tutor: true });
        } else if (audience === "demo") {
          await signInWithGoogle({ demo: true });
        } else if (audience === "parent" && studentEmailReady) {
          await signInWithGoogle({
            studentEmail: normalizeEmail(studentEmail),
          });
        } else if (audience === "parent") {
          await signInWithGoogle({ returning: true });
        } else {
          await signInWithGoogle();
        }
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
            Choose Student, Parent, Tutor, or Demo, then continue with Google.
          </p>

          <div
            role="radiogroup"
            aria-label="Sign in as"
            className="relative mt-6 grid grid-cols-4 rounded-full bg-foreground/[0.06] p-1 shadow-[inset_0_1px_2px_hsl(220_40%_16%/0.08)]"
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute bottom-1 left-1 top-1 w-[calc((100%-8px)/4)] rounded-full",
                "border border-white/80 bg-white/80 shadow-[0_6px_16px_-8px_hsl(220_40%_16%/0.45),inset_0_1px_0_hsl(0_0%_100%/0.95)]",
                "backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                audience === "parent" && "translate-x-full",
                audience === "tutor" && "translate-x-[200%]",
                audience === "demo" && "translate-x-[300%]",
              )}
            />
            {SIGN_IN_OPTIONS.map((option) => {
              const selected = audience === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    "relative z-10 h-9 rounded-full text-[13px] font-medium transition-colors duration-300",
                    selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    setAudience(option.id);
                    setFormError(null);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-4">
            {!isConfigured && (
              <Alert variant="destructive">
                <AlertTitle>Firebase not configured</AlertTitle>
                <AlertDescription>
                  Copy <code className="text-xs">.env.example</code> to{" "}
                  <code className="text-xs">.env</code> and add your Firebase project keys.
                </AlertDescription>
              </Alert>
            )}

            {(formError || error) && (
              <Alert variant="destructive">
                <AlertTitle>Sign-in error</AlertTitle>
                <AlertDescription>{formError || error}</AlertDescription>
              </Alert>
            )}

            {audience === "student" ? (
              <p className="text-sm text-muted-foreground">
                Use Google to open your dashboard. No password.
              </p>
            ) : audience === "tutor" ? (
              <p className="text-sm text-muted-foreground">
                Sign in with your Google account. This opens only when that email is on the tutor list.
              </p>
            ) : audience === "demo" ? (
              <p className="text-sm text-muted-foreground">
                Sign in with Google to open or create a demo account.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="student-email">Student email, first time only</Label>
                  <Input
                    id="student-email"
                    type="email"
                    autoComplete="off"
                    value={studentEmail}
                    onChange={(event) => setStudentEmail(event.target.value)}
                    placeholder="student@email.com"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  First time, enter your student's account email and sign in with your Google account. Returning parents leave this blank and sign in with your Google account.
                </p>
              </div>
            )}

            <GoogleSignInButton
              onClick={handleSignIn}
              loading={signingIn}
              disabled={!isConfigured || signingIn || (audience === "parent" && !studentEmailBlank && !studentEmailReady)}
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
