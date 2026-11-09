import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HighlightableText } from "@/components/exam/HighlightableText";
import { ModuleBadge } from "@/components/question/ModuleBadge";
import { QuestionResponseFields } from "@/components/question/QuestionResponseFields";
import { NotesWorkbench } from "@/components/notes/NotesWorkbench";
import { useAuth } from "@/contexts/AuthContext";
import { getSelectedChoiceIds } from "@/lib/questionExplanation";
import { canSubmitQuestionAnswer, isQuestionAnswerCorrect } from "@/lib/sessionGrading";
import { cn } from "@/lib/utils";
import type { Question } from "@/types";
import logoIcon from "@/assets/logo-icon.png";

const STEM = `Which sentence contains an error in its construction and should be revised?

(1) The city council voted last Tuesday to approve a new plan for expanding the public transit system. (2) Supported by years of traffic data and rider surveys, the plan calls for three new subway lines and dozens of additional bus routes. (3) Several neighborhood groups have raised concerns about construction noise and disruption to local businesses during the expansion. (4) Having studied the issue for nearly two years, the final decision surprised many residents who had expected a different outcome.`;

const HOW_TO_SOLVE =
  "Check each sentence that begins with a modifying phrase. In sentence 2, \"Supported by years of traffic data and rider surveys\" is followed by \"the plan,\" and the plan really is supported by that data, so the sentence is correct. In sentence 4, \"Having studied the issue for nearly two years\" is followed by \"the final decision.\" The phrase describes someone who studied, and a decision cannot study anything. The sentence must name the people who did the studying, such as the council, right after the comma.";

const WHY_CORRECT =
  "Correct. \"Having studied the issue for nearly two years\" must describe whoever did the studying, but the noun right after the comma is \"the final decision.\" A decision cannot study an issue. Revised: \"Having studied the issue for nearly two years, the council made a final decision that surprised many residents who had expected a different outcome.\"";

const COMMON_TRAP =
  "Sentence 2 also begins with a long phrase and a comma, so students who flag every opening phrase may choose it. The test is not whether a sentence starts with a phrase but whether the phrase describes the noun right after the comma. The plan is supported by data, so sentence 2 works; the final decision did not study the issue, so sentence 4 does not.";

const WRONG_CHOICES = [
  {
    label: "A",
    text: "Sentence 1 is correct. \"The city council\" is the subject, \"voted\" is the verb, and \"to approve a new plan\" tells what the council voted to do.",
  },
  {
    label: "B",
    text: "Sentence 2 is correct even though it begins with a modifier. \"Supported by years of traffic data and rider surveys\" describes the plan, and \"the plan\" comes right after the comma.",
  },
  {
    label: "C",
    text: "Sentence 3 is correct. \"Several neighborhood groups\" is the subject of \"have raised,\" and the rest of the sentence tells what their concerns are.",
  },
];

const TRY_STEPS = [
  "Answer a few questions as a student",
  "Assign practice to a sample student",
  "Assign practice to an actual student",
];

const DEMO_QUESTION: Question = {
  id: "ELA-REB-002",
  subject: "ELA",
  subtype: "MC4_A-D",
  module: "2",
  stem: STEM,
  choices: [
    {
      id: "ELA-REB-002-a",
      label: "A",
      text: "Sentence 1",
      isCorrect: false,
      explanation: WRONG_CHOICES[0].text,
    },
    {
      id: "ELA-REB-002-b",
      label: "B",
      text: "Sentence 2",
      isCorrect: false,
      explanation: WRONG_CHOICES[1].text,
    },
    {
      id: "ELA-REB-002-c",
      label: "C",
      text: "Sentence 3",
      isCorrect: false,
      explanation: WRONG_CHOICES[2].text,
    },
    {
      id: "ELA-REB-002-d",
      label: "D",
      text: "Sentence 4",
      isCorrect: true,
      explanation: WHY_CORRECT,
    },
  ],
  tags: [
    { id: "RE-MOD", domain: "ELA", code: "RE-MOD", label: "Modifier/Construction Error" },
    { id: "RE-SEN", domain: "ELA", code: "RE-SEN", label: "Sentence Structure" },
  ],
  solutionExplanation: HOW_TO_SOLVE,
  commonTrap: COMMON_TRAP,
  createdAt: "2026-06-26T12:01:00Z",
};

