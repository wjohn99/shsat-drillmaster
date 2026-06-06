import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AuthLink } from "@/components/auth/AuthLink";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/auth";
import logoIcon from "@/assets/logo-icon.png";

const roleLabels: Record<UserRole, string> = {
  tutor: "Tutor",
  student: "Student",
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
          <AuthLink
            to="/question-bank"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/question-bank') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Question Bank
          </AuthLink>
          <AuthLink
            to="/blitz"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/blitz') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Blitz Mode
          </AuthLink>
          <AuthLink
            to="/worksheets"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/worksheets') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Worksheets
          </AuthLink>
          <AuthLink
            to={
              profile?.role === "student" && profile.uid
                ? `/workspace/${profile.uid}`
                : "/workspace"
            }
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname.startsWith('/workspace') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Workspace
          </AuthLink>
          <AuthLink
            to="/practice"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/practice') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Practice
          </AuthLink>
          {profile?.role === "tutor" && (
            <AuthLink
              to="/question-submission"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive('/question-submission') ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Question Submission
            </AuthLink>
          )}
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
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};