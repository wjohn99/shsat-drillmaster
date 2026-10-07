import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { TutorOption } from "@/types/assignment";
import type { WorkspaceBoard } from "@/types/workspace";
import {
  resolvedAssignedTutorUid,
  updateWorkspaceBoardAssignedTutor,
} from "@/lib/workspaceService";
import { cn } from "@/lib/utils";

interface AssignedTutorSelectProps {
  board: WorkspaceBoard;
  tutors: TutorOption[];
  onAssigned: (next: {
    assignedTutorUid: string;
    assignedTutorName: string;
    assignedTutorEmail: string;
  }) => void;
  compact?: boolean;
}

export function AssignedTutorSelect({
  board,
  tutors,
  onAssigned,
  compact = false,
}: AssignedTutorSelectProps) {
  const [saving, setSaving] = useState(false);
  const selectedUid = resolvedAssignedTutorUid(board);

  const options = useMemo(() => {
    const byUid = new Map(tutors.map((tutor) => [tutor.uid, tutor]));
    if (selectedUid && !byUid.has(selectedUid)) {
      byUid.set(selectedUid, {
        uid: selectedUid,
        displayName: board.assignedTutorName || "Assigned tutor",
        email: board.assignedTutorEmail || "",
      });
    }
    return [...byUid.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [tutors, selectedUid, board.assignedTutorEmail, board.assignedTutorName]);

  const selectedName =
    options.find((tutor) => tutor.uid === selectedUid)?.displayName || "Select a tutor";

  const handleChange = async (uid: string) => {
    if (!uid || uid === selectedUid || saving) return;
    const tutor = options.find((row) => row.uid === uid);
    if (!tutor) return;
    setSaving(true);
    try {
      await updateWorkspaceBoardAssignedTutor(board.id, tutor);
      onAssigned({
        assignedTutorUid: tutor.uid,
        assignedTutorName: tutor.displayName,
        assignedTutorEmail: tutor.email,
      });
      toast({ title: `Assigned tutor: ${tutor.displayName}` });
    } catch (err) {
      toast({
        title: "Could not assign tutor",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectId = `assigned-tutor-${board.id}`;

  return (
    <div className={cn("flex items-center gap-2 min-w-0", !compact && "flex-wrap")}>
      <Label
        htmlFor={selectId}
        className="shrink-0 text-xs font-normal text-muted-foreground"
      >
        Assigned tutor
      </Label>
      <Select value={selectedUid} onValueChange={(uid) => void handleChange(uid)} disabled={saving}>
        <SelectTrigger
          id={selectId}
          className={cn(
            "h-8 w-auto max-w-full gap-1.5 border-border/70 bg-background px-2.5 py-0 text-sm font-medium shadow-none",
            "justify-start [&>span]:line-clamp-none [&>span]:whitespace-nowrap",
            compact && "h-7 text-[13px]",
          )}
        >
          <SelectValue placeholder="Select a tutor">{selectedName}</SelectValue>
        </SelectTrigger>
        <SelectContent className="w-auto min-w-[10rem]">
          {options.map((tutor) => (
            <SelectItem key={tutor.uid} value={tutor.uid} className="pr-3">
              {tutor.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
