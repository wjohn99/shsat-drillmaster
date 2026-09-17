import { useEffect, useMemo, useState } from "react";
import { Plus, ArrowRight, Clock, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TutorAssignmentsGrid } from "./TutorAssignmentsGrid";
import { WorksheetHistoryList } from "./WorksheetHistoryList";
import { fetchPracticeSessionsForTutor } from "@/lib/practiceSessionService";
import { fetchStudents } from "@/lib/assignmentService";
import type { TutorAssignmentRow } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";

interface TutorWorksheetsHomeProps {
  assignmentsRefreshKey: number;
  onCreateCustom: () => void;
  onReviewAssignment: (assignment: TutorAssignmentRow) => void;
  onReviewSession: (session: PracticeSessionRecord) => void;
}

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

export function TutorWorksheetsHome({
  assignmentsRefreshKey,
  onCreateCustom,
  onReviewAssignment,
  onReviewSession,
}: TutorWorksheetsHomeProps) {
  const [historySessions, setHistorySessions] = useState<PracticeSessionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [studentNameByUid, setStudentNameByUid] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const [rows, students] = await Promise.all([
          fetchPracticeSessionsForTutor(),
          fetchStudents(),
        ]);
        if (cancelled) return;
        setHistorySessions(rows);
        setStudentNameByUid(new Map(students.map((s) => [s.uid, s.displayName])));
      } catch {
        if (!cancelled) {
          setHistorySessions([]);
          setStudentNameByUid(new Map());
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentsRefreshKey]);

  const sessionStudentDetail = useMemo(
    () => (session: PracticeSessionRecord) => {
      const name = studentNameByUid.get(session.userId);
      return name ? `Student: ${name}` : undefined;
    },
    [studentNameByUid],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Assign a custom worksheet, or browse pre-sets when they are available.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            Browse pre-sets
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button onClick={onCreateCustom}>
            Assign to student
            <Plus className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="font-serif text-xl font-semibold">Your assignments</h2>
          <p className="text-muted-foreground mt-1">
            Track worksheets you sent and review saved results when students finish.
          </p>
        </div>
        <TutorAssignmentsGrid
          refreshKey={assignmentsRefreshKey}
          onReviewAssignment={onReviewAssignment}
          onCreate={onCreateCustom}
        />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="font-serif text-xl font-semibold">Student attempt history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every completed assigned worksheet is saved here for you to review anytime.
          </p>
        </div>
        <WorksheetHistoryList
          sessions={historySessions}
          loading={historyLoading}
          role="tutor"
          getSessionDetail={sessionStudentDetail}
          onReview={onReviewSession}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">Featured pre-sets</h2>
          <Button variant="outline" size="sm">
            View all
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {presetWorksheets.map((worksheet) => (
            <Card key={worksheet.id}>
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
    </div>
  );
}
