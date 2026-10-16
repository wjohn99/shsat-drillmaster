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
  "Welcome, and thank you for helping us test this beta. You're one of our first founding tutors. We've spent a long time building this resource for tutors, and our questions are written and reviewed by tutors. Start with the diagnostic or try a practice set. Questions are split into Module 1 and Module 2 for now. Before you share anything with a student, please test it yourself first.";

export function DemoWelcomeDialog() {
  const [open, setOpen] = useState(isDemoWelcomePending);

  const close = () => {
    dismissDemoWelcome();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Welcome</DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed text-foreground">
            {WELCOME_TEXT}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={close}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
