import { describe, expect, it } from "vitest";
import {
  diagnosticResultButtonLabel,
  diagnosticSessionsByDate,
} from "@/lib/diagnosticResultLabel";

function session(id: string, iso: string, attemptNumber?: number) {
  const date = new Date(iso);
  return {
    id,
    attemptNumber,
    completedAt: { toMillis: () => date.getTime(), toDate: () => date },
  };
}

describe("diagnostic result labels", () => {
  it("labels each sitting by date, oldest first", () => {
    const later = session("later", "2026-11-09T15:00:00");
    const earlier = session("earlier", "2026-03-02T10:00:00");
    const ordered = diagnosticSessionsByDate([later, earlier]);
    expect(ordered.map((row) => row.id)).toEqual(["earlier", "later"]);
    expect(diagnosticResultButtonLabel(earlier, ordered)).toBe("Results, Mar 2, 2026");
    expect(diagnosticResultButtonLabel(later, ordered)).toBe("Results, Nov 9, 2026");
  });

  it("adds the time when two sittings share a day", () => {
    const morning = session("morning", "2026-11-09T09:05:00");
    const evening = session("evening", "2026-11-09T18:40:00");
    const sessions = [morning, evening];
    expect(diagnosticResultButtonLabel(morning, sessions)).toBe("Results, Nov 9, 2026, 9:05 AM");
    expect(diagnosticResultButtonLabel(evening, sessions)).toBe("Results, Nov 9, 2026, 6:40 PM");
  });
});
