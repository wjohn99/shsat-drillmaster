import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignLeft,
  Check,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Link2,
  Loader2,
  MessageSquare,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  assignmentDueDateInputToTimestamp,
  defaultAssignmentDueDateInput,
  fetchAssignmentById,
} from "@/lib/assignmentService";
import {
  formatAssignmentDueDate,
  formatAttachmentDueDate,
  isAssignmentOverdue,
  isAttachmentOverdue,
} from "@/lib/dashboardStats";
import { updateWorkspaceCard } from "@/lib/workspaceService";
import type { WorksheetAssignment } from "@/types/assignment";
import {
  addCardLinkAttachment,
  createCardComment,
  fetchCardAttachments,
  fetchLatestSubmissionsForAttachments,
  getAttachmentHref,
  softDeleteCardAttachment,
  softDeleteCardComment,
  submitAttachmentWork,
  subscribeCardFeed,
} from "@/lib/workspaceCardContentService";
import type {
  CardFeedItem,
  WorkspaceCard,
  WorkspaceCardActivity,
  WorkspaceCardAttachment,
  WorkspaceCardComment,
  WorkspaceAttachmentSubmission,
} from "@/types/workspace";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface CardDetailModalProps {
  boardId: string;
  card: WorkspaceCard | null;
  listTitle?: string;
  defaultStudentName?: string;
  open: boolean;
  readOnly?: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

function formatTimestamp(ts: { toDate?: () => Date } | undefined): string {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CardDetailModal({
  boardId,
  card,
  listTitle,
  defaultStudentName,
  open,
  readOnly = false,
  onOpenChange,
  onUpdated,
}: CardDetailModalProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [completed, setCompleted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [concepts, setConcepts] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [saving, setSaving] = useState(false);

  const [attachments, setAttachments] = useState<WorkspaceCardAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkSetDueDate, setLinkSetDueDate] = useState(false);
  const [linkDueDate, setLinkDueDate] = useState(defaultAssignmentDueDateInput);
  const [savingLink, setSavingLink] = useState(false);
  const [submissionsByAttachmentId, setSubmissionsByAttachmentId] = useState<
    Record<string, WorkspaceAttachmentSubmission | null>
  >({});

  const [feed, setFeed] = useState<CardFeedItem[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [linkedAssignment, setLinkedAssignment] = useState<WorksheetAssignment | null>(null);
  const [linkedAssignmentLoading, setLinkedAssignmentLoading] = useState(false);

  useEffect(() => {
    if (!card) return;
    setTitle(card.title);
    setCompleted(card.completed);
    setStudentName(card.sessionMeta?.studentName ?? defaultStudentName ?? "");
    setSessionDate(card.sessionMeta?.sessionDate ?? "");
    setStartTime(card.sessionMeta?.startTime ?? "");
    setDuration(card.sessionMeta?.duration ?? "");
    setLocation(card.sessionMeta?.location ?? "");
    setConcepts(card.description ?? "");
    setEditingDescription(false);
    setShowFullDescription(false);
    setCommentDraft("");
    setAddingLink(false);
    setLinkTitle("");
    setLinkUrl("");
    setLinkSetDueDate(false);
    setLinkDueDate(defaultAssignmentDueDateInput());
  }, [card, defaultStudentName]);

  const isStudentView = profile?.role === "student";
  const minLinkDueDate = defaultAssignmentDueDateInput();

  const reloadSubmissions = async (rows: WorkspaceCardAttachment[]) => {
    if (!card || rows.length === 0) {
      setSubmissionsByAttachmentId({});
      return;
    }
    const map = await fetchLatestSubmissionsForAttachments(boardId, card.id, rows);
    setSubmissionsByAttachmentId(map);
  };

  useEffect(() => {
    if (!open || !card) return;

    let cancelled = false;
    setAttachmentsLoading(true);
    void fetchCardAttachments(boardId, card.id)
      .then(async (rows) => {
        if (cancelled) return;
        setAttachments(rows);
        await reloadSubmissions(rows);
      })
      .finally(() => {
        if (!cancelled) setAttachmentsLoading(false);
      });

    const unsub = subscribeCardFeed(boardId, card.id, setFeed);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [open, boardId, card?.id]);

  useEffect(() => {
    if (!open || !card?.assignmentId) {
      setLinkedAssignment(null);
      return;
    }

    let cancelled = false;
    setLinkedAssignmentLoading(true);
    void fetchAssignmentById(card.assignmentId)
      .then((row) => {
        if (!cancelled) setLinkedAssignment(row);
      })
      .finally(() => {
        if (!cancelled) setLinkedAssignmentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, card?.assignmentId]);

  const handleOpenWorksheetAssign = () => {
    if (!card || readOnly) return;
    onOpenChange(false);
    navigate("/worksheets", {
      state: {
        assignToWorkspace: {
          boardId,
          listId: card.listId,
          cardId: card.id,
        },
      },
    });
  };

  const handleStartLinkedWorksheet = () => {
    if (!linkedAssignment || !card) return;
    onOpenChange(false);
    navigate("/worksheets", {
      state: {
        autoStartAssignment: linkedAssignment,
        workspaceCompletionTarget: { boardId, cardId: card.id },
      },
    });
  };

  const handleSaveDescription = async () => {
    if (!card || readOnly) return;
    setSaving(true);
    try {
      await updateWorkspaceCard(boardId, card.id, {
        // Firestore rejects `undefined` in map fields — use empty strings to clear.
        sessionMeta: {
          studentName: studentName.trim(),
          sessionDate: sessionDate.trim(),
          startTime: startTime.trim(),
          duration: duration.trim(),
          location: location.trim(),
        },
        description: concepts,
      });
      setEditingDescription(false);
      onUpdated();
      toast({ title: "Description saved" });
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!card || readOnly || title.trim() === card.title) return;
    try {
      await updateWorkspaceCard(boardId, card.id, { title: title.trim() });
      onUpdated();
    } catch {
      toast({ title: "Could not update title", variant: "destructive" });
    }
  };

  const handleToggleComplete = async (checked: boolean) => {
    if (!card || readOnly) return;
    setCompleted(checked);
    try {
      await updateWorkspaceCard(boardId, card.id, { completed: checked });
      onUpdated();
    } catch {
      setCompleted(!checked);
      toast({ title: "Could not update status", variant: "destructive" });
    }
  };

  const handleAddLink = async () => {
    if (!card || readOnly) return;
    if (linkSetDueDate && linkDueDate < minLinkDueDate) {
      toast({
        title: "Due date must be today or later",
        variant: "destructive",
      });
      return;
    }
    setSavingLink(true);
    try {
      const dueAt = linkSetDueDate ? assignmentDueDateInputToTimestamp(linkDueDate) : null;
      await addCardLinkAttachment(boardId, card.id, linkTitle, linkUrl, dueAt);
      const rows = await fetchCardAttachments(boardId, card.id);
      setAttachments(rows);
      await reloadSubmissions(rows);
      setLinkTitle("");
      setLinkUrl("");
      setLinkSetDueDate(false);
      setLinkDueDate(defaultAssignmentDueDateInput());
      setAddingLink(false);
      toast({ title: "Link added" });
    } catch (err) {
      toast({
        title: "Could not add link",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingLink(false);
    }
  };

  const handleRemoveAttachment = async (attachment: WorkspaceCardAttachment) => {
    if (!card || readOnly) return;
    try {
      await softDeleteCardAttachment(boardId, card.id, attachment.id, attachment.fileName);
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    } catch (err) {
      toast({
        title: "Could not remove attachment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePostComment = async () => {
    if (!card || !commentDraft.trim()) return;
    setPostingComment(true);
    try {
      await createCardComment(boardId, card.id, commentDraft);
      setCommentDraft("");
    } catch (err) {
      toast({
        title: "Could not post comment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPostingComment(false);
    }
  };

  const descriptionPreview = buildDescriptionPreview(
    studentName,
    sessionDate,
    startTime,
    duration,
    location,
    concepts,
  );
  const descriptionLong = descriptionPreview.length > 480;
  const descriptionShown =
    showFullDescription || !descriptionLong
      ? descriptionPreview
      : `${descriptionPreview.slice(0, 480)}…`;

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[min(92vh,900px)] p-0 gap-0 flex flex-col overflow-hidden [&>button]:z-20">
        <DialogTitle className="sr-only">{card.title}</DialogTitle>

        <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
          {/* Main column */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 border-r border-border">
            <div className="px-6 pt-5 pb-3 space-y-3 shrink-0">
              {listTitle ? (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {listTitle}
                </p>
              ) : null}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={completed ? "Mark incomplete" : "Mark complete"}
                  disabled={readOnly}
                  onClick={() => void handleToggleComplete(!completed)}
                  className={cn(
                    "h-6 w-6 shrink-0 rounded-full flex items-center justify-center",
                    "outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                    completed
                      ? "bg-primary"
                      : "border-2 border-muted-foreground/50",
                    !readOnly && "cursor-pointer hover:opacity-90",
                    readOnly && "cursor-default",
                  )}
                >
                  {completed ? (
                    <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                  ) : null}
                </button>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => void handleSaveTitle()}
                  readOnly={readOnly}
                  className="text-xl font-semibold border-none shadow-none px-0 py-0 h-auto leading-tight focus-visible:ring-0"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-6 pb-6">
              {/* Description */}
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlignLeft className="h-4 w-4" />
                    Description
                  </div>
                  {!readOnly && !editingDescription ? (
                    <Button variant="ghost" size="sm" onClick={() => setEditingDescription(true)}>
                      Edit
                    </Button>
                  ) : null}
                </div>

                {editingDescription && !readOnly ? (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Name</Label>
                        <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Date</Label>
                        <Input
                          value={sessionDate}
                          onChange={(e) => setSessionDate(e.target.value)}
                          placeholder="MM/DD/YY"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Start time</Label>
                        <Input
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          placeholder="6:40 pm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Duration</Label>
                        <Input
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          placeholder="1 hour"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Location</Label>
                        <Input
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Google Meet"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Concepts covered</Label>
                      <Textarea
                        value={concepts}
                        onChange={(e) => setConcepts(e.target.value)}
                        rows={10}
                        placeholder="Bullet points for topics discussed in this session…"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => void handleSaveDescription()} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingDescription(false);
                          setStudentName(card.sessionMeta?.studentName ?? defaultStudentName ?? "");
                          setSessionDate(card.sessionMeta?.sessionDate ?? "");
                          setStartTime(card.sessionMeta?.startTime ?? "");
                          setDuration(card.sessionMeta?.duration ?? "");
                          setLocation(card.sessionMeta?.location ?? "");
                          setConcepts(card.description ?? "");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm space-y-3">
                    {descriptionPreview ? (
                      <pre className="whitespace-pre-wrap font-sans text-foreground/90 leading-relaxed">
                        {descriptionShown}
                      </pre>
                    ) : (
                      <p className="text-muted-foreground italic">
                        {readOnly ? "No description yet." : "No description yet. Click Edit to add session notes."}
                      </p>
                    )}
                    {descriptionLong && !editingDescription ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowFullDescription((v) => !v)}
                      >
                        {showFullDescription ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Show more
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                )}
              </section>

              {card.assignmentId ? (
                <section className="mb-8">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <ClipboardList className="h-4 w-4" />
                    Assigned Worksheet
                  </div>
                  {linkedAssignmentLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : linkedAssignment ? (
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <div>
                        <p className="font-medium">{linkedAssignment.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {linkedAssignment.questionIds.length} questions
                          {formatAssignmentDueDate(linkedAssignment)
                            ? ` · Due ${formatAssignmentDueDate(linkedAssignment)}`
                            : ""}
                          {linkedAssignment.status === "completed"
                            ? " · Completed"
                            : isAssignmentOverdue(linkedAssignment)
                              ? " · Overdue"
                              : " · To do"}
                        </p>
                      </div>
                      {profile?.role === "student" && linkedAssignment.status === "todo" ? (
                        <Button size="sm" onClick={handleStartLinkedWorksheet}>
                          Start worksheet
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Worksheet not found.</p>
                  )}
                </section>
              ) : null}

              {/* Attachments */}
              <section>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                  </div>
                  {!readOnly ? (
                    <div className="flex items-center gap-1">
                      {!card.assignmentId ? (
                        <Button variant="ghost" size="sm" onClick={handleOpenWorksheetAssign}>
                          <ClipboardList className="h-4 w-4 mr-1" />
                          Assign worksheet
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddingLink((v) => !v)}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Add link
                      </Button>
                    </div>
                  ) : null}
                </div>

                {!readOnly && addingLink ? (
                  <div className="mb-4 rounded-lg border bg-muted/30 p-3 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Paste a Google Drive, Dropbox, or other share link. Stored in Drillmaster
                      only — no file upload needed.
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="link-title">Label</Label>
                      <Input
                        id="link-title"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                        placeholder="Session 30 Notes"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="link-url">URL</Label>
                      <Input
                        id="link-url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="link-due-date"
                        checked={linkSetDueDate}
                        onCheckedChange={(v) => setLinkSetDueDate(v === true)}
                      />
                      <Label htmlFor="link-due-date" className="text-sm font-normal cursor-pointer">
                        Set a due date for this homework
                      </Label>
                    </div>
                    {linkSetDueDate ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="link-due-date-input">Due date</Label>
                        <Input
                          id="link-due-date-input"
                          type="date"
                          min={minLinkDueDate}
                          value={linkDueDate}
                          onChange={(e) => setLinkDueDate(e.target.value)}
                        />
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={savingLink || !linkUrl.trim()}
                        onClick={() => void handleAddLink()}
                      >
                        {savingLink ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                        Save link
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAddingLink(false);
                          setLinkTitle("");
                          setLinkUrl("");
                          setLinkSetDueDate(false);
                          setLinkDueDate(defaultAssignmentDueDateInput());
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}

                {attachmentsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No links attached yet.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Links</p>
                    {attachments.map((attachment) => (
                      <AttachmentRow
                        key={attachment.id}
                        boardId={boardId}
                        cardId={card.id}
                        attachment={attachment}
                        submission={submissionsByAttachmentId[attachment.id] ?? null}
                        isTutorView={!readOnly}
                        isStudentView={isStudentView}
                        onRemove={() => void handleRemoveAttachment(attachment)}
                        onSubmissionUpdated={async () => {
                          await reloadSubmissions(attachments);
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            </ScrollArea>
          </div>

          {/* Comments column */}
          <div className="w-full lg:w-[340px] shrink-0 flex flex-col min-h-[280px] lg:min-h-0 bg-muted/20">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-semibold">Comments and activity</span>
            </div>

            <div className="p-3 shrink-0">
              <Textarea
                placeholder="Write a comment…"
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                rows={3}
                className="resize-none bg-background text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void handlePostComment();
                  }
                }}
              />
              <Button
                className="mt-2 w-full"
                size="sm"
                disabled={postingComment || !commentDraft.trim()}
                onClick={() => void handlePostComment()}
              >
                {postingComment ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Comment
              </Button>
            </div>

            <Separator />

            <ScrollArea className="flex-1 px-3 py-3">
              <div className="space-y-4">
                {feed.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Activity will appear here when you comment, add links, or assign worksheets.
                  </p>
                ) : (
                  feed.map((item) =>
                    item.kind === "comment" ? (
                      <CommentBubble
                        key={`c-${item.data.id}`}
                        comment={item.data}
                        canDelete={
                          !readOnly &&
                          (profile?.role === "tutor" || profile?.uid === item.data.authorUid)
                        }
                        onDelete={() =>
                          void softDeleteCardComment(boardId, card.id, item.data.id).catch(() =>
                            toast({ title: "Could not delete comment", variant: "destructive" }),
                          )
                        }
                      />
                    ) : (
                      <ActivityLine key={`a-${item.data.id}`} activity={item.data} />
                    ),
                  )
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildDescriptionPreview(
  studentName: string,
  sessionDate: string,
  startTime: string,
  duration: string,
  location: string,
  concepts: string,
): string {
  const lines: string[] = [];
  if (studentName) lines.push(`Name: ${studentName}`);
  if (sessionDate) lines.push(`Date: ${sessionDate}`);
  if (startTime) lines.push(`Start Time: ${startTime}`);
  if (duration) lines.push(`Duration: ${duration}`);
  if (location) lines.push(`Location: ${location}`);
  if (lines.length > 0 && concepts.trim()) lines.push("");
  if (concepts.trim()) {
    lines.push("Concepts Covered");
    lines.push(concepts.trim());
  }
  return lines.join("\n");
}

function AttachmentRow({
  boardId,
  cardId,
  attachment,
  submission,
  isTutorView,
  isStudentView,
  onRemove,
  onSubmissionUpdated,
}: {
  boardId: string;
  cardId: string;
  attachment: WorkspaceCardAttachment;
  submission: WorkspaceAttachmentSubmission | null;
  isTutorView: boolean;
  isStudentView: boolean;
  onRemove: () => void;
  onSubmissionUpdated: () => Promise<void>;
}) {
  const href = getAttachmentHref(attachment);
  const isLink = attachment.kind === "link";
  const isPdf =
    !isLink &&
    (attachment.contentType.includes("pdf") ||
      attachment.fileName.toLowerCase().endsWith(".pdf"));
  const dueLabel = formatAttachmentDueDate(attachment);
  const hasSubmission = Boolean(submission);
  const overdue = isAttachmentOverdue(attachment, hasSubmission);

  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openHref = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openAttachment = () => {
    if (href) {
      openHref(href);
      return;
    }
    toast({
      title: "File upload not available",
      description: "Add a Google Drive or Dropbox link instead.",
      variant: "destructive",
    });
  };

  const handleSubmitWork = async () => {
    if (!submitUrl.trim()) {
      toast({ title: "Add a link to your completed work", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await submitAttachmentWork(
        boardId,
        cardId,
        attachment.id,
        attachment.fileName,
        submitUrl,
        submitNotes,
      );
      setSubmitUrl("");
      setSubmitNotes("");
      setShowSubmitForm(false);
      await onSubmissionUpdated();
      toast({ title: "Work submitted" });
    } catch (err) {
      toast({
        title: "Could not submit work",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-2.5 space-y-2 group">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-10 w-10 shrink-0 rounded flex items-center justify-center text-xs font-bold",
            isLink
              ? "bg-primary/10 text-primary"
              : isPdf
                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                : "bg-muted",
          )}
        >
          {isLink ? <Link2 className="h-4 w-4" /> : isPdf ? "PDF" : "FILE"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{attachment.fileName}</p>
          <p className="text-xs text-muted-foreground">
            Added {formatTimestamp(attachment.createdAt)}
            {dueLabel ? ` · Due ${dueLabel}` : ""}
            {overdue ? " · Overdue" : ""}
            {hasSubmission ? " · Submitted" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!href && attachment.kind === "file"}
            onClick={openAttachment}
            title="Open assignment link"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {isTutorView ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {submission ? (
        <div className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-2 text-xs space-y-1">
          <p className="font-medium text-foreground/90">
            {isStudentView ? "Your submission" : `${submission.submittedByName}'s submission`}
          </p>
          <p className="text-muted-foreground">
            Submitted {formatTimestamp(submission.submittedAt)}
          </p>
          {submission.notes ? (
            <p className="text-muted-foreground whitespace-pre-wrap">{submission.notes}</p>
          ) : null}
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => openHref(submission.submissionUrl)}
          >
            Open submitted work
          </Button>
        </div>
      ) : null}

      {isStudentView ? (
        <div className="space-y-2">
          {!showSubmitForm ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setShowSubmitForm(true);
                if (submission) {
                  setSubmitUrl(submission.submissionUrl);
                  setSubmitNotes(submission.notes);
                }
              }}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              {submission ? "Update submission" : "Submit completed work"}
            </Button>
          ) : (
            <div className="rounded-md border bg-muted/30 p-2.5 space-y-2">
              <p className="text-xs text-muted-foreground">
                Paste a link to your finished homework (Google Drive, Dropbox, etc.).
              </p>
              <div className="space-y-1.5">
                <Label htmlFor={`submit-url-${attachment.id}`} className="text-xs">
                  Link to your work
                </Label>
                <Input
                  id={`submit-url-${attachment.id}`}
                  value={submitUrl}
                  onChange={(e) => setSubmitUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`submit-notes-${attachment.id}`} className="text-xs">
                  Notes (optional)
                </Label>
                <Textarea
                  id={`submit-notes-${attachment.id}`}
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                  placeholder="Anything your tutor should know"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={submitting || !submitUrl.trim()}
                  onClick={() => void handleSubmitWork()}
                >
                  {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Submit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowSubmitForm(false);
                    setSubmitUrl("");
                    setSubmitNotes("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CommentBubble({
  comment,
  canDelete,
  onDelete,
}: {
  comment: WorkspaceCardComment;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-2 group">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">{initials(comment.authorName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="rounded-lg bg-background border px-3 py-2 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">
            <span className="font-medium text-foreground">{comment.authorName}</span>
            {" · "}
            {formatTimestamp(comment.createdAt)}
          </p>
          <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
        </div>
        {canDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100"
            onClick={onDelete}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ActivityLine({ activity }: { activity: WorkspaceCardActivity }) {
  const isWorksheetAssigned = activity.type === "worksheet_assigned";
  const isWorksheetCompleted = activity.type === "worksheet_completed";
  const isAttachmentSubmitted = activity.type === "attachment_submitted";
  const isWorksheetHighlight = isWorksheetAssigned || isWorksheetCompleted;
  const isSubmissionHighlight = isAttachmentSubmitted;
  return (
    <p
      className={cn(
        "text-xs text-muted-foreground leading-relaxed",
        (isWorksheetHighlight || isSubmissionHighlight) && "rounded-md border px-2.5 py-2",
        isWorksheetAssigned && "border-primary/20 bg-primary/5",
        isWorksheetCompleted && "border-emerald-500/25 bg-emerald-500/5",
        isSubmissionHighlight && "border-emerald-500/25 bg-emerald-500/5",
      )}
    >
      {isWorksheetAssigned ? (
        <ClipboardList className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5 text-primary" />
      ) : null}
      {isWorksheetCompleted ? (
        <CheckCircle2 className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5 text-emerald-600" />
      ) : null}
      {isAttachmentSubmitted ? (
        <Upload className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5 text-emerald-600" />
      ) : null}
      <span className="font-medium text-foreground/80">{activity.actorName}</span>{" "}
      {activity.message}
      {activity.createdAt ? (
        <span className="block mt-0.5 opacity-70">{formatTimestamp(activity.createdAt)}</span>
      ) : null}
    </p>
  );
}
