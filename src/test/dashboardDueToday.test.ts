import { describe, expect, it } from "vitest";
import {
  hasOpenAssignmentDueToday,
  isAssignmentDueOnLocalDay,
  pickCurrentOpenAssignment,
} from "@/lib/dashboardStats";

const now = new Date(2026, 10, 12, 15, 0, 0).getTime();
const endOf = (year: number, month: number, day: number) =>
  new Date(year, month, day, 23, 59, 59, 999).getTime();

function due(ms: number | null) {
  return ms == null ? null : { toMillis: () => ms };
}

describe("due today", () => {
  it("matches an open worksheet due at the end of today", () => {
    const assignment = { status: "todo" as const, dueAt: due(endOf(2026, 10, 12)) };
    expect(isAssignmentDueOnLocalDay(assignment, now)).toBe(true);
    expect(hasOpenAssignmentDueToday([assignment], now)).toBe(true);
  });

  it("skips overdue, future, completed, and undated worksheets", () => {
    const rows = [
      { status: "todo" as const, dueAt: due(endOf(2026, 10, 11)) },
      { status: "todo" as const, dueAt: due(endOf(2026, 10, 13)) },
      { status: "completed" as const, dueAt: due(endOf(2026, 10, 12)) },
      { status: "todo" as const, dueAt: null },
    ];
    expect(hasOpenAssignmentDueToday(rows, now)).toBe(false);
  });
});

describe("pickCurrentOpenAssignment", () => {
  it("picks the soonest open worksheet and leaves undated work for last", () => {
    const later = {
      id: "later",
      status: "todo" as const,
      dueAt: due(endOf(2026, 10, 20)),
      createdAt: due(1),
    };
    const sooner = {
      id: "sooner",
      status: "todo" as const,
      dueAt: due(endOf(2026, 10, 12)),
      createdAt: due(2),
    };
    const undated = {
      id: "undated",
      status: "todo" as const,
      dueAt: null,
      createdAt: due(0),
    };
    const done = {
      id: "done",
      status: "completed" as const,
      dueAt: due(endOf(2026, 10, 1)),
      createdAt: due(0),
    };
    expect(pickCurrentOpenAssignment([later, done, undated, sooner])?.id).toBe("sooner");
    expect(pickCurrentOpenAssignment([undated, done])?.id).toBe("undated");
  });

  it("breaks a due-date tie with the older assignment", () => {
    const newer = {
      id: "newer",
      status: "todo" as const,
      dueAt: due(endOf(2026, 10, 12)),
      createdAt: due(20),
    };
    const older = {
      id: "older",
      status: "todo" as const,
      dueAt: due(endOf(2026, 10, 12)),
      createdAt: due(10),
    };
    expect(pickCurrentOpenAssignment([newer, older])?.id).toBe("older");
  });
});
