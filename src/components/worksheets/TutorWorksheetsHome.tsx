import { useEffect, useMemo, useRef, useState } from "react";
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
import type { WorksheetPreset } from "@/data/worksheetPresets";

interface TutorWorksheetsHomeProps {
  assignmentsRefreshKey: number;
  presets: WorksheetPreset[];
  onCreateCustom: () => void;
  onAssignPreset: (preset: WorksheetPreset) => void;
  onPreviewPreset: (preset: WorksheetPreset) => void;
  onReviewAssignment: (assignment: TutorAssignmentRow) => void;
  onPrintAssignment: (assignment: TutorAssignmentRow) => void;
  onReviewSession: (session: PracticeSessionRecord) => void;
}

export function TutorWorksheetsHome({
  assignmentsRefreshKey,
  presets,
  onCreateCustom,
  onAssignPreset,
  onPreviewPreset,
  onReviewAssignment,
  onPrintAssignment,
  onReviewSession,
}: TutorWorksheetsHomeProps) {
  const presetsRef = useRef<HTMLElement>(null);
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

  const scrollToPresets = () => {
    presetsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Assign a custom worksheet, or send a pre-set built from the question bank.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={scrollToPresets}>
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
          onPrintAssignment={onPrintAssignment}
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

      <section id="worksheet-presets" ref={presetsRef} className="scroll-mt-24">
        <div className="mb-4">
          <h2 className="font-serif text-xl font-semibold">Pre-set worksheets</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ready-made sets from the current question bank. Assign one to a student, or
            preview it first.
          </p>
        </div>

        {presets.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No pre-sets yet. Add tagged questions to the bank and they will show up here.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {presets.map((worksheet) => (
              <Card key={worksheet.id}>
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
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
                  <p className="mb-4 text-sm text-muted-foreground">{worksheet.description}</p>
                  <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <BookOpen className="mr-1 h-3 w-3" />
                      {worksheet.questionCount} questions
                    </div>
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {worksheet.estimatedMinutes} min
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      size="sm"
                      onClick={() => onPreviewPreset(worksheet)}
                    >
                      Preview
                    </Button>
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={() => onAssignPreset(worksheet)}
                    >
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
