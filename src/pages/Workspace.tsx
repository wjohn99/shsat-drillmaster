import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAsStudent } from "@/contexts/ViewAsStudentContext";
import { TutorWorkspaceHome } from "@/components/workspace/TutorWorkspaceHome";
import { WorkspaceBoard } from "@/components/workspace/WorkspaceBoard";
import { fetchParentLink } from "@/lib/parentLinkService";
import { fetchWorkspaceBoard } from "@/lib/workspaceService";
import { Loader2 } from "lucide-react";

type StudentBoardStatus = "idle" | "loading" | "ready" | "missing";
type ParentBoardStatus = "idle" | "loading" | "ready" | "missing" | "unlinked";

export default function Workspace() {
  const { boardId } = useParams<{ boardId?: string }>();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { viewAs } = useViewAsStudent();
  const isTutor = profile?.role === "tutor" || profile?.role === "demo";
  const viewingAsStudent = Boolean(viewAs) && isTutor;
  const isParent = profile?.role === "parent";
  const isStudent = profile?.role === "student";

  const [studentBoardStatus, setStudentBoardStatus] = useState<StudentBoardStatus>("idle");
  const [parentStudentUid, setParentStudentUid] = useState<string | null>(null);
  const [parentBoardStatus, setParentBoardStatus] = useState<ParentBoardStatus>("idle");

  useEffect(() => {
    if (authLoading || !profile || !isStudent) {
      setStudentBoardStatus("idle");
      return;
    }

    if (boardId) {
      if (boardId !== profile.uid) {
        navigate(`/workspace/${profile.uid}`, { replace: true });
      }
      return;
    }

    let cancelled = false;
    setStudentBoardStatus("loading");

    void (async () => {
      try {
        const board = await fetchWorkspaceBoard(profile.uid);
        if (cancelled) return;
        setStudentBoardStatus(board ? "ready" : "missing");
      } catch {
        if (!cancelled) setStudentBoardStatus("missing");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, profile, isStudent, boardId, navigate]);

  useEffect(() => {
    if (authLoading || !profile || !isParent) {
      setParentStudentUid(null);
      setParentBoardStatus("idle");
      return;
    }

    let cancelled = false;
    setParentBoardStatus("loading");

    void (async () => {
      try {
        const link = await fetchParentLink(profile.uid);
        if (cancelled) return;
        const studentUid = link?.status === "approved" ? link.studentUid : null;
        if (!studentUid) {
          setParentStudentUid(null);
          setParentBoardStatus("unlinked");
          return;
        }
        setParentStudentUid(studentUid);
        if (boardId && boardId !== studentUid) {
          navigate(`/workspace/${studentUid}`, { replace: true });
          return;
        }
        if (boardId === studentUid) {
          setParentBoardStatus("ready");
          return;
        }
        const board = await fetchWorkspaceBoard(studentUid);
        if (cancelled) return;
        setParentBoardStatus(board ? "ready" : "missing");
      } catch {
        if (!cancelled) {
          setParentStudentUid(null);
          setParentBoardStatus("unlinked");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, profile, isParent, boardId, navigate]);

  const showLoading =
    authLoading ||
    (isStudent && !boardId && (studentBoardStatus === "idle" || studentBoardStatus === "loading")) ||
    (isParent && (parentBoardStatus === "idle" || parentBoardStatus === "loading"));

  const boardContent = (() => {
    if (showLoading) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (isStudent && !boardId) {
      if (studentBoardStatus === "ready" && profile) {
        return <Navigate to={`/workspace/${profile.uid}`} replace />;
      }
      if (studentBoardStatus === "missing") {
        return <StudentWorkspacePlaceholder />;
      }
      return null;
    }

    if (isParent && !boardId) {
      if (parentBoardStatus === "ready" && parentStudentUid) {
        return <Navigate to={`/workspace/${parentStudentUid}`} replace />;
      }
      if (parentBoardStatus === "missing") {
        return <ParentWorkspacePlaceholder linked />;
      }
      if (parentBoardStatus === "unlinked") {
        return <ParentWorkspacePlaceholder linked={false} />;
      }
      return null;
    }

    if (boardId && isParent && parentStudentUid && boardId !== parentStudentUid) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (viewingAsStudent && viewAs && boardId !== viewAs.uid) {
      return <Navigate to={`/workspace/${viewAs.uid}`} replace />;
    }

    if (boardId) {
      return (
        <BoardCrashGuard>
          <WorkspaceBoard
            boardId={boardId}
            readOnly={isStudent || isParent || viewingAsStudent}
            canCreateListsAndCards={!isParent && !viewingAsStudent}
            showBackLink={isTutor && !viewingAsStudent}
          />
        </BoardCrashGuard>
      );
    }

    if (isTutor && !viewingAsStudent) {
      return <TutorWorkspaceHome />;
    }

    return <StudentWorkspacePlaceholder />;
  })();

  const wideLayout = Boolean(boardId);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={wideLayout ? "flex-1 px-4 py-6" : "flex-1 container py-8"}>
        {boardContent}
      </main>
    </div>
  );
}

class BoardCrashGuard extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message || "Something went wrong while opening this board." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Workspace board failed to render", error, info);
  }

  render() {
    if (this.state.message) {
      return (
        <div className="max-w-lg mx-auto text-center space-y-4 py-16">
          <h1 className="text-xl font-bold">Couldn’t open this board</h1>
          <p className="text-sm text-muted-foreground">{this.state.message}</p>
          <Button variant="outline" asChild>
            <Link to="/workspace">Back to Workspace</Link>
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ParentWorkspacePlaceholder({ linked }: { linked: boolean }) {
  return (
    <div className="max-w-lg mx-auto text-center space-y-4 py-16">
      <h1 className="text-2xl font-bold">Workspace</h1>
      <p className="text-muted-foreground">
        {linked
          ? "Your student's tutor has not set up a workspace yet."
          : "This parent account is not linked to a student. Sign in again as a parent with the student's email."}
      </p>
    </div>
  );
}

function StudentWorkspacePlaceholder() {
  return (
    <div className="max-w-lg mx-auto text-center space-y-4 py-16">
      <h1 className="text-2xl font-bold">Workspace</h1>
      <p className="text-muted-foreground">
        Your tutor has not set up a workspace for you yet.
      </p>
      <p className="text-sm text-muted-foreground">
        When ready, you will see your SHSAT roadmap, session notes, and assignments here.
      </p>
    </div>
  );
}
