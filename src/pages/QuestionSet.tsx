import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { QuestionsStatus } from "@/components/questions/QuestionsStatus";
import { SessionQuestionRunner } from "@/components/session/SessionQuestionRunner";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestions } from "@/contexts/QuestionsContext";
import { useViewAsStudent } from "@/contexts/ViewAsStudentContext";
import { isQuestionModule } from "@/lib/questionModule";
import {
  isPracticeSetType,
  practiceSetScopeId,
  restoredPracticeQuestions,
} from "@/lib/practiceSetProgress";
import { clearWorksheetProgress, fetchWorksheetProgress } from "@/lib/worksheetProgressService";
import {
  clearWorksheetProgressLocal,
  loadWorksheetProgressLocal,
  pickNewerWorksheetProgress,
  worksheetProgressIsStarted,
  type WorksheetProgressSave,
} from "@/lib/worksheetProgressStorage";
import type { Question, QuestionModule } from "@/types";

async function loadSavedSet(userId: string, scopeId: string): Promise<WorksheetProgressSave | null> {
  const local = loadWorksheetProgressLocal(userId, scopeId);
  try {
    const remote = await fetchWorksheetProgress(userId, scopeId);
    return pickNewerWorksheetProgress(local, remote);
  } catch {
    return local;
  }
}

async function clearSavedSet(userId: string, scopeId: string): Promise<void> {
  clearWorksheetProgressLocal(userId, scopeId);
  try {
    await clearWorksheetProgress(userId, scopeId);
  } catch {
    // Local progress is already cleared. Account cleanup can retry on the next finish.
  }
}

export default function QuestionSet() {
  const { getFilteredQuestions, getQuestionsByIds, loading } = useQuestions();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { viewAs } = useViewAsStudent();
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState<WorksheetProgressSave | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);

  const typeParam = searchParams.get("type");
  const practiceType = isPracticeSetType(typeParam) ? typeParam : null;
  const pinnedIds = useMemo(
    () =>
      (searchParams.get("questionIds") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    [searchParams],
  );
  const resumeRequested = searchParams.get("resume") === "1" && practiceType != null && !viewAs;
  const scopeId = practiceType ? practiceSetScopeId(practiceType) : null;

  useEffect(() => {
    if (!resumeRequested || !profile?.uid || !scopeId) {
      setSaved(null);
      setProgressLoaded(true);
      return;
    }
    let cancelled = false;
    setProgressLoaded(false);
    void loadSavedSet(profile.uid, scopeId).then((next) => {
      if (cancelled) return;
      setSaved(next);
      setProgressLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [resumeRequested, profile?.uid, scopeId]);

  const filteredQuestions = useMemo(() => {
    const modules = (searchParams.get("modules")?.split(",") || searchParams.get("difficulties")?.split(",") || [])
      .map((value) => (value === "hard" ? "2" : value === "easy" || value === "medium" ? "1" : value))
      .filter((value): value is QuestionModule => isQuestionModule(value));
    const countRaw = Number(searchParams.get("count") || "20");
    const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.floor(countRaw) : 20;
    return getFilteredQuestions({
      subjects: searchParams.get("subjects")?.split(",").filter(Boolean) || [],
      modules,
      tagCodes: searchParams.get("tagCodes")?.split(",").filter(Boolean) || [],
    }).slice(0, count);
  }, [getFilteredQuestions, searchParams]);

  const resumedQuestions = useMemo(() => {
    if (!resumeRequested || !saved || !worksheetProgressIsStarted(saved)) return null;
    const catalog = getFilteredQuestions({});
    const byId = new Map(catalog.map((question) => [question.id, question]));
    return restoredPracticeQuestions(saved.questionIds, byId);
  }, [getFilteredQuestions, resumeRequested, saved]);

  const pinnedQuestions = useMemo(
    () => (pinnedIds.length > 0 ? getQuestionsByIds(pinnedIds) : null),
    [getQuestionsByIds, pinnedIds],
  );

  const questionSet: Question[] = resumeRequested
    ? (resumedQuestions ?? [])
    : (pinnedQuestions ?? filteredQuestions);
  const tagCodes = searchParams.get("tagCodes")?.split(",").filter(Boolean) ?? saved?.tagCodes ?? [];

  const finishSet = () => {
    setDone(true);
    if (profile?.uid && scopeId && !viewAs) {
      void clearSavedSet(profile.uid, scopeId);
    }
  };

  if (loading || (resumeRequested && !progressLoaded)) {
    return (
      <div className="min-h-screen">
        <Header />
        <QuestionsStatus />
      </div>
    );
  }

  if (resumeRequested && resumedQuestions == null) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container max-w-lg py-16 text-center">
          <h1 className="font-serif text-2xl font-semibold">No set to resume</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This practice set is no longer saved. Choose topics and a new question count.
          </p>
          <Button className="mt-6" asChild>
            <Link to={practiceType ? `/practice/${practiceType}` : "/practice"}>Choose a new set</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (questionSet.length === 0) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">No questions found</h1>
          <p className="text-muted-foreground mb-6">
            Try a different module or skill.
          </p>
          <Button onClick={() => navigate("/practice")}>Back to practice</Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container max-w-lg py-16 text-center">
          <h1 className="font-serif text-2xl font-semibold">Practice set complete</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Each question showed the answer, explanation, and common trap after you checked it.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/practice">Back to practice</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SessionQuestionRunner
      questions={questionSet}
      sessionTitle={pinnedIds.length > 0 ? "Missed questions" : "Practice set"}
      storageKeyPrefix="practice-set"
      revealAnswers
      finishLabel="Finish practice set"
      notesKind="practice"
      progressKey={
        profile?.uid && scopeId && !viewAs
          ? {
              userId: profile.uid,
              scopeId,
              runSource: "self",
              assignmentId: null,
              title: "Practice set",
              tagCodes,
              tutorUid: null,
            }
          : undefined
      }
      initialProgress={resumeRequested ? saved : null}
      onExit={() => navigate("/practice")}
      onComplete={finishSet}
    />
  );
}
