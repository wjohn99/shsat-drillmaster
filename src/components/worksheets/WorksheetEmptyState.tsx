import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type EmptyKind = "worksheet" | "results";
type EmptyRole = "tutor" | "student";

const COPY: Record<EmptyKind, { title: string; tutor: string; student: string }> = {
  worksheet: {
    title: "No worksheet yet",
    tutor: "Create one",
    student: "Your tutor hasn’t assigned one.",
  },
  results: {
    title: "No results yet",
    tutor: "A student hasn’t completed one yet.",
    student: "Finish a worksheet to see them here.",
  },
};

interface WorksheetEmptyStateProps {
  kind?: EmptyKind;
  role: EmptyRole;
  onCreate?: () => void;
}

export function WorksheetEmptyState({
  kind = "worksheet",
  role,
  onCreate,
}: WorksheetEmptyStateProps) {
  const copy = COPY[kind];

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-2 py-10 text-center">
        <p className="font-medium">{copy.title}</p>
        <p className="text-sm text-muted-foreground">
          {role === "tutor" ? copy.tutor : copy.student}
        </p>
        {kind === "worksheet" && role === "tutor" && onCreate ? (
          <Button onClick={onCreate}>Create one</Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
