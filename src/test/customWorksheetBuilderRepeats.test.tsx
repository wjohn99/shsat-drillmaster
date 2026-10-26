// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CustomWorksheetBuilder } from "@/components/worksheets/CustomWorksheetBuilder";
import {
  WORKSHEET_SECTIONS,
  type WorksheetSectionId,
} from "@/lib/worksheetTagCatalog";
import type { Tag } from "@/types";

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: () => false,
  });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: () => undefined,
  });
});

afterEach(cleanup);

const tagCatalog = Object.fromEntries(
  WORKSHEET_SECTIONS.map((section) => [section.id, [] as Tag[]]),
) as Record<WorksheetSectionId, Tag[]>;

function renderBuilder(
  overrides: Partial<ComponentProps<typeof CustomWorksheetBuilder>> = {},
) {
  const onBlockRepeatQuestionsChange = vi.fn();
  render(
    <CustomWorksheetBuilder
      variant="tutor"
      selectedCodes={["ALG-1"]}
      questionLimit={10}
      tagCatalog={tagCatalog}
      matchingCount={4}
      questionPickMode="random"
      onQuestionPickModeChange={vi.fn()}
      poolQuestions={[]}
      chosenIds={[]}
      chosenQuestions={[]}
      passages={[]}
      onChosenIdsChange={vi.fn()}
      onToggleTag={vi.fn()}
      onQuestionLimitChange={vi.fn()}
      onClearTags={vi.fn()}
      onStart={vi.fn()}
      onExportPdf={vi.fn()}
      students={[{ uid: "stu-1", displayName: "Ada", email: "ada@example.com" }]}
      selectedStudentUid="stu-1"
      onStudentChange={vi.fn()}
      assignmentDueDate="2026-10-31"
      onAssignmentDueDateChange={vi.fn()}
      onAssign={vi.fn()}
      blockRepeatQuestions={false}
      onBlockRepeatQuestionsChange={onBlockRepeatQuestionsChange}
      {...overrides}
    />,
  );
  return { onBlockRepeatQuestionsChange };
}

describe("worksheet repeat-question toggle", () => {
  it("allows repeats by default and leaves previously submitted questions in the pool copy", () => {
    renderBuilder();
    expect(
      screen.getByRole("switch", { name: "Block repeat questions" }).getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      screen.getByText("This student can get questions they already submitted on an assigned worksheet."),
    ).toBeTruthy();
    expect(screen.queryByText(/submitted question/)).toBeNull();
  });

  it("explains that submitted questions are left out when blocking is on", () => {
    renderBuilder({
      blockRepeatQuestions: true,
      excludedSubmittedCount: 3,
    });
    expect(
      screen.getByRole("switch", { name: "Block repeat questions" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByText("Questions this student already submitted on an assigned worksheet are left out."),
    ).toBeTruthy();
    expect(screen.getByText(/3 submitted questions are left out for Ada/)).toBeTruthy();
  });

  it("notifies the parent when the tutor flips the switch", () => {
    const { onBlockRepeatQuestionsChange } = renderBuilder();
    fireEvent.click(screen.getByRole("switch", { name: "Block repeat questions" }));
    expect(onBlockRepeatQuestionsChange).toHaveBeenCalledWith(true);
  });
});
