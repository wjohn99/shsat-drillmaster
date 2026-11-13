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
