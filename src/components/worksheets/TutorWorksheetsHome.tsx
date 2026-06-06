import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, ArrowRight, Clock, BookOpen, History } from "lucide-react";
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
    <div className="space-y-14 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
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
              Choose skill tags and assign a custom worksheet to a student.
            </p>
            <Button className="w-full" onClick={onCreateCustom}>
              Create Custom
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Your assignments</h2>
          <p className="text-muted-foreground mt-1">
            Track worksheets you sent and review saved results when students finish.
          </p>
        </div>
        <TutorAssignmentsGrid
          refreshKey={assignmentsRefreshKey}
          onReviewAssignment={onReviewAssignment}
        />
      </section>

      <section>
        <div className="mb-6 flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Student attempt history</h2>
            <p className="text-muted-foreground mt-1">
              Every completed assigned worksheet is saved here for you to review anytime.
            </p>
          </div>
        </div>
        <WorksheetHistoryList
          sessions={historySessions}
          loading={historyLoading}
          emptyMessage="When a student finishes an assigned worksheet, their results will appear here."
          getSessionDetail={sessionStudentDetail}
          onReview={onReviewSession}
        />
      </section>

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
    </div>
  );
}
