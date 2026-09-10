import { Loader2 } from "lucide-react";

import { useQuestions } from "@/contexts/QuestionsContext";

type QuestionsStatusProps = {
  children: React.ReactNode;
  /** When true, render nothing while loading (for inline stats). */
  quiet?: boolean;
};

export function QuestionsStatus({ children, quiet = false }: QuestionsStatusProps) {
  const { loading, error } = useQuestions();

  if (loading) {
    if (quiet) return null;
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading question bank…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-center text-destructive">
        {error}
      </div>
    );
  }

  return <>{children}</>;
}