export default function TutorDemo() {
  const { profile } = useAuth();
  const tryDemoTo = profile ? "/dashboard" : "/login?as=demo";
  const [rawAnswer, setRawAnswer] = useState<string | undefined>();
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [notes, setNotes] = useState("");
  const [scratchPad, setScratchPad] = useState("");
  const selectedIds = getSelectedChoiceIds(DEMO_QUESTION, rawAnswer);
  const selectedLabel = DEMO_QUESTION.choices?.find((choice) => choice.id === selectedIds[0])?.label;
  const answerCorrect = checked && isQuestionAnswerCorrect(DEMO_QUESTION, rawAnswer);

  useEffect(() => {
    if (!checked) return;
    document.getElementById("answer-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [checked]);

  useEffect(() => {
    const previous = document.title;
    document.title = "DrillMaster for tutors";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div id="top" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="" className="h-8 w-8 object-contain" />
            <div className="leading-none">
              <p className="font-serif text-[15px] font-semibold tracking-tight">StepPrep</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-primary/80">DrillMaster</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>
      </header>

      <section className="border-b bg-brand-navy text-white">
        <div className="container grid items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-cream">
              Built by tutors. For tutors.
            </p>
            <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.12] tracking-tight md:text-5xl">
              By tutors, for tutors.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/80">
              Better practice. Clearer insights. More confident teaching.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
              Built by the StepPrep team, led by Jed Levine, with 25 years of SHSAT prep experience.
            </p>
            <Button asChild variant="brand" size="lg" className="mt-8">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
          <ProductFrame>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">ELA</Badge>
              <Badge>Module 2</Badge>
            </div>
            <TrapBlock />
            <div className="rounded-lg border bg-card px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4 text-primary" aria-hidden />
                Skill to improve
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Modifiers that open a sentence. Practice naming the noun right after the comma, then a short Modifiers set.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Tutors only. Students do not see this while they answer.</p>
            </div>
          </ProductFrame>
        </div>
      </section>

      <div id="how-it-works">
        <Step number="1" title="You choose the module and the skill, built for the adaptive SHSAT.">
          <Flanked
            left="Module, topic, then skill."
            right="Send a prebuilt set, or build your own."
          >
          <div className="grid items-stretch gap-3 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-full border px-3 py-2 text-center text-sm">Module 1</div>
                <div className="rounded-full bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground">
                  Module 2
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold">Revising and editing</p>
              <p className="text-xs text-muted-foreground">ELA · Sentence structure, modifiers, pronouns, punctuation</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {["Modifiers", "Pronouns", "Punctuation", "Transitions"].map((skill) => (
                  <div
                    key={skill}
                    className={cn(
                      "rounded-lg border px-3 py-2",
                      skill === "Modifiers" && "border-primary bg-primary/10 font-medium",
                    )}
                  >
                    {skill}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col rounded-2xl border bg-card">
              <div className="flex flex-1 flex-col justify-center px-4 py-4">
                <p className="font-semibold">Prebuilt set</p>
                <p className="mt-1 text-sm text-muted-foreground">Ready to assign: Modifiers, ELA, Module 2</p>
              </div>
              <div className="flex flex-1 flex-col justify-center border-t px-4 py-4">
                <p className="font-semibold">Create your own</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick the skills, the module, and how many questions to send.
                </p>
              </div>
            </div>
          </div>
          </Flanked>
        </Step>

        <Step number="2" title="Your student practices with questions written by experienced SHSAT tutors.">
          <Stage className="[grid-template-areas:'modNote'_'highlightNote'_'head'_'badges'_'passage'_'body'] lg:[grid-template-areas:'x_head_y'_'modNote_badges_z'_'w_passage_highlightNote'_'v_body_u']">
            <Note area="modNote" point="right">
              Subject and module stay on the question.
            </Note>
            <Note area="highlightNote" point="left" align="start">
              Students can highlight the passage, the same way they mark up an exam.
            </Note>
            <FrameBrand />
            <Panel area="badges" edge="mid">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">ELA</Badge>
                <ModuleBadge module="2" />
                <Badge variant="outline">MC4_A-D</Badge>
              </div>
            </Panel>
            <Panel area="passage" edge="mid">
              <HighlightableText text={DEMO_QUESTION.stem} storageKey="demo-tutor-stem-ELA-REB-002" />
            </Panel>
            <Panel area="body" edge="bottom">
              {checked ? (
                <div
                  className={cn(
                    "mb-4 rounded-lg border p-3 text-sm",
                    answerCorrect
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-destructive/30 bg-destructive/10 text-destructive",
                  )}
                >
                  {answerCorrect ? "Correct." : "Incorrect."}
                </div>
              ) : null}
              <QuestionResponseFields
                question={DEMO_QUESTION}
                raw={rawAnswer}
                disabled={checked}
                showSolution={checked}
                onChange={setRawAnswer}
                onToggleAta={() => undefined}
                eliminatedChoiceIds={eliminated}
                onToggleEliminate={
                  checked
                    ? undefined
                    : (choiceId) =>
                        setEliminated((current) =>
                          current.includes(choiceId)
                            ? current.filter((id) => id !== choiceId)
                            : [...current, choiceId],
                        )
                }
              />
              {checked ? null : (
                <Button
                  className="mt-4 w-full"
                  size="lg"
                  disabled={!canSubmitQuestionAnswer(DEMO_QUESTION, rawAnswer)}
                  onClick={() => setChecked(true)}
                >
                  Check answer
                </Button>
              )}
            </Panel>
          </Stage>
        </Step>

        <Step id="answer-result" number="3" title="The correct answer and a full explanation.">
          <Stage className="[grid-template-areas:'solveNote'_'whyNote'_'head'_'lead'_'solve'_'why'] lg:[grid-template-areas:'x_head_y'_'a_lead_b'_'solveNote_solve_z'_'w_why_whyNote']">
            <Note area="solveNote" point="right" align="start">
              How to solve it, step by step.
            </Note>
            <Note area="whyNote" point="left" align="start">
              Then why the right choice holds.
            </Note>
            <FrameBrand />
            <Panel area="lead" edge="mid">
              <p className="text-sm text-muted-foreground">
                {checked && selectedLabel
                  ? `You chose ${selectedLabel}. Correct answer: D`
                  : "Check an answer above. This explanation marks the choice you picked."}
              </p>
            </Panel>
            <Panel area="solve" edge="mid">
              <h3 className="text-sm font-semibold">How to solve it</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{HOW_TO_SOLVE}</p>
            </Panel>
            <Panel area="why" edge="bottom">
              <h3 className="text-sm font-semibold">Why D is correct</h3>
              <div className="mt-2 rounded-lg border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm leading-relaxed">
                <p className="mb-2 font-medium">
                  D · Correct
                  {checked && selectedLabel === "D" ? (
                    <span className="ml-2 text-xs font-normal text-emerald-800 dark:text-emerald-200">Your answer</span>
                  ) : null}
                </p>
                {WHY_CORRECT}
              </div>
            </Panel>
          </Stage>
        </Step>

        <Step number="3" title="Why each incorrect answer is wrong.">
          <Flanked left="Their answer is marked." right="Every other choice is explained.">
          <ProductFrame>
            <h3 className="text-sm font-semibold">Why the other choices are wrong</h3>
            <div className="space-y-2">
              {WRONG_CHOICES.map((choice) => {
                const picked = checked && selectedLabel === choice.label;
                return (
                  <div
                    key={choice.label}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-sm leading-relaxed",
                      picked && "border-destructive/30 bg-destructive/10",
                    )}
                  >
                    <p className="mb-1 font-medium">
                      {choice.label}
                      {picked ? <span className="ml-2 text-xs font-normal text-destructive">Your answer</span> : null}
                    </p>
                    {choice.text}
                  </div>
                );
              })}
            </div>
          </ProductFrame>
          </Flanked>
        </Step>

        <Step number="3" title="The common trap.">
          <Flanked
            left="The mistake students make on this skill."
            right="Named on the question, for the tutor."
          >
          <ProductFrame>
            <TrapBlock />
          </ProductFrame>
          </Flanked>
        </Step>

        <Step number="4" title="Based on their performance, you decide what's next.">
          <Stage className="[grid-template-areas:'skillNote'_'notesNote'_'head'_'skill'_'notes'] lg:[grid-template-areas:'x_head_y'_'skillNote_skill_z'_'w_notes_notesNote']">
            <Note area="skillNote" point="right">
              Skill to improve is for the tutor.
            </Note>
            <Note area="notesNote" point="left" align="start">
              My Notes stays on the question.
            </Note>
            <FrameBrand />
            <Panel area="skill" edge="mid">
              <div className="rounded-lg border px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Target className="h-4 w-4 text-primary" aria-hidden />
                  Skill to improve
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Modifiers that open a sentence. Practice naming the noun right after the comma, then a short Modifiers set.
                </p>
              </div>
            </Panel>
            <Panel area="notes" edge="bottom">
              <div className="rounded-lg border px-4 py-3">
                <h3 className="text-sm font-semibold">My Notes</h3>
                <div className="mt-2">
                  <NotesWorkbench
                    compact
                    text={notes}
                    onTextChange={setNotes}
                    scratchPad={scratchPad}
                    onScratchPadChange={setScratchPad}
                    textPlaceholder="Add your notes about this question..."
                    textAriaLabel="Question notes"
                  />
                </div>
              </div>
            </Panel>
          </Stage>
        </Step>
      </div>

      <section className="bg-brand-navy py-16 text-white md:py-20">
        <div className="container px-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-cream">Try it</p>
          <h2 className="mt-3 max-w-xl font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            See it for yourself.
          </h2>
          <ol className="mt-8 grid gap-3 md:grid-cols-3">
            {TRY_STEPS.map((step, index) => (
              <li key={step} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-sm leading-relaxed">
                <span className="mb-2 block font-serif text-lg text-brand-cream">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-12 flex justify-center">
            <Button
              asChild
              variant="brand"
              size="lg"
              className="h-16 min-w-[18rem] rounded-2xl px-12 text-lg font-semibold shadow-[0_12px_40px_hsl(46_88%_88%/0.35)] transition-transform hover:scale-[1.04] hover:shadow-[0_16px_48px_hsl(46_88%_88%/0.5)] [&_svg]:size-5"
            >
              <Link to={tryDemoTo}>
                Try the demo
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({
  id,
  number,
  title,
  children,
}: {
  id?: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-b py-14 md:py-20">
      <div className="container px-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Step {number}
        </p>
        <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function Callout({
  children,
  point = "right",
  edge = "above",
}: {
  children: React.ReactNode;
  point?: "left" | "right";
  edge?: "above" | "below";
}) {
  const pointsLeft = point === "left";
  const below = edge === "below";
  return (
    <div
      className={cn(
        "flex w-full max-w-sm lg:w-auto lg:max-w-[16rem] lg:items-center",
        below ? "flex-col-reverse items-end" : "flex-col items-start",
        pointsLeft ? "lg:flex-row-reverse" : "lg:flex-row",
      )}
    >
      <p className="rounded-2xl bg-brand-navy px-4 py-3 text-base font-medium leading-snug text-brand-cream shadow-md">
        {children}
      </p>
      <span
        aria-hidden
        className={cn(
          "h-0 w-0 border-x-[9px] border-x-transparent lg:hidden",
          below
            ? "mr-8 border-b-[12px] border-b-brand-navy"
            : "ml-8 border-t-[12px] border-t-brand-navy",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "hidden h-0 w-0 shrink-0 lg:block",
          pointsLeft
            ? "border-y-[9px] border-r-[12px] border-y-transparent border-r-brand-navy"
            : "border-y-[9px] border-l-[12px] border-y-transparent border-l-brand-navy",
        )}
      />
    </div>
  );
}

function Flanked({
  left,
  right,
  children,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-4 lg:grid-cols-[minmax(11rem,16rem)_minmax(0,40rem)_minmax(11rem,16rem)] lg:justify-center">
      <div className="lg:justify-self-end">
        <Callout point="right">{left}</Callout>
      </div>
      <div className="min-w-0">{children}</div>
      <div className="lg:justify-self-start">
        <Callout point="left" edge="below">
          {right}
        </Callout>
      </div>
    </div>
  );
}

function ProductFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
      <div className="border-b">
        <BrandRow />
      </div>
      <div className="space-y-4 p-4 md:p-5">{children}</div>
    </div>
  );
}

function Stage({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-6xl grid-cols-1 lg:grid-cols-[minmax(12rem,16rem)_minmax(0,42rem)_minmax(12rem,16rem)] lg:gap-x-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Note({
  area,
  point,
  align = "center",
  children,
}: {
  area: string;
  point: "left" | "right";
  align?: "center" | "start";
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ gridArea: area }}
      className={cn(
        "mb-3 lg:mb-0",
        point === "right" ? "lg:justify-self-end" : "lg:justify-self-start",
        align === "start" ? "lg:self-start lg:pt-1" : "lg:self-center",
      )}
    >
      <Callout point={point}>{children}</Callout>
    </div>
  );
}

function BrandRow() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <img src={logoIcon} alt="" className="h-6 w-6 object-contain" />
      <span className="font-serif text-sm font-semibold">StepPrep</span>
      <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground">DrillMaster</span>
    </div>
  );
}

function FrameBrand() {
  return (
    <div style={{ gridArea: "head" }} className="rounded-t-2xl border bg-card">
      <BrandRow />
    </div>
  );
}

function Panel({
  area,
  edge,
  children,
}: {
  area: string;
  edge: "mid" | "bottom";
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ gridArea: area }}
      className={cn(
        "bg-card px-4 md:px-5",
        edge === "mid" && "border-x py-4",
        edge === "bottom" && "rounded-b-2xl border border-t-0 pb-5 pt-4",
      )}
    >
      {children}
    </div>
  );
}

function TrapBlock() {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        Common trap
      </div>
      <p className="text-sm leading-relaxed text-amber-950/90 dark:text-amber-100/90">{COMMON_TRAP}</p>
    </div>
  );
}
