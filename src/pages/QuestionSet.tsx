import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { QuestionsStatus } from "@/components/questions/QuestionsStatus";
import { SessionQuestionRunner } from "@/components/session/SessionQuestionRunner";
import { useQuestions } from "@/contexts/QuestionsContext";
import { isQuestionModule } from "@/lib/questionModule";
import type { QuestionModule } from "@/types";

export default function QuestionSet() {
  const { getFilteredQuestions, loading } = useQuestions();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  const questionSet = useMemo(() => {
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <QuestionsStatus />
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
      sessionTitle="Practice set"
      storageKeyPrefix="practice-set"
      revealAnswers
      finishLabel="Finish practice set"
      onExit={() => navigate("/practice")}
      onComplete={() => setDone(true)}
    />
  );
}
