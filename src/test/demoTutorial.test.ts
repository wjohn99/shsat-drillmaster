import { describe, expect, it } from "vitest";
import { loadQuestionCatalogSync } from "@/data/questionCatalog";
import { isFormatTagCode } from "@/data/taggingScheme";
import {
  DEMO_TUTORIAL_QUESTION_ID,
  DEMO_TUTORIAL_STEPS,
  DEMO_TUTORIAL_WORKSHEET_TITLE,
  isDemoTutorialSessionCardTitle,
  isTutorialStepLocation,
  pickDemoTutorialAlgebraQuestionIds,
  tutorialOpensRoadmap,
  tutorialOpensSessionCard,
  tutorialPreparesAssignedWorksheet,
  tutorialSearch,
  tutorialShowsAssignedWorksheet,
  tutorialWorksheetSurface,
  worksheetsStateForTutorial,
  type DemoTutorialStep,
} from "@/lib/demoTutorial";

const QUESTION = `/question/${DEMO_TUTORIAL_QUESTION_ID}`;

describe("demo tutorial flow", () => {
  it("walks DrillMaster first and leaves Workspace as the last step", () => {
    const ids = DEMO_TUTORIAL_STEPS.map((step) => step.id);
    expect(ids).toEqual([
      "open-bank",
      "choose-skill",
      "practice-question",
      "how-to-solve",
      "why-wrong",
      "common-trap",
      "next-topics",
      "question-notes",
      "prebuilt-or-own",
      "build-worksheet",
      "workspace-complement",
    ]);
    const drillmasterSteps = DEMO_TUTORIAL_STEPS.filter(
      (step) => step.route !== "/workspace" && step.route !== "first-sample-board",
    );
    expect(drillmasterSteps.length).toBeGreaterThan(1);
    expect(DEMO_TUTORIAL_STEPS.at(-1)?.route).toBe("/workspace");
    expect(DEMO_TUTORIAL_STEPS[1]?.via).toBe("nav-question-bank");
    expect(DEMO_TUTORIAL_STEPS.find((step) => step.id === "prebuilt-or-own")?.via).toBe(
      "nav-worksheets",
    );
    expect(DEMO_TUTORIAL_STEPS.find((step) => step.id === "build-worksheet")?.via).toBe(
      "assign-worksheet",
    );
    expect(DEMO_TUTORIAL_STEPS.some((step) => step.worksheetsBuild || step.reveal)).toBe(false);
    expect(tutorialWorksheetSurface(DEMO_TUTORIAL_STEPS.find((step) => step.id === "build-worksheet"))).toBe(
      "build",
    );
    expect(tutorialWorksheetSurface(DEMO_TUTORIAL_STEPS.find((step) => step.id === "prebuilt-or-own"))).toBe(
      "home",
    );
    expect(
      tutorialWorksheetSurface(DEMO_TUTORIAL_STEPS.find((step) => step.id === "workspace-complement")),
    ).toBe(null);
    expect(DEMO_TUTORIAL_STEPS.some((step) => /—/.test(`${step.title} ${step.body}`))).toBe(false);
  });

  it("uses one question for practice, then the same question with the answer open", () => {
    const practice = DEMO_TUTORIAL_STEPS.find((step) => step.id === "practice-question");
    const explained = DEMO_TUTORIAL_STEPS.filter((step) =>
      ["how-to-solve", "why-wrong", "common-trap", "next-topics", "question-notes"].includes(
        step.id,
      ),
    );
    expect(practice?.route).toBe(QUESTION);
    expect(tutorialSearch(practice!)).toBe("?practice=true");
    expect(explained).toHaveLength(5);
    for (const step of explained) {
      expect(step.route).toBe(QUESTION);
      expect(tutorialSearch(step)).toBe("");
    }
    expect(
      isTutorialStepLocation(QUESTION, "?practice=true", practice, null),
    ).toBe(true);
    expect(isTutorialStepLocation(QUESTION, "", practice, null)).toBe(false);
    expect(isTutorialStepLocation(QUESTION, "", explained[0], null)).toBe(true);
    expect(isTutorialStepLocation(QUESTION, "?practice=true", explained[0], null)).toBe(false);

    const question = loadQuestionCatalogSync("demo").questions.find(
      (item) => item.id === DEMO_TUTORIAL_QUESTION_ID,
    );
    expect(question?.solutionExplanation?.trim()).toBeTruthy();
    expect(question?.commonTrap?.trim()).toBeTruthy();
    expect(question?.choices?.some((choice) => !choice.isCorrect && choice.explanation?.trim())).toBe(
      true,
    );
    expect(question?.tags.some((tag) => !isFormatTagCode(tag.code))).toBe(true);
  });

  it("keeps the old board helpers for a step that asks for them", () => {
    const roadmap: DemoTutorialStep = {
      id: "roadmap",
      route: "first-sample-board",
      target: "student-roadmap",
      title: "Roadmap",
      body: "Open it.",
      reveal: "roadmap",
    };
    const ready: DemoTutorialStep = {
      id: "worksheet-ready",
      route: "first-sample-board",
      target: "assigned-worksheet",
      title: "Ready",
      body: "The worksheet is on the card.",
      reveal: "session-card",
    };
    const skills: DemoTutorialStep = {
      id: "worksheet-skills",
      route: "/worksheets",
      target: "worksheet-skills",
      title: "Skills",
      body: "Pick skills.",
      worksheetsBuild: true,
    };
    expect(tutorialOpensRoadmap(roadmap)).toBe(true);
    expect(tutorialOpensRoadmap(DEMO_TUTORIAL_STEPS[0])).toBe(false);
    expect(tutorialOpensSessionCard(ready)).toBe(true);
    expect(tutorialShowsAssignedWorksheet(ready)).toBe(true);
    expect(tutorialShowsAssignedWorksheet(skills)).toBe(false);
    expect(tutorialPreparesAssignedWorksheet(skills)).toBe(true);
    expect(DEMO_TUTORIAL_STEPS.every((step) => !tutorialOpensRoadmap(step))).toBe(true);
    expect(DEMO_TUTORIAL_STEPS.every((step) => !tutorialOpensSessionCard(step))).toBe(true);
    expect(isDemoTutorialSessionCardTitle("10.12.26 Session 2")).toBe(true);
    expect(isDemoTutorialSessionCardTitle("Homework")).toBe(false);
  });

  it("opens the worksheet builder with algebra skills for the sample student", () => {
    const state = worksheetsStateForTutorial("demo-1-avery", "/workspace/demo-1-avery");
    expect(state.openTutorBuild).toBe(true);
    expect(state.assignToStudentUid).toBe("demo-1-avery");
    expect(state.suggestedTagCodes).toEqual(["ALG-LIN", "ALG-EXP"]);
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
