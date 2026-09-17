import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import {
  assignToStudentNavState,
  viewLastResultsNavState,
} from "@/types/worksheetsNavigation";
import { cn } from "@/lib/utils";

interface StudentQuickActionsProps {
  studentUid: string;
  lastSession?: PracticeSessionRecord | null;
  lastCompletedAssignment?: WorksheetAssignment | null;
  firstDiagnostic?: PracticeSessionRecord | null;
  latestDiagnostic?: PracticeSessionRecord | null;
  className?: string;
  showOpenBoard?: boolean;
  /** When set, worksheet CTAs return here instead of staying on worksheets. */
  returnTo?: string;
}

export function StudentQuickActions({
  studentUid,
  lastSession,
  lastCompletedAssignment,
  firstDiagnostic,
  latestDiagnostic,
  className,
  showOpenBoard = true,
  returnTo,
}: StudentQuickActionsProps) {
  const resultsState = viewLastResultsNavState(lastSession, lastCompletedAssignment, {
    returnTo,
  });
  const showLatestDiagnostic =
    latestDiagnostic && latestDiagnostic.id !== firstDiagnostic?.id;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {showOpenBoard ? (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/workspace/${studentUid}`}>Open board</Link>
        </Button>
      ) : null}
      <Button variant="outline" size="sm" asChild>
        <Link to="/worksheets" state={assignToStudentNavState(studentUid, { returnTo })}>
          Assign worksheet
        </Link>
      </Button>
      {firstDiagnostic ? (
        <Button size="sm" variant="outline" asChild>
          <Link to="/practice/diagnostic" state={{ reviewSession: firstDiagnostic }}>
            First diagnostic
          </Link>
        </Button>
      ) : null}
      {showLatestDiagnostic ? (
        <Button size="sm" variant="outline" asChild>
          <Link to="/practice/diagnostic" state={{ reviewSession: latestDiagnostic }}>
            Latest diagnostic
          </Link>
        </Button>
      ) : null}
      {resultsState ? (
        <Button size="sm" asChild>
          <Link to="/worksheets" state={resultsState}>
            View last results
          </Link>
        </Button>
      ) : (
        <Button size="sm" disabled title="No results yet">
          View last results
        </Button>
      )}
    </div>
  );
}
