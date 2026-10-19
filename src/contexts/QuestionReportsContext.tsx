import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  canManageQuestionReports,
  canReportQuestions,
  fetchMyQuestionReport,
  fetchQuestionReports,
  resolveQuestionReport,
  subscribeOpenQuestionReports,
  submitQuestionReport,
} from "@/lib/questionReportService";
import type {
  QuestionReport,
  QuestionReportReason,
  QuestionReportRole,
  QuestionReportSource,
} from "@/types/questionReport";

interface QuestionReportsContextValue {
  openReports: QuestionReport[];
  openQuestionIds: Set<string>;
  canReport: boolean;
  canManage: boolean;
  submitReport: (input: {
    questionId: string;
    reason: QuestionReportReason;
    comment: string;
    source: QuestionReportSource;
    contentVersion?: number;
  }) => Promise<void>;
  resolveReport: (reportId: string) => Promise<void>;
  loadMyReport: (questionId: string) => Promise<QuestionReport | null>;
  loadQuestionReports: (questionId: string) => Promise<QuestionReport[]>;
}

const QuestionReportsContext = createContext<QuestionReportsContextValue | undefined>(undefined);

export function QuestionReportsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [openReports, setOpenReports] = useState<QuestionReport[]>([]);
  const canReport = canReportQuestions(profile?.role);
  const canManage = canManageQuestionReports(profile?.role);

  useEffect(() => {
    if (!canManage || !isFirebaseConfigured) {
      setOpenReports([]);
      return;
    }
    return subscribeOpenQuestionReports(setOpenReports);
  }, [canManage]);

  const openQuestionIds = useMemo(
    () => new Set(openReports.map((report) => report.questionId)),
    [openReports],
  );

  const submitReport = useCallback(
    async (input: {
      questionId: string;
      reason: QuestionReportReason;
      comment: string;
      source: QuestionReportSource;
      contentVersion?: number;
    }) => {
      if (!profile || !canReport) {
        throw new Error("You must be signed in as a student or tutor to report a question.");
      }
      await submitQuestionReport({
        ...input,
        reporterName: profile.displayName || profile.email,
        reporterEmail: profile.email,
        reporterRole: profile.role as QuestionReportRole,
      });
    },
    [canReport, profile],
  );

  const resolveReport = useCallback(
    async (reportId: string) => {
      if (!profile || !canManage) {
        throw new Error("Only tutors can resolve question reports.");
      }
      await resolveQuestionReport({
        reportId,
        resolvedByUid: profile.uid,
        resolvedByName: profile.displayName || profile.email,
      });
    },
    [canManage, profile],
  );

  const value = useMemo<QuestionReportsContextValue>(
    () => ({
      openReports,
      openQuestionIds,
      canReport,
      canManage,
      submitReport,
      resolveReport,
      loadMyReport: fetchMyQuestionReport,
      loadQuestionReports: fetchQuestionReports,
    }),
    [canManage, canReport, openQuestionIds, openReports, resolveReport, submitReport],
  );

  return (
    <QuestionReportsContext.Provider value={value}>{children}</QuestionReportsContext.Provider>
  );
}

export function useQuestionReports(): QuestionReportsContextValue {
  const ctx = useContext(QuestionReportsContext);
  if (!ctx) {
    throw new Error("useQuestionReports must be used within QuestionReportsProvider.");
  }
  return ctx;
}
