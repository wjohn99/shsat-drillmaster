function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isDemoWorkspaceBoard(board) {
  return Boolean(board && board.demoAccount);
}

/**
 * Who should get the email for a comment, file, or submission on this board.
 * Students only receive mail for activity on their own board, and never for
 * their own posts. Assigned tutors only receive mail when that board's student posts.
 */
function workspaceNotifyAudience(board, actorUid) {
  if (!board || isDemoWorkspaceBoard(board)) return null;
  const studentUid = String(board.studentUid || "").trim();
  const actor = String(actorUid || "").trim();
  if (!studentUid || !actor) return null;
  if (actor === studentUid) return "assigned_tutor";
  return "board_student";
}

/**
 * Linked parents hear about tutor posts on their own child's board.
 * The student's own comments, uploads, and submissions stay with the tutor.
 */
function parentNotifyAudience(board, actorUid) {
  if (!board || isDemoWorkspaceBoard(board)) return null;
  const studentUid = String(board.studentUid || "").trim();
  const actor = String(actorUid || "").trim();
  if (!studentUid || !actor || actor === studentUid) return null;
  return "linked_parents";
}

function parentLinkMatchesStudent(link, studentUid) {
  const student = String(studentUid || "").trim();
  if (!link || !student) return false;
  if (link.status !== "approved") return false;
  return String(link.studentUid || "").trim() === student;
}

function progressRows(roadmap) {
  if (!roadmap || typeof roadmap !== "object") return [];
  const rows = roadmap.progressUpdates;
  return Array.isArray(rows) ? rows : [];
}

const MAX_NEW_PROGRESS_EMAILS = 3;

/** Progress updates that were not on the board before this write, posted by someone other than the student. */
function newTutorProgressUpdates(beforeRoadmap, afterRoadmap, board) {
  const studentUid = String(board?.studentUid || "").trim();
  if (!board || isDemoWorkspaceBoard(board) || !studentUid) return [];
  const seen = new Set(
    progressRows(beforeRoadmap)
      .map((row) => String(row && row.id ? row.id : "").trim())
      .filter(Boolean),
  );
  const added = [];
  for (const row of progressRows(afterRoadmap)) {
    if (!row || typeof row !== "object") continue;
    const id = String(row.id || "").trim();
    const changed = String(row.changed || "").trim();
    const actor = String(row.createdByUid || "").trim();
    if (!id || seen.has(id) || !changed || !actor || actor === studentUid) continue;
    added.push({
      id,
      changed,
      next: String(row.next || "").trim(),
      cardId: String(row.cardId || "").trim(),
      createdByUid: actor,
      createdByName: String(row.createdByName || "").trim(),
      createdAtMs: Number(row.createdAtMs) || 0,
    });
  }
  added.sort((a, b) => b.createdAtMs - a.createdAtMs);
  return added.slice(0, MAX_NEW_PROGRESS_EMAILS);
}

function isSendableEmail(email) {
  const value = normalizeEmail(email);
  if (!value.includes("@")) return false;
  if (value.endsWith("@example.com")) return false;
  return true;
}

function workspaceBoardUrl(appUrl, board, cardId) {
  const base = String(appUrl || "").replace(/\/$/, "");
  const studentUid = String(board?.studentUid || board?.id || "").trim();
  const path = `${base}/workspace/${studentUid || board?.id}`;
  const id = String(cardId || "").trim();
  if (!id) return path;
  return `${path}?card=${encodeURIComponent(id)}`;
}

module.exports = {
  normalizeEmail,
  isDemoWorkspaceBoard,
  workspaceNotifyAudience,
  parentNotifyAudience,
  parentLinkMatchesStudent,
  newTutorProgressUpdates,
  isSendableEmail,
  workspaceBoardUrl,
};
