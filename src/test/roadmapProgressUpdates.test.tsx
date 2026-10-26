// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RoadmapProgressUpdates } from "@/components/workspace/RoadmapProgressUpdates";
import type { RoadmapProgressUpdate } from "@/types/workspace";

const update: RoadmapProgressUpdate = {
  id: "u1",
  date: "2026-10-19",
  changed: "Finished the algebra worksheet.",
  next: "A short reading set on Session 2.",
  cardId: "card-2",
  cardTitle: "10.12.26 Session 2",
  createdByUid: "t1",
  createdByName: "John",
  createdAtMs: Date.UTC(2026, 9, 19),
};

afterEach(cleanup);

describe("RoadmapProgressUpdates", () => {
  it("shows families a dated update, the next step, and a card button", () => {
    const onOpenCard = vi.fn();
    render(
      <RoadmapProgressUpdates
        updates={[update]}
        readOnly
        cardOptions={[]}
        authorUid=""
        authorName=""
        onOpenCard={onOpenCard}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Finished the algebra worksheet.")).toBeTruthy();
    expect(screen.getByText("A short reading set on Session 2.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open 10.12.26 Session 2" }));
    expect(onOpenCard).toHaveBeenCalledWith("card-2");
    expect(screen.queryByRole("button", { name: "Add an update" })).toBeNull();
  });

  it("lets a tutor post one note and an optional related card", () => {
    const onChange = vi.fn();
    render(
      <RoadmapProgressUpdates
        updates={[]}
        readOnly={false}
        cardOptions={[{ id: "card-2", title: "10.12.26 Session 2", listTitle: "Session summaries" }]}
        authorUid="t1"
        authorName="John"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add an update" }));
    fireEvent.change(screen.getByLabelText("Update"), {
      target: { value: "Diagnostic came back. Math is ahead of ELA. Assign a reading set." },
    });
    expect(screen.getByText("Related card, optional")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Post update" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const patch = onChange.mock.calls[0][0];
    expect(patch.currentPriority).toBeUndefined();
    expect(patch.progressUpdates[0].changed).toContain("Diagnostic");
    expect(patch.progressUpdates[0].next).toBe("");
  });

  it("keeps earlier-updates and add-an-update on separate rows", () => {
    const extra: RoadmapProgressUpdate = {
      ...update,
      id: "u2",
      changed: "Started linear equations.",
      createdAtMs: Date.UTC(2026, 9, 12),
    };
    const older: RoadmapProgressUpdate = {
      ...update,
      id: "u3",
      cardId: null,
      cardTitle: null,
      changed: "Intro session complete.",
      createdAtMs: Date.UTC(2026, 9, 5),
    };
    render(
      <RoadmapProgressUpdates
        updates={[update, extra, older]}
        readOnly={false}
        cardOptions={[]}
        authorUid="t1"
        authorName="John"
        onChange={vi.fn()}
      />,
    );
    const earlier = screen.getByRole("button", { name: "Earlier updates (1)" });
    const add = screen.getByRole("button", { name: "Add an update" });
    expect(earlier.parentElement).toBe(add.parentElement);
    expect(earlier.parentElement?.className).toContain("flex-col");
    fireEvent.click(earlier);
    expect(screen.getByRole("button", { name: "Show less" }).parentElement?.className).toContain(
      "flex-col",
    );
  });
});
