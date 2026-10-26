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
  isSendableEmail,
  workspaceBoardUrl,
};
