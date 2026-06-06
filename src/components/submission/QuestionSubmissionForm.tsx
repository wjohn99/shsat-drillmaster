import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FORMAT_OPTIONS,
  formatChoicesOptional,
  formatRequiresChoices,
  getFormatAnswerMode,
  getSkillOptionsForType,
  getTypesForSection,
  MODULE_OPTIONS,
  SECTION_OPTIONS,
} from "@/data/questionSubmissionConstants";
import {
  isSheetExportConfigured,
  submitQuestion,
} from "@/lib/questionSubmissionService";
import type { Subject } from "@/types";
import type {
  QuestionFormatCode,
  QuestionModule,
  QuestionSubmissionInput,
  QuestionSubmissionType,
} from "@/types/questionSubmission";
import { cn } from "@/lib/utils";

type ChipVariant = "ela" | "math" | "mod1" | "mod2";

const chipActiveStyles: Record<ChipVariant, string> = {
  ela: "bg-[#EEEDFE] border-[#534AB7] text-[#3C3489]",
  math: "bg-[#E1F5EE] border-[#0F6E56] text-[#085041]",
  mod1: "bg-[#E6F1FB] border-[#185FA5] text-[#0C447C]",
  mod2: "bg-[#FBEAF0] border-[#993556] text-[#72243E]",
};

const CORRECT_ANSWER_HINTS: Record<ReturnType<typeof getFormatAnswerMode>, string> = {
  mcq: "Select the correct letter.",
  multi_select: "List all correct choices, e.g. A, C, D.",
  free_response: "Enter the exact correct answer (number, expression, or text).",
  structured:
    "Describe the correct answer or interaction setup (coordinates, drag targets, graph points, etc.).",
};

