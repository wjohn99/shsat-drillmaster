// @vitest-environment jsdom
/**
 * Rendering checks for response fields that the audit flagged: numeric entry carried by a
 * table question, exact-count multi-select instructions, and inline-choice/drag-drop payloads.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuestionResponseFields } from "@/components/question/QuestionResponseFields";
import { loadDiagnosticQuestionCatalog, loadRevisedBank } from "@/data/questionCatalog";
import type { Question } from "@/types";

afterEach(cleanup);

const bank = loadRevisedBank().questions;
const diagnostic = loadDiagnosticQuestionCatalog().questions;
const byId = (list: Question[], id: string) => list.find((q) => q.id === id)!;

function renderFields(question: Question) {
  return render(
    <QuestionResponseFields
      question={question}
      raw={undefined}
      disabled={false}
      showSolution={false}
      onChange={() => {}}
      onToggleAta={() => {}}
    />,
  );
}

describe("QuestionResponseFields", () => {
  it("shows a numeric entry field for an INDY-CGT question answered by number (MATH-DAT-115)", () => {
    const { container } = renderFields(byId(bank, "MATH-DAT-115"));
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector("input")).not.toBeNull();
  });

  it("shows the table and numeric entry for MATH-DAT-DX09 (INDY-EE with a table)", () => {
    const { container } = renderFields(byId(diagnostic, "MATH-DAT-DX09"));
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector("input")).not.toBeNull();
  });

  it.each(bank.filter((q) => q.subtype === "INDY-MS" && !q.scopeHold).map((q) => [q.id, q] as const))(
    "%s tells the student exactly how many to select",
    (_id, q) => {
      renderFields(q);
      expect(screen.getByText(`Select ${q.ms!.selectCount} answers.`)).toBeTruthy();
      expect(screen.getAllByRole("checkbox")).toHaveLength(q.choices!.length);
    },
  );

  it.each(bank.filter((q) => q.subtype === "INDY-IC").slice(0, 5).map((q) => [q.id, q] as const))(
    "%s renders one labelled control per inline slot",
    (_id, q) => {
      const { container } = renderFields(q);
      const controls = container.querySelectorAll("select, [role='combobox']");
      expect(controls.length).toBe(q.ic!.slots.length);
    },
  );

  it("hides Eliminate unless onToggleEliminate is provided", () => {
    const question = bank.find((q) => q.subtype === "MC4_A-D" && q.choices?.length)!;
    renderFields(question);
    expect(screen.queryByRole("button", { name: "Eliminate" })).toBeNull();
  });

  it("strikes through a choice when Eliminate is clicked", () => {
    const question = bank.find((q) => q.subtype === "MC4_A-D" && q.choices?.length)!;
    const eliminated: string[] = [];
    const onToggleEliminate = vi.fn((choiceId: string) => {
      const i = eliminated.indexOf(choiceId);
      if (i >= 0) eliminated.splice(i, 1);
      else eliminated.push(choiceId);
    });
    const { rerender } = render(
      <QuestionResponseFields
        question={question}
        raw={undefined}
        disabled={false}
        showSolution={false}
        onChange={() => {}}
        onToggleAta={() => {}}
        eliminatedChoiceIds={eliminated}
        onToggleEliminate={onToggleEliminate}
      />,
    );
    const first = screen.getAllByRole("button", { name: "Eliminate" })[0];
    fireEvent.click(first);
    expect(onToggleEliminate).toHaveBeenCalledWith(question.choices![0].id);
    rerender(
      <QuestionResponseFields
        question={question}
        raw={undefined}
        disabled={false}
        showSolution={false}
        onChange={() => {}}
        onToggleAta={() => {}}
        eliminatedChoiceIds={[...eliminated]}
        onToggleEliminate={onToggleEliminate}
      />,
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
    expect(screen.getByText(`${question.choices![0].label}.`).closest("label")?.className).toMatch(
      /line-through/,
    );
  });
});
