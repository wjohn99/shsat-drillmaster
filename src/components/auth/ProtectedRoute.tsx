import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Dashboard is the only signed-in page a parent can open. */
  allowParent?: boolean;
  /** Workspace, worksheets, and similar tools stay off demo accounts. */
  blockDemo?: boolean;
}

export function ProtectedRoute({
  children,
  allowParent = false,
  blockDemo = false,
}: ProtectedRouteProps) {
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

  if (!allowParent && profile.role === "parent") {
    return <Navigate to="/dashboard" replace />;
  }

  if (blockDemo && profile.role === "demo") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
