import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  WORKSPACE_BOARD_COLORS,
  workspaceBoardAccentColor,
} from "@/lib/workspaceBoardColors";
import { updateWorkspaceBoardDetails } from "@/lib/workspaceService";
import type { WorkspaceBoard } from "@/types/workspace";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface EditBoardDetailsDialogProps {
  board: WorkspaceBoard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (next: { studentName: string; color: string }) => void;
}

export function EditBoardDetailsDialog({
  board,
  open,
  onOpenChange,
  onSaved,
}: EditBoardDetailsDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(workspaceBoardAccentColor(board?.color));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !board) return;
    setName(board.studentName);
    setColor(workspaceBoardAccentColor(board.color));
    setSaving(false);
  }, [open, board]);

  const handleSave = async () => {
    if (!board) return;
    const nextName = name.trim();
    if (!nextName) {
      toast({ title: "Board name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateWorkspaceBoardDetails(board.id, {
        studentName: nextName,
        color,
      });
      onSaved({ studentName: nextName, color });
      onOpenChange(false);
      toast({ title: "Board updated" });
    } catch (err) {
      toast({
        title: "Could not update board",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Board name and color</DialogTitle>
          <DialogDescription>
            Changes how this workspace appears for tutors. The student account stays the same.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="board-display-name">Board name</Label>
            <Input
              id="board-display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSave();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Board color</Label>
            <div className="flex flex-wrap gap-2">
              {WORKSPACE_BOARD_COLORS.map((swatch) => (
                <button
                  key={swatch.id}
                  type="button"
                  title={swatch.label}
                  aria-label={`${swatch.label} board color`}
                  aria-pressed={color === swatch.hex}
                  onClick={() => setColor(swatch.hex)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105",
                    color === swatch.hex
                      ? "border-foreground ring-2 ring-offset-2 ring-foreground/30"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
