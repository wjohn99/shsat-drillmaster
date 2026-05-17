import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { questions, allTags, passages } from "@/data/mockData";
import type { Question } from "@/types";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";
import type { WorksheetAssignment } from "@/types/assignment";
import {
  WORKSHEET_SECTIONS,
  buildWorksheetTagCatalog,
  pickWorksheetQuestions,
} from "@/lib/worksheetTagCatalog";
import { openWorksheetPdfInNewTab } from "@/lib/worksheetPdfExport";
import {
  createAssignment,
  fetchStudents,
  markAssignmentCompleted,
  resolveQuestionsByIds,
} from "@/lib/assignmentService";
import { savePracticeSession } from "@/lib/practiceSessionService";
import { SessionQuestionRunner } from "@/components/session/SessionQuestionRunner";
import { SessionResultsDashboard } from "@/components/session/SessionResultsDashboard";
import {
  CustomWorksheetBuilder,
  type WorksheetBuilderVariant,
} from "@/components/worksheets/CustomWorksheetBuilder";
import { TutorWorksheetsHome } from "@/components/worksheets/TutorWorksheetsHome";
import { StudentWorksheetsHome } from "@/components/worksheets/StudentWorksheetsHome";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { StudentOption } from "@/types/assignment";
import type { WorksheetsLocationState } from "@/types/worksheetsNavigation";

type Mode = "home" | "build" | "runner" | "results";
type RunSource = "assignment" | "self" | "tutor-preview";

