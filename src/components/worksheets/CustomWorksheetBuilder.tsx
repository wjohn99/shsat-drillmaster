import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, FileDown, Loader2, Search, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WORKSHEET_SECTIONS,
  type WorksheetSectionId,
} from "@/lib/worksheetTagCatalog";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types";
import type { StudentOption } from "@/types/assignment";
import type { WorkspaceCard, WorkspaceList } from "@/types/workspace";
import { WORKSPACE_NEW_CARD_ID } from "@/types/worksheetsNavigation";

export type WorksheetBuilderVariant = "tutor" | "student";

interface CustomWorksheetBuilderProps {
  variant: WorksheetBuilderVariant;
  selectedCodes: string[];
  questionLimit: number;
  tagCatalog: Record<WorksheetSectionId, Tag[]>;
  matchingCount: number;
  onToggleTag: (code: string) => void;
  onQuestionLimitChange: (limit: number) => void;
  onClearTags: () => void;
  onStart: () => void;
  onExportPdf: () => void;
  students?: StudentOption[];
  studentsLoading?: boolean;
  selectedStudentUid?: string;
  onStudentChange?: (uid: string) => void;
  assignmentDueDate?: string;
  onAssignmentDueDateChange?: (value: string) => void;
  minAssignmentDueDate?: string;
  showOnWorkspace?: boolean;
  onShowOnWorkspaceChange?: (value: boolean) => void;
  workspaceBoardExists?: boolean;
  workspaceLists?: WorkspaceList[];
  workspaceListsLoading?: boolean;
  workspaceListId?: string;
  onWorkspaceListIdChange?: (listId: string) => void;
  workspaceCards?: WorkspaceCard[];
  workspaceCardTarget?: string;
  onWorkspaceCardTargetChange?: (target: string) => void;
  workspacePlacementLocked?: boolean;
  assigning?: boolean;
  onAssign?: () => void;
}

const DEFAULT_OPEN_SECTIONS: WorksheetSectionId[] = [
  "rc",
  "re",
  "num",
  "alg",
  "app",
  "geo",
  "dat",
];

