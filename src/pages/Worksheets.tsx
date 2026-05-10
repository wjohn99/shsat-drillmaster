import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  FileText,
  Plus,
  Sparkles,
  Clock,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  FileDown,
} from "lucide-react";
import { questions, allTags, passages } from "@/data/mockData";
import type { Question } from "@/types";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";
import {
  WORKSHEET_SECTIONS,
  buildWorksheetTagCatalog,
  pickWorksheetQuestions,
} from "@/lib/worksheetTagCatalog";
import { openWorksheetPdfInNewTab } from "@/lib/worksheetPdfExport";
import { SessionQuestionRunner } from "@/components/session/SessionQuestionRunner";
import { SessionResultsDashboard } from "@/components/session/SessionResultsDashboard";

type Mode = "home" | "build" | "runner" | "results";

const Worksheets = () => {
  const [mode, setMode] = useState<Mode>("home");
  const [runKey, setRunKey] = useState(0);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [questionLimit, setQuestionLimit] = useState(10);
  const [worksheetQuestions, setWorksheetQuestions] = useState<Question[]>([]);
  const [sessionEvents, setSessionEvents] = useState<SessionAnalyticsEvent[]>([]);

  const tagCatalog = useMemo(() => buildWorksheetTagCatalog(allTags, questions), []);

  const toggleTag = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  const matchingCount = useMemo(() => {
    if (selectedCodes.length === 0) return 0;
    const ids = new Set<string>();
    for (const q of questions) {
      if (q.tags.some((t) => selectedSet.has(t.code))) ids.add(q.id);
    }
    return ids.size;
  }, [questions, selectedCodes, selectedSet]);

  const startWorksheetRun = () => {
    const picked = pickWorksheetQuestions(questions, selectedSet, questionLimit);
    setWorksheetQuestions(picked);
    setRunKey((k) => k + 1);
    setSessionEvents([]);
    setMode("runner");
  };

  const selectedTagLabels = useMemo(() => {
    return selectedCodes.map((code) => {
      for (const sec of WORKSHEET_SECTIONS) {
        const t = tagCatalog[sec.id].find((x) => x.code === code);
        if (t) return t.label;
      }
      return code;
    });
  }, [selectedCodes, tagCatalog]);

  const exportWorksheetPdf = () => {
    const picked = pickWorksheetQuestions(questions, selectedSet, questionLimit);
    if (picked.length === 0) return;
    const tagPart =
      selectedTagLabels.length > 0 ? selectedTagLabels.join("; ") : "No tags";
    openWorksheetPdfInNewTab(picked, passages, {
      tagSummaryLine: `${new Date().toLocaleString()} — Tags: ${tagPart}`,
    });
  };

  const worksheetCorrect = sessionEvents.filter((e) => e.correct).length;
  const worksheetAccuracyPct = sessionEvents.length
    ? Math.round((worksheetCorrect / sessionEvents.length) * 100)
    : 0;

  const presetWorksheets = [
    {
      id: "algebra-basics",
      title: "Algebra Basics",
      description: "Linear equations and expressions fundamentals",
      questionCount: 20,
      estimatedTime: "30 min",
      subject: "MATH",
    },
    {
      id: "reading-comp-1",
      title: "Reading Comprehension Set 1",
      description: "Science and technology passages",
      questionCount: 15,
      estimatedTime: "25 min",
      subject: "ELA",
    },
    {
      id: "grammar-essentials",
      title: "Grammar Essentials",
      description: "Comma usage and sentence structure",
      questionCount: 25,
      estimatedTime: "20 min",
      subject: "ELA",
    },
    {
      id: "geometry-shapes",
      title: "Geometry & Shapes",
      description: "Area, volume, and coordinate geometry",
      questionCount: 18,
      estimatedTime: "35 min",
      subject: "MATH",
    },
  ];

  if (mode === "runner" && worksheetQuestions.length > 0) {
    return (
      <SessionQuestionRunner
        key={runKey}
        questions={worksheetQuestions}
        sessionTitle="Custom worksheet"
        storageKeyPrefix="worksheet"
        onExit={() => setMode("build")}
        onComplete={(events) => {
          setSessionEvents(events);
          setMode("results");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8">
        {mode === "results" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => setMode("build")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to builder
            </Button>
            <SessionResultsDashboard
              title="Worksheet complete"
              events={sessionEvents}
              summaryMetrics={[
                { label: "Questions answered", value: sessionEvents.length },
                { label: "Correct", value: worksheetCorrect },
                { label: "Accuracy", value: `${worksheetAccuracyPct}%` },
              ]}
              footnote="Statistics use your answers and time on each question in this worksheet."
              footerActions={
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMode("build");
                    }}
                  >
                    Edit tags
                  </Button>
                  <Button
                    onClick={() => {
                      startWorksheetRun();
                    }}
                  >
                    New worksheet (same tags)
                  </Button>
                </>
              }
            />
          </div>
        )}

        {mode === "build" && (
          <div className="mb-12 max-w-6xl mx-auto">
            <Button variant="ghost" className="mb-6" onClick={() => setMode("home")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Create custom worksheet</h2>
              <p className="text-muted-foreground max-w-2xl">
                Pick skill tags from each SHSAT section. Tags come from the question bank and any new tags on
                questions are included automatically.
              </p>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Worksheet size</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Maximum number of questions (random from the pool that matches your tags). If the pool is
                  smaller, you get every match.
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
                  onValueChange={(v) => setQuestionLimit(v[0] ?? 10)}
                />
                <p className="text-xs text-muted-foreground">
                  Pool size for current tags: <span className="font-medium text-foreground">{matchingCount}</span>
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {WORKSHEET_SECTIONS.map((section) => {
                const tags = tagCatalog[section.id];
                return (
                  <Card key={section.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </CardHeader>
                    <CardContent>
                      {tags.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No tags in this section yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-1">
                          {tags.map((tag) => {
                            const on = selectedCodes.includes(tag.code);
                            return (
                              <Chip
                                key={tag.code}
                                variant={on ? "selected" : section.id === "math" ? "math" : "ela"}
                                size="sm"
                                className="max-w-full text-left justify-start"
                                onClick={() => toggleTag(tag.code)}
                              >
                                {tag.label}
                              </Chip>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                onClick={startWorksheetRun}
                disabled={selectedCodes.length === 0 || matchingCount === 0}
              >
                Start worksheet
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={exportWorksheetPdf}
                disabled={selectedCodes.length === 0 || matchingCount === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => setSelectedCodes([])}>
                Clear tags
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedCodes.length} tag{selectedCodes.length === 1 ? "" : "s"} selected
              </span>
            </div>
          </div>
        )}

        {mode === "home" && (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Worksheets</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Create focused practice sessions with curated question sets, custom worksheets, or AI-generated
                content.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50">
                <CardHeader className="text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">Pre-set Worksheets</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Ready-made worksheets covering key SHSAT topics and skills.
                  </p>
                  <Button className="w-full">
                    Browse Pre-sets
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50">
                <CardHeader className="text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-ela flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">Customize</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Choose skill tags from all four SHSAT sections and build a worksheet from the question bank.
                  </p>
                  <Button className="w-full" onClick={() => setMode("build")}>
                    Create Custom
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50">
                <CardHeader className="text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-math flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">Generate with AI</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Let AI create personalized worksheets based on your learning goals.
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" disabled>
                      Generate Worksheet
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      This feature is currently under development and will be available in a future update.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Featured Pre-set Worksheets</h2>
                <Button variant="outline">View All</Button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {presetWorksheets.map((worksheet) => (
                  <Card key={worksheet.id} className="group hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant={worksheet.subject === "MATH" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {worksheet.subject}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg leading-tight">{worksheet.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{worksheet.description}</p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <div className="flex items-center">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {worksheet.questionCount} questions
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {worksheet.estimatedTime}
                        </div>
                      </div>

                      <Button className="w-full" size="sm">
                        Start Worksheet
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Worksheets;