const Worksheets = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const role = profile?.role;

  const [mode, setMode] = useState<Mode>("home");
  const [buildVariant, setBuildVariant] = useState<WorksheetBuilderVariant>("tutor");
  const [runSource, setRunSource] = useState<RunSource>("tutor-preview");
  const [runKey, setRunKey] = useState(0);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [questionLimit, setQuestionLimit] = useState(10);
  const [worksheetQuestions, setWorksheetQuestions] = useState<Question[]>([]);
  const [sessionEvents, setSessionEvents] = useState<SessionAnalyticsEvent[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<WorksheetAssignment | null>(null);

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentUid, setSelectedStudentUid] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignmentsRefreshKey, setAssignmentsRefreshKey] = useState(0);

  const tagCatalog = useMemo(() => buildWorksheetTagCatalog(allTags, questions), []);

  const toggleTag = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
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
  }, [selectedCodes, selectedSet]);

  const selectedTagLabels = useMemo(() => {
    return selectedCodes.map((code) => {
      for (const sec of WORKSHEET_SECTIONS) {
        const t = tagCatalog[sec.id].find((x) => x.code === code);
        if (t) return t.label;
      }
      return code;
    });
  }, [selectedCodes, tagCatalog]);

  useEffect(() => {
    if (role !== "tutor" || mode !== "build" || buildVariant !== "tutor") return;

    let cancelled = false;
    (async () => {
      setStudentsLoading(true);
      try {
        const list = await fetchStudents();
        if (!cancelled) setStudents(list);
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Could not load students",
            description: err instanceof Error ? err.message : "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, mode, buildVariant]);

  const openTutorBuild = () => {
    setBuildVariant("tutor");
    setActiveAssignment(null);
    setMode("build");
  };

  const openStudentBuild = () => {
    setBuildVariant("student");
    setActiveAssignment(null);
    setMode("build");
  };

  const pickCurrentQuestions = () =>
    pickWorksheetQuestions(questions, selectedSet, questionLimit);

  const startWorksheetRun = (picked?: Question[]) => {
    const next = picked ?? pickCurrentQuestions();
    setWorksheetQuestions(next);
    setRunKey((k) => k + 1);
    setSessionEvents([]);
    setMode("runner");
  };

  const startTutorOrSelfPreview = () => {
    setActiveAssignment(null);
    setRunSource(buildVariant === "student" ? "self" : "tutor-preview");
    startWorksheetRun();
  };

  const startAssignedWorksheet = (assignment: WorksheetAssignment) => {
    const picked = resolveQuestionsByIds(questions, assignment.questionIds);
    if (picked.length === 0) {
      toast({
        title: "Worksheet unavailable",
        description: "None of the assigned questions could be loaded.",
        variant: "destructive",
      });
      return;
    }
    setActiveAssignment(assignment);
    setRunSource("assignment");
    startWorksheetRun(picked);
  };

  useEffect(() => {
    if (authLoading || !profile) return;

    const navState = location.state as WorksheetsLocationState | null;
    if (!navState) return;

    if (navState.openTutorBuild && role === "tutor") {
      openTutorBuild();
    } else if (navState.openStudentBuild && role === "student") {
      openStudentBuild();
    } else if (navState.autoStartAssignment && role === "student") {
      startAssignedWorksheet(navState.autoStartAssignment);
    } else {
      return;
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [authLoading, profile, role, location.state, location.pathname, navigate]);

  const handleAssignToStudent = async () => {
    if (!profile || role !== "tutor") return;
    if (!selectedStudentUid) {
      toast({
        title: "Select a student",
        description: "Choose who should receive this worksheet.",
        variant: "destructive",
      });
      return;
    }

    const picked = pickCurrentQuestions();
    if (picked.length === 0) return;

    setAssigning(true);
    try {
      const title =
        selectedTagLabels.length > 0
          ? `Worksheet: ${selectedTagLabels.slice(0, 2).join(", ")}${selectedTagLabels.length > 2 ? "…" : ""}`
          : "Custom worksheet";

      await createAssignment({
        questionIds: picked.map((q) => q.id),
        tutorUid: profile.uid,
        assignedToStudentUid: selectedStudentUid,
        title,
        tagCodes: selectedCodes,
      });

      const student = students.find((s) => s.uid === selectedStudentUid);
      toast({
        title: "Assignment sent",
        description: student
          ? `${student.displayName} will see this in Active Assignments.`
          : "The student will see this in Active Assignments.",
      });
      setSelectedStudentUid("");
    } catch (err) {
      toast({
        title: "Assignment failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const exportWorksheetPdf = () => {
    const picked = pickCurrentQuestions();
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

  const sessionTitle =
    runSource === "assignment"
      ? activeAssignment?.title ?? "Assigned worksheet"
      : runSource === "self"
        ? "Your practice worksheet"
        : "Custom worksheet";

  const storageKeyPrefix =
    runSource === "assignment" && activeAssignment
      ? `assignment-${activeAssignment.id}`
      : runSource === "self"
        ? `worksheet-self-${profile?.uid ?? "anon"}`
        : "worksheet";

  const exitRunner = () => {
    if (runSource === "assignment") {
      setActiveAssignment(null);
      setMode("home");
    } else {
      setMode("build");
    }
  };

  if (mode === "runner" && worksheetQuestions.length > 0) {
    return (
      <SessionQuestionRunner
        key={runKey}
        questions={worksheetQuestions}
        sessionTitle={sessionTitle}
        storageKeyPrefix={storageKeyPrefix}
        onExit={exitRunner}
        onComplete={async (events) => {
          setSessionEvents(events);

          if (runSource === "assignment" || runSource === "self") {
            try {
              await savePracticeSession({
                sessionType: runSource === "assignment" ? "assignment" : "self",
                title: sessionTitle,
                tagCodes:
                  runSource === "assignment"
                    ? (activeAssignment?.tagCodes ?? [])
                    : selectedCodes,
                questionIds: worksheetQuestions.map((q) => q.id),
                events,
                assignmentId: activeAssignment?.id ?? null,
                tutorUid:
                  runSource === "assignment" ? (activeAssignment?.tutorUid ?? null) : null,
              });
            } catch (err) {
              toast({
                title: "Could not save practice results",
                description: err instanceof Error ? err.message : "Please try again.",
                variant: "destructive",
              });
            }
          }

          if (
            runSource === "assignment" &&
            activeAssignment &&
            activeAssignment.status === "todo"
          ) {
            try {
              await markAssignmentCompleted(activeAssignment.id);
              setAssignmentsRefreshKey((k) => k + 1);
            } catch (err) {
              toast({
                title: "Could not save completion",
                description: err instanceof Error ? err.message : "Please try again.",
                variant: "destructive",
              });
            }
          }
          setMode("results");
        }}
      />
    );
  }

  const resultsTitle =
    runSource === "assignment"
      ? "Assignment complete"
      : runSource === "self"
        ? "Practice complete"
        : "Worksheet complete";

  const backFromResults = () => {
    if (runSource === "assignment") {
      setActiveAssignment(null);
      setMode("home");
    } else if (runSource === "self") {
      setActiveAssignment(null);
      setMode("build");
    } else {
      setActiveAssignment(null);
      setMode("build");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8">
        {mode === "results" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <Button variant="ghost" onClick={backFromResults}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {runSource === "assignment" ? "Back to worksheets" : "Back to builder"}
            </Button>
            <SessionResultsDashboard
              title={resultsTitle}
              events={sessionEvents}
              summaryMetrics={[
                { label: "Questions answered", value: sessionEvents.length },
                { label: "Correct", value: worksheetCorrect },
                { label: "Accuracy", value: `${worksheetAccuracyPct}%` },
              ]}
              footnote={
                runSource === "self"
                  ? "Self-practice results are for your review only — not shared with your tutor."
                  : "Statistics use your answers and time on each question in this worksheet."
              }
              footerActions={
                role === "tutor" ? (
                  <>
                    <Button variant="outline" onClick={() => setMode("build")}>
                      Edit tags
                    </Button>
                    <Button onClick={startTutorOrSelfPreview}>New worksheet (same tags)</Button>
                  </>
                ) : runSource === "self" ? (
                  <>
                    <Button variant="outline" onClick={() => setMode("home")}>
                      Back to worksheets
                    </Button>
                    <Button onClick={startTutorOrSelfPreview}>Practice again</Button>
                  </>
                ) : (
                  <Button onClick={backFromResults}>Back to worksheets</Button>
                )
              }
            />
          </div>
        )}

        {mode === "build" && (role === "tutor" || role === "student") && (
          <div className="mb-12 max-w-6xl mx-auto">
            <Button
              variant="ghost"
              className="mb-6"
              onClick={() => {
                setActiveAssignment(null);
                setMode("home");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">
                {buildVariant === "student"
                  ? "Create your own practice"
                  : "Create custom worksheet"}
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                {buildVariant === "student"
                  ? "Pick skill tags and start a worksheet whenever you want to practice."
                  : "Pick skill tags, preview the worksheet, and assign it to a student."}
              </p>
            </div>

            <CustomWorksheetBuilder
              variant={buildVariant}
              selectedCodes={selectedCodes}
              questionLimit={questionLimit}
              tagCatalog={tagCatalog}
              matchingCount={matchingCount}
              onToggleTag={toggleTag}
              onQuestionLimitChange={setQuestionLimit}
              onClearTags={() => setSelectedCodes([])}
              onStart={startTutorOrSelfPreview}
              onExportPdf={exportWorksheetPdf}
              students={students}
              studentsLoading={studentsLoading}
              selectedStudentUid={selectedStudentUid}
              onStudentChange={setSelectedStudentUid}
              assigning={assigning}
              onAssign={handleAssignToStudent}
            />
          </div>
        )}

        {mode === "home" && (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Worksheets</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {role === "tutor"
                  ? "Create and assign focused practice sessions for your students."
                  : role === "student"
                    ? "Complete tutor assignments and build your own practice anytime."
                    : "Sign in to create or receive assigned worksheets."}
              </p>
            </div>

            {authLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !profile ? (
              <Card className="max-w-lg mx-auto border-dashed">
                <CardContent className="py-10 text-center space-y-4">
                  <p className="text-muted-foreground">
                    Sign in to access role-based worksheet tools.
                  </p>
                  <Button asChild>
                    <Link to="/login">Sign in with Google</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : role === "tutor" ? (
              <TutorWorksheetsHome onCreateCustom={openTutorBuild} />
            ) : (
              <StudentWorksheetsHome
                assignmentsRefreshKey={assignmentsRefreshKey}
                onStartAssignment={startAssignedWorksheet}
                onCreateCustomPractice={openStudentBuild}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Worksheets;
