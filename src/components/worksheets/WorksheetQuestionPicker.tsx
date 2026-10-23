import { useMemo, useState } from "react";
import { Check, Search, Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ModuleBadge } from "@/components/question/ModuleBadge";
import { ProvisionalBadge } from "@/components/question/ProvisionalBadge";
import { isFormatTagCode } from "@/data/taggingScheme";
import { MathText } from "@/lib/mathText";
import { shuffleArray, WORKSHEET_QUESTION_CAP } from "@/lib/worksheetTagCatalog";
import { cn } from "@/lib/utils";
import type { Passage, Question } from "@/types";

export type WorksheetQuestionPickMode = "random" | "chosen";

interface WorksheetQuestionPickerProps {
  poolQuestions: Question[];
  chosenIds: string[];
  chosenQuestions: Question[];
  passages: Passage[];
  questionLimit: number;
  onQuestionLimitChange: (limit: number) => void;
  onChosenIdsChange: (ids: string[]) => void;
  emptyPoolMessage?: string;
}

function skillLine(question: Question): string {
  const labels = question.tags
    .filter((tag) => !isFormatTagCode(tag.code))
    .map((tag) => tag.label?.trim() || tag.code);
  if (labels.length <= 3) return labels.join(", ");
  return `${labels.slice(0, 3).join(", ")} +${labels.length - 3}`;
}

function capIds(ids: string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= WORKSHEET_QUESTION_CAP) break;
  }
  return unique;
}

