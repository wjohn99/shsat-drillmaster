import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionReviews } from "@/contexts/QuestionReviewContext";
import { canReviewQuestions } from "@/lib/questionReviewService";
import { isProvisionalQuestion, needsJedApproval } from "@/lib/reviewStatus";
import { cn } from "@/lib/utils";
import type { Question } from "@/types";

type ProvisionalBadgeProps = {
  question: Question;
  className?: string;
};

export function ProvisionalBadge({ question, className }: ProvisionalBadgeProps) {
  const { profile } = useAuth();
  const { states } = useQuestionReviews();
  if (!canReviewQuestions(profile?.role) || !isProvisionalQuestion(question)) return null;
  const awaitingJed = needsJedApproval(question, states.get(question.id));
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-400/80 bg-amber-50 text-[10px] font-semibold uppercase tracking-wide text-amber-900",
        className,
      )}
      title={awaitingJed ? "A tutor reviewed this. Waiting on Jed." : "Under review."}
    >
      {awaitingJed ? "Awaiting Jed" : "Provisional"}
    </Badge>
  );
}
