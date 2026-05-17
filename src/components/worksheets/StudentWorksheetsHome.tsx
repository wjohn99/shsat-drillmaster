import { ArrowRight, BookOpen, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentAssignmentsGrid } from "./StudentAssignmentsGrid";
import type { WorksheetAssignment } from "@/types/assignment";

interface StudentWorksheetsHomeProps {
  assignmentsRefreshKey: number;
  onStartAssignment: (assignment: WorksheetAssignment) => void;
  onCreateCustomPractice: () => void;
}

export function StudentWorksheetsHome({
  assignmentsRefreshKey,
  onStartAssignment,
  onCreateCustomPractice,
}: StudentWorksheetsHomeProps) {
  return (
    <div className="space-y-14 max-w-6xl mx-auto">
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Active Assignments</h2>
          <p className="text-muted-foreground mt-1">
            Worksheets from your tutor — complete these when assigned.
          </p>
        </div>
        <StudentAssignmentsGrid
          refreshKey={assignmentsRefreshKey}
          onStartAssignment={onStartAssignment}
        />
      </section>

      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Practice on your own</h2>
          <p className="text-muted-foreground mt-1">
            Build a custom worksheet anytime. Self-practice is private and not graded by your
            tutor.
          </p>
        </div>

        <Card className="max-w-md border-2 hover:border-primary/40 transition-colors hover:shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="h-14 w-14 rounded-full bg-gradient-ela flex items-center justify-center mx-auto mb-3">
              <Plus className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-xl">Create custom practice</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Pick skill tags from all four SHSAT sections and practice at your own pace.
            </p>
            <Button className="w-full" onClick={onCreateCustomPractice}>
              <BookOpen className="h-4 w-4 mr-2" />
              Build worksheet
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
