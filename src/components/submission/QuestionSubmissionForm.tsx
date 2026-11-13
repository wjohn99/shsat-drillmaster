import { useEffect, useMemo, useRef, useState } from "react";
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
  isPassageBasedType,
  MODULE_OPTIONS,
  SECTION_OPTIONS,
} from "@/data/questionSubmissionConstants";
import { PassageIdCombobox } from "@/components/submission/PassageIdCombobox";
import { StatusPill } from "@/components/status/StatusPill";
import { getPassageText, listPassageIds } from "@/lib/passageLibrary";
import {
  clearQuestionSubmissionDraft,
  emptyQuestionSubmissionDraft,
  loadQuestionSubmissionDraft,
  loadQuestionSubmissionReceipts,
  questionSubmissionDraftHasContent,
  recordQuestionSubmissionReceipt,
  saveQuestionSubmissionDraft,
  type QuestionSubmissionDraft,
  type QuestionSubmissionReceipt,
} from "@/lib/questionSubmissionDraft";
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
        "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? chipActiveStyles[variant]
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

const emptyForm: QuestionSubmissionDraft = emptyQuestionSubmissionDraft;

export function QuestionSubmissionForm() {
  const { profile, loading } = useAuth();
  const sheetLinked = isSheetExportConfigured();
  const [form, setForm] = useState<QuestionSubmissionDraft>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [passageIds, setPassageIds] = useState<string[]>(() => listPassageIds());
  const [draftReady, setDraftReady] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [receipts, setReceipts] = useState<QuestionSubmissionReceipt[]>([]);
  const formRef = useRef(form);
  formRef.current = form;
  const receiptsRef = useRef<HTMLDivElement>(null);
  const pinReceipt = useRef(false);
  const displayNameRef = useRef(profile?.displayName ?? "");
  displayNameRef.current = profile?.displayName ?? "";

  const isPassageBased = form.type ? isPassageBasedType(form.type) : false;
  const answerMode = getFormatAnswerMode(form.format);
  const showChoices = formatRequiresChoices(form.format) || formatChoicesOptional(form.format);
  const choicesRequired = formatRequiresChoices(form.format);

  useEffect(() => {
    if (loading) return;
    const uid = profile?.uid;
    if (!uid) {
      setDraftReady(true);
      return;
    }
    const draft = loadQuestionSubmissionDraft(uid);
    if (draft) {
      setForm({
        ...draft,
        author: draft.author || displayNameRef.current,
      });
      setDraftNote("Draft restored.");
    }
    setReceipts(loadQuestionSubmissionReceipts(uid));
    setDraftReady(true);
  }, [loading, profile?.uid]);

  useEffect(() => {
    if (!draftReady || !profile?.displayName) return;
    setForm((prev) => (prev.author.trim() ? prev : { ...prev, author: profile.displayName ?? "" }));
  }, [draftReady, profile?.displayName]);

  useEffect(() => {
    if (!draftReady || !profile?.uid) return;
    const uid = profile.uid;
    if (questionSubmissionDraftHasContent(form)) {
      saveQuestionSubmissionDraft(uid, form);
    } else {
      clearQuestionSubmissionDraft(uid);
    }
  }, [draftReady, form, profile?.uid]);

  useEffect(() => {
    if (!draftReady || !profile?.uid) return;
    const uid = profile.uid;
    const flush = () => {
      const current = formRef.current;
      if (questionSubmissionDraftHasContent(current)) {
        saveQuestionSubmissionDraft(uid, current);
      } else {
        clearQuestionSubmissionDraft(uid);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [draftReady, profile?.uid]);

  useEffect(() => {
    if (!pinReceipt.current) return;
    pinReceipt.current = false;
    receiptsRef.current?.scrollIntoView?.({ block: "start" });
  }, [receipts]);

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
      skillTagCodes: [],
    }));
    setError(null);
    setSuccess(null);
  };

  const handleTypeChange = (type: QuestionSubmissionType) => {
    setForm((prev) => ({
      ...prev,
      type,
      skillTagCodes: [],
      passageId: isPassageBasedType(type) ? prev.passageId : "",
      passage: isPassageBasedType(type) ? prev.passage : "",
    }));
    setError(null);
    setSuccess(null);
  };

  const handlePassageIdChange = (value: string) => {
    const stored = getPassageText(value);
    setForm((prev) => ({
      ...prev,
      passageId: value,
      passage: stored ?? prev.passage,
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

  const toggleSkillTag = (code: string) => {
    setForm((prev) => ({
      ...prev,
      skillTagCodes: prev.skillTagCodes.includes(code)
        ? prev.skillTagCodes.filter((entry) => entry !== code)
        : [...prev.skillTagCodes, code],
    }));
    setError(null);
    setSuccess(null);
  };

  const validate = (): string | null => {
    if (!form.section) return "Select a section.";
    if (!form.module) return "Select a module.";
    if (!form.type) return "Select a question type.";
    if (!form.format) return "Select a question format.";
    if (form.skillTagCodes.length === 0) return "Select at least one skill tag.";
    if (!form.author.trim()) return "Enter your name.";
    if (!form.explanation.trim()) return "Enter a step-by-step explanation.";
    if (!form.commonTrap.trim()) return "Enter the common trap.";

    if (isPassageBased) {
      if (!form.passageId.trim()) return "Enter or select a Passage ID.";
      if (!form.passage.trim()) return "Enter the passage text.";
      if (!form.question.trim()) return "Enter the question stem.";
    } else if (!form.question.trim()) {
      return "Enter the question.";
    }

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
        skillTagCodes: form.skillTagCodes,
        author: form.author,
        passageId: form.passageId,
        passage: form.passage,
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

      if (isPassageBased) {
        setPassageIds(listPassageIds());
      }

      const nextForm: QuestionSubmissionDraft = {
        ...emptyForm,
        author: profile.displayName || "",
        section: form.section,
        module: form.module,
        type: form.type,
        format: form.format,
      };
      formRef.current = nextForm;
      clearQuestionSubmissionDraft(profile.uid);
      setDraftNote("");
      pinReceipt.current = true;
      setReceipts(
        recordQuestionSubmissionReceipt(profile.uid, {
          questionId: result.questionId,
          pending: result.pending,
          question: input.question,
        }),
      );
      setSuccess(
        result.pending
          ? "Sent. The tracker did not return an ID. Refresh the Google Sheet to confirm the new row. If nothing shows up, redeploy the Apps Script (see scripts/question-submission-sheet.gs)."
          : `Submitted. Question ID ${result.questionId} is In Review in the question bank tracker.`,
      );
      setForm(nextForm);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to submit question.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!draftReady) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
          <h1 className="text-lg font-medium">DrillMaster Question Submission</h1>
          <p className="mt-2 text-sm text-muted-foreground">Loading your draft.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
      <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
        <div className="mb-6">
          <h1 className="text-lg font-medium">DrillMaster Question Submission</h1>
          {draftNote ? (
            <p className="mt-2 text-sm text-muted-foreground">{draftNote}</p>
          ) : null}
        </div>

        {receipts.length > 0 ? (
          <div
            ref={receiptsRef}
            className="sticky top-20 z-20 -mx-6 mb-8 scroll-mt-24 border-y bg-card px-6 py-4 md:-mx-8 md:px-8"
          >
            <p className="text-sm font-medium">Submitted</p>
            {success ? <p className="mt-1 text-sm text-muted-foreground">{success}</p> : null}
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {receipts.map((receipt) => (
                <li
                  key={`${receipt.submittedAt}-${receipt.questionId}`}
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={receipt.status === "In Review" ? "progress" : "neutral"}>
                      {receipt.status}
                    </StatusPill>
                    {receipt.questionId ? (
                      <span className="text-muted-foreground">{receipt.questionId}</span>
                    ) : null}
                  </div>
                  {receipt.preview ? (
                    <p className="mt-1 text-muted-foreground">{receipt.preview}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(receipt.submittedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {receipt.pending
                      ? ". The tracker did not return an ID. Check the Google Sheet."
                      : ". In Review means the tracker accepted it. It joins the live question bank after approval."}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <h2 className="mb-4 text-base font-medium">Setup</h2>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
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
            <Label className="text-sm font-medium">
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

        <div className="mb-5 space-y-2">
          <Label htmlFor="question-type" className="text-sm font-medium">
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

        <div className="mb-5 space-y-2">
          <Label className="text-sm font-medium">
            Skill Tags
          </Label>
          <p className="text-sm text-muted-foreground">Select all that apply.</p>
          {!form.type ? (
            <p className="text-sm text-muted-foreground">Select a question type first.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {skillOptions.map((option) => {
                const active = form.skillTagCodes.includes(option.code);
                return (
                  <button
                    key={option.code}
                    type="button"
                    title={option.label}
                    onClick={() => toggleSkillTag(option.code)}
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1.5 font-mono text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {option.code}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-5 space-y-2">
          <Label htmlFor="question-format" className="text-sm font-medium">
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

        <div className="mb-5 space-y-2">
          <Label htmlFor="author" className="text-sm font-medium">
            Author
          </Label>
          <Input
            id="author"
            value={form.author}
            onChange={(event) => updateField("author", event.target.value)}
            placeholder="Your name"
          />
        </div>

        <p className="mb-2 min-h-5 font-mono text-sm text-muted-foreground">
          {previewId
            ? `Question ID preview: ${previewId}`
            : "Question ID will appear once type is selected"}
        </p>

        <h2 className="mb-4 mt-8 border-t pt-6 text-base font-medium">Question</h2>

        {isPassageBased && (
          <>
            <div className="mb-5 space-y-2">
              <Label htmlFor="passage-id" className="text-sm font-medium">
                Passage ID
              </Label>
              <p className="text-sm text-muted-foreground">
                Select a saved passage or type a new ID. New passages are saved for reuse on this device.
              </p>
              <PassageIdCombobox
                value={form.passageId}
                options={passageIds}
                onChange={handlePassageIdChange}
                placeholder="e.g. RC-PASS-001"
              />
            </div>

            <div className="mb-5 space-y-2">
              <Label htmlFor="passage" className="text-sm font-medium">
                Passage
              </Label>
              <Textarea
                id="passage"
                rows={6}
                value={form.passage}
                onChange={(event) => updateField("passage", event.target.value)}
                placeholder="Paste the reading passage here."
              />
            </div>
          </>
        )}

        <div className="mb-5 space-y-2">
          <Label htmlFor="question" className="text-sm font-medium">
            Question
          </Label>
          <Textarea
            id="question"
            rows={isPassageBased ? 3 : 5}
            value={form.question}
            onChange={(event) => updateField("question", event.target.value)}
            placeholder={
              isPassageBased
                ? "Enter the question stem (without the passage)."
                : "Type the question stem here."
            }
          />
        </div>

        <h2 className="mb-4 mt-8 border-t pt-6 text-base font-medium">
          {showChoices ? "Choices" : "Answer"}
        </h2>

        {showChoices && (
          <div className="mb-5 space-y-2">
            <Label className="text-sm font-medium">
              {choicesRequired ? "Choices A to D" : "Options or items"}
              {!choicesRequired ? (
                <span className="font-normal text-muted-foreground"> (optional)</span>
              ) : null}
            </Label>
            {(["A", "B", "C", "D"] as const).map((letter) => {
              const key = `choice${letter}` as "choiceA" | "choiceB" | "choiceC" | "choiceD";
              return (
                <div key={letter} className="grid grid-cols-[28px_1fr] items-center gap-2">
                  <span className="text-center text-sm font-medium text-muted-foreground">
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
          <Label className="text-sm font-medium">
            Correct Answer
          </Label>
          <p className="text-sm text-muted-foreground">{CORRECT_ANSWER_HINTS[answerMode]}</p>

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

        <h2 className="mb-4 mt-8 border-t pt-6 text-base font-medium">Explanation</h2>

        <div className="mb-5 space-y-2">
          <Label htmlFor="explanation" className="text-sm font-medium">
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
          <Label htmlFor="common-trap" className="text-sm font-medium">
            Common Trap
          </Label>
          <Textarea
            id="common-trap"
            rows={2}
            value={form.commonTrap}
            onChange={(event) => updateField("commonTrap", event.target.value)}
            placeholder="Why might a student pick the wrong answer?"
          />
        </div>

        <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-8 rounded-b-xl border-t bg-card px-6 py-4 md:-mx-8 md:-mb-8 md:px-8">
          {error ? (
            <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
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
      </div>
    </form>
  );
}
