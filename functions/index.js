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
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function grantParentReadAccess(parentUid, studentUid) {
  const [assignmentSnap, sessionSnap] = await Promise.all([
    db.collection("assignments").where("assignedToStudentUid", "==", studentUid).get(),
    db.collection("practice_sessions").where("userId", "==", studentUid).get(),
  ]);
  const refs = [
    ...assignmentSnap.docs,
    ...sessionSnap.docs.filter((row) => {
      const sessionType = row.data().sessionType;
      return sessionType === "assignment" || sessionType === "diagnostic";
    }),
  ].map((row) => row.ref);

  for (let index = 0; index < refs.length; index += 400) {
    const batch = db.batch();
    for (const ref of refs.slice(index, index + 400)) {
      batch.update(ref, { readerUids: FieldValue.arrayUnion(parentUid) });
    }
    await batch.commit();
  }
}

exports.linkParentAccount = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in with Google first.");
  }

  const studentEmail = normalizeEmail(request.data?.studentEmail);
  const parentEmail = normalizeEmail(request.auth.token.email);
  const parentUid = request.auth.uid;
  if (!parentEmail) {
    throw new HttpsError("failed-precondition", "Your Google account must have an email address.");
  }
  if (!studentEmail || !studentEmail.includes("@")) {
    throw new HttpsError("invalid-argument", "Enter the student's email.");
  }
  if (studentEmail === parentEmail) {
    throw new HttpsError(
      "failed-precondition",
      "This Google account matches the student email. Use the parent's own Google account.",
    );
  }

  const [whitelistSnap, parentSnap, linkSnap, studentsSnap] = await Promise.all([
    db.doc(`tutor_whitelist/${parentEmail}`).get(),
    db.doc(`users/${parentUid}`).get(),
    db.doc(`parent_links/${parentUid}`).get(),
    db.collection("users").where("role", "==", "student").get(),
  ]);

  if (whitelistSnap.exists) {
    throw new HttpsError("failed-precondition", "This Google account is a tutor.");
  }

  const existingRole = parentSnap.exists ? parentSnap.data().role : null;
  if (existingRole === "student") {
    throw new HttpsError(
      "failed-precondition",
      "This Google account is a student. Sign in as a student, or use the parent's own Google account.",
    );
  }
  if (existingRole === "tutor") {
    throw new HttpsError("failed-precondition", "This Google account is a tutor.");
  }

  const studentDoc = studentsSnap.docs.find(
    (row) => normalizeEmail(row.data().email) === studentEmail,
  );
  if (!studentDoc) {
    throw new HttpsError(
      "failed-precondition",
      "The email you entered is not a valid student account. No parent account was created.",
    );
  }

  const existingLink = linkSnap.exists ? linkSnap.data() : null;
  if (
    existingLink
    && existingLink.status === "approved"
    && existingLink.studentUid
    && existingLink.studentUid !== studentDoc.id
  ) {
    throw new HttpsError("failed-precondition", "This parent account is already linked to another student.");
  }

  const student = studentDoc.data();
  const studentName = student.displayName || student.email || "Student";
  const now = FieldValue.serverTimestamp();

  await db.doc(`users/${parentUid}`).set(
    {
      uid: parentUid,
      email: request.auth.token.email,
      displayName: request.auth.token.name || parentSnap.data()?.displayName || "",
      photoURL: request.auth.token.picture || parentSnap.data()?.photoURL || null,
      role: "parent",
      lastActiveAt: now,
      ...(parentSnap.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );
  await db.doc(`parent_links/${parentUid}`).set(
    {
      parentUid,
      parentEmail,
      studentEmail,
      studentUid: studentDoc.id,
      studentName,
      status: "approved",
      updatedAt: now,
      ...(linkSnap.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );
  await db.doc(`student_parent_readers/${studentDoc.id}`).set(
    {
      studentUid: studentDoc.id,
      parentUids: FieldValue.arrayUnion(parentUid),
      updatedAt: now,
    },
    { merge: true },
  );
  await grantParentReadAccess(parentUid, studentDoc.id);

  return { studentUid: studentDoc.id, studentName };
});

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
