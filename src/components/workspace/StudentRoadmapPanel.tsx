import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  SHSAT_2026_PLAN,
  SHSAT_TARGET_SCHOOLS,
  daysUntilIsoDate,
  formatIsoDateLabel,
  shsatSchoolById,
} from "@/lib/shsat2026";
import {
  formatSessionDate,
  formatSessionKind,
  newRoadmapFollowUp,
  type StudentRoadmapSnapshot,
} from "@/lib/studentRoadmap";
import type { StudentAttentionStatus, StudentRoadmap } from "@/types/workspace";
import { ATTENTION_STATUS_LABEL } from "@/types/workspace";
import { assignToStudentNavState } from "@/types/worksheetsNavigation";
import type { PracticeSessionRecord } from "@/types/practiceSession";

function subjectAccuracy(session: PracticeSessionRecord | null, subject: "ELA" | "MATH"): string {
  if (!session) return "—";
  const rows = session.events.filter((event) => event.subject === subject);
  if (rows.length === 0) return "—";
  const pct = Math.round((rows.filter((event) => event.correct).length / rows.length) * 100);
  return `${pct}%`;
}

function ScoreTile({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      {children ?? <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StudentRoadmapPanel({
  snapshot,
  readOnly,
  saving,
  onSave,
}: {
  snapshot: StudentRoadmapSnapshot;
  readOnly: boolean;
  saving?: boolean;
  onSave: (roadmap: StudentRoadmap) => Promise<void>;
}) {
  const [draft, setDraft] = useState<StudentRoadmap>(snapshot.roadmap);
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const draftRef = useRef(draft);
  const dirtyRef = useRef(false);
  const savingLock = useRef(false);
  draftRef.current = draft;
  dirtyRef.current = dirty;

  useEffect(() => {
    if (dirtyRef.current) return;
    setDraft(snapshot.roadmap);
  }, [snapshot.roadmap]);

  const school = shsatSchoolById(draft.targetSchool);
  const returnTo = `/workspace/${snapshot.board.studentUid}`;
  const statusSelectValue = draft.statusManual && draft.status ? draft.status : "auto";

  const update = <K extends keyof StudentRoadmap>(key: K, value: StudentRoadmap[K]) => {
    dirtyRef.current = true;
    setDirty(true);
    setSaveState("idle");
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (opts?: { silent?: boolean }) => {
    if (readOnly || savingLock.current) return;
    const toSave = draftRef.current;
    savingLock.current = true;
    setSaveState("saving");
    try {
      await onSave(toSave);
      if (JSON.stringify(draftRef.current) !== JSON.stringify(toSave)) {
        dirtyRef.current = true;
        setDirty(true);
        setSaveState("idle");
        savingLock.current = false;
        window.setTimeout(() => {
          void handleSave({ silent: true });
        }, 400);
        return;
      }
      dirtyRef.current = false;
      setDirty(false);
      setSaveState("saved");
      if (!opts?.silent) toast({ title: "Roadmap saved" });
    } catch (err) {
      setSaveState("error");
      toast({
        title: "Could not save roadmap",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      savingLock.current = false;
    }
  };

  useEffect(() => {
    if (readOnly || !dirty) return;
    const timer = window.setTimeout(() => {
      void handleSave({ silent: true });
    }, 1500);
    return () => window.clearTimeout(timer);
    // Save whenever the tutor stops editing for a moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const flush = () => {
      if (dirtyRef.current) void handleSave({ silent: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
      flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  const addFollowUp = () => {
    const text = followUpDraft.trim();
    if (!text) return;
    update("followUps", [...draft.followUps, newRoadmapFollowUp(text)]);
    setFollowUpDraft("");
  };

  const startingDisplay =
    draft.startingPoint.trim() ||
    (snapshot.baselineAccuracy != null ? `${snapshot.baselineAccuracy}%` : "—");
  const currentDisplay =
    draft.currentScores.trim() ||
    (snapshot.currentAccuracy != null ? `${snapshot.currentAccuracy}%` : "—");
  const targetDisplay = draft.targetComposite != null ? String(draft.targetComposite) : "—";
  const testDateDisplay = draft.testDate ? formatIsoDateLabel(draft.testDate) || draft.testDate : "Not set";
  const startingHint = snapshot.baseline
    ? `First diagnostic · ELA ${subjectAccuracy(snapshot.baseline, "ELA")} · Math ${subjectAccuracy(snapshot.baseline, "MATH")}`
    : "No diagnostic yet";
  const currentHint = snapshot.latestDiagnostic
    ? `Latest diagnostic · ELA ${subjectAccuracy(snapshot.latestDiagnostic, "ELA")} · Math ${subjectAccuracy(snapshot.latestDiagnostic, "MATH")}`
    : "Same as starting point once they sit";
  const targetHint = school.priorCutoff
    ? `${school.label} prior-year cutoff ${school.priorCutoff}`
    : "Scaled composite goal (not raw %)";
  const daysUntilTest = daysUntilIsoDate(draft.testDate);
  const testDateHint =
    daysUntilTest != null
      ? daysUntilTest >= 0
        ? `${daysUntilTest} days out`
        : "Date has passed"
      : `Public School Day ${formatIsoDateLabel(SHSAT_2026_PLAN.schoolDayDate)}`;

  return (
    <section className="rounded-xl border glass-surface p-4 sm:p-5 mb-5 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold tracking-tight">
          {snapshot.board.studentName}
        </h2>
        <Badge variant={snapshot.status === "follow_up" ? "destructive" : "secondary"}>
          {snapshot.statusLabel}
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreTile label="Starting point" value={startingDisplay} hint={startingHint}>
          {readOnly ? undefined : (
            <Input
              aria-label="Starting point"
              value={draft.startingPoint}
              onChange={(e) => update("startingPoint", e.target.value)}
              placeholder={
                snapshot.baselineAccuracy != null ? `${snapshot.baselineAccuracy}%` : "e.g. 58%"
              }
              className="mt-1 h-9 text-lg font-semibold tabular-nums"
            />
          )}
        </ScoreTile>
        <ScoreTile label="Current scores" value={currentDisplay} hint={currentHint}>
          {readOnly ? undefined : (
            <Input
              aria-label="Current scores"
              value={draft.currentScores}
              onChange={(e) => update("currentScores", e.target.value)}
              placeholder={
                snapshot.currentAccuracy != null ? `${snapshot.currentAccuracy}%` : "e.g. 64%"
              }
              className="mt-1 h-9 text-lg font-semibold tabular-nums"
            />
          )}
        </ScoreTile>
        <ScoreTile label="Target" value={targetDisplay} hint={targetHint}>
          {readOnly ? undefined : (
            <Input
              aria-label="Target composite"
              type="number"
              min={400}
              max={800}
              value={draft.targetComposite ?? ""}
              onChange={(e) => {
                const next = e.target.value;
                if (next === "") {
                  update("targetComposite", null);
                  return;
                }
                const parsed = Number(next);
                update("targetComposite", Number.isFinite(parsed) ? parsed : null);
              }}
              placeholder={school.priorCutoff ? String(school.priorCutoff) : "e.g. 530"}
              className="mt-1 h-9 text-lg font-semibold tabular-nums"
            />
          )}
        </ScoreTile>
        <ScoreTile label="Test date" value={testDateDisplay} hint={testDateHint}>
          {readOnly ? undefined : (
            <Input
              aria-label="Test date"
              type="date"
              value={draft.testDate}
              onChange={(e) => update("testDate", e.target.value)}
              className="mt-1 h-9"
            />
          )}
        </ScoreTile>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-sm font-medium">Strengths</p>
          {snapshot.strengths.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {snapshot.strengths.map((row) => (
                <Badge key={row.tagCode} variant="secondary">
                  {row.label} · {row.accuracy}%
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Strengths appear after diagnostics and worksheets have enough tagged items.
            </p>
          )}
          {readOnly ? (
            draft.strengthsNotes ? (
              <p className="text-sm whitespace-pre-wrap">{draft.strengthsNotes}</p>
            ) : null
          ) : (
            <Textarea
              value={draft.strengthsNotes}
              onChange={(e) => update("strengthsNotes", e.target.value)}
              placeholder="Tutor notes on strengths"
              className="min-h-[72px]"
            />
          )}
        </div>
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-sm font-medium">Areas for growth</p>
          {snapshot.growthAreas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {snapshot.growthAreas.map((row) => (
                <Badge key={row.tagCode} variant="outline">
                  {row.label} · {row.accuracy}%
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Growth tags come from the same sittings. Assign the next worksheet from these.
            </p>
          )}
          {readOnly ? (
            draft.growthNotes ? (
              <p className="text-sm whitespace-pre-wrap">{draft.growthNotes}</p>
            ) : null
          ) : (
            <Textarea
              value={draft.growthNotes}
              onChange={(e) => update("growthNotes", e.target.value)}
              placeholder="Tutor notes on gaps"
              className="min-h-[72px]"
            />
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Progress over time</p>
        {snapshot.diagnosticSittings.length === 0 && snapshot.recentSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Diagnostics, worksheets, and session notes will land here as they happen.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Diagnostics
              </p>
              {snapshot.diagnosticSittings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No diagnostic sitting yet.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {snapshot.diagnosticSittings.map((session, index) => (
                    <li key={session.id} className="flex justify-between gap-2">
                      <span>
                        {index === 0 ? "Baseline" : `Sitting ${index + 1}`}
                        {formatSessionDate(session) ? ` · ${formatSessionDate(session)}` : ""}
                      </span>
                      <span className="tabular-nums font-medium">{session.accuracyPct}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Recent sessions
              </p>
              {snapshot.recentSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved sessions yet.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {snapshot.recentSessions.map((session) => (
                    <li key={session.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {formatSessionKind(session)}
                        {formatSessionDate(session) ? ` · ${formatSessionDate(session)}` : ""}
                      </span>
                      <span className="tabular-nums font-medium shrink-0">
                        {session.accuracyPct}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-medium">Current and long-term priorities</p>
          {readOnly ? (
            <>
              <p className="text-sm">
                <span className="text-muted-foreground">Now: </span>
                {draft.currentPriority || snapshot.currentPriority}
              </p>
              {draft.longTermPriorities ? (
                <p className="text-sm whitespace-pre-wrap">{draft.longTermPriorities}</p>
              ) : null}
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="current-priority">Current priority</Label>
                <Input
                  id="current-priority"
                  value={draft.currentPriority}
                  onChange={(e) => update("currentPriority", e.target.value)}
                  placeholder="What this week of tutoring is for"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="long-term">Long-term priorities</Label>
                <Textarea
                  id="long-term"
                  value={draft.longTermPriorities}
                  onChange={(e) => update("longTermPriorities", e.target.value)}
                  placeholder="Through test day: modules, stamina, schools, accommodations"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Next session and follow-ups</p>
          {readOnly ? (
            <>
              <p className="text-sm">{snapshot.nextSessionLabel}</p>
              {draft.nextSessionNotes ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {draft.nextSessionNotes}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="next-date">Next session</Label>
                  <Input
                    id="next-date"
                    type="date"
                    value={draft.nextSessionDate}
                    onChange={(e) => update("nextSessionDate", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="next-time">Time</Label>
                  <Input
                    id="next-time"
                    type="time"
                    value={draft.nextSessionTime}
                    onChange={(e) => update("nextSessionTime", e.target.value)}
                  />
                </div>
              </div>
              <Textarea
                value={draft.nextSessionNotes}
                onChange={(e) => update("nextSessionNotes", e.target.value)}
                placeholder="Lesson plan for that sitting"
                className="min-h-[72px]"
              />
            </>
          )}
          <div className="space-y-2">
            {draft.followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open follow-ups.</p>
            ) : (
              draft.followUps.map((row) => (
                <label key={row.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={!row.open}
                    disabled={readOnly}
                    onCheckedChange={(checked) => {
                      update(
                        "followUps",
                        draft.followUps.map((item) =>
                          item.id === row.id ? { ...item, open: checked !== true } : item,
                        ),
                      );
                    }}
                  />
                  <span className={row.open ? "" : "text-muted-foreground line-through"}>
                    {row.text}
                  </span>
                </label>
              ))
            )}
            {!readOnly ? (
              <div className="flex gap-2">
                <Input
                  value={followUpDraft}
                  onChange={(e) => setFollowUpDraft(e.target.value)}
                  placeholder="Add a follow-up"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFollowUp();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addFollowUp}>
                  Add
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {!readOnly ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Target school</Label>
            <Select value={draft.targetSchool} onValueChange={(value) => update("targetSchool", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHSAT_TARGET_SCHOOLS.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Kanban status</Label>
            <Select
              value={statusSelectValue}
              onValueChange={(value) => {
                if (value === "auto") {
                  setDraft((prev) => ({ ...prev, status: null, statusManual: false }));
                  return;
                }
                setDraft((prev) => ({
                  ...prev,
                  status: value as StudentAttentionStatus,
                  statusManual: true,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto from follow-ups and dates</SelectItem>
                {(Object.keys(ATTENTION_STATUS_LABEL) as StudentAttentionStatus[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {ATTENTION_STATUS_LABEL[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {!readOnly ? (
          <>
            <Button
              onClick={() => void handleSave()}
              disabled={saving || saveState === "saving"}
            >
              {saving || saveState === "saving" ? "Saving…" : "Save roadmap"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {dirty
                ? "Unsaved changes — auto-saves after you pause."
                : saveState === "saved"
                  ? "All changes saved to this student's board."
                  : saveState === "error"
                    ? "Last save failed. Try Save roadmap again."
                    : null}
            </span>
          </>
        ) : null}
        {!readOnly ? (
          <Button variant="outline" asChild>
            <Link
              to="/worksheets"
              state={assignToStudentNavState(snapshot.board.studentUid, {
                returnTo,
                suggestedTagCodes: snapshot.suggestedTagCodes,
              })}
            >
              Assign next worksheet
            </Link>
          </Button>
        ) : null}
        {snapshot.latestDiagnostic || snapshot.baseline ? (
          <>
            <Button variant="outline" asChild>
              <Link
                to="/practice/diagnostic"
                state={{ reviewSession: snapshot.latestDiagnostic ?? snapshot.baseline }}
              >
                View diagnostic results
              </Link>
            </Button>
            {snapshot.baseline &&
            snapshot.latestDiagnostic &&
            snapshot.baseline.id !== snapshot.latestDiagnostic.id ? (
              <Button variant="outline" asChild>
                <Link to="/practice/diagnostic" state={{ reviewSession: snapshot.baseline }}>
                  First diagnostic
                </Link>
              </Button>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {snapshot.diagnosticInProgress
              ? "This student has started the diagnostic but has not finished it. Results will appear here after they submit."
              : "This student has not started the diagnostic yet."}
          </p>
        )}
      </div>
    </section>
  );
}
