import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User, Search, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";

export const Header = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
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
            <span className="text-xs text-muted-foreground -mt-1">SHSAT Practice</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            to="/question-bank"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/question-bank') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Question Bank
          </Link>
          <Link
            to="/blitz"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/blitz') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Blitz Mode
          </Link>
          <Link
            to="/worksheets"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/worksheets') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Worksheets
          </Link>
          <Link
            to="/practice"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/practice') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Practice
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="text-xs">
            Beta
          </Badge>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <User className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};