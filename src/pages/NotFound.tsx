import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const homeTo = profile ? "/dashboard" : "/";

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container flex min-h-[60vh] flex-col items-start justify-center py-16">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          That URL doesn’t exist. Head back to {profile ? "your dashboard" : "home"}.
        </p>
        <Button className="mt-6" asChild>
          <Link to={homeTo}>{profile ? "Go to Dashboard" : "Return home"}</Link>
        </Button>
      </main>
    </div>
  );
};

export default NotFound;
