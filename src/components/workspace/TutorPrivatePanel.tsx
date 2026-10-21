import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, FileText, Link2, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatIsoDateLabel } from "@/lib/shsat2026";
import {
  deleteTutorPrivateNote,
  fetchTutorPrivateNotes,
  MAX_FILES_PER_TUTOR_NOTE,
  resolveTutorPrivateNoteFileUrl,
  saveTutorPrivateNoteWithUploads,
  tutorPrivateNoteLinkFile,
} from "@/lib/tutorPrivateNotesService";
import {
  TUTOR_PRIVATE_NOTE_KIND_LABEL,
  TUTOR_PRIVATE_NOTE_KINDS,
  type TutorPrivateNote,
  type TutorPrivateNoteFile,
  type TutorPrivateNoteKind,
} from "@/types/workspace";

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function previewText(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.length > 140 ? `${compact.slice(0, 137)}...` : compact;
}

function emptyDraft(kind: TutorPrivateNoteKind = "lesson_plan"): {
  kind: TutorPrivateNoteKind;
  title: string;
  sessionDate: string;
  body: string;
  files: TutorPrivateNoteFile[];
} {
  return {
    kind,
    title: "",
    sessionDate: todayIsoDate(),
    body: "",
    files: [],
  };
}

export function TutorPrivatePanel({ boardId }: { boardId: string }) {
  const [notes, setNotes] = useState<TutorPrivateNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<TutorPrivateNote | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [openingPath, setOpeningPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadNotes = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      setNotes(await fetchTutorPrivateNotes(boardId));
    } catch (err) {
      setNotes([]);
      if (!opts?.silent) {
        toast({
          title: "Could not load tutor notes",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotes();
    // Reload when the student board changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const latestLabel = useMemo(() => {
    const dated = notes.find((note) => note.sessionDate);
    if (dated?.sessionDate) return formatIsoDateLabel(dated.sessionDate);
    return notes[0] ? "Saved" : null;
  }, [notes]);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setPendingFiles([]);
    setAddingLink(false);
    setLinkTitle("");
    setLinkUrl("");
    setComposerOpen(true);
  };

  const openEdit = (note: TutorPrivateNote) => {
    setEditing(note);
    setDraft({
      kind: note.kind,
      title: note.title,
      sessionDate: note.sessionDate,
      body: note.body,
      files: note.files,
    });
    setPendingFiles([]);
    setAddingLink(false);
    setLinkTitle("");
    setLinkUrl("");
    setComposerOpen(true);
  };

  const attachmentCount = draft.files.length + pendingFiles.length;

  const addLink = () => {
    if (!linkUrl.trim()) return;
    if (attachmentCount >= MAX_FILES_PER_TUTOR_NOTE) {
      toast({
        title: "Attachment limit reached",
        description: `A note can have at most ${MAX_FILES_PER_TUTOR_NOTE} attachments.`,
        variant: "destructive",
      });
      return;
    }
    try {
      setDraft((prev) => ({
        ...prev,
        files: [...prev.files, tutorPrivateNoteLinkFile(linkTitle, linkUrl)],
      }));
      setLinkTitle("");
      setLinkUrl("");
      setAddingLink(false);
    } catch (err) {
      toast({
        title: "Could not add link",
        description: err instanceof Error ? err.message : "Check the URL and try again.",
        variant: "destructive",
      });
    }
  };

  const handlePickFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next = [...pendingFiles];
    for (const file of Array.from(list)) {
      if (draft.files.length + next.length >= MAX_FILES_PER_TUTOR_NOTE) break;
      next.push(file);
    }
    setPendingFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveTutorPrivateNoteWithUploads(boardId, editing?.id ?? null, draft, pendingFiles);
      setComposerOpen(false);
      toast({ title: editing ? "Tutor note saved" : "Tutor note added" });
      await loadNotes({ silent: true });
    } catch (err) {
      toast({
        title: "Could not save tutor note",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || saving) return;
    setSaving(true);
    try {
      await deleteTutorPrivateNote(boardId, editing.id);
      setDeleteOpen(false);
      setComposerOpen(false);
      toast({ title: "Tutor note removed" });
      await loadNotes({ silent: true });
    } catch (err) {
      toast({
        title: "Could not remove note",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openFile = async (file: TutorPrivateNoteFile) => {
    const key = file.storagePath || file.externalUrl || file.fileName;
    setOpeningPath(key);
    try {
      const url = await resolveTutorPrivateNoteFileUrl(file);
      if (!url) throw new Error("This file has no link.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast({
        title: "Could not open file",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setOpeningPath(null);
    }
  };

  return (
    <>
      <details data-tour="tutor-private-notes" className="group rounded-xl border glass-surface mb-3">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-5 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Tutor Notes & Lesson Planning</h2>
            <Badge variant="outline">Tutor only</Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : notes.length > 0 ? (
              <>
                <span className="text-xs text-muted-foreground">
                  {notes.length} {notes.length === 1 ? "note" : "notes"}
                  {latestLabel ? ` · ${latestLabel}` : ""}
                </span>
                <span className="text-xs font-medium text-muted-foreground group-open:hidden">
                  Show notes
                </span>
              </>
            ) : (
              <span className="text-xs font-medium text-muted-foreground group-open:hidden">
                Add a lesson plan
              </span>
            )}
            <span className="hidden text-xs font-medium text-muted-foreground group-open:inline">
              Hide notes
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </div>
        </summary>

        <div className="space-y-3 border-t border-border/60 px-4 pb-4 pt-4 sm:px-5">
          <p className="text-sm text-muted-foreground">
            Lesson plans, session notes, observations, and next-session priorities. Students and
            families cannot see this. Keep homework and assignments in the lists below.
          </p>
          <Button type="button" size="sm" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" />
            Add note
          </Button>
          {notes.length === 0 && !loading ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
              No tutor notes yet. Add a lesson plan, session notes, or next-session priorities.
            </p>
          ) : (
            <ul className="space-y-2">
              {notes.map((note) => {
                const preview = previewText(note.body);
                return (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => openEdit(note)}
                      className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{TUTOR_PRIVATE_NOTE_KIND_LABEL[note.kind]}</Badge>
                        {note.sessionDate ? (
                          <span className="text-xs text-muted-foreground">
                            {formatIsoDateLabel(note.sessionDate)}
                          </span>
                        ) : null}
                        {note.files.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            {note.files.length}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-medium">{note.title}</p>
                      {preview ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">{preview}</p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </details>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit tutor note" : "Add tutor note"}</DialogTitle>
            <DialogDescription>
              Private to tutors. Students and families cannot see this note.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tutor-note-kind">Type</Label>
                <Select
                  value={draft.kind}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, kind: value as TutorPrivateNoteKind }))
                  }
                >
                  <SelectTrigger id="tutor-note-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TUTOR_PRIVATE_NOTE_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {TUTOR_PRIVATE_NOTE_KIND_LABEL[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tutor-note-date">Session date</Label>
                <Input
                  id="tutor-note-date"
                  type="date"
                  value={draft.sessionDate}
                  onChange={(e) => setDraft((prev) => ({ ...prev, sessionDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tutor-note-title">Title</Label>
              <Input
                id="tutor-note-title"
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Oct 21 lesson plan"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tutor-note-body">Notes</Label>
              <Textarea
                id="tutor-note-body"
                value={draft.body}
                onChange={(e) => setDraft((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Lesson plan, observations, or what to cover next time. Drive links in this text stay clickable."
                className="min-h-[180px]"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Attachments</p>
              {draft.files.length === 0 && pendingFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Optional. Paste a Drive link or upload a PDF. Family-facing homework stays on the
                  board lists.
                </p>
              ) : null}
              <ul className="space-y-1.5">
                {draft.files.map((file, index) => (
                  <li
                    key={`${file.fileName}-${file.storagePath || file.externalUrl || index}`}
                    className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                  >
                    {file.kind === "link" ? (
                      <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-sm underline-offset-2 hover:underline"
                      onClick={() => void openFile(file)}
                    >
                      {openingPath === (file.storagePath || file.externalUrl || file.fileName) ? (
                        <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {file.fileName}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          files: prev.files.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove {file.fileName}</span>
                    </Button>
                  </li>
                ))}
                {pendingFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">{file.name} (new)</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        setPendingFiles((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove {file.name}</span>
                    </Button>
                  </li>
                ))}
              </ul>
              {addingLink ? (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tutor-note-link-title">Name</Label>
                    <Input
                      id="tutor-note-link-title"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="Oct 21 lesson plan"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tutor-note-link-url">URL</Label>
                    <Input
                      id="tutor-note-link-url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={!linkUrl.trim()} onClick={addLink}>
                      Save link
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setAddingLink(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={attachmentCount >= MAX_FILES_PER_TUTOR_NOTE}
                    onClick={() => setAddingLink(true)}
                  >
                    <Link2 className="mr-1 h-4 w-4" />
                    Add Drive link
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={attachmentCount >= MAX_FILES_PER_TUTOR_NOTE}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="mr-1 h-4 w-4" />
                    Upload PDF
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => handlePickFiles(e.target.files)}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={saving}
              >
                Remove note
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setComposerOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving..." : "Save note"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this tutor note?</AlertDialogTitle>
            <AlertDialogDescription>
              Students never saw this note. Tutors will no longer see it on this board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep note</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Remove note</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
