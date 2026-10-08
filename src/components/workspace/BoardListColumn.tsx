import { useEffect, useMemo, useRef, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { Check, GripVertical, MessageSquare, MoreHorizontal, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  createWorkspaceCard,
  deleteWorkspaceCard,
  deleteWorkspaceList,
  reorderWorkspaceCards,
  updateWorkspaceCard,
  updateWorkspaceList,
} from "@/lib/workspaceService";
import type { WorkspaceCard, WorkspaceList } from "@/types/workspace";
import type { WorksheetAssignment } from "@/types/assignment";
import {
  formatAssignmentDueDate,
  worksheetProgressStatus,
  WORKSHEET_PROGRESS_LABEL,
} from "@/lib/dashboardStats";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

function formatCardSessionDate(value?: string): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value.trim();
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value.trim();
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface BoardListColumnProps {
  boardId: string;
  list: WorkspaceList;
  accentColor?: string;
  cards: WorkspaceCard[];
  assignmentById?: Map<string, WorksheetAssignment>;
  readOnly?: boolean;
  canCreateListsAndCards?: boolean;
  onCardClick: (card: WorkspaceCard, opts?: { focusNotes?: boolean }) => void;
  onCardsChanged: () => void;
  onListChanged: () => void;
  onListRenamed?: (listId: string, title: string) => void;
}

export function BoardListColumn({
  boardId,
  list,
  accentColor,
  cards,
  assignmentById,
  readOnly = false,
  canCreateListsAndCards = !readOnly,
  onCardClick,
  onCardsChanged,
  onListChanged,
  onListRenamed,
}: BoardListColumnProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<WorkspaceCard | null>(null);
  const [deletingCard, setDeletingCard] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dropLineTop, setDropLineTop] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const dragImageRef = useRef<HTMLElement | null>(null);
  const listBodyRef = useRef<HTMLDivElement | null>(null);
  const listCardsRef = useRef<WorkspaceCard[]>([]);
  const draggingCardIdRef = useRef<string | null>(null);
  const fromIndexRef = useRef(-1);
  const dropIndexRef = useRef<number | null>(null);
  const reorderingRef = useRef(false);

  const listCards = useMemo(
    () =>
      cards
        .filter((c) => c.listId === list.id)
        .sort((a, b) => {
          if (a.position !== b.position) return a.position - b.position;
          const aMs = a.createdAt?.toMillis?.() ?? 0;
          const bMs = b.createdAt?.toMillis?.() ?? 0;
          return aMs - bMs;
        }),
    [cards, list.id],
  );
  listCardsRef.current = listCards;

  useEffect(() => {
    return () => {
      dragImageRef.current?.remove();
      dragImageRef.current = null;
    };
  }, []);

  const clearDragState = () => {
    dragImageRef.current?.remove();
    dragImageRef.current = null;
    draggingCardIdRef.current = null;
    fromIndexRef.current = -1;
    dropIndexRef.current = null;
    setDraggingCardId(null);
    setDropLineTop(null);
  };

  const updateDropFromPointer = (clientY: number) => {
    const root = listBodyRef.current;
    if (!root) return;

    const cardEls = Array.from(root.querySelectorAll<HTMLElement>("[data-workspace-card]"));
    const rootRect = root.getBoundingClientRect();
    let nextIndex = cardEls.length;
    let nextTop = root.scrollHeight - 8;

    for (let i = 0; i < cardEls.length; i += 1) {
      const rect = cardEls[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        nextIndex = i;
        nextTop = rect.top - rootRect.top + root.scrollTop;
        break;
      }
    }

    if (nextIndex === cardEls.length && cardEls.length > 0) {
      const lastRect = cardEls[cardEls.length - 1].getBoundingClientRect();
      nextTop = lastRect.bottom - rootRect.top + root.scrollTop;
    } else if (cardEls.length === 0) {
      nextTop = 12;
    }

    if (dropIndexRef.current === nextIndex) return;
    dropIndexRef.current = nextIndex;
    setDropLineTop(nextTop);
  };

  const commitReorder = async () => {
    if (readOnly || reorderingRef.current) return;

    const currentCards = listCardsRef.current;
    const fromIndex = fromIndexRef.current;
    const insertAt = dropIndexRef.current;
    if (!draggingCardIdRef.current || fromIndex < 0 || insertAt == null) return;

    let toIndex = insertAt;
    if (fromIndex < toIndex) toIndex -= 1;
    toIndex = Math.max(0, Math.min(toIndex, currentCards.length - 1));
    if (toIndex === fromIndex) {
      clearDragState();
      return;
    }

    const next = [...currentCards];
    const [dragged] = next.splice(fromIndex, 1);
    if (!dragged) {
      clearDragState();
      return;
    }
    next.splice(toIndex, 0, dragged);

    reorderingRef.current = true;
    setReordering(true);
    try {
      await reorderWorkspaceCards(
        boardId,
        next.map((card) => card.id),
      );
      onCardsChanged();
    } catch (err) {
      toast({
        title: "Could not reorder cards",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      reorderingRef.current = false;
      clearDragState();
      setReordering(false);
    }
  };

  const startCardDrag = (event: React.DragEvent<HTMLElement>, cardId: string, cardIndex: number) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", cardId);

    const cardEl = event.currentTarget.closest("[data-workspace-card]") as HTMLElement | null;
    if (cardEl) {
      const clone = cardEl.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.top = "-9999px";
      clone.style.left = "-9999px";
      clone.style.width = `${cardEl.offsetWidth}px`;
      clone.style.pointerEvents = "none";
      clone.style.boxShadow = "0 12px 28px rgba(15, 23, 42, 0.2)";
      document.body.appendChild(clone);
      dragImageRef.current = clone;
      event.dataTransfer.setDragImage(clone, 24, 16);
    }

    draggingCardIdRef.current = cardId;
    fromIndexRef.current = cardIndex;
    dropIndexRef.current = cardIndex;
    setDraggingCardId(cardId);
    if (cardEl && listBodyRef.current) {
      const rootRect = listBodyRef.current.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();
      setDropLineTop(cardRect.top - rootRect.top + listBodyRef.current.scrollTop);
    }
  };

  const handleAddCard = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setSubmitting(true);
    try {
      const cardId = await createWorkspaceCard(boardId, list.id, title);
      const today = new Date();
      const sessionDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");
      setNewTitle("");
      setAdding(false);
      onCardClick(
        {
          id: cardId,
          boardId,
          listId: list.id,
          title,
          description: "",
          sessionMeta: { sessionDate },
          position: 0,
          completed: false,
          commentCount: 0,
          attachmentCount: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { focusNotes: true },
      );
      onCardsChanged();
    } catch (err) {
      toast({
        title: "Could not add card",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenameList = async () => {
    const title = renameTitle.trim();
    if (!title || title === list.title) {
      setRenameOpen(false);
      return;
    }
    setRenaming(true);
    try {
      await updateWorkspaceList(boardId, list.id, { title });
      onListRenamed?.(list.id, title);
      setRenameOpen(false);
      toast({ title: "List renamed" });
    } catch (err) {
      toast({
        title: "Could not rename list",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteList = async () => {
    setDeleting(true);
    try {
      await deleteWorkspaceList(boardId, list.id);
      setDeleteOpen(false);
      onListChanged();
      toast({ title: "List hidden", description: `"${list.title}" is hidden. Notes and files stay in the account.` });
    } catch (err) {
      toast({
        title: "Could not delete list",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    setDeletingCard(true);
    try {
      await deleteWorkspaceCard(boardId, cardToDelete.id);
      setCardToDelete(null);
      onCardsChanged();
      toast({ title: "Card hidden", description: "Notes and files stay saved on the account." });
    } catch (err) {
      toast({
        title: "Could not delete card",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingCard(false);
    }
  };

  return (
    <>
      <div
        className="glass-surface flex w-72 max-h-[calc(100vh-10rem)] shrink-0 flex-col overflow-hidden rounded-xl border"
        onDragOver={(e) => {
          if (readOnly || !draggingCardIdRef.current) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          updateDropFromPointer(e.clientY);
        }}
        onDrop={(e) => {
          e.preventDefault();
          void commitReorder();
        }}
      >
        {accentColor ? (
          <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: accentColor }} aria-hidden />
        ) : null}
        <div className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-3">
          <h3 className="min-w-0 flex-1 truncate text-base font-semibold">{list.title}</h3>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {listCards.length}
          </span>
          {!readOnly ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md",
                    "bg-background border border-border shadow-sm",
                    "text-foreground/70 hover:bg-accent hover:text-foreground",
                    "data-[state=open]:bg-accent data-[state=open]:text-foreground",
                    "outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                  )}
                  aria-label={`List options for ${list.title}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuItem
                  onSelect={() => {
                    setRenameTitle(list.title);
                    setRenameOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename list
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {canCreateListsAndCards && !adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mx-2 mt-2 shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add a card
          </button>
        ) : null}

        {adding && canCreateListsAndCards ? (
          <div className="space-y-2 p-2 pb-0 shrink-0">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Card title"
              maxLength={200}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddCard();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewTitle("");
                }
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddCard} disabled={submitting || !newTitle.trim()}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setNewTitle("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        <div
          ref={listBodyRef}
          className={cn(
            "relative flex-1 min-h-0 overflow-y-auto p-2",
            draggingCardId && "bg-primary/5 ring-1 ring-inset ring-primary/20 rounded-b-xl",
          )}
        >
          {draggingCardId && dropLineTop != null ? (
            <div
              className="pointer-events-none absolute left-2 right-2 z-10"
              style={{ top: dropLineTop }}
            >
              <div className="h-1.5 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/20" />
              <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                Drop here
              </span>
            </div>
          ) : null}

          {listCards.map((card, index) => {
            const isDraggingThis = draggingCardId === card.id;
            const sessionWhen = formatCardSessionDate(card.sessionMeta?.sessionDate);

            return (
              <div key={card.id} className="mb-2 last:mb-0">
                <div
                  data-workspace-card
                  className={cn(
                    "group/card rounded-lg",
                    isDraggingThis && "opacity-40 ring-2 ring-primary/40",
                  )}
                >
                  <div className="flex items-stretch">
                    {!readOnly ? (
                      <div
                        draggable
                        onDragStart={(e) => startCardDrag(e, card.id, index)}
                        onDragEnd={() => {
                          dragImageRef.current?.remove();
                          dragImageRef.current = null;
                          window.setTimeout(() => {
                            if (!reorderingRef.current) clearDragState();
                          }, 0);
                        }}
                        className={cn(
                          "flex items-center px-1.5 shrink-0 touch-none",
                          "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground",
                        )}
                        aria-label={`Drag to reorder ${card.title}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onCardClick(card)}
                      className={cn(
                        "relative min-w-0 flex-1 rounded-xl border border-border bg-card px-3.5 py-3 text-left text-sm transition-colors",
                        "hover:border-foreground/20",
                        card.completed && "opacity-80",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          role="button"
                          tabIndex={readOnly ? -1 : 0}
                          aria-label={card.completed ? "Mark incomplete" : "Mark complete"}
                          className={cn(
                            "h-4 w-4 shrink-0 rounded-full flex items-center justify-center",
                            "outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (readOnly) return;
                            void (async () => {
                              try {
                                await updateWorkspaceCard(boardId, card.id, { completed: !card.completed });
                                onCardsChanged();
                              } catch {
                                toast({ title: "Could not update status", variant: "destructive" });
                              }
                            })();
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            e.stopPropagation();
                            (e.currentTarget as HTMLElement).click();
                          }}
                        >
                          {card.completed ? (
                            <span className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="h-4 w-4 rounded-full border border-muted-foreground/50" />
                          )}
                        </span>
                        <span
                          className={cn(
                            "font-medium leading-snug",
                            card.completed && "text-muted-foreground",
                          )}
                        >
                          {card.title}
                        </span>
                      </div>
                      {sessionWhen ? (
                        <p className="mt-1 pl-6 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {sessionWhen}
                        </p>
                      ) : null}
                      {card.assignmentId ? (
                        <BoardCardAssignmentStatus
                          assignment={assignmentById?.get(card.assignmentId) ?? null}
                        />
                      ) : null}
                      {card.description ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 pl-6">
                          {card.description}
                        </p>
                      ) : null}
                      {((card.commentCount ?? 0) > 0 || (card.attachmentCount ?? 0) > 0) ? (
                        <div className="mt-2 pl-6 flex items-center gap-3 text-muted-foreground">
                          {(card.commentCount ?? 0) > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] tabular-nums"
                              aria-label={`${card.commentCount} ${card.commentCount === 1 ? "comment" : "comments"}`}
                            >
                              <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                              {card.commentCount}
                            </span>
                          ) : null}
                          {(card.attachmentCount ?? 0) > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] tabular-nums"
                              aria-label={`${card.attachmentCount} ${card.attachmentCount === 1 ? "attachment" : "attachments"}`}
                            >
                              <Paperclip className="h-3.5 w-3.5" aria-hidden />
                              {card.attachmentCount}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {!readOnly ? (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Delete ${card.title}`}
                          className={cn(
                            "absolute top-1.5 right-1.5 h-7 w-7 inline-flex items-center justify-center rounded-md",
                            "text-muted-foreground hover:text-destructive hover:bg-background/80",
                            "opacity-0 group-hover/card:opacity-100 focus:opacity-100",
                            "outline-none ring-0 focus:outline-none",
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCardToDelete(card);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            e.stopPropagation();
                            setCardToDelete(card);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {listCards.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No cards yet</p>
          ) : null}
        </div>
      </div>

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open);
          if (!open) setRenameTitle("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleRenameList();
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename list</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor={`rename-list-${list.id}`}>List name</Label>
              <Input
                id={`rename-list-${list.id}`}
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                placeholder="List name"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)} disabled={renaming}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={renaming || !renameTitle.trim() || renameTitle.trim() === list.title}
              >
                {renaming ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{list.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides the list and its cards from the board. Session notes, comments, and files
              stay saved on the account and are not permanently erased.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteList();
              }}
            >
              {deleting ? "Deleting…" : "Delete list"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(cardToDelete)} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              This hides &ldquo;{cardToDelete?.title}&rdquo; from the board. Session notes, comments,
              and files stay saved on the account and are not permanently erased.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCard}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingCard}
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteCard();
              }}
            >
              {deletingCard ? "Deleting…" : "Delete card"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function BoardCardAssignmentStatus({
  assignment,
}: {
  assignment: WorksheetAssignment | null | undefined;
}) {
  const status = assignment ? worksheetProgressStatus(assignment) : "assigned";
  const dueLabel = assignment && status !== "done" ? formatAssignmentDueDate(assignment) : "";
  const variant = status === "done" ? "secondary" : status === "due" ? "destructive" : "default";

  return (
    <div className="mt-1.5 pl-6 flex flex-wrap items-center gap-1.5">
      <Badge variant={variant} className="text-[10px] px-1.5 py-0">
        {WORKSHEET_PROGRESS_LABEL[status]}
      </Badge>
      {dueLabel ? (
        <span
          className={
            status === "due" ? "text-[10px] font-medium text-destructive" : "text-[10px] text-muted-foreground"
          }
        >
          {dueLabel}
        </span>
      ) : null}
    </div>
  );
}
