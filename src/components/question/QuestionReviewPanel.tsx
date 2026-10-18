import { useEffect, useMemo, useState } from "react";
import { MessageSquare, PencilLine, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionReviews } from "@/contexts/QuestionReviewContext";
import { canReviewQuestions, isJedReviewer } from "@/lib/questionReviewService";
import { isProvisionalQuestion } from "@/lib/reviewStatus";
import { toast } from "@/hooks/use-toast";
import type { Question } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

function formatReviewDate(ms?: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type QuestionReviewPanelProps = {
  question: Question;
  className?: string;
};

export function QuestionReviewPanel({ question, className }: QuestionReviewPanelProps) {
  const { profile } = useAuth();
  const { states, saveTutorReview, jedFinalApprove, watchQuestion } = useQuestionReviews();
  const state = states.get(question.id);
  const canReview = canReviewQuestions(profile?.role);
  const isJed = isJedReviewer(profile?.email);
  const showPanel = canReview && (isProvisionalQuestion(question) || Boolean(state));

  const myEntry = useMemo(
    () => state?.entries.find((entry) => entry.tutorUid === profile?.uid),
    [profile?.uid, state?.entries],
  );

  const [comment, setComment] = useState("");
  const [suggestedEdits, setSuggestedEdits] = useState("");
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!showPanel) return;
    return watchQuestion(question.id);
  }, [question.id, showPanel, watchQuestion]);

  useEffect(() => {
    setComment(myEntry?.comment ?? "");
    setSuggestedEdits(myEntry?.suggestedEdits ?? "");
  }, [myEntry, question.id]);

  if (!showPanel || !profile) return null;

  const jedApproved = state?.jedApproved === true;
  const reviewerCount = state?.reviewerUids.length ?? 0;
  const otherEntries = (state?.entries ?? []).slice().sort((a, b) => a.updatedAtMs - b.updatedAtMs);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTutorReview({
        questionId: question.id,
        comment,
        suggestedEdits,
      });
      toast({
        title: "Review saved",
        description: "This question moved to Reviewed. Jed gives the final approval.",
      });
    } catch (err) {
      toast({
        title: "Could not save review",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleJedApprove = async () => {
    setApproving(true);
    try {
      await jedFinalApprove(question.id);
      toast({
        title: "Provisional tag removed",
        description: "This question is now marked final.",
      });
    } catch (err) {
      toast({
        title: "Could not approve question",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  const statusBadge = jedApproved ? (
    <Badge variant="outline" className="shrink-0 whitespace-nowrap border-emerald-300 bg-emerald-50 text-emerald-900">
      Final
    </Badge>
  ) : reviewerCount > 0 ? (
    <Badge
      variant="outline"
      className="shrink-0 whitespace-nowrap border-amber-400/80 bg-amber-50 text-amber-900"
    >
      Awaiting Jed
    </Badge>
  ) : (
    <Badge variant="outline" className="shrink-0 whitespace-nowrap">
      Needs a tutor review
    </Badge>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">Tutor review</CardTitle>
            <p className="text-sm text-muted-foreground">
              Save a review to send this to Jed. Comments and suggested edits are optional.
              Only Jed can remove the provisional tag.
            </p>
          </div>
          {statusBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {jedApproved ? (
          <p className="text-sm text-muted-foreground">
            Jed removed the provisional tag
            {state?.jedApprovedAtMs ? ` on ${formatReviewDate(state.jedApprovedAtMs)}` : ""}.
            New tutor reviews are closed.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`review-comment-${question.id}`}>Comments</Label>
              <Textarea
                id={`review-comment-${question.id}`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Notes for other tutors or Jed..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`review-edits-${question.id}`}>Suggested edits</Label>
              <Textarea
                id={`review-edits-${question.id}`}
                value={suggestedEdits}
                onChange={(event) => setSuggestedEdits(event.target.value)}
                placeholder="What should change in the stem, choices, or solution..."
                rows={3}
              />
            </div>
            <Button onClick={() => void handleSave()} disabled={saving} size="sm">
              {saving ? "Saving..." : myEntry ? "Update my review" : "Save my review"}
            </Button>
          </div>
        )}

        {isJed && !jedApproved && (
          <div className="space-y-3 rounded-xl border px-3 py-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Jed final approval removes the provisional tag. You can do this even if no other
                tutor has reviewed the question yet.
              </p>
            </div>
            <Button onClick={() => void handleJedApprove()} disabled={approving} size="sm">
              {approving ? "Approving..." : "Remove provisional tag"}
            </Button>
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Reviews {otherEntries.length > 0 ? `(${otherEntries.length})` : ""}
          </h3>
          {otherEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tutor reviews yet.</p>
          ) : (
            <ul className="space-y-2">
              {otherEntries.map((entry) => (
                <li key={entry.tutorUid} className="space-y-2 rounded-xl border px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {entry.tutorName || entry.tutorEmail}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      Reviewed
                    </Badge>
                    {entry.updatedAtMs > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatReviewDate(entry.updatedAtMs)}
                      </span>
                    )}
                  </div>
                  {entry.comment && (
                    <p className="flex items-start gap-2 text-sm">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{entry.comment}</span>
                    </p>
                  )}
                  {entry.suggestedEdits && (
                    <p className="flex items-start gap-2 text-sm">
                      <PencilLine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>{entry.suggestedEdits}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
