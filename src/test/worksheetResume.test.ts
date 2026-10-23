import { afterEach, describe, expect, it, vi } from "vitest";
import {
  forgetActiveWorksheet,
  markWorksheetResumeAfterReload,
  readWorksheetResumeAfterReload,
  worksheetResumePath,
} from "@/lib/worksheetResume";

function installSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  });
}

describe("worksheet resume after refresh", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a reloaded student back to the open worksheet", () => {
    installSessionStorage();
    markWorksheetResumeAfterReload("student-1", "assign-9");
    expect(worksheetResumePath("/dashboard", "", "student-1", "student")).toBe(
      "/worksheets?attempt=assign-9",
    );
    expect(worksheetResumePath("/", "", "student-1", "student")).toBe(
      "/worksheets?attempt=assign-9",
    );
    expect(worksheetResumePath("/worksheets", "", "student-1", "student")).toBe(
      "/worksheets?attempt=assign-9",
    );
  });

  it("stays on the worksheet when that attempt is already open", () => {
    installSessionStorage();
    markWorksheetResumeAfterReload("student-1", "assign-9");
    expect(
      worksheetResumePath("/worksheets", "?attempt=assign-9", "student-1", "student"),
    ).toBeNull();
  });

  it("does not resume a worksheet for a different account", () => {
    installSessionStorage();
    markWorksheetResumeAfterReload("student-1", "assign-9");
    expect(readWorksheetResumeAfterReload("student-2")).toBeNull();
    expect(worksheetResumePath("/dashboard", "", "student-2", "student")).toBeNull();
    expect(worksheetResumePath("/dashboard", "", "student-1", "tutor")).toBeNull();
  });

  it("stops resuming after the student leaves the worksheet", () => {
    installSessionStorage();
    markWorksheetResumeAfterReload("student-1", "assign-9");
    forgetActiveWorksheet();
    expect(worksheetResumePath("/dashboard", "", "student-1", "student")).toBeNull();
  });
});
