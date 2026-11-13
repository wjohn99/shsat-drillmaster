import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useViewAsStudent } from "@/contexts/ViewAsStudentContext";
import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import {
  assignToStudentNavState,
  openCurrentWorksheetNavState,
  viewLastResultsNavState,
} from "@/types/worksheetsNavigation";
import { cn } from "@/lib/utils";

interface StudentQuickActionsProps {
  studentUid: string;
  studentName?: string;
  studentEmail?: string;
  lastSession?: PracticeSessionRecord | null;
  lastCompletedAssignment?: WorksheetAssignment | null;
  /** Open worksheet the student still owes. Soonest due date wins. */
  currentAssignment?: WorksheetAssignment | null;
  firstDiagnostic?: PracticeSessionRecord | null;
  latestDiagnostic?: PracticeSessionRecord | null;
  className?: string;
  /** Full-width buttons that wrap on a narrow screen. */
  stacked?: boolean;
  /** Smaller buttons that stay on one row when the card is wide enough. */
  compact?: boolean;
  tourId?: string;
  /** Board page: two actions, with the rest in one menu. */
  layout?: "board";
  onArchive?: () => void;
  showOpenBoard?: boolean;
  showFirstDiagnostic?: boolean;
  showLastResults?: boolean;
  /** When set, worksheet CTAs return here instead of staying on worksheets. */
  returnTo?: string;
}

