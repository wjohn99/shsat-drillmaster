import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectStripe } from "@/components/question/SubjectStripe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/status/StatusPill";
import { ArrowRight } from "lucide-react";
import { SHSAT_DIAGNOSTIC_SPEC } from "@/data/shsatDiagnosticForm";
import { diagnosticAssignmentStatusLine } from "@/lib/diagnosticAccess";
import { fetchDiagnosticProgress } from "@/lib/diagnosticProgressService";
import type { DiagnosticExamSave } from "@/lib/diagnosticExamStorage";
import {
  diagnosticResultButtonLabel,
  diagnosticSessionsByDate,
} from "@/lib/diagnosticResultLabel";
import { assembleDiagnosticExam, diagnosticResumePlace } from "@/lib/shsatDiagnostic";
import {
  PINNED_PRACTICE_SCOPE_ID,
  PRACTICE_SET_TYPE_IDS,
  practiceSetIsResumable,
  practiceSetScopeId,
  unfinishedSetLabel,
  type PracticeSetTypeId,
} from "@/lib/practiceSetProgress";
import { fetchWorkspaceBoard } from "@/lib/workspaceService";
import { fetchWorksheetProgressForUser } from "@/lib/worksheetProgressService";
import {
  loadWorksheetProgressLocal,
  pickNewerWorksheetProgress,
  type WorksheetProgressSave,
} from "@/lib/worksheetProgressStorage";
import { practiceMissedQuestionsHref } from "@/lib/diagnosticSubmitCheck";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAsStudent } from "@/contexts/ViewAsStudentContext";
import { loadTutorVisibleStudentView } from "@/lib/studentView";
import { fetchPracticeSessionsForStudent } from "@/lib/practiceSessionService";
import type { PracticeSessionRecord } from "@/types/practiceSession";

