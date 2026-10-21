import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isDemoWelcomePending } from "@/lib/authService";
import { isDemoTutorialComplete, markDemoTutorialComplete } from "@/lib/demoTutorial";
import { useViewAsStudent } from "@/contexts/ViewAsStudentContext";

interface DemoTutorialContextValue {
  active: boolean;
  stepIndex: number;
  startTutorial: () => void;
  maybeAutoStart: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
}

const DemoTutorialContext = createContext<DemoTutorialContextValue | undefined>(undefined);

export function DemoTutorialProvider({ children }: { children: ReactNode }) {
  const { accountRole, profile } = useAuth();
  const { exitViewAsStudent } = useViewAsStudent();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const activeRef = useRef(false);

  const finish = useCallback(() => {
    if (profile?.uid && accountRole === "demo") {
      markDemoTutorialComplete(profile.uid);
    }
    activeRef.current = false;
    setActive(false);
    setStepIndex(0);
  }, [accountRole, profile?.uid]);

  const startTutorial = useCallback(() => {
    if (accountRole !== "demo") return;
    exitViewAsStudent();
    activeRef.current = true;
    setStepIndex(0);
    setActive(true);
  }, [accountRole, exitViewAsStudent]);

  const maybeAutoStart = useCallback(() => {
    if (activeRef.current) return;
    if (accountRole !== "demo" || !profile?.uid) return;
    if (isDemoWelcomePending()) return;
    if (isDemoTutorialComplete(profile.uid)) return;
    exitViewAsStudent();
    activeRef.current = true;
    setStepIndex(0);
    setActive(true);
  }, [accountRole, exitViewAsStudent, profile?.uid]);

  const nextStep = useCallback(() => {
    setStepIndex((current) => current + 1);
  }, []);

  const previousStep = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const value = useMemo(
    () => ({
      active,
      stepIndex,
      startTutorial,
      maybeAutoStart,
      nextStep,
      previousStep,
      skipTutorial: finish,
    }),
    [active, finish, maybeAutoStart, nextStep, previousStep, startTutorial, stepIndex],
  );

  return <DemoTutorialContext.Provider value={value}>{children}</DemoTutorialContext.Provider>;
}

export function useDemoTutorial(): DemoTutorialContextValue {
  const context = useContext(DemoTutorialContext);
  if (!context) {
    throw new Error("useDemoTutorial must be used within a DemoTutorialProvider.");
  }
  return context;
}
