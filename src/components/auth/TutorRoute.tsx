import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface TutorRouteProps {
  children: React.ReactNode;
}

export function TutorRoute({ children }: TutorRouteProps) {
  const { profile, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (!isConfigured) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-background"
        aria-busy="true"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (profile.role !== "tutor") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
