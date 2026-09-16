import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { TutorWorkspaceHome } from "@/components/workspace/TutorWorkspaceHome";
import { WorkspaceBoard } from "@/components/workspace/WorkspaceBoard";
import { fetchWorkspaceBoard } from "@/lib/workspaceService";
import { Loader2 } from "lucide-react";

type StudentBoardStatus = "idle" | "loading" | "ready" | "missing";

export default function Workspace() {
  const { boardId } = useParams<{ boardId?: string }>();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const isTutor = profile?.role === "tutor";
  const isStudent = profile?.role === "student";

  const [studentBoardStatus, setStudentBoardStatus] = useState<StudentBoardStatus>("idle");

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

  const showLoading =
    authLoading ||
    (isStudent && !boardId && (studentBoardStatus === "idle" || studentBoardStatus === "loading"));

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

    if (boardId) {
      return (
        <BoardCrashGuard>
          <WorkspaceBoard
            boardId={boardId}
            readOnly={isStudent}
            showBackLink={isTutor}
          />
        </BoardCrashGuard>
      );
    }

    if (isTutor) {
      return (
        <TutorWorkspaceHome onBoardCreated={(id) => navigate(`/workspace/${id}`)} />
      );
    }

    return <StudentWorkspacePlaceholder />;
  })();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={boardId ? "flex-1 px-4 py-6" : "flex-1 container py-8"}>
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
            <Link to="/workspace">Back to workspaces</Link>
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function StudentWorkspacePlaceholder() {
  return (
    <div className="max-w-lg mx-auto text-center space-y-4 py-16">
      <h1 className="text-2xl font-bold">Your workspace</h1>
      <p className="text-muted-foreground">
        Your tutor has not set up a workspace board for you yet.
      </p>
      <p className="text-sm text-muted-foreground">
        When ready, you will see session notes, practice tests, and info here.
      </p>
    </div>
  );
}
