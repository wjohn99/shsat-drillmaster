import { useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeEmail } from "@/lib/authService";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/logo-icon.png";

type SignInAudience = "student" | "parent" | "tutor" | "demo";

const SIGN_IN_OPTIONS = [
  {
    id: "student",
    label: "Student",
    detail: "Opens a student account.",
  },
  {
    id: "parent",
    label: "Parent",
    detail: "Links to one student. Does not create a student.",
  },
  {
    id: "tutor",
    label: "Tutor",
    detail: "Only works if this email is on the tutor list.",
  },
  {
    id: "demo",
    label: "Demo",
    detail: "Opens a sample class. Does not open a live tutor account.",
  },
] as const;

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function Login() {
  const { profile, error, isConfigured, signInWithGoogle } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [signingIn, setSigningIn] = useState(false);
  const [audience, setAudience] = useState<SignInAudience>(
    searchParams.get("as") === "demo" ? "demo" : "student",
  );
  const [studentEmail, setStudentEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (profile) {
    const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
    const to =
      from?.pathname && from.pathname !== "/login"
        ? `${from.pathname}${from.search || ""}`
        : "/dashboard";
    return <Navigate to={to} replace />;
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
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-navy px-12 py-10 text-white md:flex lg:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 top-0 h-64 w-64 rounded-full bg-brand-cream/10 blur-3xl"
        />
        <Wordmark tone="light" />
        <div className="relative max-w-md">
          <p className="text-sm font-medium text-brand-cream">
            Built by tutors. For tutors.
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.15] tracking-tight lg:text-5xl">
            SHSAT Drillmaster
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/75">
            Diagnostics, worksheets, and skill practice for tutors and students.
          </p>
        </div>
        <p className="relative text-sm text-white/55">StepPrep Hub</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden">
            <Wordmark tone="dark" />
          </div>
          <div className="rounded-2xl border bg-card p-7 shadow-sm sm:p-8">
          <h2 className="font-serif text-3xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Choose who is signing in. Each one opens a different kind of account.
          </p>

          <div role="radiogroup" aria-label="Sign in as" className="mt-6 grid grid-cols-2 gap-3">
            {SIGN_IN_OPTIONS.map((option) => {
              const selected = audience === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-muted/60",
                  )}
                  onClick={() => {
                    setAudience(option.id);
                    setFormError(null);
                  }}
                >
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                    {option.detail}
                  </span>
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

            {audience === "parent" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="student-email" className="text-sm font-medium">
                    Student email, first time only
                  </Label>
                  <Input
                    id="student-email"
                    type="email"
                    autoComplete="off"
                    value={studentEmail}
                    onChange={(event) => setStudentEmail(event.target.value)}
                    placeholder="student@email.com"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  First time, enter your student's account email and sign in with your Google account. Returning parents leave this blank and sign in with your Google account.
                </p>
              </div>
            ) : null}

            <GoogleSignInButton
              onClick={handleSignIn}
              loading={signingIn}
              disabled={!isConfigured || signingIn || (audience === "parent" && !studentEmailBlank && !studentEmailReady)}
              className="h-12 bg-background"
            />

            <p className="pt-1 text-sm text-muted-foreground">
              <Link to="/" className="font-medium text-foreground underline-offset-4 hover:underline">
                Back to home
              </Link>
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Wordmark({ tone }: { tone: "light" | "dark" }) {
  const light = tone === "light";
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2.5", light ? "text-white" : "text-foreground")}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
        <img src={logoIcon} alt="" className="h-8 w-8 object-contain" />
      </span>
      <span className="leading-none">
        <span className="block font-serif text-[15px] font-semibold tracking-tight">StepPrep</span>
        <span
          className={cn(
            "mt-0.5 block text-[10px] uppercase tracking-[0.16em]",
            light ? "text-brand-cream" : "text-primary/80",
          )}
        >
          DrillMaster
        </span>
      </span>
    </Link>
  );
}
