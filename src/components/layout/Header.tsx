import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogOut, User, Menu } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLink } from "@/components/auth/AuthLink";
import { DemoWelcomeDialog } from "@/components/auth/DemoWelcomeDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAsStudent } from "@/contexts/ViewAsStudentContext";
import { useDemoTutorial } from "@/contexts/DemoTutorialContext";
import { useExamLock } from "@/contexts/ExamLockContext";
import type { UserRole } from "@/types/auth";
import logoIcon from "@/assets/logo-icon.png";
import { cn } from "@/lib/utils";

const roleLabels: Record<UserRole, string> = {
  tutor: "Tutor",
  student: "Student",
  parent: "Parent",
  demo: "Demo",
};

type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  active: boolean;
};

function tourTargetForPath(to: string): string | undefined {
  if (to === "/practice") return "nav-practice";
  if (to === "/worksheets") return "nav-worksheets";
  if (to === "/workspace" || to.startsWith("/workspace/")) return "nav-workspace";
  return undefined;
}

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isDemoMode, demoBusy, exitDemoMode, signOut } = useAuth();
  const { viewAs, exitViewAsStudent } = useViewAsStudent();
  const { maybeAutoStart } = useDemoTutorial();
  const { locked, requestLeave } = useExamLock();

  const isActive = (path: string) => location.pathname === path;
  const homeTo = profile ? "/dashboard" : "/";

  const initials =
    profile?.displayName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SP";

  const workspacePath = viewAs
    ? `/workspace/${viewAs.uid}`
    : profile?.role === "student" && profile.uid
      ? `/workspace/${profile.uid}`
      : "/workspace";

  const leaveDemoAccount = () => {
    void (async () => {
      await exitDemoMode();
      navigate("/dashboard", { replace: true });
    })();
  };

  const navItems: NavItem[] = profile?.role === "parent"
    ? [
        {
          to: "/dashboard",
          label: "Dashboard",
          shortLabel: "Dashboard",
          active: location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/"),
        },
        {
          to: "/workspace",
          label: "Workspace",
          shortLabel: "Workspace",
          active: location.pathname.startsWith("/workspace"),
        },
      ]
    : [
    {
      to: "/question-bank",
      label: "Question Bank",
      shortLabel: "Bank",
      active: isActive("/question-bank"),
    },
    { to: "/blitz", label: "Blitz Mode", shortLabel: "Blitz", active: isActive("/blitz") },
    {
      to: workspacePath,
      label: "Workspace",
      shortLabel: "Workspace",
      active: location.pathname.startsWith("/workspace"),
    },
    {
      to: "/worksheets",
      label: "Worksheets",
      shortLabel: "Worksheets",
      active: isActive("/worksheets"),
    },
    {
      to: "/practice",
      label: "Practice",
      shortLabel: "Practice",
      active: location.pathname === "/practice" || location.pathname.startsWith("/practice/"),
    },
    ...(profile?.role === "tutor" && !viewAs
      ? [
          {
            to: "/question-submission",
            label: "Question Submission",
            shortLabel: "Submit",
            active: isActive("/question-submission"),
          },
        ]
      : []),
  ];

  const navLinkClass = (active: boolean) =>
    cn(
      "flex items-center self-center rounded-full px-3 py-1.5 text-[13px] font-semibold tracking-tight transition-colors",
      active
        ? "glass-control border border-primary/20 bg-primary/10 text-primary"
        : "text-primary hover:bg-primary/10",
    );

  const sheetLinkClass = (active: boolean) =>
    cn(
      "rounded-xl px-3 py-2.5 text-sm font-medium",
      active
        ? "glass-control border text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <>
    {profile?.role === "demo" && !isDemoMode ? (
      <DemoWelcomeDialog onDismiss={maybeAutoStart} />
    ) : null}
    <header className={cn(locked ? "relative z-50 shrink-0" : "sticky top-0 z-50")}>
      <div className="container px-4 pt-3 pb-2">
        <div className="glass-chrome flex h-14 items-stretch justify-between rounded-[1.35rem] border border-foreground/20 bg-white/95 px-3 text-primary">
        {locked ? (
          <button
            type="button"
            className="flex items-center gap-2.5 self-center text-left"
            aria-label="Leave diagnostic"
            onClick={requestLeave}
          >
            <img src={logoIcon} alt="" className="h-8 w-8 object-contain" />
            <div className="flex flex-col leading-none">
              <span className="font-serif text-[15px] font-semibold tracking-tight">StepPrep</span>
              <span className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-primary/80">
                DrillMaster
              </span>
            </div>
          </button>
        ) : (
        <Link
          to={homeTo}
          className="flex items-center gap-2.5 self-center"
          aria-label={profile ? "Go to Dashboard" : "Go to home"}
        >
          <img src={logoIcon} alt="StepPrep Logo" className="h-8 w-8 object-contain" />
          <div className="flex flex-col leading-none">
            <span className="font-serif text-[15px] font-semibold tracking-tight">StepPrep</span>
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-primary/80">
              DrillMaster
            </span>
          </div>
        </Link>
        )}

        {!locked ? (
        <nav data-tour="tutor-nav" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <AuthLink
              key={item.to}
              to={item.to}
              data-tour={tourTargetForPath(item.to)}
              className={navLinkClass(item.active)}
            >
              {item.label}
            </AuthLink>
          ))}
        </nav>
        ) : (
          <p className="self-center text-xs text-muted-foreground">Exam in progress</p>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2.5 self-center">
          {profile ? (
            <>
              <span className="hidden items-center rounded-full border glass-control px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/80 sm:inline-flex">
                {roleLabels[profile.role]}
              </span>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.photoURL ?? undefined} alt={profile.displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline font-medium max-w-[140px] truncate">
                  {profile.displayName || profile.email}
                </span>
              </div>
              {!locked ? (
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              ) : null}
            </>
          ) : locked ? null : (
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
              <Link to="/login">
                <User className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline text-sm">Sign In</span>
              </Link>
            </Button>
          )}

          {!locked ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:max-w-xs">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {navItems.map((item) => (
                  <SheetClose key={item.to} asChild>
                    <AuthLink
                      to={item.to}
                      className={sheetLinkClass(item.active)}
                      aria-label={item.label}
                    >
                      {item.shortLabel}
                    </AuthLink>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-8 border-t pt-6 space-y-4">
                {profile ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={profile.photoURL ?? undefined} alt={profile.displayName} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {profile.displayName || profile.email}
                        </p>
                        <span className="mt-1 inline-flex items-center rounded-full border glass-control px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/80">
                          {roleLabels[profile.role]}
                        </span>
                      </div>
                    </div>
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => signOut()}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </SheetClose>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Button className="w-full" asChild>
                      <Link to="/login">Sign In</Link>
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
          ) : null}
        </div>
        </div>
      </div>
      {viewAs && !locked ? (
        <div className="container px-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-background px-3 py-2">
            <p className="text-sm text-foreground">
              Viewing as {viewAs.displayName}. This is view only. You can open results, and you cannot start work, comment, or upload for this student.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={exitViewAsStudent}>
              Exit student view
            </Button>
          </div>
        </div>
      ) : null}
      {(isDemoMode || (profile?.role === "demo" && location.pathname.startsWith("/workspace"))) && !locked ? (
        <div className="container px-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
            {location.pathname.startsWith("/workspace") ? (
              <p className="text-sm text-foreground">Workspace shows sample students only.</p>
            ) : null}
            {isDemoMode ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={demoBusy}
                onClick={leaveDemoAccount}
              >
                Exit demo
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
    </>
  );
};