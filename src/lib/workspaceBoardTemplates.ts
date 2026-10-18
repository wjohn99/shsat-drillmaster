import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { getWorkspaceBoardTemplate } from "@/data/workspaceBoardTemplates";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { WorkspaceBoardTemplate } from "@/lib/workspaceBoardTemplateTypes";

const BOARDS_COLLECTION = "workspace_boards";
const WRITE_BATCH_LIMIT = 400;

export {
  BLANK_WORKSPACE_BOARD_TEMPLATE_ID,
  DEFAULT_WORKSPACE_BOARD_TEMPLATE_ID,
  isSharedWorkspaceTemplateStoragePath,
  WORKSPACE_TEMPLATE_STORAGE_PREFIX,
} from "@/lib/workspaceBoardTemplateTypes";
export {
  getWorkspaceBoardTemplate,
  WORKSPACE_BOARD_TEMPLATE_OPTIONS,
  WORKSPACE_BOARD_TEMPLATES,
} from "@/data/workspaceBoardTemplates";

export function workspaceBoardTemplateAttachmentCount(template: WorkspaceBoardTemplate): number {
  return template.lists.reduce(
    (sum, list) => sum + list.cards.reduce((inner, card) => inner + card.attachments.length, 0),
    0,
  );
}

/** Copy a template's lists, cards, and shared PDFs onto a new student board. */
export async function applyWorkspaceBoardTemplate(
  boardId: string,
  templateId: string,
): Promise<void> {
  const template = getWorkspaceBoardTemplate(templateId);
  if (!template) return;

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be signed in to apply a board template.");
  }

  const db = getFirebaseDb();
  const uploadedByName = (user.displayName || user.email || "Tutor").slice(0, 200);
  const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  for (const [listIndex, list] of template.lists.entries()) {
    const listRef = doc(collection(db, BOARDS_COLLECTION, boardId, "lists"));
    ops.push((batch) => {
      batch.set(listRef, {
        title: list.title.slice(0, 200),
        kind: list.kind,
        position: listIndex,
        createdAt: serverTimestamp(),
      });
    });

    for (const [cardIndex, card] of list.cards.entries()) {
      const cardRef = doc(collection(db, BOARDS_COLLECTION, boardId, "cards"));
      ops.push((batch) => {
        batch.set(cardRef, {
          listId: listRef.id,
          title: card.title.slice(0, 200),
          description: card.description.slice(0, 20000),
          position: cardIndex,
          completed: false,
          commentCount: 0,
          attachmentCount: card.attachments.length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      for (const attachment of card.attachments) {
        const attachmentRef = doc(
          collection(db, BOARDS_COLLECTION, boardId, "cards", cardRef.id, "attachments"),
        );
        ops.push((batch) => {
          batch.set(attachmentRef, {
            kind: "file",
            fileName: attachment.fileName.slice(0, 200),
            storagePath: attachment.storagePath,
            contentType: attachment.contentType,
            sizeBytes: attachment.sizeBytes,
            uploadedByUid: user.uid,
            uploadedByName,
            createdAt: serverTimestamp(),
          });
        });
      }
    }
  }

  for (let i = 0; i < ops.length; i += WRITE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const write of ops.slice(i, i + WRITE_BATCH_LIMIT)) write(batch);
    await batch.commit();
  }
}
