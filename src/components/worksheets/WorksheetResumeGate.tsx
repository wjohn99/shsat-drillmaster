import { useEffect, useRef, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearWorksheetReloadFlag,
  forgetActiveWorksheet,
  worksheetResumePath,
} from "@/lib/worksheetResume";
import { WORKSHEETS_PATH } from "@/types/worksheetsNavigation";

/**
 * After a student refreshes an open worksheet, send them back to that worksheet
 * even if the browser landed on the dashboard or the worksheets list.
 */
export function WorksheetResumeGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { profile, loading } = useAuth();
  const pathRef = useRef(location.pathname);
  const resumePath = loading
    ? null
    : worksheetResumePath(
        location.pathname,
        location.search,
        profile?.uid ?? null,
        profile?.role ?? null,
      );
  const onAttempt =
    !loading &&
    profile?.role === "student" &&
    resumePath == null &&
    location.pathname === WORKSHEETS_PATH;

  useEffect(() => {
    const leftWorksheet =
      pathRef.current === WORKSHEETS_PATH && location.pathname !== WORKSHEETS_PATH;
    pathRef.current = location.pathname;
    if (leftWorksheet) {
      forgetActiveWorksheet();
      return;
    }
    if (onAttempt) clearWorksheetReloadFlag();
  }, [location.pathname, location.search, onAttempt]);

  if (resumePath) {
    return <Navigate to={resumePath} replace />;
  }

  return <>{children}</>;
}
