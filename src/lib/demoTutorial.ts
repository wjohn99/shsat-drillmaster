export interface DemoTutorialStep {
  id: string;
  /** A path, or "first-sample-board" for the first sample student. */
  route: string;
  target: string;
  title: string;
  body: string;
}

export const FIRST_SAMPLE_BOARD = "first-sample-board";

export const DEMO_TUTORIAL_STEPS: DemoTutorialStep[] = [
  {
    id: "workspace-home",
    route: "/workspace",
    target: "sample-boards",
    title: "The workspace is the class",
    body: "Each card is one student's board. The diagnostic, worksheets, notes, and results all connect back to that board. Avery, Jordan, and Sam are samples. Live students never appear in a demo account.",
  },
  {
    id: "one-board",
    route: FIRST_SAMPLE_BOARD,
    target: "student-board",
    title: "One board is one student",
    body: "The name, status, and roadmap belong to this student. A live class uses this same board.",
  },
  {
    id: "roadmap",
    route: FIRST_SAMPLE_BOARD,
    target: "student-roadmap",
    title: "The roadmap is the student's plan",
    body: "Scores, the target school, the next session, and follow-ups are in this roadmap. Private lesson plans go in Tutor notes, just below. Students and families do not see that section.",
  },
  {
    id: "diagnostic-form",
    route: "/practice",
    target: "diagnostic-card",
    title: "Practice holds that same diagnostic",
    body: "This card is the full form. It is the diagnostic the board assigns. After a student submits, the result stays with their board.",
  },
  {
    id: "board-actions",
    route: FIRST_SAMPLE_BOARD,
    target: "board-actions",
    title: "Worksheets and results are on the board too",
    body: "Assign worksheet, View last results, and View as student are here. A worksheet is created on the Worksheets page, then it belongs to this student. View as student is their page, including results after they submit.",
  },
  {
    id: "worksheets",
    route: "/worksheets",
    target: "assign-worksheet",
    title: "Worksheets is where the set is made",
    body: "A set can come from skills or from hand-picked questions. Once it is sent, it shows on that student's workspace board.",
  },
  {
    id: "board-lists",
    route: FIRST_SAMPLE_BOARD,
    target: "board-lists",
    title: "Notes and homework stay on the board",
    body: "Session summaries, homework, and score reports are lists on the board. Students and families see these. Keep lesson plans in Tutor notes instead.",
  },
  {
    id: "dashboard",
    route: "/dashboard",
    target: "student-progress",
    title: "The dashboard gathers every board",
    body: "Student progress is the class at a glance: diagnostic status, open worksheets, and results after a student submits. Each row is one workspace board.",
  },
];

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
