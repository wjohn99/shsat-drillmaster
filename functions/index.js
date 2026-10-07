/**
 * Email the assigned tutor when that student comments or posts a file.
 *
 * Setup:
 *   firebase functions:secrets:set MAILGUN_API_KEY
 *   firebase deploy --only functions
 *
 * Optional functions/.env:
 *   MAILGUN_DOMAIN=stepprephub.com
 *   MAILGUN_API_HOST=api.mailgun.net
 *   NOTIFY_FROM=StepPrep Workspace <notifications@stepprephub.com>
 *   APP_URL=https://stepprephub.com
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");

initializeApp();
const db = getFirestore();

const mailgunApiKey = defineSecret("MAILGUN_API_KEY");

const triggerOptions = {
  region: "us-central1",
  secrets: [mailgunApiKey],
};

function env(name, fallback) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clip(value, max) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

async function loadBoard(boardId) {
  const snap = await db.doc(`workspace_boards/${boardId}`).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (data.deletedAt) return null;
  return { id: snap.id, ...data };
}

async function loadCard(boardId, cardId) {
  const snap = await db.doc(`workspace_boards/${boardId}/cards/${cardId}`).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (data.deletedAt) return null;
  return { id: snap.id, ...data };
}

async function resolveTutorEmail(board) {
  const stored = String(board.assignedTutorEmail || "").trim();
  if (stored.includes("@")) return stored;
  const tutorUid = String(board.assignedTutorUid || board.createdByUid || "").trim();
  if (!tutorUid) return "";
  const userSnap = await db.doc(`users/${tutorUid}`).get();
  if (!userSnap.exists) return "";
  return String(userSnap.data()?.email || "").trim();
}

async function sendMailgun({ to, subject, text, html }) {
  const apiKey = mailgunApiKey.value();
  const domain = env("MAILGUN_DOMAIN", "stepprephub.com");
  const host = env("MAILGUN_API_HOST", "api.mailgun.net");
  const from = env("NOTIFY_FROM", "StepPrep Workspace <notifications@stepprephub.com>");
  if (!apiKey) {
    throw new Error("MAILGUN_API_KEY is not set.");
  }
  const body = new URLSearchParams({ from, to, subject, text, html });
  const res = await fetch(`https://${host}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Mailgun ${res.status}: ${detail.slice(0, 400)}`);
  }
}

async function notifyAssignedTutor({ boardId, cardId, actorUid, actionLabel, preview }) {
  const board = await loadBoard(boardId);
  if (!board) {
    logger.info("skip notify: board missing", { boardId });
    return;
  }
  if (String(board.studentUid || "") !== String(actorUid || "")) {
    logger.info("skip notify: actor is not this board's student", { boardId, actorUid });
    return;
  }

  const to = await resolveTutorEmail(board);
  if (!to || !to.includes("@")) {
    logger.warn("skip notify: assigned tutor has no email", { boardId });
    return;
  }

  const card = await loadCard(boardId, cardId);
  const cardTitle = String(card?.title || "Untitled card").trim() || "Untitled card";
  const studentName = String(board.studentName || "Student").trim() || "Student";
  const appUrl = env("APP_URL", "https://stepprephub.com").replace(/\/$/, "");
  const boardUrl = `${appUrl}/workspace/${boardId}`;
  const previewText = clip(preview, 500);
  const subject = `${studentName} ${actionLabel}: ${clip(cardTitle, 80)}`;
  const text = [
    `${studentName} ${actionLabel} on their workspace.`,
    `Card: ${cardTitle}`,
    previewText ? `Details: ${previewText}` : null,
    `Open board: ${boardUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
  const html = `
    <p><strong>${escapeHtml(studentName)}</strong> ${escapeHtml(actionLabel)} on their workspace.</p>
    <p>Card: ${escapeHtml(cardTitle)}</p>
    ${previewText ? `<p>${escapeHtml(previewText)}</p>` : ""}
    <p><a href="${escapeHtml(boardUrl)}">Open board</a></p>
  `;

  await sendMailgun({ to, subject, text, html });
  logger.info("tutor notified", { boardId, cardId, to, subject });
}

exports.onStudentCardComment = onDocumentCreated(
  {
    ...triggerOptions,
    document: "workspace_boards/{boardId}/cards/{cardId}/comments/{commentId}",
  },
  async (event) => {
    const data = event.data?.data() || {};
    await notifyAssignedTutor({
      boardId: event.params.boardId,
      cardId: event.params.cardId,
      actorUid: data.authorUid,
      actionLabel: "commented",
      preview: data.body,
    });
  },
);

exports.onStudentCardAttachment = onDocumentCreated(
  {
    ...triggerOptions,
    document: "workspace_boards/{boardId}/cards/{cardId}/attachments/{attachmentId}",
  },
  async (event) => {
    const data = event.data?.data() || {};
    const kind = data.kind === "link" ? "added a link" : "uploaded a PDF";
    await notifyAssignedTutor({
      boardId: event.params.boardId,
      cardId: event.params.cardId,
      actorUid: data.uploadedByUid,
      actionLabel: kind,
      preview: data.fileName,
    });
  },
);

exports.onStudentAttachmentSubmission = onDocumentCreated(
  {
    ...triggerOptions,
    document:
      "workspace_boards/{boardId}/cards/{cardId}/attachments/{attachmentId}/submissions/{submissionId}",
  },
  async (event) => {
    const data = event.data?.data() || {};
    await notifyAssignedTutor({
      boardId: event.params.boardId,
      cardId: event.params.cardId,
      actorUid: data.submittedByUid,
      actionLabel: "submitted completed work",
      preview: data.notes || data.submissionUrl,
    });
  },
);
