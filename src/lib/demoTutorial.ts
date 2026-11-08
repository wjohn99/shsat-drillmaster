import { assignToStudentNavState, type WorksheetsLocationState } from "@/types/worksheetsNavigation";

export type DemoTutorialReveal = "roadmap" | "session-card";

export interface DemoTutorialStep {
  id: string;
  /** A path, or "first-sample-board" for the first sample student. */
  route: string;
  /**
   * When set, the address must use this query. Empty string means no query.
   * Omit to ignore the query.
   */
  search?: string;
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

/** Demo-visible revising item with a solution, choice notes, a trap, and skill tags. */
export const DEMO_TUTORIAL_QUESTION_ID = "ELA-REB-002";

const TUTORIAL_QUESTION = `/question/${DEMO_TUTORIAL_QUESTION_ID}`;

export const DEMO_TUTORIAL_STEPS: DemoTutorialStep[] = [
  {
    id: "open-bank",
    route: "/dashboard",
    target: "nav-question-bank",
    title: "Start in the question bank",
    body: "Question Bank is where DrillMaster starts. You choose a subject, module, and skill there. Workspace keeps the class record, and we will look at it at the end.",
  },
  {
    id: "choose-skill",
    route: "/question-bank",
    target: "bank-filters",
    via: "nav-question-bank",
    title: "Choose the module and the skill",
    body: "Filter by subject, module, then skill. That is how you pick practice for the adaptive test. A prebuilt worksheet, or one you build, starts from these same skills.",
  },
  {
    id: "practice-question",
    route: TUTORIAL_QUESTION,
    search: "practice=true",
    target: "question-practice",
    title: "A student answers the question",
    body: "Subject and module sit on the item. Highlight is there for the sentences. The questions are written by tutors, in the style of the test.",
  },
  {
    id: "how-to-solve",
    route: TUTORIAL_QUESTION,
    search: "",
    target: "how-to-solve",
    title: "The correct answer, explained",
    body: "After they submit, How to solve it walks the item step by step. The correct choice is explained just under that.",
  },
  {
    id: "why-wrong",
    route: TUTORIAL_QUESTION,
    search: "",
    target: "why-wrong",
    title: "Why the other choices are wrong",
    body: "Each incorrect choice says what a student might have thought, and why that reading does not hold. Their pick is marked.",
  },
  {
    id: "common-trap",
    route: TUTORIAL_QUESTION,
    search: "",
    target: "common-trap",
    title: "The common trap",
    body: "The trap names the mistake students make on this skill, so you know what to teach next.",
  },
  {
    id: "next-topics",
    route: TUTORIAL_QUESTION,
    search: "",
    target: "skill-to-improve",
    title: "Topics for the next session",
    body: "Skill to improve is for tutors. It is the topic to practice next. Students do not see it while they are answering.",
  },
  {
    id: "question-notes",
    route: TUTORIAL_QUESTION,
    search: "",
    target: "question-notes",
    title: "Notes stay on the question",
    body: "My Notes is for what you want to remember about this item before the next session. Type a note, or draw the work on the scratch pad.",
  },
  {
    id: "prebuilt-or-own",
    route: "/worksheets",
    target: "worksheet-presets",
    via: "nav-worksheets",
    title: "Send a prebuilt set, or build your own",
    body: "Worksheets is where practice goes to a student. Browse a pre-set that is ready to assign, or build one from the skills you choose.",
  },
  {
    id: "build-worksheet",
    route: "/worksheets",
    target: "worksheet-skills",
    via: "assign-worksheet",
    title: "Create your own",
    body: "Assign to student opens the builder. Pick the skills from the lesson, then set how many questions to send. In the demo the students are samples. With a real class, this is the same screen.",
  },
  {
    id: "workspace-complement",
    route: "/workspace",
    target: "sample-boards",
    via: "nav-workspace",
    title: "Workspace keeps the class record",
    body: "This part is complementary. Avery, Jordan, and Sam are sample students. An assigned worksheet can show up on a student's board, with notes and results. Start from the question bank and worksheets. The board is where that work is kept.",
  },
];

/** Query the step requires, or null when any query is fine. */
export function tutorialSearch(step: DemoTutorialStep): string | null {
  if (step.search === undefined) return null;
  if (step.search === "") return "";
  return step.search.startsWith("?") ? step.search : `?${step.search}`;
}

/** Which worksheets screen this step highlights. Null when the step is not on Worksheets. */
export function tutorialWorksheetSurface(
  step?: DemoTutorialStep | null,
): "home" | "build" | null {
  if (!step || step.route !== "/worksheets") return null;
  return step.target === "worksheet-skills" ? "build" : "home";
}

export function isTutorialStepLocation(
  pathname: string,
  search: string,
  step: DemoTutorialStep | undefined,
  sampleBoardPath: string | null,
): boolean {
  if (!step) return false;
  const route = step.route === FIRST_SAMPLE_BOARD ? sampleBoardPath : step.route;
  if (!route || pathname !== route) return false;
  const want = tutorialSearch(step);
  if (want === null) return true;
  return search === want;
}

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
