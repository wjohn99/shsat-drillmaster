import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Play, Settings, ArrowRight, BookOpen, Brain, Check } from "lucide-react";
import { QuestionModule, Subject } from "@/types";
import { QuestionsStatus } from "@/components/questions/QuestionsStatus";
import { useQuestions } from "@/contexts/QuestionsContext";
import { moduleBadgeColor, moduleLabel, QUESTION_MODULES } from "@/lib/questionModule";
import { TAG_CATEGORIES, getTagLabel } from "@/data/taggingScheme";
import { cn } from "@/lib/utils";

type TopicSection = {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  tags: { code: string; label: string }[];
};

type PracticeScope = {
  title: string;
  description: string;
  subject: Subject | null;
  sections: TopicSection[];
  /** Tags that define this skill when the student has not picked a narrower topic. */
  poolTagCodes: string[] | null;
};

const PART_A_CODES = [
  "RE-SEN",
  "RE-MOD",
  "RE-TEN",
  "RE-RUN",
  "RE-SVA",
  "RE-PRO",
  "RE-COM",
  "RE-COLN",
  "RE-SEM",
  "RE-APP",
] as const;

const PART_B_CODES = ["RE-WC", "RE-ORG", "RE-CL"] as const;

function contentCategory(id: string): TopicSection {
  const category = TAG_CATEGORIES.find((entry) => entry.id === id);
  if (!category || category.subject === "BOTH") {
    throw new Error(`Missing practice category ${id}`);
  }
  return {
    id: category.id,
    title: category.title,
    description: category.description,
    subject: category.subject,
    tags: category.tags,
  };
}

function revisingSection(part: "a" | "b"): TopicSection {
  const codes = new Set<string>(part === "a" ? PART_A_CODES : PART_B_CODES);
  const revising = contentCategory("re");
  return {
    id: part === "a" ? "re-a" : "re-b",
    title: part === "a" ? "Revising & Editing Part A" : "Revising & Editing Part B",
    description:
      part === "a"
        ? "Grammar, punctuation, and sentence structure"
        : "Organization, clarity, and word choice",
    subject: "ELA",
    tags: revising.tags.filter((tagDef) => codes.has(tagDef.code)),
  };
}

function practiceScope(type: string | undefined): PracticeScope {
  if (type === "reading-comprehension") {
    const reading = contentCategory("rc");
    return {
      title: "Reading Comprehension",
      description: "Passage skills for this set. Module and question count narrow it further.",
      subject: "ELA",
      sections: [reading],
      poolTagCodes: reading.tags.map((tagDef) => tagDef.code),
    };
  }
  if (type === "revising-editing-a") {
    const section = revisingSection("a");
    return {
      title: "Revising & Editing Part A",
      description: "Grammar, punctuation, and sentence structure for this set.",
      subject: "ELA",
      sections: [section],
      poolTagCodes: section.tags.map((tagDef) => tagDef.code),
    };
  }
  if (type === "revising-editing-b") {
    const section = revisingSection("b");
    return {
      title: "Revising & Editing Part B",
      description: "Organization, clarity, and word choice for this set.",
      subject: "ELA",
      sections: [section],
      poolTagCodes: section.tags.map((tagDef) => tagDef.code),
    };
  }
  if (type === "math") {
    const sections = ["num", "alg", "app", "geo", "dat"].map(contentCategory);
    return {
      title: "Math",
      description: "Math topics for this set. Leave them unselected to use every math skill.",
      subject: "MATH",
      sections,
      poolTagCodes: null,
    };
  }
  return {
    title: "Create practice set",
    description: "Choose a subject and skills, then set how many questions to practice.",
    subject: null,
    sections: TAG_CATEGORIES.filter((category) => category.subject !== "BOTH").map((category) =>
      contentCategory(category.id),
    ),
    poolTagCodes: null,
  };
}