const Practice = () => {
  const { profile } = useAuth();
  const { viewAs } = useViewAsStudent();
  const isTutor = (profile?.role === "tutor" || profile?.role === "demo") && !viewAs;
  const diagnostic = useMemo(() => assembleDiagnosticExam(), []);
  const [diagnosticSessions, setDiagnosticSessions] = useState<PracticeSessionRecord[]>([]);
  const [diagnosticAssigned, setDiagnosticAssigned] = useState(isTutor);
  const [diagnosticInProgress, setDiagnosticInProgress] = useState(false);
  const [diagnosticSave, setDiagnosticSave] = useState<DiagnosticExamSave | null>(null);
  const [diagnosticAccessLoaded, setDiagnosticAccessLoaded] = useState(isTutor);
  const [practiceProgress, setPracticeProgress] = useState<
    Partial<Record<PracticeSetTypeId, WorksheetProgressSave>>
  >({});
  const [pinnedProgress, setPinnedProgress] = useState<WorksheetProgressSave | null>(null);

  useEffect(() => {
    if (!profile || viewAs) return;
    let cancelled = false;
    void fetchPracticeSessionsForStudent(["diagnostic"])
      .then((rows) => {
        if (!cancelled) setDiagnosticSessions(rows);
      })
      .catch(() => {
        if (!cancelled) setDiagnosticSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [profile, viewAs]);

  const accountUid = profile?.uid;
  const accountRole = profile?.role;
  useEffect(() => {
    if (!accountUid) return;
    if (viewAs) {
      let cancelled = false;
      setDiagnosticAccessLoaded(false);
      void loadTutorVisibleStudentView(viewAs.uid).then((visible) => {
        if (cancelled) return;
        setDiagnosticAssigned(Boolean(visible.board?.diagnosticAssigned));
        setDiagnosticInProgress(visible.diagnosticInProgress);
        setDiagnosticSave(null);
        setDiagnosticSessions(
          visible.sessions.filter((session) => session.sessionType === "diagnostic"),
        );
        setDiagnosticAccessLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }
    if (accountRole === "tutor" || accountRole === "demo") {
      setDiagnosticAssigned(true);
      setDiagnosticAccessLoaded(true);
      return;
    }
    let cancelled = false;
    setDiagnosticAccessLoaded(false);
    void Promise.all([
      fetchWorkspaceBoard(accountUid).catch(() => null),
      fetchDiagnosticProgress(accountUid).catch(() => null),
    ]).then(([board, progress]) => {
      if (cancelled) return;
      setDiagnosticAssigned(Boolean(board?.diagnosticAssigned));
      setDiagnosticInProgress(Boolean(progress));
      setDiagnosticSave(progress);
      setDiagnosticAccessLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [accountUid, accountRole, viewAs]);

  useEffect(() => {
    if (!profile?.uid || viewAs) {
      setPracticeProgress({});
      setPinnedProgress(null);
      return;
    }
    const userId = profile.uid;
    let cancelled = false;
    void fetchWorksheetProgressForUser(userId)
      .catch(() => [])
      .then((rows) => {
        if (cancelled) return;
        const next: Partial<Record<PracticeSetTypeId, WorksheetProgressSave>> = {};
        for (const type of PRACTICE_SET_TYPE_IDS) {
          const scopeId = practiceSetScopeId(type);
          const remote = rows.find((save) => save.scopeId === scopeId) ?? null;
          const save = pickNewerWorksheetProgress(
            loadWorksheetProgressLocal(userId, scopeId),
            remote,
          );
          if (practiceSetIsResumable(save)) next[type] = save;
        }
        const pinnedRemote = rows.find((save) => save.scopeId === PINNED_PRACTICE_SCOPE_ID) ?? null;
        const pinned = pickNewerWorksheetProgress(
          loadWorksheetProgressLocal(userId, PINNED_PRACTICE_SCOPE_ID),
          pinnedRemote,
        );
        setPinnedProgress(practiceSetIsResumable(pinned) ? pinned : null);
        setPracticeProgress(next);
      });
    return () => {
      cancelled = true;
    };
  }, [profile, viewAs]);

  const canStartDiagnostic = isTutor || (!viewAs && diagnosticAssigned);
  const diagnosticPlace =
    !viewAs && diagnosticSave ? diagnosticResumePlace(diagnostic, diagnosticSave) : null;
  const studentDiagnosticStatus =
    !viewAs && !isTutor && diagnosticAccessLoaded
      ? diagnosticAssignmentStatusLine(diagnosticAssigned, diagnosticInProgress)
      : null;
  const datedDiagnostics =
    diagnosticSessions.length > 1 ? diagnosticSessionsByDate(diagnosticSessions) : [];

  const practiceTypes: {
    id: PracticeSetTypeId;
    title: string;
    description: string;
    subject: "ELA" | "MATH";
    features: string[];
  }[] = [
    {
      id: "reading-comprehension",
      title: "Reading Comprehension",
      description: "Choose passage skills and a module, then set how many questions.",
      subject: "ELA",
      features: ["Main idea", "Inference", "Evidence", "Vocabulary"],
    },
    {
      id: "revising-editing-a",
      title: "Revising & Editing Part A",
      description: "Choose grammar and punctuation skills, then set how many questions.",
      subject: "ELA",
      features: ["Sentence structure", "Agreement", "Punctuation"],
    },
    {
      id: "revising-editing-b",
      title: "Revising & Editing Part B",
      description: "Choose organization and word choice skills, then set how many questions.",
      subject: "ELA",
      features: ["Word choice", "Organization", "Clarity"],
    },
    {
      id: "math",
      title: "Math",
      description: "Choose math topics, or leave them open, then set how many questions.",
      subject: "MATH",
      features: ["Arithmetic", "Algebra", "Geometry", "Data"],
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container py-8">
        <PageHeader
          title="Practice"
          description={
            viewAs
              ? `Practice as ${viewAs.displayName} sees it. Submitted diagnostic results stay available. Starting a set is turned off.`
              : isTutor
              ? "Start with a full SHSAT diagnostic, then drill weaker skills in shorter sessions."
              : "The SHSAT diagnostic stays listed here. Your tutor assigns it before you can start. Skill practice below is open anytime."
          }
        />

        <Card className="mb-10" data-tour="diagnostic-card">
          <CardHeader className="gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-muted-foreground">
                {SHSAT_DIAGNOSTIC_SPEC.testSeason}
              </p>
              <CardTitle className="mt-1 text-xl">{SHSAT_DIAGNOSTIC_SPEC.name}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                50 ELA, 50 Math, {SHSAT_DIAGNOSTIC_SPEC.standardMinutes} minutes
              </p>
              {diagnostic.isComplete ? null : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {diagnostic.elaReady}/{SHSAT_DIAGNOSTIC_SPEC.elaCount} ELA ·{" "}
                  {diagnostic.mathReady}/{SHSAT_DIAGNOSTIC_SPEC.mathCount} Math loaded
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              {viewAs ? (
                <>
                  {diagnosticAccessLoaded ? (
                    <StatusPill
                      tone={
                        diagnosticSessions.length > 0
                          ? "finished"
                          : diagnosticAssigned
                            ? "progress"
                            : "neutral"
                      }
                    >
                      {diagnosticSessions.length > 0
                        ? "Finished"
                        : diagnosticAssigned
                          ? "Assigned"
                          : "Not assigned"}
                    </StatusPill>
                  ) : null}
                  <p className="max-w-xs text-sm text-muted-foreground">
                    {!diagnosticAccessLoaded
                      ? "Checking whether this diagnostic is assigned."
                      : diagnosticSessions.length > 0
                        ? "Open the submitted results below."
                        : diagnosticAssigned
                          ? "The diagnostic is assigned. Results show here after they submit."
                          : "The diagnostic is not assigned yet."}
                  </p>
                </>
              ) : !diagnosticAccessLoaded && !isTutor ? (
                <p className="max-w-xs text-sm text-muted-foreground">
                  Checking whether this diagnostic is assigned.
                </p>
              ) : (
                <>
                  {studentDiagnosticStatus ? (
                    <>
                      <StatusPill tone={diagnosticInProgress || diagnosticAssigned ? "progress" : "neutral"}>
                        {diagnosticInProgress ? "In progress" : diagnosticAssigned ? "Assigned" : "Not assigned"}
                      </StatusPill>
                      <p className="max-w-xs text-sm text-muted-foreground">
                        {studentDiagnosticStatus}
                        {diagnosticPlace ? ` Saved at ${diagnosticPlace}.` : ""}
                      </p>
                    </>
                  ) : null}
                  {diagnosticInProgress ? (
                    <Button asChild>
                      <Link to="/practice/diagnostic">
                        Resume diagnostic
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : canStartDiagnostic ? (
                    <Button asChild>
                      <Link to="/practice/diagnostic">
                        Open diagnostic
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled>
                      Open diagnostic
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              {viewAs || !isTutor ? null : (
                <p className="max-w-xs text-sm text-muted-foreground">
                  Students can see this here, and can start it only after you assign it on their
                  workspace board.
                </p>
              )}
              {diagnosticSessions.length === 1 ? (
                <Button variant="outline" asChild>
                  <Link to="/practice/diagnostic" state={{ reviewSession: diagnosticSessions[0] }}>
                    View results
                  </Link>
                </Button>
              ) : datedDiagnostics.length > 0 ? (
                datedDiagnostics.map((session) => (
                  <Button key={session.id} variant="outline" asChild>
                    <Link to="/practice/diagnostic" state={{ reviewSession: session }}>
                      {diagnosticResultButtonLabel(session, datedDiagnostics)}
                    </Link>
                  </Button>
                ))
              ) : null}
            </div>
          </CardHeader>
        </Card>

        {pinnedProgress ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Missed questions</CardTitle>
              <p className="text-sm text-muted-foreground">
                {unfinishedSetLabel(
                  pinnedProgress.currentQuestionIndex,
                  pinnedProgress.questionIds.length,
                )}
              </p>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to={practiceMissedQuestionsHref(pinnedProgress.questionIds)}>
                  Resume
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="mb-4">
          <h2 className="font-serif text-xl font-semibold">Skill practice</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose topics and how many questions. An unfinished set stays on the card.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {practiceTypes.map((type) => {
            const unfinished = practiceProgress[type.id];
            return (
            <Card key={type.id} className="relative flex h-full flex-col overflow-hidden">
              <SubjectStripe subject={type.subject} />
              <CardHeader>
                <p className="text-sm font-medium text-muted-foreground">
                  {type.subject}
                </p>
                <CardTitle className="mt-1 text-lg">{type.title}</CardTitle>
                <p className="text-sm leading-relaxed text-muted-foreground">{type.description}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex min-h-0 flex-1 flex-col">
                    <h4 className="mb-2 text-sm font-medium">Topics</h4>
                    <div className="flex flex-wrap content-start gap-2">
                      {type.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-sm font-normal">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                      {unfinished
                        ? unfinishedSetLabel(
                            unfinished.currentQuestionIndex,
                            unfinished.questionIds.length,
                          )
                        : "Next: topics, module, and set size."}
                    </p>
                    {viewAs ? (
                      <Button className="w-full" disabled>
                        Start practice
                      </Button>
                    ) : unfinished ? (
                      <>
                        <Button className="w-full" asChild>
                          <Link to={`/practice-set?type=${type.id}&resume=1`}>
                            Resume
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button className="w-full" variant="outline" asChild>
                          <Link to={`/practice/${type.id}`}>New set</Link>
                        </Button>
                      </>
                    ) : (
                      <Button className="w-full" asChild>
                        <Link to={`/practice/${type.id}`}>
                          Start practice
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Practice;
