import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ClipboardList, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  deleteWorkspaceList,
  reorderWorkspaceCards,
  updateWorkspaceCard,
  updateWorkspaceList,
} from "@/lib/workspaceService";
import type { WorkspaceCard, WorkspaceList } from "@/types/workspace";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface BoardListColumnProps {
  boardId: string;
  list: WorkspaceList;
  cards: WorkspaceCard[];
  readOnly?: boolean;
  onCardClick: (card: WorkspaceCard) => void;
  onCardsChanged: () => void;
  onListChanged: () => void;
}

export function BoardListColumn({
  boardId,
  list,
  cards,
  readOnly = false,
  onCardClick,
  onCardsChanged,
  onListChanged,
}: BoardListColumnProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      await createWorkspaceCard(boardId, list.id, title);
      setNewTitle("");
      setAdding(false);
      onCardsChanged();
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
      setRenameOpen(false);
      onListChanged();
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
      toast({ title: "List deleted", description: `"${list.title}" and its cards were removed.` });
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

  return (
    <>
      <div
        className="w-72 shrink-0 flex flex-col max-h-[calc(100vh-10rem)] rounded-xl bg-muted/80 border border-border"
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
        <div className="px-3 py-2.5 flex items-center gap-2 border-b border-border">
          <h3 className="font-semibold text-sm truncate flex-1 min-w-0">{list.title}</h3>
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

        <div
          ref={listBodyRef}
          className={cn(
            "relative overflow-y-auto p-2 min-h-[120px]",
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

            return (
              <div key={card.id} className="mb-2 last:mb-0">
                <div
                  data-workspace-card
                  className={cn(
                    "rounded-lg",
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
                        "flex-1 min-w-0 text-left rounded-lg px-3 py-2.5 text-sm shadow-sm transition-colors",
                        "bg-card border border-border hover:bg-accent/50",
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
                      {card.assignmentId ? (
                        <p className="text-xs text-muted-foreground mt-1 pl-6 flex items-center gap-1">
                          <ClipboardList className="h-3 w-3 shrink-0" />
                          Worksheet attached
                        </p>
                      ) : null}
                      {card.description ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 pl-6">
                          {card.description}
                        </p>
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

          {adding && !readOnly ? (
            <div className="space-y-2 p-1">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Card title"
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
        </div>

        {!readOnly && !adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="m-2 mt-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add a card
          </button>
        ) : null}
      </div>

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open);
          if (!open) setRenameTitle("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename list</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`rename-list-${list.id}`}>List name</Label>
            <Input
              id={`rename-list-${list.id}`}
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              placeholder="List name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRenameList();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)} disabled={renaming}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleRenameList()}
              disabled={renaming || !renameTitle.trim() || renameTitle.trim() === list.title}
            >
              {renaming ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{list.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the list and all {listCards.length} card
              {listCards.length === 1 ? "" : "s"} in it. This cannot be undone from the app.
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
    </>
  );
}
