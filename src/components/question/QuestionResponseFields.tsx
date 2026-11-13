import { CheckCircle, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CgtBlock } from "@/components/question/CgtBlock";
import { DndBlock } from "@/components/question/DndBlock";
import { EquationEditorBlock } from "@/components/question/EquationEditorBlock";
import { GraphFigureBlock } from "@/components/question/GraphFigureBlock";
import { HotSpotBlock } from "@/components/question/HotSpotBlock";
import { InlineChoiceBlock } from "@/components/question/InlineChoiceBlock";
import { WpBlock } from "@/components/question/WpBlock";
import { isIndyCheckboxMultiSubtype } from "@/lib/indyAta";
import { parseDndPlacementsForQuestion, serializeDndPlacements } from "@/lib/indyDnd";
import { parseIcSelectionsForQuestion, serializeIcSelections } from "@/lib/indyIc";
import { getSelectedChoiceIds } from "@/lib/questionExplanation";
import { MathText } from "@/lib/mathText";
import { cn } from "@/lib/utils";
import type { Question } from "@/types";

interface QuestionResponseFieldsProps {
  question: Question;
  raw: string | undefined;
  disabled: boolean;
  showSolution: boolean;
  onChange: (value: string) => void;
  onToggleAta: (choiceId: string) => void;
  /** Struck-through choice ids (answer eliminator). */
  eliminatedChoiceIds?: string[];
  onToggleEliminate?: (choiceId: string) => void;
}

