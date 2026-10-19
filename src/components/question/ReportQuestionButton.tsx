import { useEffect, useState } from "react";
import { CircleAlert } from "lucide-react";
import { useQuestionReports } from "@/contexts/QuestionReportsContext";
import { toast } from "@/hooks/use-toast";
import { QUESTION_REPORT_COMMENT_MAX, QUESTION_REPORT_REASONS } from "@/types/questionReport";
import type { QuestionReportReason, QuestionReportSource } from "@/types/questionReport";
import type { Question } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ReportQuestionButtonProps = {
  question: Question;
  source: QuestionReportSource;
  compact?: boolean;
  className?: string;
};

export function ReportQuestionButton({
  question,
  source,
  className,
}: ReportQuestionButtonProps) {
  const { canReport, submitReport, loadMyReport } = useQuestionReports();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<QuestionReportReason>("wrong_answer");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  useEffect(() => {
    if (!open || !canReport) return;
    let cancelled = false;
    void loadMyReport(question.id).then((report) => {
      if (cancelled || !report) return;
      setAlreadyReported(report.status === "open");
      setReason(report.reason);
      setComment(report.comment);
    });
    return () => {
      cancelled = true;
    };
  }, [canReport, loadMyReport, open, question.id]);

  if (!canReport) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await submitReport({
        questionId: question.id,
        reason,
        comment,
        source,
        contentVersion: question.contentVersion,
      });
      setAlreadyReported(true);
      setOpen(false);
      toast({
        title: alreadyReported ? "Report updated" : "Report sent",
        description: "Tutors can see this on the question. Thank you.",
      });
    } catch (err) {
      toast({
        title: "Could not send report",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(className)}
        aria-label="Report this question"
        onClick={() => setOpen(true)}
      >
        <CircleAlert className="h-4 w-4 mr-2" />
        Report
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent overlayClassName="bg-black/40 backdrop-blur-none" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report this question</DialogTitle>
            <DialogDescription>
              {alreadyReported
                ? "You already reported this item. You can update your note."
                : "Tell us what is wrong. Tutors will see this on the question."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What is wrong?</Label>
              <RadioGroup
                value={reason}
                onValueChange={(value) => setReason(value as QuestionReportReason)}
                className="gap-2"
              >
                {QUESTION_REPORT_REASONS.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={item.id} id={`report-${question.id}-${item.id}`} />
                    <Label
                      htmlFor={`report-${question.id}-${item.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {item.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`report-comment-${question.id}`}>Details</Label>
              <Textarea
                id={`report-comment-${question.id}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={QUESTION_REPORT_COMMENT_MAX}
                rows={4}
                placeholder="What did you see? Include the choice letter if the key looks wrong."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving || comment.trim().length === 0}
            >
              {saving ? "Sending…" : alreadyReported ? "Update report" : "Send report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
