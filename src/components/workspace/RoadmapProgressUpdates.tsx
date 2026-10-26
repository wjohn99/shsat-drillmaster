import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatIsoDateLabel } from "@/lib/shsat2026";
import {
  latestProgressUpdate,
  MAX_ROADMAP_PROGRESS_UPDATES,
  newRoadmapProgressUpdate,
} from "@/lib/studentRoadmap";
import type { RoadmapProgressUpdate, WorkspaceCard, WorkspaceList } from "@/types/workspace";

const VISIBLE_UPDATES = 2;

export interface RoadmapCardOption {
  id: string;
  title: string;
  listTitle: string;
}

export function cardOptionsFromBoard(
  cards: WorkspaceCard[],
  lists: WorkspaceList[],
): RoadmapCardOption[] {
  const titleByList = new Map(lists.map((list) => [list.id, list.title]));
  return [...cards]
    .sort((a, b) => a.position - b.position)
    .map((card) => ({
      id: card.id,
      title: card.title,
      listTitle: titleByList.get(card.listId) ?? "",
    }));
}

export function RoadmapLatestLine({ updates }: { updates: RoadmapProgressUpdate[] }) {
  const latest = latestProgressUpdate(updates);
  if (!latest) return null;
  const when = formatIsoDateLabel(latest.date);
  return (
    <p className="mt-1 max-w-xl truncate text-sm text-muted-foreground group-open:hidden">
      {when ? `${when}: ` : null}
      {latest.changed}
    </p>
  );
}

export function RoadmapProgressUpdates({
  updates,
  readOnly,
  cardOptions,
  authorUid,
  authorName,
  onOpenCard,
  onChange,
}: {
  updates: RoadmapProgressUpdate[];
  readOnly: boolean;
  cardOptions: RoadmapCardOption[];
  authorUid: string;
  authorName: string;
  onOpenCard?: (cardId: string) => void;
  onChange: (patch: {
    progressUpdates: RoadmapProgressUpdate[];
    currentPriority?: string;
  }) => void;
}) {
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [cardId, setCardId] = useState("none");
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? updates : updates.slice(0, VISIBLE_UPDATES);

  const resetComposer = () => {
    setWriting(false);
    setNote("");
    setCardId("none");
  };

  const postUpdate = () => {
    const row = newRoadmapProgressUpdate({
      changed: note,
      createdByUid: authorUid,
      createdByName: authorName,
      cardId: cardId === "none" ? null : cardId,
      cardTitle: cardOptions.find((card) => card.id === cardId)?.title ?? null,
    });
    if (!row.changed) return;
    onChange({
      progressUpdates: [row, ...updates].slice(0, MAX_ROADMAP_PROGRESS_UPDATES),
    });
    resetComposer();
  };

  const removeUpdate = (id: string) => {
    onChange({
      progressUpdates: updates.filter((row) => row.id !== id),
    });
  };

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-2">
        <p className="text-sm font-medium">Latest update</p>
        <p className="text-xs text-muted-foreground">
          {readOnly
            ? "A short note from your tutor."
            : "Families see this. Lesson plans stay in Tutor notes."}
        </p>
      </div>

      {updates.length === 0 && !writing ? (
        <p className="text-sm text-muted-foreground">
          {readOnly
            ? "No update yet. Your tutor will add one when there is news."
            : "Add a short note when a worksheet, diagnostic, or session changes the plan."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((row) => (
            <li key={row.id} className="text-sm">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {formatIsoDateLabel(row.date) || "Update"}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{row.changed}</p>
              {row.next.trim() ? (
                <p className="mt-1">
                  <span className="text-muted-foreground">Next: </span>
                  {row.next}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {row.cardId && onOpenCard ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => onOpenCard(row.cardId!)}
                  >
                    Open {row.cardTitle || "card"}
                  </Button>
                ) : row.cardTitle ? (
                  <p className="text-xs text-muted-foreground">On {row.cardTitle}</p>
                ) : null}
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-muted-foreground"
                    onClick={() => removeUpdate(row.id)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-col items-start gap-2">
        {updates.length > VISIBLE_UPDATES ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-0"
            onClick={() => setShowAll((open) => !open)}
          >
            {showAll ? "Show less" : `Earlier updates (${updates.length - VISIBLE_UPDATES})`}
          </Button>
        ) : null}

        {!readOnly ? (
          writing ? (
            <div className="w-full space-y-3 border-t border-border/60 pt-3">
              <div className="space-y-1">
                <Label htmlFor="progress-note">Update</Label>
                <Textarea
                  id="progress-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Finished the algebra worksheet. Linear items were stronger than the passage. Next is a short reading set on Session 2."
                  className="min-h-[88px]"
                />
              </div>
              {cardOptions.length > 0 ? (
                <div className="space-y-1">
                  <Label>Related card, optional</Label>
                  <Select value={cardId} onValueChange={setCardId}>
                    <SelectTrigger>
                      <SelectValue placeholder="No linked card" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No linked card</SelectItem>
                      {cardOptions.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.listTitle ? `${card.listTitle}: ${card.title}` : card.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={postUpdate} disabled={!note.trim()}>
                  Post update
                </Button>
                <Button type="button" variant="ghost" onClick={resetComposer}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => setWriting(true)}>
              Add an update
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
