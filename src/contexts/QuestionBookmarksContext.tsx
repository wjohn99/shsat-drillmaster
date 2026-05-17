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
  fetchBookmarkedQuestionIds,
  setQuestionBookmark,
} from "@/lib/questionBookmarkService";

interface QuestionBookmarksContextValue {
  bookmarkedIds: Set<string>;
  loading: boolean;
  isBookmarked: (questionId: string) => boolean;
  toggleBookmark: (questionId: string) => Promise<void>;
}

const QuestionBookmarksContext = createContext<QuestionBookmarksContextValue | undefined>(
  undefined,
);

export function QuestionBookmarksProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) {
      setBookmarkedIds(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchBookmarkedQuestionIds(profile.uid)
      .then((ids) => {
        if (!cancelled) setBookmarkedIds(ids);
      })
      .catch(() => {
        if (!cancelled) setBookmarkedIds(new Set());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.uid]);

  const toggleBookmark = useCallback(
    async (questionId: string) => {
      if (!profile?.uid) return;

      const willBookmark = !bookmarkedIds.has(questionId);
      const previous = bookmarkedIds;

      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (willBookmark) next.add(questionId);
        else next.delete(questionId);
        return next;
      });

      try {
        await setQuestionBookmark(profile.uid, questionId, willBookmark);
      } catch {
        setBookmarkedIds(previous);
        throw new Error("Could not update saved question.");
      }
    },
    [bookmarkedIds, profile?.uid],
  );

  const value = useMemo(
    () => ({
      bookmarkedIds,
      loading,
      isBookmarked: (questionId: string) => bookmarkedIds.has(questionId),
      toggleBookmark,
    }),
    [bookmarkedIds, loading, toggleBookmark],
  );

  return (
    <QuestionBookmarksContext.Provider value={value}>
      {children}
    </QuestionBookmarksContext.Provider>
  );
}

export function useQuestionBookmarks(): QuestionBookmarksContextValue {
  const ctx = useContext(QuestionBookmarksContext);
  if (!ctx) {
    throw new Error("useQuestionBookmarks must be used within QuestionBookmarksProvider");
  }
  return ctx;
}
