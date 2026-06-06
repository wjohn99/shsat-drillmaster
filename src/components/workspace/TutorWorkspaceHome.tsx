import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAllWorkspaceBoards } from "@/lib/workspaceService";
import type { WorkspaceBoard } from "@/types/workspace";
import { AddStudentBoardDialog } from "./AddStudentBoardDialog";

interface TutorWorkspaceHomeProps {
  onBoardCreated: (boardId: string) => void;
}

export function TutorWorkspaceHome({ onBoardCreated }: TutorWorkspaceHomeProps) {
  const [boards, setBoards] = useState<WorkspaceBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadBoards = async () => {
    setLoading(true);
    setError(null);
    try {
      setBoards(await fetchAllWorkspaceBoards());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workspace boards.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBoards();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Student workspaces</h1>
          <p className="text-muted-foreground mt-1">
            One board per student. All tutors can view and edit; students only see their own.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add student
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      ) : boards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-4">
            <LayoutGrid className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium">No workspace boards yet</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add a student who has signed in to create their session board with default lists
              (Session Summaries and Info).
            </p>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add student
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link key={board.id} to={`/workspace/${board.id}`}>
              <Card className="h-full hover:shadow-md hover:border-primary/40 transition-all">
                <CardHeader>
                  <CardTitle className="text-lg">{board.studentName}</CardTitle>
                  {board.studentEmail ? (
                    <p className="text-sm text-muted-foreground truncate">{board.studentEmail}</p>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Open board →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AddStudentBoardDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(boardId) => {
          void loadBoards();
          onBoardCreated(boardId);
        }}
      />
    </div>
  );
}
