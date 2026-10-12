import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  filterCatalogForViewer,
  loadFullPracticeCatalog,
  type QuestionCatalog,
} from "@/data/questionCatalog";
import { getQuestionsForTopic } from "@/data/navigationData";
import { filterQuestions, type QuestionFilterInput } from "@/lib/questionFilters";
import { useAuth } from "@/contexts/AuthContext";
import type { Form, Passage, Question } from "@/types";
import type { SubjectNavigation } from "@/types/navigation";

type QuestionsContextValue = {
  questions: Question[];
  passages: Passage[];
  forms: Form[];
  navigationData: SubjectNavigation[];
  loading: boolean;
  error: string | null;
  getFilteredQuestions: (
    filters: QuestionFilterInput,
    catalog?: Question[],
  ) => Question[];
  getQuestionById: (id: string) => Question | undefined;
  getQuestionsForTopic: (topicId: string) => Question[];
  /** Resolve assigned worksheet IDs from the full bank, including provisional items. */
  getQuestionsByIds: (ids: string[]) => Question[];
  getPassagesForQuestions: (items: Question[]) => Passage[];
};

const QuestionsContext = createContext<QuestionsContextValue | null>(null);

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const [fullCatalog, setFullCatalog] = useState<QuestionCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => loadFullPracticeCatalog())
      .then((next) => {
        if (!cancelled) {
          setFullCatalog(next);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load question bank.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = useMemo(() => {
    if (!fullCatalog) return null;
    const role = authLoading ? undefined : profile?.role;
    return filterCatalogForViewer(fullCatalog, role);
  }, [fullCatalog, authLoading, profile?.role]);

  const getFilteredQuestions = useCallback(
    (filters: QuestionFilterInput, source?: Question[]) => {
      const pool = source ?? catalog?.questions ?? [];
      return filterQuestions(filters, pool);
    },
    [catalog],
  );

  const getQuestionById = useCallback(
    (id: string) => catalog?.questions.find((q) => q.id === id),
    [catalog],
  );

  const getQuestionsForTopicId = useCallback(
    (topicId: string) => {
      if (!catalog) return [];
      return getQuestionsForTopic(catalog.questions, topicId, catalog.navigationData);
    },
    [catalog],
  );

  const getQuestionsByIds = useCallback(
    (ids: string[]) => {
      if (!fullCatalog) return [];
      const byId = new Map(fullCatalog.questions.map((question) => [question.id, question]));
      return ids
        .map((id) => byId.get(id))
        .filter((question): question is Question => question !== undefined);
    },
    [fullCatalog],
  );

  const getPassagesForQuestions = useCallback(
    (items: Question[]) => {
      if (!fullCatalog) return [];
      const passageIds = new Set(
        items.map((question) => question.passageId).filter((id): id is string => Boolean(id)),
      );
      return fullCatalog.passages.filter((passage) => passageIds.has(passage.id));
    },
    [fullCatalog],
  );

  const value = useMemo<QuestionsContextValue>(
    () => ({
      questions: catalog?.questions ?? [],
      passages: catalog?.passages ?? [],
      forms: catalog?.forms ?? [],
      navigationData: catalog?.navigationData ?? [],
      loading,
      error,
      getFilteredQuestions,
      getQuestionById,
      getQuestionsForTopic: getQuestionsForTopicId,
      getQuestionsByIds,
      getPassagesForQuestions,
    }),
    [
      catalog,
      loading,
      error,
      getFilteredQuestions,
      getQuestionById,
      getQuestionsForTopicId,
      getQuestionsByIds,
      getPassagesForQuestions,
    ],
  );

  return <QuestionsContext.Provider value={value}>{children}</QuestionsContext.Provider>;
}

export function useQuestions(): QuestionsContextValue {
  const ctx = useContext(QuestionsContext);
  if (!ctx) {
    throw new Error("useQuestions must be used within QuestionsProvider.");
  }
  return ctx;
}
