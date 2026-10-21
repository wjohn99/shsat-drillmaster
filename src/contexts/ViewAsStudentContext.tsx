import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  readStoredViewAsStudent,
  writeStoredViewAsStudent,
  type ViewAsStudent,
} from "@/lib/viewAsStudent";

interface ViewAsStudentContextValue {
  viewAs: ViewAsStudent | null;
  enterViewAsStudent: (student: ViewAsStudent) => void;
  exitViewAsStudent: () => void;
}

const ViewAsStudentContext = createContext<ViewAsStudentContextValue | undefined>(undefined);

export function ViewAsStudentProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [viewAs, setViewAs] = useState<ViewAsStudent | null>(() => readStoredViewAsStudent());
  const roleKey = `${profile?.uid ?? ""}:${profile?.role ?? ""}`;
  const roleKeyRef = useRef(roleKey);

  useEffect(() => {
    if (roleKeyRef.current === roleKey) return;
    roleKeyRef.current = roleKey;
    setViewAs(null);
    writeStoredViewAsStudent(null);
  }, [roleKey]);

  useEffect(() => {
    if (!profile) return;
    if (profile.role === "tutor" || profile.role === "demo") return;
    setViewAs(null);
    writeStoredViewAsStudent(null);
  }, [profile]);

  const enterViewAsStudent = useCallback((student: ViewAsStudent) => {
    const next = {
      uid: student.uid,
      displayName: student.displayName.trim() || "Student",
      email: student.email.trim(),
    };
    writeStoredViewAsStudent(next);
    setViewAs(next);
  }, []);

  const exitViewAsStudent = useCallback(() => {
    writeStoredViewAsStudent(null);
    setViewAs(null);
  }, []);

  const value = useMemo(
    () => ({ viewAs, enterViewAsStudent, exitViewAsStudent }),
    [enterViewAsStudent, exitViewAsStudent, viewAs],
  );

  return (
    <ViewAsStudentContext.Provider value={value}>{children}</ViewAsStudentContext.Provider>
  );
}

export function useViewAsStudent(): ViewAsStudentContextValue {
  const context = useContext(ViewAsStudentContext);
  if (!context) {
    throw new Error("useViewAsStudent must be used within a ViewAsStudentProvider.");
  }
  return context;
}
