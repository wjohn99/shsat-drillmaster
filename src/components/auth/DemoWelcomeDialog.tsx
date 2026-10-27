import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dismissDemoWelcome, isDemoWelcomePending } from "@/lib/authService";

const WELCOME_TEXT =
  "Welcome to DrillMaster, and thanks for being a founding tutor. Find targeted SHSAT practice with questions and explanations written and reviewed by tutors. Start with a diagnostic or practice set. Modules 1 and 2 are our beta structure; we'll refine it as we learn from the adaptive test and your feedback. Try it yourself before using it with students, and tell us what would make it more useful.";

export function DemoWelcomeDialog({ onDismiss }: { onDismiss?: () => void }) {
  const [open, setOpen] = useState(isDemoWelcomePending);

  const close = () => {
    dismissDemoWelcome();
    setOpen(false);
    onDismiss?.();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-w-3xl gap-6 p-10">
        <DialogHeader className="space-y-5 pr-10">
          <DialogTitle className="text-3xl">Welcome</DialogTitle>
          <DialogDescription className="text-left text-lg leading-8 text-foreground">
            {WELCOME_TEXT}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button size="lg" className="h-12 px-8 text-base" onClick={close}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