function Chip({
  active,
  variant,
  onClick,
  children,
}: {
  active: boolean;
  variant: ChipVariant;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? chipActiveStyles[variant]
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

const emptyForm = {
  section: "" as Subject | "",
  module: "" as QuestionModule | "",
  type: "" as QuestionSubmissionType | "",
  format: "INDY-MCQ" as QuestionFormatCode,
  skillTagCode: "",
  author: "",
  passageId: "",
  question: "",
  choiceA: "",
  choiceB: "",
  choiceC: "",
  choiceD: "",
  correctAnswer: "",
  explanation: "",
  commonTrap: "",
};

export function QuestionSubmissionForm() {
  const { profile } = useAuth();
  const sheetLinked = isSheetExportConfigured();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const answerMode = getFormatAnswerMode(form.format);
  const showChoices = formatRequiresChoices(form.format) || formatChoicesOptional(form.format);
  const choicesRequired = formatRequiresChoices(form.format);

  useEffect(() => {
    if (profile?.displayName && !form.author) {
      setForm((prev) => ({ ...prev, author: profile.displayName }));
    }
  }, [profile?.displayName, form.author]);

  const typeOptions = useMemo(
    () => (form.section ? getTypesForSection(form.section) : []),
    [form.section],
  );

  const skillOptions = useMemo(
    () => (form.type ? getSkillOptionsForType(form.type) : []),
    [form.type],
  );

  useEffect(() => {
    if (!form.type) {
      setPreviewId(null);
      return;
    }
    setPreviewId(`${form.section}-${form.type}-###`);
  }, [form.section, form.type]);

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSectionChange = (section: Subject) => {
    setForm((prev) => ({
      ...prev,
      section,
      type: "",
      skillTagCode: "",
    }));
    setError(null);
    setSuccess(null);
  };

  const handleTypeChange = (type: QuestionSubmissionType) => {
    setForm((prev) => ({
      ...prev,
      type,
      skillTagCode: "",
    }));
    setError(null);
    setSuccess(null);
  };

  const handleFormatChange = (format: QuestionFormatCode) => {
    setForm((prev) => ({
      ...prev,
      format,
      choiceA: "",
      choiceB: "",
      choiceC: "",
      choiceD: "",
      correctAnswer: "",
    }));
    setError(null);
    setSuccess(null);
  };

  const validate = (): string | null => {
    if (!form.section) return "Select a section.";
    if (!form.module) return "Select a module.";
    if (!form.type) return "Select a question type.";
    if (!form.format) return "Select a question format.";
    if (!form.skillTagCode) return "Select a skill tag.";
    if (!form.author.trim()) return "Enter your name.";
    if (!form.question.trim()) return "Enter the question or passage.";
    if (!form.explanation.trim()) return "Enter a step-by-step explanation.";

    if (choicesRequired) {
      if (!form.choiceA.trim() || !form.choiceB.trim() || !form.choiceC.trim() || !form.choiceD.trim()) {
        return "Enter all four answer choices.";
      }
    }

    if (answerMode === "mcq") {
      if (!["A", "B", "C", "D"].includes(form.correctAnswer)) {
        return "Select the correct answer.";
      }
    } else if (!form.correctAnswer.trim()) {
      return "Enter the correct answer.";
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!profile) {
      setError("You must be signed in to submit a question.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const input: QuestionSubmissionInput = {
        section: form.section as Subject,
        module: form.module as QuestionModule,
        type: form.type as QuestionSubmissionType,
        format: form.format,
        skillTagCode: form.skillTagCode,
        author: form.author,
        passageId: form.passageId,
        question: form.question,
        choiceA: form.choiceA,
        choiceB: form.choiceB,
        choiceC: form.choiceC,
        choiceD: form.choiceD,
        correctAnswer: form.correctAnswer,
        explanation: form.explanation,
        commonTrap: form.commonTrap,
      };

      const result = await submitQuestion(input);

      setSuccess(
        result.pending
          ? "Submitted for review! Your question was sent to the tracker — refresh the sheet to see the assigned Question ID."
          : `Submitted! Question ID: ${result.questionId}. It has been added to the question bank tracker for review.`,
      );
      setForm({
        ...emptyForm,
        author: profile.displayName || "",
        section: form.section as Subject,
        module: form.module as QuestionModule,
        format: form.format,
      });
      setPreviewId(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit question.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
      <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <h1 className="text-lg font-medium">DrillMaster Question Submission</h1>
        </div>

        <p className="mb-3.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Question metadata
        </p>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Section
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {SECTION_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  active={form.section === option.value}
                  variant={option.value === "ELA" ? "ela" : "math"}
                  onClick={() => handleSectionChange(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Module
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {MODULE_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  active={form.module === option.value}
                  variant={option.value === "1" ? "mod1" : "mod2"}
                  onClick={() => updateField("module", option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="question-type" className="text-xs uppercase tracking-wide text-muted-foreground">
              Question type
            </Label>
            <Select
              value={form.type || undefined}
              onValueChange={(value) => handleTypeChange(value as QuestionSubmissionType)}
              disabled={!form.section}
            >
              <SelectTrigger id="question-type">
                <SelectValue placeholder={form.section ? "Select type" : "Select section first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{form.section === "MATH" ? "Math" : "ELA"}</SelectLabel>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-tag" className="text-xs uppercase tracking-wide text-muted-foreground">
              Skill Tag
            </Label>
            <Select
              value={form.skillTagCode || undefined}
              onValueChange={(value) => updateField("skillTagCode", value)}
              disabled={!form.type}
            >
              <SelectTrigger id="skill-tag">
                <SelectValue placeholder={form.type ? "Select skill" : "Select type first"} />
              </SelectTrigger>
              <SelectContent>
                {skillOptions.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-5 space-y-2">
          <Label htmlFor="question-format" className="text-xs uppercase tracking-wide text-muted-foreground">
            Format
          </Label>
          <Select
            value={form.format}
            onValueChange={(value) => handleFormatChange(value as QuestionFormatCode)}
          >
            <SelectTrigger id="question-format">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="author" className="text-xs uppercase tracking-wide text-muted-foreground">
              Author
            </Label>
            <Input
              id="author"
              value={form.author}
              onChange={(event) => updateField("author", event.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passage-id" className="text-xs uppercase tracking-wide text-muted-foreground">
              Passage ID <span className="font-normal normal-case text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="passage-id"
              value={form.passageId}
              onChange={(event) => updateField("passageId", event.target.value)}
              placeholder="e.g. RE-PASS-001"
            />
          </div>
        </div>

        <p className="mb-5 min-h-4 font-mono text-[11px] text-muted-foreground">
          {previewId
            ? `Question ID preview: ${previewId}`
            : "Question ID will appear once type is selected"}
        </p>

        <hr className="my-6 border-border" />

        <p className="mb-3.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Question content
        </p>

        <div className="mb-5 space-y-2">
          <Label htmlFor="question" className="text-xs uppercase tracking-wide text-muted-foreground">
            Question / passage
          </Label>
          <Textarea
            id="question"
            rows={5}
            value={form.question}
            onChange={(event) => updateField("question", event.target.value)}
            placeholder="Type the question stem here, or paste the reading passage."
          />
        </div>

        {showChoices && (
          <div className="mb-5 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {choicesRequired ? "Choice A – D" : "Options / items"}
              {!choicesRequired && (
                <span className="font-normal normal-case text-muted-foreground"> (optional)</span>
              )}
            </Label>
            {(["A", "B", "C", "D"] as const).map((letter) => {
              const key = `choice${letter}` as "choiceA" | "choiceB" | "choiceC" | "choiceD";
              return (
                <div key={letter} className="grid grid-cols-[28px_1fr] items-center gap-2">
                  <span className="text-center text-xs font-medium text-muted-foreground">
                    {letter}
                  </span>
                  <Input
                    value={form[key]}
                    onChange={(event) => updateField(key, event.target.value)}
                    placeholder={
                      choicesRequired
                        ? `Choice ${letter}`
                        : `Option ${letter} (if applicable)`
                    }
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="mb-5 space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Correct Answer
          </Label>
          <p className="text-xs text-muted-foreground">{CORRECT_ANSWER_HINTS[answerMode]}</p>

          {answerMode === "mcq" ? (
            <div className="grid grid-cols-4 gap-2">
              {(["A", "B", "C", "D"] as const).map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => updateField("correctAnswer", letter)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    form.correctAnswer === letter
                      ? "border-[#3B6D11] bg-[#EAF3DE] text-[#27500A]"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {letter}
                </button>
              ))}
            </div>
          ) : answerMode === "structured" ? (
            <Textarea
              rows={3}
              value={form.correctAnswer}
              onChange={(event) => updateField("correctAnswer", event.target.value)}
              placeholder="Describe the correct answer or how the interaction should work."
            />
          ) : (
            <Input
              value={form.correctAnswer}
              onChange={(event) => updateField("correctAnswer", event.target.value)}
              placeholder={
                answerMode === "multi_select"
                  ? "e.g. A, C, D"
                  : "Enter the correct answer"
              }
            />
          )}
        </div>

        <hr className="my-6 border-border" />

        <p className="mb-3.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Explanation
        </p>

        <div className="mb-5 space-y-2">
          <Label htmlFor="explanation" className="text-xs uppercase tracking-wide text-muted-foreground">
            Step-by-step explanation
          </Label>
          <Textarea
            id="explanation"
            rows={4}
            value={form.explanation}
            onChange={(event) => updateField("explanation", event.target.value)}
            placeholder="Walk through why the correct answer is right."
          />
        </div>

        <div className="mb-5 space-y-2">
          <Label htmlFor="common-trap" className="text-xs uppercase tracking-wide text-muted-foreground">
            Common Trap <span className="font-normal normal-case text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="common-trap"
            rows={2}
            value={form.commonTrap}
            onChange={(event) => updateField("commonTrap", event.target.value)}
            placeholder="Why might a student pick the wrong answer?"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-[#3B6D11]/30 bg-[#EAF3DE] px-4 py-3 text-sm font-medium text-[#27500A]">
            {success}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting || !sheetLinked}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit for review"
          )}
        </Button>
      </div>
    </form>
  );
}
