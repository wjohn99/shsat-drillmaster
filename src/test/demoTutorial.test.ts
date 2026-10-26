import { describe, expect, it } from "vitest";
import {
  DEMO_TUTORIAL_STEPS,
  DEMO_TUTORIAL_WORKSHEET_TITLE,
  isDemoTutorialSessionCardTitle,
  pickDemoTutorialAlgebraQuestionIds,
  tutorialOpensRoadmap,
  tutorialOpensSessionCard,
  tutorialPreparesAssignedWorksheet,
  tutorialShowsAssignedWorksheet,
  worksheetsStateForTutorial,
} from "@/lib/demoTutorial";

describe("demo tutorial flow", () => {
  it("stays on the workspace board for the first session loop, then worksheets, then back", () => {
    const ids = DEMO_TUTORIAL_STEPS.map((step) => step.id);
    expect(ids).toEqual([
      "workspace-home",
      "open-board",
      "session-cards",
      "session-2",
      "roadmap",
      "assign-diagnostic",
      "view-diagnostic",
      "worksheet-skills",
      "worksheet-limit",
      "worksheet-workspace",
      "worksheet-ready",
      "review-results",
      "next-loop",
    ]);
    const boardSteps = DEMO_TUTORIAL_STEPS.filter((step) => step.route === "first-sample-board");
    const worksheetSteps = DEMO_TUTORIAL_STEPS.filter((step) => step.route === "/worksheets");
    expect(boardSteps.length).toBeGreaterThan(worksheetSteps.length);
    expect(DEMO_TUTORIAL_STEPS[1]?.via).toBe("sample-board-link");
    expect(DEMO_TUTORIAL_STEPS.find((step) => step.id === "worksheet-skills")?.via).toBe(
      "nav-worksheets",
    );
  });

  it("opens the roadmap and session card only on those beats", () => {
    const roadmap = DEMO_TUTORIAL_STEPS.find((step) => step.id === "roadmap");
    const diagnostic = DEMO_TUTORIAL_STEPS.find((step) => step.id === "view-diagnostic");
    const session = DEMO_TUTORIAL_STEPS.find((step) => step.id === "session-2");
    const home = DEMO_TUTORIAL_STEPS[0];
    expect(tutorialOpensRoadmap(roadmap)).toBe(true);
    expect(tutorialOpensRoadmap(diagnostic)).toBe(true);
    expect(tutorialOpensRoadmap(home)).toBe(false);
    expect(session?.via).toBe("session-2-card");
    expect(session?.target).toBe("session-card");
    expect(tutorialOpensSessionCard(session)).toBe(true);
    expect(tutorialOpensSessionCard(home)).toBe(false);
    expect(isDemoTutorialSessionCardTitle("10.12.26 Session 2")).toBe(true);
    expect(isDemoTutorialSessionCardTitle("Homework")).toBe(false);
  });

  it("opens the worksheet builder with algebra skills for the sample student", () => {
    const state = worksheetsStateForTutorial("demo-1-avery", "/workspace/demo-1-avery");
    expect(state.openTutorBuild).toBe(true);
    expect(state.assignToStudentUid).toBe("demo-1-avery");
    expect(state.suggestedTagCodes).toEqual(["ALG-LIN", "ALG-EXP"]);
  });

  it("shows a real assigned worksheet on Session 2 after the assign beat", () => {
    const ready = DEMO_TUTORIAL_STEPS.find((step) => step.id === "worksheet-ready");
    const skills = DEMO_TUTORIAL_STEPS.find((step) => step.id === "worksheet-skills");
    const session = DEMO_TUTORIAL_STEPS.find((step) => step.id === "session-2");
    expect(ready?.target).toBe("assigned-worksheet");
    expect(ready?.reveal).toBe("session-card");
    expect(tutorialOpensSessionCard(ready)).toBe(true);
    expect(tutorialShowsAssignedWorksheet(ready)).toBe(true);
    expect(tutorialShowsAssignedWorksheet(session)).toBe(false);
    expect(tutorialPreparesAssignedWorksheet(skills)).toBe(true);
    expect(tutorialPreparesAssignedWorksheet(ready)).toBe(false);
    expect(DEMO_TUTORIAL_WORKSHEET_TITLE).toMatch(/Linear Equations/);
    expect(
      pickDemoTutorialAlgebraQuestionIds(
        [
          { id: "alg-1", tags: [{ code: "ALG-LIN" }] },
          { id: "ela-1", tags: [{ code: "ELA-MAIN" }] },
          { id: "alg-2", tags: [{ code: "ALG-EXP" }] },
        ],
        8,
      ),
    ).toEqual(["alg-1", "alg-2"]);
  });
});