export default function PracticeSetup() {
  const { getFilteredQuestions } = useQuestions();
  const navigate = useNavigate();
  const { type } = useParams();
  const scope = practiceScope(type);

  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [selectedModules, setSelectedModules] = useState<QuestionModule[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>(() =>
    scope.subject ? scope.sections.map((section) => section.id) : [],
  );
  const [questionsCount, setQuestionsCount] = useState(10);
  const [timedMode, setTimedMode] = useState(true);

  useEffect(() => {
    const next = practiceScope(type);
    setSelectedSubjects([]);
    setSelectedModules([]);
    setSelectedTags([]);
    setExpandedSections(next.subject ? next.sections.map((section) => section.id) : []);
  }, [type]);

  const subjects: Subject[] = ['MATH', 'ELA'];

  const toggleArraySelection = <T,>(array: T[], setArray: (arr: T[]) => void, item: T) => {
    if (array.includes(item)) {
      setArray(array.filter(i => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const toggleTag = (code: string, subject: Subject | "BOTH") => {
    if (selectedTags.includes(code)) {
      setSelectedTags(selectedTags.filter((item) => item !== code));
      return;
    }
    setSelectedTags([...selectedTags, code]);
    if (subject !== "BOTH" && !selectedSubjects.includes(subject)) {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const activeSubjects = scope.subject ? [scope.subject] : selectedSubjects;
  const activeTags = selectedTags.length > 0 ? selectedTags : scope.poolTagCodes ?? [];

  const availableQuestions = getFilteredQuestions({
    subjects: activeSubjects,
    modules: selectedModules,
    tagCodes: activeTags,
  });
  const maxQuestions = availableQuestions.length;
  const setSize = maxQuestions === 0 ? 0 : Math.min(questionsCount, maxQuestions);

  useEffect(() => {
    if (maxQuestions === 0) return;
    setQuestionsCount((current) => Math.min(Math.max(current, 1), maxQuestions));
  }, [maxQuestions]);

  const startPractice = () => {
    const params = new URLSearchParams();
    if (activeSubjects.length > 0) params.set("subjects", activeSubjects.join(","));
    if (selectedModules.length > 0) params.set("modules", selectedModules.join(","));
    if (activeTags.length > 0) params.set("tagCodes", activeTags.join(","));
    params.set('count', String(setSize));
    params.set('timed', timedMode.toString());

    navigate(`/practice-set?${params.toString()}`);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <QuestionsStatus>
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-1.5 font-serif text-[1.75rem] font-semibold tracking-tight">
              {scope.title}
            </h1>
            <p className="text-[15px] text-muted-foreground">{scope.description}</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Settings Panel */}
            <div className="lg:col-span-2 space-y-6">
              {scope.subject ? null : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Subject
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {subjects.map((subject) => (
                      <Chip
                        key={subject}
                        variant={
                          selectedSubjects.includes(subject)
                            ? "selected"
                            : subject === "MATH"
                              ? "math"
                              : "ela"
                        }
                        onClick={() => toggleArraySelection(selectedSubjects, setSelectedSubjects, subject)}
                        className="flex-1 justify-center"
                      >
                        {subject}
                      </Chip>
                    ))}
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Module Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Module</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Filter by SHSAT adaptive module
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {QUESTION_MODULES.map((module) => (
                      <button
                        key={module}
                        onClick={() => toggleArraySelection(selectedModules, setSelectedModules, module)}
                        className={`
                          flex-1 h-12 rounded-full text-sm font-bold text-white transition-all
                          ${selectedModules.includes(module) ? 'ring-2 ring-ring ring-offset-2 scale-[1.02]' : 'hover:opacity-90'}
                        `}
                        style={{ backgroundColor: moduleBadgeColor(module) }}
                      >
                        {moduleLabel(module)}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Topic Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Topics (Optional)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {scope.subject
                      ? "Optional. Pick skills to narrow this set, or leave them open to use all of them."
                      : "Focus on specific skills and concepts"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTags.map((code) => (
                        <Chip
                          key={code}
                          variant={code.startsWith("RC-") || code.startsWith("RE-") ? "ela" : "math"}
                          size="sm"
                          onRemove={() => setSelectedTags(selectedTags.filter((item) => item !== code))}
                        >
                          {getTagLabel(code)}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                  <Accordion
                    type="multiple"
                    value={expandedSections}
                    onValueChange={setExpandedSections}
                    className="rounded-lg border px-4"
                  >
                    {scope.sections.map((section) => {
                      const tags = section.tags;
                      const selectedInSection = tags.filter((tagDef) =>
                        selectedTags.includes(tagDef.code),
                      ).length;
                      return (
                        <AccordionItem key={section.id} value={section.id}>
                          <AccordionTrigger className="py-3.5 hover:no-underline">
                            <div className="flex flex-1 items-center gap-3 pr-2 text-left">
                              <div
                                className={cn(
                                  "min-h-[2.5rem] w-1 shrink-0 self-stretch rounded-full",
                                  section.subject === "MATH" ? "bg-math" : "bg-ela",
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold">{section.title}</span>
                                  <Badge variant="outline" className="text-[10px] font-normal">
                                    {section.subject === "MATH" ? "Math" : "ELA"}
                                  </Badge>
                                  {selectedInSection > 0 ? (
                                    <Badge className="text-[10px]">{selectedInSection} selected</Badge>
                                  ) : null}
                                </div>
                                <p className="mt-0.5 line-clamp-1 text-xs font-normal text-muted-foreground">
                                  {section.description}
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid gap-2 pb-2 sm:grid-cols-2">
                              {tags.map((tagDef) => {
                                const on = selectedTags.includes(tagDef.code);
                                return (
                                  <button
                                    key={tagDef.code}
                                    type="button"
                                    onClick={() => toggleTag(tagDef.code, section.subject)}
                                    className={cn(
                                      "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
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
                                      {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                                    </span>
                                    <span className="leading-snug">{tagDef.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>

              {/* Practice Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Practice Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Timed Practice</Label>
                      <p className="text-xs text-muted-foreground">Track time and get pacing feedback</p>
                    </div>
                    <Switch
                      checked={timedMode}
                      onCheckedChange={setTimedMode}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <Label className="text-sm font-medium">Questions in set: {setSize}</Label>
                    </div>
                    <Slider
                      min={maxQuestions > 0 ? 1 : 0}
                      max={Math.max(maxQuestions, 1)}
                      step={1}
                      value={[maxQuestions > 0 ? setSize : 0]}
                      disabled={maxQuestions === 0}
                      onValueChange={(value) => setQuestionsCount(value[0] ?? 1)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum {maxQuestions} question{maxQuestions === 1 ? "" : "s"} for these filters.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Practice Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="mb-2 font-serif text-3xl font-semibold text-primary">
                      {setSize}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      questions in this set
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span>{scope.subject ? "Set:" : "Subjects:"}</span>
                      <span className="text-right">
                        {scope.subject
                          ? scope.title
                          : selectedSubjects.length === 0
                            ? "All"
                            : selectedSubjects.join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. Time:</span>
                      <span>{Math.round(setSize * 1.5)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mode:</span>
                      <span>{timedMode ? 'Timed' : 'Untimed'}</span>
                    </div>
                  </div>

                  <Separator />

                  <Button 
                    className="w-full" 
                    onClick={startPractice}
                    disabled={availableQuestions.length === 0}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Practice
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/question-bank')}
                  >
                    Browse Individual Questions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      </QuestionsStatus>
    </div>
  );
}