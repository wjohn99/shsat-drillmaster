import {
  assignmentDueDateInputToTimestamp,
  createAssignment,
  defaultAssignmentDueDateInput,
  setAssignmentWorkspaceCard,
} from "@/lib/assignmentService";
import { loadQuestionCatalogSync } from "@/data/questionCatalog";
import {
  DEMO_TUTORIAL_ALGEBRA_TAGS,
  DEMO_TUTORIAL_WORKSHEET_TITLE,
  isDemoTutorialSessionCardTitle,
  pickDemoTutorialAlgebraQuestionIds,
} from "@/lib/demoTutorial";
import { logWorksheetAssignedToCard } from "@/lib/workspaceCardContentService";
import { fetchWorkspaceCards, linkAssignmentToWorkspace } from "@/lib/workspaceService";

export type DemoTutorialAssignmentResult = {
  created: boolean;
  cardId: string | null;
  assignmentId: string | null;
};

const inflight = new Map<string, Promise<DemoTutorialAssignmentResult>>();

function demoTutorialQuestionIds(preferred?: string[]): string[] {
  const fromCaller = preferred?.map(String).filter(Boolean) ?? [];
  if (fromCaller.length > 0) return fromCaller;
  return pickDemoTutorialAlgebraQuestionIds(loadQuestionCatalogSync("demo").questions);
}

/**
 * Pins a real assigned worksheet on Avery's Session 2 for the demo tour.
 * Idempotent: skips if that card already has an assignment.
 */
export async function ensureDemoTutorialAssignmentOnSessionCard(input: {
  tutorUid: string;
  boardId: string;
  studentUid: string;
  questionIds?: string[];
}): Promise<DemoTutorialAssignmentResult> {
  const existing = inflight.get(input.boardId);
  if (existing) return existing;

  const work = (async (): Promise<DemoTutorialAssignmentResult> => {
    const cards = await fetchWorkspaceCards(input.boardId);
    const card = cards.find((row) => isDemoTutorialSessionCardTitle(row.title));
    if (!card) return { created: false, cardId: null, assignmentId: null };
    if (card.assignmentId) {
      return { created: false, cardId: card.id, assignmentId: card.assignmentId };
    }

    const questionIds = demoTutorialQuestionIds(input.questionIds);
    if (questionIds.length === 0) {
      return { created: false, cardId: card.id, assignmentId: null };
    }

    const dueDateInput = defaultAssignmentDueDateInput();
    const dueAt = assignmentDueDateInputToTimestamp(dueDateInput);
    const assignmentId = await createAssignment({
      questionIds,
      tutorUid: input.tutorUid,
      assignedToStudentUid: input.studentUid,
      title: DEMO_TUTORIAL_WORKSHEET_TITLE,
      tagCodes: [...DEMO_TUTORIAL_ALGEBRA_TAGS],
      dueAt,
      revealAnswers: true,
      workspace: {
        boardId: input.boardId,
        listId: card.listId,
        existingCardId: card.id,
      },
    });
    await linkAssignmentToWorkspace({
      boardId: input.boardId,
      listId: card.listId,
      assignmentId,
      dueAt,
      existingCardId: card.id,
    });
    await setAssignmentWorkspaceCard(assignmentId, card.id);
    const dueLabel = new Date(`${dueDateInput}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    await logWorksheetAssignedToCard(
      input.boardId,
      card.id,
      DEMO_TUTORIAL_WORKSHEET_TITLE,
      dueLabel,
    );
    return { created: true, cardId: card.id, assignmentId };
  })().finally(() => {
    inflight.delete(input.boardId);
  });

  inflight.set(input.boardId, work);
  return work;
}
