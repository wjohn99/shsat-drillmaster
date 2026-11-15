import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_SIGNUP_PATH,
  diagnosticProspects,
  isDiagnosticSignupSearch,
  studentCanStartDiagnostic,
} from "@/lib/diagnosticAccess";

describe("diagnostic signup access", () => {
  it("recognizes the shared signup link", () => {
    expect(DIAGNOSTIC_SIGNUP_PATH).toBe("/login?start=diagnostic");
    expect(isDiagnosticSignupSearch("?start=diagnostic")).toBe(true);
    expect(isDiagnosticSignupSearch("?as=demo")).toBe(false);
  });

  it("lets a student start from the account flag or a board", () => {
    expect(studentCanStartDiagnostic({ role: "student" })).toBe(false);
    expect(studentCanStartDiagnostic({ role: "student", profileAssigned: true })).toBe(true);
    expect(studentCanStartDiagnostic({ role: "student", boardAssigned: true })).toBe(true);
    expect(studentCanStartDiagnostic({ role: "tutor" })).toBe(true);
  });

  it("lists signup students who do not have a board yet", () => {
    const students = [
      { uid: "prospect", diagnosticAssigned: true },
      { uid: "class", diagnosticAssigned: true },
      { uid: "plain", diagnosticAssigned: false },
    ];
    expect(diagnosticProspects(students, ["class"]).map((student) => student.uid)).toEqual([
      "prospect",
    ]);
  });
});