export function QuestionResponseFields({
  question,
  raw,
  disabled,
  showSolution,
  onChange,
  onToggleAta,
  eliminatedChoiceIds = [],
  onToggleEliminate,
}: QuestionResponseFieldsProps) {
  const eliminated = new Set(eliminatedChoiceIds);
  const selectedChoiceIds = new Set(getSelectedChoiceIds(question, raw));
  const selectedMcValue = [...selectedChoiceIds][0] ?? "";
  const choiceControlClass = "choice-control";
  const showMcChoices =
    Boolean(question.choices) &&
    !isIndyCheckboxMultiSubtype(question.subtype) &&
    question.subtype !== "INDY-DND" &&
    question.subtype !== "INDY-EE" &&
    question.subtype !== "INDY-IC" &&
    question.subtype !== "INDY-HS" &&
    question.subtype !== "INDY-GIF";

  return (
    <>
      {question.cgt && <CgtBlock spec={question.cgt} />}
      {question.subtype === "INDY-WP" && <WpBlock spec={question.wp ?? {}} />}
      {question.subtype === "INDY-HS" && question.hs && (
        <HotSpotBlock
          spec={question.hs}
          selectedId={raw || null}
          onSelect={(id) => onChange(id)}
          disabled={disabled}
          showSolution={showSolution}
        />
      )}
      {question.subtype === "INDY-GIF" && question.gif?.mode === "plotPoint" && (
        <GraphFigureBlock
          spec={question.gif}
          value={raw || null}
          onChange={(s) => onChange(s)}
          disabled={disabled}
          showSolution={showSolution}
        />
      )}
      {question.subtype === "INDY-IC" && question.ic && (
        <InlineChoiceBlock
          spec={question.ic}
          selections={parseIcSelectionsForQuestion(question.ic, raw)}
          onChange={(next) => onChange(serializeIcSelections(next))}
          disabled={disabled}
          showSolution={showSolution}
        />
      )}
      {question.subtype === "INDY-DND" && question.dnd && (
        <DndBlock
          spec={question.dnd}
          placements={parseDndPlacementsForQuestion(question.dnd, raw)}
          onChange={(next) => onChange(serializeDndPlacements(next))}
          disabled={disabled}
          showSolution={showSolution}
        />
      )}
      {question.ee && (question.subtype === "INDY-EE" || !question.choices?.length) && (
        <EquationEditorBlock
          key={question.id}
          spec={question.ee}
          value={raw || ""}
          onChange={(v) => onChange(v)}
          disabled={disabled}
        />
      )}

      {isIndyCheckboxMultiSubtype(question.subtype) && question.choices && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {question.subtype === "INDY-MS" && question.ms
              ? `Select ${question.ms.selectCount} answers.`
              : "Select all that apply."}
          </p>
          {question.choices.map((choice) => {
            const checked = selectedChoiceIds.has(choice.id);
            const showWrongPick = showSolution && checked && !choice.isCorrect;
            const showMissed = showSolution && !checked && choice.isCorrect;
            const isEliminated = eliminated.has(choice.id);
            const choiceId = `${question.id}-${choice.id}`;
            return (
              <div key={choice.id} className="flex items-stretch gap-2">
                <Label
                  className={cn(
                    "flex min-h-14 w-full flex-1 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-base leading-snug",
                    checked && !showSolution && "border-primary bg-primary/10",
                    showSolution && choice.isCorrect && "border-success bg-success/10 font-medium text-success",
                    showWrongPick && "border-destructive bg-destructive/10 text-destructive",
                    showMissed && "border-warning text-warning",
                    isEliminated && "text-muted-foreground line-through",
                  )}
                >
                  <Checkbox
                    id={choiceId}
                    checked={checked}
                    onCheckedChange={() => onToggleAta(choice.id)}
                    disabled={disabled}
                    className={choiceControlClass}
                  />
                  <span className="font-medium">{choice.label}.</span>
                  <span className="min-w-0 flex-1">
                    <MathText text={choice.text} />
                  </span>
                  {showSolution && showWrongPick ? (
                    <span className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-sm font-medium text-destructive">
                      Selected
                    </span>
                  ) : null}
                  {showSolution && choice.isCorrect ? (
                    <CheckCircle className="h-5 w-5 shrink-0 text-success" />
                  ) : null}
                  {showWrongPick ? <XCircle className="h-5 w-5 shrink-0 text-destructive" /> : null}
                </Label>
                {onToggleEliminate && !showSolution ? (
                  <button
                    type="button"
                    className="shrink-0 self-center rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => onToggleEliminate(choice.id)}
                  >
                    {isEliminated ? "Undo" : "Eliminate"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {showMcChoices && question.choices && (
        <RadioGroup
          value={selectedMcValue || raw || ""}
          onValueChange={onChange}
          disabled={disabled && !showSolution}
          className={cn("gap-2", showSolution && "pointer-events-none")}
        >
          {question.choices.map((choice) => {
            const isEliminated = eliminated.has(choice.id);
            const isStudentPick = selectedChoiceIds.has(choice.id);
            return (
              <div key={choice.id} className="flex items-stretch gap-2">
                <Label
                  className={cn(
                    "flex min-h-14 w-full flex-1 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-base leading-snug",
                    isStudentPick && !showSolution && "border-primary bg-primary/10",
                    showSolution && choice.isCorrect && "border-success bg-success/10 font-medium text-success",
                    showSolution && isStudentPick && !choice.isCorrect && "border-destructive bg-destructive/10 text-destructive",
                    isEliminated && "text-muted-foreground line-through",
                  )}
                >
                  <RadioGroupItem value={choice.id} id={choice.id} className={choiceControlClass} />
                  <span className="font-medium">{choice.label}.</span>
                  <span className="min-w-0 flex-1">
                    <MathText text={choice.text} />
                  </span>
                  {showSolution && isStudentPick && !choice.isCorrect ? (
                    <span className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-sm font-medium text-destructive">
                      Selected
                    </span>
                  ) : null}
                  {showSolution && choice.isCorrect ? (
                    <CheckCircle className="h-5 w-5 shrink-0 text-success" />
                  ) : null}
                  {showSolution && isStudentPick && !choice.isCorrect ? (
                    <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                  ) : null}
                </Label>
                {onToggleEliminate && !showSolution ? (
                  <button
                    type="button"
                    className="shrink-0 self-center rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => onToggleEliminate(choice.id)}
                  >
                    {isEliminated ? "Undo" : "Eliminate"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </RadioGroup>
      )}

      {question.subtype === "GRID_IN" && (
        <div className="space-y-3">
          <Label htmlFor={`grid-${question.id}`}>Enter your answer:</Label>
          <Input
            id={`grid-${question.id}`}
            value={raw || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter fraction or decimal"
            className="max-w-md"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Grid-in answers are not auto-graded yet; they count as incorrect for statistics.
          </p>
        </div>
      )}
    </>
  );
}
