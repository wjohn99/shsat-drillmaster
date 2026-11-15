// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AppUserProfile } from "@/types/auth";

const authState: {
  profile: AppUserProfile | null;
  error: string | null;
  isConfigured: boolean;
  signInWithGoogle: ReturnType<typeof vi.fn>;
  grantDiagnosticAccess: ReturnType<typeof vi.fn>;
} = {
  profile: null,
  error: null,
  isConfigured: true,
  signInWithGoogle: vi.fn(),
  grantDiagnosticAccess: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

import Login from "@/pages/Login";

function renderLogin(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/practice/diagnostic" element={<div>Exam page</div>} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("diagnostic signup login", () => {
  it("hides the role picker and asks for the student's Google account", () => {
    authState.profile = null;
    renderLogin("/login?start=diagnostic");
    expect(screen.getByRole("heading", { name: "Start the diagnostic" })).toBeTruthy();
    expect(screen.queryByRole("radiogroup", { name: "Sign in as" })).toBeNull();
    expect(screen.getByText(/The exam opens as soon as you sign in/)).toBeTruthy();
    expect(screen.getByText(/use your Google account, not theirs/)).toBeTruthy();
  });

  it("sends a student who already has access straight to the exam", () => {
    authState.profile = {
      uid: "student-1",
      email: "student@example.com",
      displayName: "Avery",
      photoURL: null,
      role: "student",
      diagnosticAssigned: true,
    } as AppUserProfile;
    renderLogin("/login?start=diagnostic");
    expect(screen.getByText("Exam page")).toBeTruthy();
  });
});
