import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "./DashboardShell";

const START_HERE = [
  {
    title: "Question Bank",
    description: "Browse questions by module and skill.",
    to: "/question-bank",
    action: "Browse questions",
  },
  {
    title: "Practice",
    description: "Skill sets by module. Check each answer to see the explanation and common trap.",
    to: "/practice",
    action: "Open practice",
  },
  {
    title: "Diagnostic",
    description: "The full diagnostic is ready to start. No workspace step.",
    to: "/practice/diagnostic",
    action: "Start diagnostic",
  },
];

export function DemoDashboard() {
  return (
    <DashboardShell
      title="Demo"
      subtitle="Diagnostic, practice, and questions for this beta."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {START_HERE.map((item) => (
          <Card key={item.to}>
            <CardHeader>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to={item.to}>
                  {item.action}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
