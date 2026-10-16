import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { isProvisionalQuestion } from "@/lib/reviewStatus";
import { cn } from "@/lib/utils";
import type { Question } from "@/types";

type ProvisionalBadgeProps = {
  question: Question;
  className?: string;
};

export function ProvisionalBadge({ question, className }: ProvisionalBadgeProps) {
  const { profile } = useAuth();
  if (profile?.role !== "tutor" || !isProvisionalQuestion(question)) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-400/80 bg-amber-50 text-[10px] font-semibold uppercase tracking-wide text-amber-900",
        className,
      )}
      title="Under review."
    >
      Provisional
    </Badge>
  );
}
