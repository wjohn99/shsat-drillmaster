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
import {
  approveQuestionAsJed,
  canReviewQuestions,
  fetchAllQuestionReviewStates,
  saveTutorQuestionReview,
  subscribeToQuestionReview,
} from "@/lib/questionReviewService";
import type { QuestionReviewState } from "@/types/questionReview";

interface QuestionReviewContextValue {
  states: Map<string, QuestionReviewState>;
  loading: boolean;
  refresh: () => Promise<void>;
  saveTutorReview: (input: {
    questionId: string;
    comment: string;
    suggestedEdits: string;
  }) => Promise<void>;
  jedFinalApprove: (questionId: string) => Promise<void>;
  watchQuestion: (questionId: string) => () => void;
}

const QuestionReviewContext = createContext<QuestionReviewContextValue | undefined>(undefined);

export function QuestionReviewProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [states, setStates] = useState<Map<string, QuestionReviewState>>(new Map());
  const [loading, setLoading] = useState(false);

  const canReview = canReviewQuestions(profile?.role);

  const refresh = useCallback(async () => {
    if (!canReview) {
      setStates(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchAllQuestionReviewStates();
      setStates(next);
    } catch {
      setStates(new Map());
    } finally {
      setLoading(false);
    }
  }, [canReview]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mergeState = useCallback((state: QuestionReviewState) => {
    setStates((prev) => {
      const next = new Map(prev);
      next.set(state.questionId, state);
      return next;
    });
  }, []);

  const saveTutorReview = useCallback(
    async (input: {
      questionId: string;
      comment: string;
      suggestedEdits: string;
    }) => {
      if (!profile || !canReview) {
        throw new Error("Only tutors can review provisional questions.");
      }
      const next = await saveTutorQuestionReview({
        questionId: input.questionId,
        tutorUid: profile.uid,
        tutorName: profile.displayName.trim() || profile.email,
        tutorEmail: profile.email,
        comment: input.comment,
        suggestedEdits: input.suggestedEdits,
      });
      mergeState(next);
    },
    [canReview, mergeState, profile],
  );

  const jedFinalApprove = useCallback(
    async (questionId: string) => {
      if (!profile || !canReview) {
        throw new Error("Only Jed can remove the provisional tag.");
      }
      const next = await approveQuestionAsJed({
        questionId,
        jedUid: profile.uid,
        jedEmail: profile.email,
      });
      mergeState(next);
    },
    [canReview, mergeState, profile],
  );

  const watchQuestion = useCallback(
    (questionId: string) => {
      if (!canReview) return () => undefined;
      return subscribeToQuestionReview(questionId, mergeState);
    },
    [canReview, mergeState],
  );

  const value = useMemo<QuestionReviewContextValue>(
    () => ({
      states,
      loading,
      refresh,
      saveTutorReview,
      jedFinalApprove,
      watchQuestion,
    }),
    [jedFinalApprove, loading, refresh, saveTutorReview, states, watchQuestion],
  );

  return (
    <QuestionReviewContext.Provider value={value}>{children}</QuestionReviewContext.Provider>
  );
}

export function useQuestionReviews(): QuestionReviewContextValue {
  const ctx = useContext(QuestionReviewContext);
  if (!ctx) {
    throw new Error("useQuestionReviews must be used within QuestionReviewProvider.");
  }
  return ctx;
}