export function CustomWorksheetBuilder({
  variant,
  selectedCodes,
  questionLimit,
  tagCatalog,
  matchingCount,
  onToggleTag,
  onQuestionLimitChange,
  onClearTags,
  onStart,
  onExportPdf,
  students = [],
  studentsLoading = false,
  selectedStudentUid = "",
  onStudentChange,
  assignmentDueDate = "",
  onAssignmentDueDateChange,
  minAssignmentDueDate,
  showOnWorkspace = false,
  onShowOnWorkspaceChange,
  workspaceBoardExists = false,
  workspaceLists = [],
  workspaceListsLoading = false,
  workspaceListId = "",
  onWorkspaceListIdChange,
  workspaceCards = [],
  workspaceCardTarget = WORKSPACE_NEW_CARD_ID,
  onWorkspaceCardTargetChange,
  workspacePlacementLocked = false,
  assigning = false,
  onAssign,
}: CustomWorksheetBuilderProps) {
  const isTutor = variant === "tutor";
  const canStart = selectedCodes.length > 0 && matchingCount > 0;
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>(DEFAULT_OPEN_SECTIONS);

  const labelByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const section of WORKSHEET_SECTIONS) {
      for (const t of tagCatalog[section.id]) {
        map.set(t.code, t.label);
      }
    }
    return map;
  }, [tagCatalog]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredCatalog = useMemo(() => {
    const result = {} as Record<WorksheetSectionId, Tag[]>;
    for (const section of WORKSHEET_SECTIONS) {
      const tags = tagCatalog[section.id];
      if (!normalizedSearch) {
        result[section.id] = tags;
        continue;
      }
      result[section.id] = tags.filter(
        (t) =>
          t.label.toLowerCase().includes(normalizedSearch) ||
          t.code.toLowerCase().includes(normalizedSearch),
      );
    }
    return result;
  }, [tagCatalog, normalizedSearch]);

  const visibleSections = useMemo(
    () =>
      WORKSHEET_SECTIONS.filter((section) => filteredCatalog[section.id].length > 0),
    [filteredCatalog],
  );

  useEffect(() => {
    if (normalizedSearch) {
      setExpandedSections(visibleSections.map((s) => s.id));
    }
  }, [normalizedSearch, visibleSections]);

  const selectedCountBySection = useMemo(() => {
    const counts = new Map<WorksheetSectionId, number>();
    for (const section of WORKSHEET_SECTIONS) {
      counts.set(
        section.id,
        tagCatalog[section.id].filter((t) => selectedCodes.includes(t.code)).length,
      );
    }
    return counts;
  }, [tagCatalog, selectedCodes]);

  return (
    <>
      {isTutor && (
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Assign to student</CardTitle>
            <p className="text-sm text-muted-foreground">
              Students must have signed in at least once so their profile exists in the
              system.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assign-student">Student</Label>
                {studentsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading students…
                  </div>
                ) : students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No students found yet. Ask students to sign in with Google first.
                  </p>
                ) : (
                  <Select
                    value={selectedStudentUid}
                    onValueChange={onStudentChange}
                    disabled={workspacePlacementLocked}
                  >
                    <SelectTrigger id="assign-student">
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
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="assign-due-date">Due date</Label>
                <Input
                  id="assign-due-date"
                  type="date"
                  value={assignmentDueDate}
                  min={minAssignmentDueDate}
                  onChange={(e) => onAssignmentDueDateChange?.(e.target.value)}
                />
              </div>
            </div>

            {selectedStudentUid ? (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="show-on-workspace"
                    checked={showOnWorkspace}
                    disabled={!workspaceBoardExists || workspacePlacementLocked}
                    onCheckedChange={(v) => onShowOnWorkspaceChange?.(v === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="show-on-workspace" className="font-medium cursor-pointer">
                      Show on{" "}
                      {students.find((s) => s.uid === selectedStudentUid)?.displayName ??
                        "student"}
                      &apos;s workspace
                    </Label>
                    {!workspaceBoardExists ? (
                      <p className="text-xs text-muted-foreground">
                        Create a workspace board for this student first (Workspace tab).
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Also appears on a card on their board.
                      </p>
                    )}
                  </div>
                </div>

                {showOnWorkspace && workspaceBoardExists ? (
                  <div className="grid gap-3 sm:grid-cols-2 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="workspace-list">List</Label>
                      {workspaceListsLoading ? (
                        <p className="text-sm text-muted-foreground">Loading lists…</p>
                      ) : (
                        <Select
                          value={workspaceListId}
                          onValueChange={onWorkspaceListIdChange}
                          disabled={workspacePlacementLocked}
                        >
                          <SelectTrigger id="workspace-list">
                            <SelectValue placeholder="Select list" />
                          </SelectTrigger>
                          <SelectContent>
                            {workspaceLists.map((list) => (
                              <SelectItem key={list.id} value={list.id}>
                                {list.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workspace-card">Card</Label>
                      <Select
                        value={workspaceCardTarget}
                        onValueChange={onWorkspaceCardTargetChange}
                        disabled={
                          workspacePlacementLocked &&
                          workspaceCardTarget !== WORKSPACE_NEW_CARD_ID
                        }
                      >
                        <SelectTrigger id="workspace-card">
                          <SelectValue placeholder="Select card" />
                        </SelectTrigger>
                        <SelectContent>
                          {!workspacePlacementLocked ? (
                            <SelectItem value={WORKSPACE_NEW_CARD_ID}>New card</SelectItem>
                          ) : null}
                          {workspaceCards
                            .filter((c) => c.listId === workspaceListId)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Overdue assignments appear in your dashboard Needs attention section.
            </p>

            <Button
              onClick={onAssign}
              disabled={
                assigning ||
                students.length === 0 ||
                !selectedStudentUid ||
                !assignmentDueDate ||
                !canStart ||
                (showOnWorkspace &&
                  workspaceBoardExists &&
                  (!workspaceListId || !workspaceCardTarget))
              }
            >
              {assigning ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Assign
            </Button>
          </CardContent>
        </Card>
      )}

      {!isTutor && (
        <Card className="mb-8 border-dashed bg-secondary/30">
          <CardContent className="py-4 text-sm text-muted-foreground">
            This practice is just for you — it won&apos;t be sent to your tutor unless they
            assign it separately.
          </CardContent>
        </Card>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Worksheet size</CardTitle>
          <p className="text-sm text-muted-foreground">
            Maximum number of questions (random from the pool that matches your tags).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="ws-limit">Questions</Label>
            <span className="font-mono text-sm tabular-nums">{questionLimit}</span>
          </div>
          <Slider
            id="ws-limit"
            min={1}
            max={50}
            step={1}
            value={[questionLimit]}
            onValueChange={(v) => onQuestionLimitChange(v[0] ?? 10)}
          />
          <p className="text-xs text-muted-foreground">
            Pool size for current tags:{" "}
            <span className="font-medium text-foreground">{matchingCount}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Skills to include</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick one or more skills. The worksheet pulls questions that match{" "}
            <span className="font-medium text-foreground">any</span> skill you select.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {selectedCodes.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Selected skills ({selectedCodes.length})
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={onClearTags}
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedCodes.map((code) => (
                  <Chip
                    key={code}
                    variant={
                      code.startsWith("RC-") || code.startsWith("RE-") ? "ela" : "math"
                    }
                    size="sm"
                    onRemove={() => onToggleTag(code)}
                  >
                    {labelByCode.get(code) ?? code}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search skills…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {visibleSections.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No skills match your search.
            </p>
          ) : (
            <Accordion
              type="multiple"
              value={expandedSections}
              onValueChange={setExpandedSections}
              className="rounded-lg border px-4"
            >
              {visibleSections.map((section) => {
                const tags = filteredCatalog[section.id];
                const selectedInSection = selectedCountBySection.get(section.id) ?? 0;

                return (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="hover:no-underline py-3.5">
                      <div className="flex flex-1 items-center gap-3 text-left pr-2">
                        <div
                          className={cn(
                            "w-1 self-stretch rounded-full shrink-0 min-h-[2.5rem]",
                            section.subject === "MATH" ? "bg-math" : "bg-ela",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm">{section.title}</span>
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {section.subject === "MATH" ? "Math" : "ELA"}
                            </Badge>
                            {selectedInSection > 0 && (
                              <Badge className="text-[10px]">
                                {selectedInSection} selected
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-normal mt-0.5 line-clamp-1">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-2 sm:grid-cols-2 pb-2">
                        {tags.map((tagItem) => {
                          const on = selectedCodes.includes(tagItem.code);
                          return (
                            <button
                              key={tagItem.code}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => onToggleTag(tagItem.code)}
                              className={cn(
                                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                on
                                  ? section.subject === "MATH"
                                    ? "border-math/50 bg-math/10"
                                    : "border-ela/50 bg-ela/10"
                                  : "border-border hover:bg-muted/50",
                              )}
                            >
                              <span
                                className={cn(
                                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                  on
                                    ? section.subject === "MATH"
                                      ? "border-math bg-math text-white"
                                      : "border-ela bg-ela text-white"
                                    : "border-muted-foreground/40 bg-background",
                                )}
                              >
                                {on && <Check className="h-3 w-3" strokeWidth={3} />}
                              </span>
                              <span className="leading-snug">{tagItem.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button onClick={onStart} disabled={!canStart}>
          {isTutor ? "Preview worksheet" : "Start practice"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button type="button" variant="outline" onClick={onExportPdf} disabled={!canStart}>
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        {selectedCodes.length > 0 && (
          <Button variant="outline" onClick={onClearTags}>
            Clear skills
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          {matchingCount} matching question{matchingCount === 1 ? "" : "s"} in pool
        </span>
      </div>
    </>
  );
}
