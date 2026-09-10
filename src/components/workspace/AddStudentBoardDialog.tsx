import { useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_WORKSPACE_BOARD_COLOR,
  WORKSPACE_BOARD_COLORS,
} from "@/lib/workspaceBoardColors";
import { createWorkspaceBoard, fetchStudentsWithoutBoard } from "@/lib/workspaceService";
import type { StudentOption } from "@/types/assignment";
import { cn } from "@/lib/utils";

interface AddStudentBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (boardId: string) => void;
}

export function AddStudentBoardDialog({
  open,
  onOpenChange,
  onCreated,
}: AddStudentBoardDialogProps) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUid, setSelectedUid] = useState("");
  const [boardColor, setBoardColor] = useState(DEFAULT_WORKSPACE_BOARD_COLOR);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSelectedUid("");
      setBoardColor(DEFAULT_WORKSPACE_BOARD_COLOR);
      try {
        const rows = await fetchStudentsWithoutBoard();
        if (!cancelled) setStudents(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load students.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleCreate = async () => {
    const student = students.find((s) => s.uid === selectedUid);
    if (!student) return;

    setSubmitting(true);
    setError(null);
    try {
      const boardId = await createWorkspaceBoard(student, { color: boardColor });
      onCreated(boardId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create board.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add student workspace</DialogTitle>
          <DialogDescription>
            Create a board for a signed-up student. All tutors can view and manage it; the
            student only sees their own board.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Every registered student already has a workspace board, or no students have signed in
            yet.
          </p>
        ) : (
          <div className="space-y-4">
            <Select value={selectedUid} onValueChange={setSelectedUid}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.uid} value={student.uid}>
                    {student.displayName}
                    {student.email ? ` (${student.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <Label>Board color</Label>
              <div className="flex flex-wrap gap-2">
                {WORKSPACE_BOARD_COLORS.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    title={swatch.label}
                    aria-label={`${swatch.label} board color`}
                    aria-pressed={boardColor === swatch.hex}
                    onClick={() => setBoardColor(swatch.hex)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105",
                      boardColor === swatch.hex
                        ? "border-foreground ring-2 ring-offset-2 ring-foreground/30"
                        : "border-transparent",
                    )}
                    style={{ backgroundColor: swatch.hex }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Helps you spot this student&apos;s board at a glance.
              </p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              className="w-full"
              disabled={!selectedUid || submitting}
              onClick={handleCreate}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Create board
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
