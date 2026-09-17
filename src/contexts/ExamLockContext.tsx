import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ExamLockContextValue = {
  locked: boolean;
  requestLeave: () => void;
  setExamLeaveHandler: (handler: (() => void) | null) => void;
};

const ExamLockContext = createContext<ExamLockContextValue>({
  locked: false,
  requestLeave: () => {},
  setExamLeaveHandler: () => {},
});

export function ExamLockProvider({ children }: { children: ReactNode }) {
  const [handler, setHandler] = useState<(() => void) | null>(null);

  const setExamLeaveHandler = useCallback((next: (() => void) | null) => {
    setHandler(() => next);
  }, []);

  const requestLeave = useCallback(() => {
    handler?.();
  }, [handler]);

  const value = useMemo(
    () => ({
      locked: handler != null,
      requestLeave,
      setExamLeaveHandler,
    }),
    [handler, requestLeave, setExamLeaveHandler],
  );

  return <ExamLockContext.Provider value={value}>{children}</ExamLockContext.Provider>;
}

export function useExamLock() {
  return useContext(ExamLockContext);
}
