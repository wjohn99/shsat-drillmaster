import { assignToStudentNavState, type WorksheetsLocationState } from "@/types/worksheetsNavigation";

export type DemoTutorialReveal = "roadmap" | "session-card";

export interface DemoTutorialStep {
  id: string;
  /** A path, or "first-sample-board" for the first sample student. */
  route: string;
  target: string;
  title: string;
  body: string;
  /** Control to click on the current screen before this step's page opens. */
  via?: string;
  /** Used when `via` is off-screen, such as the desktop nav on a phone. */
  navFallback?: string;
  reveal?: DemoTutorialReveal;
  worksheetsBuild?: boolean;
}

export const FIRST_SAMPLE_BOARD = "first-sample-board";

export const DEMO_TUTORIAL_DISMISS_CARD = "drillmaster:demo-tutorial-dismiss-card";

export const DEMO_TUTORIAL_ALGEBRA_TAGS = ["ALG-LIN", "ALG-EXP"];

export const DEMO_TUTORIAL_WORKSHEET_QUESTION_COUNT = 10;

export const DEMO_TUTORIAL_WORKSHEET_TITLE =
  "Worksheet: Linear Equations & Inequalities, Expressions & Manipulations";

export const DEMO_TUTORIAL_STEPS: DemoTutorialStep[] = [
  {
    id: "workspace-home",
    route: "/workspace",
    target: "sample-boards",
    title: "The workspace is the class",
    body: "Each card is one student's board. The diagnostic, worksheets, notes, and results all connect back to that board. Avery, Jordan, and Sam are samples.",
  },
  {
    id: "open-board",
    route: FIRST_SAMPLE_BOARD,
    target: "student-board",
    via: "sample-board-link",
    title: "Open a student's board",
    body: "Click Avery's card. One board is one student. Next we will look at one area at a time.",
  },
  {
    id: "session-cards",
    route: FIRST_SAMPLE_BOARD,
    target: "session-summaries",
    title: "Session cards track the work",
    body: "Session summaries, homework, and score reports live in these lists. Students and families can see them. Put a short note on the card after each session.",
  },
  {
    id: "session-2",
    route: FIRST_SAMPLE_BOARD,
    target: "session-card",
    via: "session-2-card",
    reveal: "session-card",
    title: "A session card holds the assignment",
    body: "Session 2 is open. When you assign a worksheet, attach it to this card so it is ready for the student to take.",
  },
  {
    id: "roadmap",
    route: FIRST_SAMPLE_BOARD,
    target: "student-roadmap",
    via: "student-roadmap",
    reveal: "roadmap",
    title: "Show the roadmap",
    body: "Click Show roadmap. Scores, the latest family update, and what to do next all live here.",
  },
  {
    id: "assign-diagnostic",
    route: FIRST_SAMPLE_BOARD,
    target: "assign-diagnostic",
    title: "Assign the diagnostic",
    body: "Turn on Assign diagnostic from this board. That opens the full form for this student.",
  },
  {
    id: "view-diagnostic",
    route: FIRST_SAMPLE_BOARD,
    target: "view-diagnostic",
    reveal: "roadmap",
    title: "A few days later, review the diagnostic",
    body: "When they finish, View diagnostic results stays on this same board. You see what they got right and wrong, then plan the next session.",
  },
  {
    id: "worksheet-skills",
    route: "/worksheets",
    target: "worksheet-skills",
    via: "nav-worksheets",
    navFallback: "assign-worksheet-board",
    worksheetsBuild: true,
    title: "Build the worksheet from today's topic",
    body: "After a session on algebra, open Worksheets and pick those skills. Check as many as you covered today.",
  },
  {
    id: "worksheet-limit",
    route: "/worksheets",
    target: "worksheet-limit",
    worksheetsBuild: true,
    title: "Set the question count",
    body: "Adjust how many questions to send. A short set is enough for homework after a session.",
  },
  {
    id: "worksheet-workspace",
    route: "/worksheets",
    target: "worksheet-workspace",
    worksheetsBuild: true,
    title: "Put it on the session card",
    body: "Show it on their workspace and pick Session 2. The assignment lands on that card.",
  },
  {
    id: "worksheet-ready",
    route: FIRST_SAMPLE_BOARD,
    target: "assigned-worksheet",
    via: "nav-workspace",
    navFallback: "sample-boards",
    reveal: "session-card",
    title: "Back on the board, it is ready",
    body: "Session 2 now has the assigned worksheet. Students see the Assigned badge on the card and start it from here.",
  },
  {
    id: "review-results",
    route: FIRST_SAMPLE_BOARD,
    target: "view-last-results",
    title: "Review what they missed",
    body: "View last results opens each question, the choice they picked, and the common trap. Green is correct, red is incorrect.",
  },
  {
    id: "next-loop",
    route: FIRST_SAMPLE_BOARD,
    target: "assign-next-worksheet",
    reveal: "roadmap",
    title: "Then you repeat the loop",
    body: "Assign next worksheet can use the skills they missed. That is one session cycle. You do the same thing the next time you meet.",
  },
];

export function tutorialOpensRoadmap(step?: DemoTutorialStep | null): boolean {
  if (!step) return false;
  return (
    step.reveal === "roadmap" ||
    step.target === "student-roadmap" ||
    step.target === "view-diagnostic" ||
    step.target === "assign-next-worksheet"
  );
}

export function tutorialOpensSessionCard(step?: DemoTutorialStep | null): boolean {
  if (!step) return false;
  return (
    step.reveal === "session-card" ||
    step.target === "session-2-card" ||
    step.target === "assigned-worksheet"
  );
}

export function tutorialPreparesAssignedWorksheet(step?: DemoTutorialStep | null): boolean {
  return Boolean(step?.worksheetsBuild);
}

export function tutorialShowsAssignedWorksheet(step?: DemoTutorialStep | null): boolean {
  return step?.id === "worksheet-ready";
}

export function isDemoTutorialSessionCardTitle(title: string): boolean {
  return /session\s*2/i.test(title);
}

export function pickDemoTutorialAlgebraQuestionIds(
  questions: { id: string; tags?: { code: string }[] }[],
  count = DEMO_TUTORIAL_WORKSHEET_QUESTION_COUNT,
): string[] {
  const tagged = questions.filter((question) =>
    question.tags?.some((tag) => DEMO_TUTORIAL_ALGEBRA_TAGS.includes(tag.code)),
  );
  const pool = tagged.length > 0 ? tagged : questions;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const question of pool) {
    if (!question.id || seen.has(question.id)) continue;
    seen.add(question.id);
    ids.push(question.id);
    if (ids.length >= count) break;
  }
  return ids;
}

export function worksheetsStateForTutorial(
  studentUid: string,
  returnTo: string,
): WorksheetsLocationState {
  return assignToStudentNavState(studentUid, {
    returnTo,
    suggestedTagCodes: DEMO_TUTORIAL_ALGEBRA_TAGS,
  });
}

function storageKey(uid: string): string {
  return `drillmaster.demoTutorialComplete:${uid}`;
}

export function isDemoTutorialComplete(uid: string): boolean {
  try {
    return localStorage.getItem(storageKey(uid)) === "1";
  } catch {
    return false;
  }
}

export function markDemoTutorialComplete(uid: string): void {
  try {
    localStorage.setItem(storageKey(uid), "1");
  } catch {
    // Private mode can block storage. The tour can still be replayed this session.
  }
}
