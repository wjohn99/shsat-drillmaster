import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignLeft,
  Check,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Eye,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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
  isAttachmentOverdue,
  worksheetProgressStatus,
  WORKSHEET_PROGRESS_LABEL,
} from "@/lib/dashboardStats";
import { updateWorkspaceCard, deleteWorkspaceCard } from "@/lib/workspaceService";
import type { WorksheetAssignment } from "@/types/assignment";
import {
  addCardLinkAttachment,
  addCardPdfAttachment,
  createCardComment,
  fetchCardAttachments,
  fetchLatestSubmissionsForAttachments,
  resolveAttachmentDownloadUrl,
  softDeleteCardAttachment,
  softDeleteCardComment,
  submitAttachmentWork,
  subscribeCardFeed,
} from "@/lib/workspaceCardContentService";
import {
  activeAttachments,
  MAX_ATTACHMENTS_PER_CARD,
  MAX_PDFS_PER_CARD,
  WORKSPACE_PDF_MAX_BYTES,
} from "@/lib/workspaceUploadLimits";
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
import { WORKSPACE_HOME_PATH } from "@/types/worksheetsNavigation";

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

function notesFromCard(
  card: WorkspaceCard,
  defaultStudentName?: string,
): {
  studentName: string;
  sessionDate: string;
  startTime: string;
  duration: string;
  location: string;
  concepts: string;
} {
  return {
    studentName: card.sessionMeta?.studentName ?? defaultStudentName ?? "",
    sessionDate: card.sessionMeta?.sessionDate ?? "",
    startTime: card.sessionMeta?.startTime ?? "",
    duration: card.sessionMeta?.duration ?? "",
    location: card.sessionMeta?.location ?? "",
    concepts: card.description ?? "",
  };
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
  const [savedNotes, setSavedNotes] = useState(() =>
    card ? notesFromCard(card, defaultStudentName) : null,
  );
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
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [pdfDisplayName, setPdfDisplayName] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [submissionsByAttachmentId, setSubmissionsByAttachmentId] = useState<
    Record<string, WorkspaceAttachmentSubmission | null>
  >({});

  const [feed, setFeed] = useState<CardFeedItem[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [linkedAssignment, setLinkedAssignment] = useState<WorksheetAssignment | null>(null);
  const [linkedAssignmentLoading, setLinkedAssignmentLoading] = useState(false);
  const [deleteCardOpen, setDeleteCardOpen] = useState(false);
  const [deletingCard, setDeletingCard] = useState(false);

  useEffect(() => {
    if (!card) return;
    const notes = notesFromCard(card, defaultStudentName);
    setTitle(card.title);
    setCompleted(card.completed);
    setStudentName(notes.studentName);
    setSessionDate(notes.sessionDate);
    setStartTime(notes.startTime);
    setDuration(notes.duration);
    setLocation(notes.location);
    setConcepts(notes.concepts);
    setSavedNotes(notes);
    setEditingDescription(false);
    setShowFullDescription(false);
    setCommentDraft("");
    setAddingLink(false);
    setLinkTitle("");
    setLinkUrl("");
    setLinkSetDueDate(false);
    setLinkDueDate(defaultAssignmentDueDateInput());
    setPendingPdf(null);
    setPdfDisplayName("");
    // Only reset when opening a different card so a background refresh cannot wipe notes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, defaultStudentName]);

  const isStudentView = profile?.role === "student";
  const isTutorView = !readOnly;
  const canAddAttachments = Boolean(profile);
  const minLinkDueDate = defaultAssignmentDueDateInput();

  const attachmentCounts = useMemo(() => {
    const active = activeAttachments(attachments);
    return {
      total: active.length,
      pdfs: active.filter((a) => a.kind === "file").length,
    };
  }, [attachments]);

  const pdfUploadBlocked =
    attachmentCounts.pdfs >= MAX_PDFS_PER_CARD ||
    attachmentCounts.total >= MAX_ATTACHMENTS_PER_CARD;
  const linkAddBlocked = attachmentCounts.total >= MAX_ATTACHMENTS_PER_CARD;

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
        returnTo: WORKSPACE_HOME_PATH,
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
        returnTo: WORKSPACE_HOME_PATH,
      },
    });
  };

  const handleSaveDescription = async (opts?: { silent?: boolean; closeAfter?: boolean }) => {
    if (!card || readOnly) return false;
    setSaving(true);
    try {
      await updateWorkspaceCard(boardId, card.id, {
        // Firestore rejects `undefined` in map fields, use empty strings to clear.
        sessionMeta: {
          studentName: studentName.trim(),
          sessionDate: sessionDate.trim(),
          startTime: startTime.trim(),
          duration: duration.trim(),
          location: location.trim(),
        },
        description: concepts,
      });
      setSavedNotes({
        studentName: studentName.trim(),
        sessionDate: sessionDate.trim(),
        startTime: startTime.trim(),
        duration: duration.trim(),
        location: location.trim(),
        concepts,
      });
      if (!opts?.silent) {
        setEditingDescription(false);
        toast({ title: "Description saved" });
        onUpdated();
      }
      if (opts?.closeAfter) onOpenChange(false);
      return true;
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const descriptionDirty =
    Boolean(card) &&
    editingDescription &&
    Boolean(savedNotes) &&
    (studentName !== savedNotes?.studentName ||
      sessionDate !== savedNotes?.sessionDate ||
      startTime !== savedNotes?.startTime ||
      duration !== savedNotes?.duration ||
      location !== savedNotes?.location ||
      concepts !== savedNotes?.concepts);

  useEffect(() => {
    if (readOnly || !descriptionDirty) return;
    const timer = window.setTimeout(() => {
      void handleSaveDescription({ silent: true });
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    readOnly,
    descriptionDirty,
    studentName,
    sessionDate,
    startTime,
    duration,
    location,
    concepts,
  ]);

  const handleDialogOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (readOnly || !descriptionDirty) {
      onOpenChange(false);
      return;
    }
    void handleSaveDescription({ silent: true, closeAfter: true });
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

  const handleDeleteCard = async () => {
    if (!card || readOnly) return;
    setDeletingCard(true);
    try {
      await deleteWorkspaceCard(boardId, card.id);
      setDeleteCardOpen(false);
      onOpenChange(false);
      onUpdated();
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

  const handlePdfSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !card || !canAddAttachments) return;
    setAddingLink(false);
    setPendingPdf(file);
    setPdfDisplayName(file.name.replace(/\.pdf$/i, "").trim() || "Document");
  };

  const clearPendingPdf = () => {
    setPendingPdf(null);
    setPdfDisplayName("");
  };

  const handleUploadNamedPdf = async () => {
    if (!card || !canAddAttachments || !pendingPdf) return;
    const displayName = pdfDisplayName.trim();
    if (!displayName) {
      toast({ title: "Name this file before uploading", variant: "destructive" });
      return;
    }
    setUploadingPdf(true);
    try {
      await addCardPdfAttachment(boardId, card.id, pendingPdf, { displayName });
      const rows = await fetchCardAttachments(boardId, card.id);
      setAttachments(rows);
      await reloadSubmissions(rows);
      clearPendingPdf();
      toast({ title: "PDF attached" });
      onUpdated();
    } catch (err) {
      toast({
        title: "Could not upload PDF",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleAddLink = async () => {
    if (!card || !canAddAttachments) return;
    if (isTutorView && linkSetDueDate && linkDueDate < minLinkDueDate) {
      toast({
        title: "Due date must be today or later",
        variant: "destructive",
      });
      return;
    }
    setSavingLink(true);
    try {
      const dueAt =
        isTutorView && linkSetDueDate ? assignmentDueDateInputToTimestamp(linkDueDate) : null;
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
      onUpdated();
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
    if (!card) return;
    if (readOnly && attachment.uploadedByUid !== profile?.uid) return;
    try {
      await softDeleteCardAttachment(
        boardId,
        card.id,
        attachment.id,
        attachment.fileName,
        attachment.storagePath,
      );
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      onUpdated();
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
      onUpdated();
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
    <>
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="glass-modal max-w-6xl w-[96vw] h-[min(92vh,900px)] p-0 gap-0 flex flex-col overflow-hidden bg-card text-card-foreground [&>button]:z-20">
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
                  className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-1 text-xl font-semibold leading-tight shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 [background-color:transparent] hover:[background-color:transparent]"
                />
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteCardOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete card
                  </Button>
                ) : null}
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
                      <Label className="font-semibold">Session Summary</Label>
                      <Textarea
                        value={concepts}
                        onChange={(e) => setConcepts(e.target.value)}
                        rows={10}
                        placeholder="Summary of what was covered in this session…"
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
                          setStudentName(savedNotes?.studentName ?? "");
                          setSessionDate(savedNotes?.sessionDate ?? "");
                          setStartTime(savedNotes?.startTime ?? "");
                          setDuration(savedNotes?.duration ?? "");
                          setLocation(savedNotes?.location ?? "");
                          setConcepts(savedNotes?.concepts ?? "");
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
                    <div className="rounded-lg border bg-background p-4 space-y-3">
                      <div>
                        <p className="font-medium">{linkedAssignment.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {linkedAssignment.questionIds.length} questions
                          {formatAssignmentDueDate(linkedAssignment)
                            ? ` · Due ${formatAssignmentDueDate(linkedAssignment)}`
                            : ""}
                          {` · ${WORKSHEET_PROGRESS_LABEL[worksheetProgressStatus(linkedAssignment)]}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile?.role === "student" && linkedAssignment.status === "todo" ? (
                          <Button size="sm" onClick={handleStartLinkedWorksheet}>
                            Start worksheet
                          </Button>
                        ) : null}
                        {linkedAssignment.status === "completed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onOpenChange(false);
                              navigate("/worksheets", {
                                state: { reviewAssignment: linkedAssignment, returnTo: WORKSPACE_HOME_PATH },
                              });
                            }}
                          >
                            View last results
                          </Button>
                        ) : null}
                      </div>
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
                  {canAddAttachments ? (
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {isTutorView && !card.assignmentId ? (
                        <Button variant="ghost" size="sm" onClick={handleOpenWorksheetAssign}>
                          <ClipboardList className="h-4 w-4 mr-1" />
                          Assign worksheet
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={uploadingPdf || pdfUploadBlocked}
                        title={
                          pdfUploadBlocked
                            ? `Limit reached (${MAX_PDFS_PER_CARD} PDFs or ${MAX_ATTACHMENTS_PER_CARD} attachments per card)`
                            : undefined
                        }
                        onClick={() => {
                          setAddingLink(false);
                          pdfInputRef.current?.click();
                        }}
                      >
                        {uploadingPdf ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1" />
                        )}
                        Upload PDF
                      </Button>
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => void handlePdfSelected(e)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={linkAddBlocked}
                        onClick={() => {
                          clearPendingPdf();
                          setAddingLink((v) => !v);
                        }}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Add link
                      </Button>
                    </div>
                  ) : null}
                </div>

                {canAddAttachments ? (
                  <p className="text-xs text-muted-foreground mb-3">
                    PDFs only · max {Math.round(WORKSPACE_PDF_MAX_BYTES / (1024 * 1024))} MB each ·{" "}
                    {attachmentCounts.pdfs}/{MAX_PDFS_PER_CARD} PDFs on this card
                  </p>
                ) : null}

                {canAddAttachments && pendingPdf ? (
                  <div className="mb-4 rounded-lg border bg-muted/30 p-3 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Name this PDF so it is easy to find on the card. Original file: {pendingPdf.name}
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="pdf-display-name">Name</Label>
                      <Input
                        id="pdf-display-name"
                        value={pdfDisplayName}
                        onChange={(e) => setPdfDisplayName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleUploadNamedPdf();
                          }
                        }}
                        placeholder="Week 3 homework"
                        maxLength={200}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={uploadingPdf || pdfUploadBlocked || !pdfDisplayName.trim()}
                        onClick={() => void handleUploadNamedPdf()}
                      >
                        {uploadingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                        Save PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={uploadingPdf}
                        onClick={clearPendingPdf}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}

                {canAddAttachments && addingLink ? (
                  <div className="mb-4 rounded-lg border bg-muted/30 p-3 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Paste a Google Drive, Dropbox, or other share link. Stored in Drillmaster
                      only, no file upload needed.
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="link-title">Name</Label>
                      <Input
                        id="link-title"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                        placeholder="Session 30 Notes"
                        maxLength={200}
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
                    {isTutorView ? (
                      <>
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
                      </>
                    ) : null}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={savingLink || !linkUrl.trim() || linkAddBlocked}
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
                  <p className="text-sm text-muted-foreground">
                    {readOnly && !canAddAttachments
                      ? "No attachments yet."
                      : "Upload a PDF or add a link (max 25 MB per PDF)."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <AttachmentRow
                        key={attachment.id}
                        boardId={boardId}
                        cardId={card.id}
                        attachment={attachment}
                        submission={submissionsByAttachmentId[attachment.id] ?? null}
                        isTutorView={isTutorView}
                        isStudentView={isStudentView}
                        currentUserUid={profile?.uid}
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
    <AlertDialog open={deleteCardOpen} onOpenChange={setDeleteCardOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this card?</AlertDialogTitle>
          <AlertDialogDescription>
            This hides the card from the board. Session notes, comments, and files stay saved on
            the account and are not permanently erased.
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
    lines.push("Session Summary");
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
  currentUserUid,
  onRemove,
  onSubmissionUpdated,
}: {
  boardId: string;
  cardId: string;
  attachment: WorkspaceCardAttachment;
  submission: WorkspaceAttachmentSubmission | null;
  isTutorView: boolean;
  isStudentView: boolean;
  currentUserUid?: string;
  onRemove: () => void;
  onSubmissionUpdated: () => Promise<void>;
}) {
  const isLink = attachment.kind === "link";
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrlLoading(true);
    setDownloadUrl(null);

    void resolveAttachmentDownloadUrl(attachment)
      .then((url) => {
        if (!cancelled) setDownloadUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDownloadUrl(null);
      })
      .finally(() => {
        if (!cancelled) setUrlLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attachment.id, attachment.kind, attachment.externalUrl, attachment.storagePath]);
  const isPdf =
    !isLink &&
    (attachment.contentType.includes("pdf") ||
      attachment.fileName.toLowerCase().endsWith(".pdf"));
  const dueLabel = formatAttachmentDueDate(attachment);
  const hasSubmission = Boolean(submission);
  const overdue = isAttachmentOverdue(attachment, hasSubmission);
  const isOwnAttachment = Boolean(currentUserUid && attachment.uploadedByUid === currentUserUid);
  const canRemove = isTutorView || isOwnAttachment;
  const showHomeworkSubmit = isStudentView && !isOwnAttachment;

  const openHref = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openAttachment = () => {
    if (downloadUrl) {
      openHref(downloadUrl);
      return;
    }
    if (urlLoading) {
      toast({ title: "Loading file…" });
      return;
    }
    toast({
      title: "Could not open attachment",
      description: "The file may have been removed or Storage is not configured.",
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
          {isPdf && downloadUrl ? (
            <HoverCard openDelay={300} closeDelay={120}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="group/preview inline-flex items-center gap-1.5 max-w-full text-left"
                >
                  <span className="text-sm font-medium truncate group-hover/preview:underline">
                    {attachment.fileName}
                  </span>
                  <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="sr-only">Preview {attachment.fileName}</span>
                </button>
              </HoverCardTrigger>
              <HoverCardContent
                side="left"
                align="start"
                className="w-[360px] p-2 z-[80]"
              >
                <p className="text-xs font-medium mb-2">Preview</p>
                <iframe
                  title={`Preview ${attachment.fileName}`}
                  src={downloadUrl}
                  className="h-[420px] w-full rounded border bg-background"
                />
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 mt-1 text-xs"
                  onClick={openAttachment}
                >
                  Open file
                </Button>
              </HoverCardContent>
            </HoverCard>
          ) : (
            <p className="text-sm font-medium truncate">{attachment.fileName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Added {formatTimestamp(attachment.createdAt)}
            {attachment.uploadedByName ? ` by ${attachment.uploadedByName}` : ""}
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
            disabled={urlLoading || (!downloadUrl && attachment.kind === "file")}
            onClick={openAttachment}
            title={isLink ? "Open link" : "Open PDF"}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {canRemove ? (
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

      {showHomeworkSubmit ? (
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
