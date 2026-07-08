import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Link, useLocation } from "react-router-dom";
import { AuthLink } from "@/components/auth/AuthLink";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/auth";
import logoIcon from "@/assets/logo-icon.png";
import { cn } from "@/lib/utils";

const roleLabels: Record<UserRole, string> = {
  tutor: "Tutor",
  student: "Student",
};

type NavItem = {
  to: string;
  label: string;
  active: boolean;
};

export const Header = () => {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isDashboard = /\/dashboard\/?$/.test(location.pathname);

  const initials =
    profile?.displayName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SP";

  const workspacePath =
    profile?.role === "student" && profile.uid ? `/workspace/${profile.uid}` : "/workspace";

  const navItems: NavItem[] = [
    { to: "/question-bank", label: "Question Bank", active: isActive("/question-bank") },
    { to: "/blitz", label: "Blitz Mode", active: isActive("/blitz") },
    { to: "/worksheets", label: "Worksheets", active: isActive("/worksheets") },
    {
      to: workspacePath,
      label: "Workspace",
      active: location.pathname.startsWith("/workspace"),
    },
    { to: "/practice", label: "Practice", active: isActive("/practice") },
    ...(profile?.role === "tutor"
      ? [
          {
            to: "/question-submission",
            label: "Question Submission",
            active: isActive("/question-submission"),
          },
        ]
      : []),
  ];

  const navLinkClass = (active: boolean) =>
    cn(
      "text-sm font-medium transition-colors hover:text-primary",
      active ? "text-primary" : "text-muted-foreground",
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="flex h-12 w-12 items-center justify-center">
            <img src={logoIcon} alt="StepPrep Logo" className="h-12 w-12 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">StepPrep</span>
            <span className="text-xs text-muted-foreground -mt-1">DrillMaster</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <AuthLink key={item.to} to={item.to} className={navLinkClass(item.active)}>
              {item.label}
            </AuthLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {profile && isDashboard ? (
            <>
              <Badge
                variant={profile.role === "tutor" ? "default" : "secondary"}
                className="hidden sm:inline-flex"
              >
                {roleLabels[profile.role]}
              </Badge>
              <div className="hidden lg:flex items-center gap-2 text-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.photoURL ?? undefined} alt={profile.displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="font-medium max-w-[140px] truncate">
                  {profile.displayName || profile.email}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link to={profile ? "/dashboard" : "/login"}>
                <User className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline text-sm">
                  {profile ? "Dashboard" : "Sign In"}
                </span>
              </Link>
            </Button>
          )}

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
              <nav className="mt-6 flex flex-col gap-4">
                {navItems.map((item) => (
                  <SheetClose key={item.to} asChild>
                    <AuthLink to={item.to} className={navLinkClass(item.active)}>
                      {item.label}
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
                        <Badge
                          variant={profile.role === "tutor" ? "default" : "secondary"}
                          className="mt-1"
                        >
                          {roleLabels[profile.role]}
                        </Badge>
                      </div>
                    </div>
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/dashboard">Dashboard</Link>
                      </Button>
                    </SheetClose>
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
        </div>
      </div>
    </header>
  );
};