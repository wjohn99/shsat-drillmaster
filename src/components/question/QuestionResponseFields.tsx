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
import { isIndyCheckboxMultiSubtype, parseAtaAnswer } from "@/lib/indyAta";
import { parseDndPlacementsForQuestion, serializeDndPlacements } from "@/lib/indyDnd";
import { parseIcSelectionsForQuestion, serializeIcSelections } from "@/lib/indyIc";
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
      {question.subtype === "INDY-EE" && question.ee && (
        <EquationEditorBlock
          key={question.id}
          spec={question.ee}
          value={raw || ""}
          onChange={(v) => onChange(v)}
          disabled={disabled}
        />
      )}

      {isIndyCheckboxMultiSubtype(question.subtype) && question.choices && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {question.subtype === "INDY-MS" ? "Select all answers that apply." : "Select all that apply."}
          </p>
          {question.choices.map((choice) => {
            const selected = parseAtaAnswer(raw);
            const checked = selected.includes(choice.id);
            const showWrongPick = showSolution && checked && !choice.isCorrect;
            const showMissed = showSolution && !checked && choice.isCorrect;
            const isEliminated = eliminated.has(choice.id);
            return (
              <div key={choice.id} className="space-y-1.5">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id={`${question.id}-${choice.id}`}
                    checked={checked}
                    onCheckedChange={() => onToggleAta(choice.id)}
                    disabled={disabled}
                    className="mt-1"
                  />
                  <Label
                    htmlFor={`${question.id}-${choice.id}`}
                    className={cn(
                      "flex-1 cursor-pointer text-sm leading-relaxed",
                      showSolution && choice.isCorrect && "text-success font-medium",
                      showWrongPick && "text-destructive",
                      showMissed && "text-warning",
                      isEliminated && "line-through text-muted-foreground",
                    )}
                  >
                    <span className="font-medium mr-2">{choice.label}.</span>
                    {choice.text}
                  </Label>
                  {onToggleEliminate && !showSolution ? (
                    <button
                      type="button"
                      className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground shrink-0 mt-1"
                      onClick={() => onToggleEliminate(choice.id)}
                    >
                      {isEliminated ? "Undo" : "Eliminate"}
                    </button>
                  ) : null}
                  {showSolution && choice.isCorrect && (
                    <CheckCircle className="h-4 w-4 shrink-0 text-success mt-1" />
                  )}
                  {showWrongPick && <XCircle className="h-4 w-4 shrink-0 text-destructive mt-1" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showMcChoices && question.choices && (
        <div className="space-y-3">
          <RadioGroup value={raw || ""} onValueChange={onChange} disabled={disabled}>
            {question.choices.map((choice) => {
              const isEliminated = eliminated.has(choice.id);
              return (
                <div key={choice.id} className="space-y-1.5">
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value={choice.id} id={choice.id} className="mt-1" />
                    <Label
                      htmlFor={choice.id}
                      className={cn(
                        "flex-1 cursor-pointer text-sm leading-relaxed",
                        showSolution && choice.isCorrect && "text-success font-medium",
                        showSolution && raw === choice.id && !choice.isCorrect && "text-destructive",
                        isEliminated && "line-through text-muted-foreground",
                      )}
                    >
                      <span className="font-medium mr-2">{choice.label}.</span>
                      {choice.text}
                    </Label>
                    {onToggleEliminate && !showSolution ? (
                      <button
                        type="button"
                        className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground shrink-0 mt-1"
                        onClick={() => onToggleEliminate(choice.id)}
                      >
                        {isEliminated ? "Undo" : "Eliminate"}
                      </button>
                    ) : null}
                    {showSolution && choice.isCorrect && (
                      <CheckCircle className="h-4 w-4 text-success mt-1" />
                    )}
                    {showSolution && raw === choice.id && !choice.isCorrect && (
                      <XCircle className="h-4 w-4 text-destructive mt-1" />
                    )}
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>
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