export function StudentQuickActions({
  studentUid,
  studentName,
  studentEmail,
  lastSession,
  lastCompletedAssignment,
  currentAssignment,
  firstDiagnostic,
  latestDiagnostic,
  className,
  stacked = false,
  compact = false,
  tourId,
  layout,
  onArchive,
  showOpenBoard = true,
  showFirstDiagnostic = true,
  showLastResults = true,
  returnTo,
}: StudentQuickActionsProps) {
  const navigate = useNavigate();
  const { enterViewAsStudent } = useViewAsStudent();
  const resultsState = viewLastResultsNavState(lastSession, lastCompletedAssignment, {
    returnTo,
  });
  const showLatestDiagnostic =
    latestDiagnostic && latestDiagnostic.id !== firstDiagnostic?.id;
  const canCompareDiagnostics = Boolean(
    firstDiagnostic && latestDiagnostic && firstDiagnostic.id !== latestDiagnostic.id,
  );
  const buttonClass = cn(
    "shrink-0",
    stacked && "w-full sm:w-auto",
    compact
      ? "h-8 px-2 text-xs max-sm:h-11 max-sm:w-full max-sm:text-sm"
      : stacked
        ? "max-sm:min-h-11"
        : undefined,
  );

  if (layout === "board") {
    return (
      <div data-tour={tourId} className={cn("flex flex-wrap items-center gap-2", className)}>
        <Button variant="outline" size="sm" className="max-sm:min-h-11" asChild>
          <Link
            to="/worksheets"
            state={assignToStudentNavState(studentUid, { returnTo })}
            data-tour="assign-worksheet-board"
          >
            Assign worksheet
          </Link>
        </Button>
        {showLastResults ? (
          resultsState ? (
            <Button size="sm" className="max-sm:min-h-11" asChild>
              <Link to="/worksheets" state={resultsState} data-tour="view-last-results">
                View last results
              </Link>
            </Button>
          ) : (
            <Button size="sm" className="max-sm:min-h-11" disabled title="No results yet" data-tour="view-last-results">
              View last results
            </Button>
          )
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="max-sm:min-h-11">
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {currentAssignment ? (
              <DropdownMenuItem asChild>
                <Link
                  to="/worksheets"
                  state={openCurrentWorksheetNavState(currentAssignment, { returnTo })}
                >
                  {currentAssignment.title
                    ? `Open worksheet: ${currentAssignment.title}`
                    : "Open worksheet"}
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onSelect={() => {
                enterViewAsStudent({
                  uid: studentUid,
                  displayName: studentName?.trim() || "Student",
                  email: studentEmail?.trim() || "",
                });
                navigate("/dashboard");
              }}
            >
              View as student
            </DropdownMenuItem>
            {showFirstDiagnostic && firstDiagnostic ? (
              <DropdownMenuItem asChild>
                <Link
                  to="/practice/diagnostic"
                  state={{ reviewSession: firstDiagnostic, ...(returnTo ? { returnTo } : {}) }}
                >
                  Diagnostic results
                </Link>
              </DropdownMenuItem>
            ) : null}
            {showLatestDiagnostic ? (
              <DropdownMenuItem asChild>
                <Link
                  to="/practice/diagnostic"
                  state={{ reviewSession: latestDiagnostic, ...(returnTo ? { returnTo } : {}) }}
                >
                  Latest diagnostic
                </Link>
              </DropdownMenuItem>
            ) : null}
            {canCompareDiagnostics && firstDiagnostic && latestDiagnostic ? (
              <DropdownMenuItem asChild>
                <Link
                  to="/practice/diagnostic"
                  state={{
                    compareDiagnostics: {
                      first: firstDiagnostic,
                      latest: latestDiagnostic,
                      ...(returnTo ? { returnTo } : {}),
                    },
                    ...(returnTo ? { returnTo } : {}),
                  }}
                >
                  Compare diagnostics
                </Link>
              </DropdownMenuItem>
            ) : null}
            {onArchive ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onArchive}>Archive board</DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div
      data-tour={tourId}
      className={cn(
        stacked
          ? "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
          : compact
            ? "flex flex-wrap gap-1.5 max-sm:grid max-sm:grid-cols-2"
            : "flex flex-wrap gap-2",
        className,
      )}
    >
      {showOpenBoard ? (
        <Button variant="outline" size="sm" className={buttonClass} asChild>
          <Link to={`/workspace/${studentUid}`}>Open board</Link>
        </Button>
      ) : null}
      <Button variant="outline" size="sm" className={buttonClass} asChild>
        <Link
          to="/worksheets"
          state={assignToStudentNavState(studentUid, { returnTo })}
          data-tour="assign-worksheet-board"
        >
          Assign worksheet
        </Link>
      </Button>
      {currentAssignment ? (
        <Button variant="outline" size="sm" className={buttonClass} asChild>
          <Link
            to="/worksheets"
            state={openCurrentWorksheetNavState(currentAssignment, { returnTo })}
            aria-label={
              currentAssignment.title
                ? `Open worksheet: ${currentAssignment.title}`
                : "Open worksheet"
            }
          >
            Open worksheet
          </Link>
        </Button>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        className={buttonClass}
        onClick={() => {
          enterViewAsStudent({
            uid: studentUid,
            displayName: studentName?.trim() || "Student",
            email: studentEmail?.trim() || "",
          });
          navigate("/dashboard");
        }}
      >
        View as student
      </Button>
      {showFirstDiagnostic && firstDiagnostic ? (
        <Button size="sm" variant="outline" className={buttonClass} asChild>
          <Link
            to="/practice/diagnostic"
            state={{ reviewSession: firstDiagnostic, ...(returnTo ? { returnTo } : {}) }}
          >
            Diagnostic results
          </Link>
        </Button>
      ) : null}
      {showLatestDiagnostic ? (
        <Button size="sm" variant="outline" className={buttonClass} asChild>
          <Link
            to="/practice/diagnostic"
            state={{ reviewSession: latestDiagnostic, ...(returnTo ? { returnTo } : {}) }}
          >
            Latest diagnostic
          </Link>
        </Button>
      ) : null}
      {canCompareDiagnostics && firstDiagnostic && latestDiagnostic ? (
        <Button size="sm" variant="outline" className={buttonClass} asChild>
          <Link
            to="/practice/diagnostic"
            state={{
              compareDiagnostics: {
                first: firstDiagnostic,
                latest: latestDiagnostic,
                ...(returnTo ? { returnTo } : {}),
              },
              ...(returnTo ? { returnTo } : {}),
            }}
          >
            Compare diagnostics
          </Link>
        </Button>
      ) : null}
      {showLastResults ? (
        resultsState ? (
          <Button size="sm" className={buttonClass} asChild>
            <Link to="/worksheets" state={resultsState} data-tour="view-last-results">
              View last results
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            className={buttonClass}
            disabled
            title="No results yet"
            data-tour="view-last-results"
          >
            View last results
          </Button>
        )
      ) : null}
    </div>
  );
}
