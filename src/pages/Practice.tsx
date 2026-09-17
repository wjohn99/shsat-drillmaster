import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight } from "lucide-react";
import { SHSAT_DIAGNOSTIC_SPEC } from "@/data/shsatDiagnosticForm";
import { assembleDiagnosticExam } from "@/lib/shsatDiagnostic";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPracticeSessionsForStudent } from "@/lib/practiceSessionService";
import { assignToStudentNavState } from "@/types/worksheetsNavigation";
import type { PracticeSessionRecord } from "@/types/practiceSession";

const Practice = () => {
  const { profile } = useAuth();
  const isTutor = profile?.role === "tutor";
  const diagnostic = useMemo(() => assembleDiagnosticExam(), []);
  const [diagnosticSessions, setDiagnosticSessions] = useState<PracticeSessionRecord[]>([]);

  useEffect(() => {
    if (!profile) return;
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
  }, [profile]);

  const practiceTypes = [
    {
      id: "reading-comprehension",
      title: "Reading Comprehension",
      description: "Adaptive practice with reading passages from various subjects",
      subject: "ELA",
      features: ["8 Different Passages", "Module 1 & 2 Practice", "Instant Feedback"],
      estimatedTime: "45–60 min",
    },
    {
      id: "revising-editing-a",
      title: "Revising & Editing Part A",
      description: "Grammar, punctuation, and sentence structure practice",
      subject: "ELA",
      features: ["Grammar Rules", "Punctuation", "Sentence Structure"],
      estimatedTime: "30–40 min",
    },
    {
      id: "revising-editing-b",
      title: "Revising & Editing Part B",
      description: "Organization, clarity, and writing improvement",
      subject: "ELA",
      features: ["Text Organization", "Clarity & Style", "Writing Flow", "Sentence Structure"],
      estimatedTime: "35–45 min",
    },
    {
      id: "math",
      title: "Math",
      description: "Comprehensive math practice across all SHSAT topics",
      subject: "MATH",
      features: ["Algebra", "Geometry", "Data Analysis", "Applied Math"],
      estimatedTime: "50–70 min",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container py-8">
        <PageHeader
          title="Practice"
          description="Start with a full SHSAT diagnostic, then drill weaker skills in shorter sessions."
          actions={
            isTutor ? (
              <Button asChild>
                <Link to="/worksheets" state={assignToStudentNavState()}>
                  Assign to student
                </Link>
              </Button>
            ) : null
          }
        />

        <Card className="mb-10">
          <CardHeader className="gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {SHSAT_DIAGNOSTIC_SPEC.testSeason}
              </p>
              <CardTitle className="mt-1 text-xl">{SHSAT_DIAGNOSTIC_SPEC.name}</CardTitle>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                50 ELA + 50 Math · {SHSAT_DIAGNOSTIC_SPEC.standardMinutes} minutes · choose your
                first section · no answers until you submit. Matches Fall 2026 timing and navigation.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Form loaded: {diagnostic.elaReady}/{SHSAT_DIAGNOSTIC_SPEC.elaCount} ELA ·{" "}
                {diagnostic.mathReady}/{SHSAT_DIAGNOSTIC_SPEC.mathCount} Math
                {diagnostic.isComplete
                  ? " · ready to launch"
                  : " · preview until the full form is imported"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Button asChild>
                <Link to="/practice/diagnostic">
                  Open diagnostic
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {diagnosticSessions.length === 1 ? (
                <Button variant="outline" asChild>
                  <Link to="/practice/diagnostic" state={{ reviewSession: diagnosticSessions[0] }}>
                    View results
                  </Link>
                </Button>
              ) : diagnosticSessions.length > 1 ? (
                <>
                  <Button variant="outline" asChild>
                    <Link
                      to="/practice/diagnostic"
                      state={{
                        reviewSession: [...diagnosticSessions].sort(
                          (a, b) =>
                            (a.completedAt?.toMillis?.() ?? 0) - (b.completedAt?.toMillis?.() ?? 0),
                        )[0],
                      }}
                    >
                      View first diagnostic
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link
                      to="/practice/diagnostic"
                      state={{ reviewSession: diagnosticSessions[0] }}
                    >
                      View latest results
                    </Link>
                  </Button>
                </>
              ) : null}
            </div>
          </CardHeader>
        </Card>

        <h2 className="mb-4 font-serif text-xl font-semibold">Skill practice</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {practiceTypes.map((type) => (
            <Card key={type.id} className="flex h-full flex-col">
              <CardHeader>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {type.subject}
                </p>
                <CardTitle className="mt-1 text-lg">{type.title}</CardTitle>
                <p className="text-sm leading-relaxed text-muted-foreground">{type.description}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex min-h-0 flex-1 flex-col">
                    <h4 className="mb-2 text-sm font-medium">Practice areas</h4>
                    <div className="flex flex-wrap content-start gap-2">
                      {type.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-2 h-4 w-4 shrink-0" />
                      Estimated time: {type.estimatedTime}
                    </div>
                    <Button className="w-full" asChild>
                      <Link to={`/practice/${type.id}`}>
                        Start practice
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Practice;