export function WorksheetQuestionPicker({
  poolQuestions,
  chosenIds,
  chosenQuestions,
  passages,
  questionLimit,
  onQuestionLimitChange,
  onChosenIdsChange,
  emptyPoolMessage = "Select at least one skill to browse questions.",
}: WorksheetQuestionPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const chosenSet = useMemo(() => new Set(chosenIds), [chosenIds]);
  const poolIds = useMemo(() => new Set(poolQuestions.map((question) => question.id)), [poolQuestions]);
  const room = WORKSHEET_QUESTION_CAP - chosenIds.length;
  const full = room <= 0;

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visiblePool = useMemo(() => {
    if (!normalizedSearch) return poolQuestions;
    return poolQuestions.filter((question) => {
      if (question.stem.toLowerCase().includes(normalizedSearch)) return true;
      if (question.id.toLowerCase().includes(normalizedSearch)) return true;
      return question.tags.some(
        (tag) =>
          tag.label.toLowerCase().includes(normalizedSearch) ||
          tag.code.toLowerCase().includes(normalizedSearch),
      );
    });
  }, [poolQuestions, normalizedSearch]);

  const groups = useMemo(() => {
    const passageTitle = new Map(passages.map((passage) => [passage.id, passage.title]));
    const byPassage = new Map<string, Question[]>();
    for (const question of visiblePool) {
      if (!question.passageId) continue;
      const group = byPassage.get(question.passageId) ?? [];
      group.push(question);
      byPassage.set(question.passageId, group);
    }
    const seen = new Set<string>();
    const rows: Array<{ passageId?: string; title?: string; questions: Question[] }> = [];
    for (const question of visiblePool) {
      if (!question.passageId) {
        rows.push({ questions: [question] });
        continue;
      }
      if (seen.has(question.passageId)) continue;
      seen.add(question.passageId);
      rows.push({
        passageId: question.passageId,
        title: passageTitle.get(question.passageId) ?? "Passage",
        questions: byPassage.get(question.passageId) ?? [question],
      });
    }
    return rows;
  }, [visiblePool, passages]);

  const availableToAdd = poolQuestions.filter((question) => !chosenSet.has(question.id)).length;
  const addCount = Math.min(questionLimit, availableToAdd, Math.max(room, 0));

  const toggle = (id: string) => {
    if (chosenSet.has(id)) {
      onChosenIdsChange(chosenIds.filter((item) => item !== id));
      return;
    }
    if (full) return;
    onChosenIdsChange(capIds([...chosenIds, id]));
  };

  const addIds = (ids: string[]) => {
    onChosenIdsChange(capIds([...chosenIds, ...ids]));
  };

  const removeIds = (ids: string[]) => {
    const drop = new Set(ids);
    onChosenIdsChange(chosenIds.filter((id) => !drop.has(id)));
  };

  const addRandom = () => {
    if (addCount <= 0) return;
    const extra = shuffleArray(poolQuestions.filter((question) => !chosenSet.has(question.id))).slice(
      0,
      addCount,
    );
    onChosenIdsChange(capIds([...chosenIds, ...extra.map((question) => question.id)]));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">
            On this worksheet ({chosenQuestions.length})
          </p>
          {chosenQuestions.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onChosenIdsChange([])}
            >
              Clear questions
            </Button>
          ) : null}
        </div>
        {chosenQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Check questions below. You can change skills and keep what you already added.
          </p>
        ) : (
          <ul className="max-h-48 space-y-1.5 overflow-y-auto">
            {chosenQuestions.map((question, index) => (
              <li key={question.id} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 w-5 shrink-0 tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="line-clamp-1">
                    <MathText text={question.stem} />
                  </span>
                  {!poolIds.has(question.id) ? (
                    <span className="block text-xs text-muted-foreground">
                      Not in the current skills
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove question ${index + 1}`}
                  onClick={() => toggle(question.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {full ? (
          <p className="text-xs text-muted-foreground">
            This worksheet is full at {WORKSHEET_QUESTION_CAP} questions.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="ws-random-add">Add at random</Label>
            <span className="font-mono text-sm tabular-nums">{questionLimit}</span>
          </div>
          <Slider
            id="ws-random-add"
            min={1}
            max={WORKSHEET_QUESTION_CAP}
            step={1}
            disabled={full || poolQuestions.length === 0}
            value={[questionLimit]}
            onValueChange={(value) => onQuestionLimitChange(value[0] ?? 10)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addRandom}
          disabled={addCount <= 0}
          className="shrink-0"
        >
          <Shuffle className="mr-2 h-4 w-4" />
          {addCount > 0 ? `Add ${addCount} at random` : "Add at random"}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search these questions"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-9"
          disabled={poolQuestions.length === 0}
        />
      </div>

      {poolQuestions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {emptyPoolMessage}
        </p>
      ) : visiblePool.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No questions match that search.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {normalizedSearch
              ? `Showing ${visiblePool.length} of ${poolQuestions.length} questions for these skills.`
              : `${poolQuestions.length} question${poolQuestions.length === 1 ? "" : "s"} for these skills.`}
          </p>
          <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {groups.map((group) => {
              const selectedCount = group.questions.filter((question) =>
                chosenSet.has(question.id),
              ).length;
              const allSelected = selectedCount === group.questions.length;
              const passageAction = allSelected
                ? "Remove these"
                : selectedCount > 0
                  ? "Add the rest"
                  : "Add all";
              return (
                <div
                  key={group.passageId ?? group.questions[0].id}
                  className={cn(group.passageId && "rounded-lg border")}
                >
                  {group.passageId ? (
                    <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                      <p className="min-w-0 text-sm font-medium leading-snug">{group.title}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 text-xs"
                        disabled={full && !allSelected}
                        onClick={() =>
                          allSelected
                            ? removeIds(group.questions.map((question) => question.id))
                            : addIds(group.questions.map((question) => question.id))
                        }
                      >
                        {passageAction}
                      </Button>
                    </div>
                  ) : null}
                  <div className={cn(group.passageId ? "divide-y" : "space-y-2")}>
                    {group.questions.map((question) => {
                      const selected = chosenSet.has(question.id);
                      const blocked = full && !selected;
                      return (
                        <button
                          key={question.id}
                          type="button"
                          aria-pressed={selected}
                          disabled={blocked}
                          onClick={() => toggle(question.id)}
                          className={cn(
                            "flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            group.passageId
                              ? selected
                                ? "bg-primary/5"
                                : "hover:bg-muted/50"
                              : selected
                                ? "rounded-lg border border-primary bg-primary/5"
                                : "rounded-lg border border-border hover:bg-muted/50",
                            blocked && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background",
                            )}
                          >
                            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                          </span>
                          <span className="min-w-0 flex-1 space-y-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <ModuleBadge module={question.module} className="h-5 px-2 text-[10px]" />
                              <ProvisionalBadge question={question} />
                              <span className="text-[11px] text-muted-foreground">{question.id}</span>
                            </span>
                            <span className="line-clamp-2 leading-snug">
                              <MathText text={question.stem} />
                            </span>
                            {skillLine(question) ? (
                              <span className="block text-xs text-muted-foreground">
                                {skillLine(question)}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
