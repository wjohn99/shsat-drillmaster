#!/usr/bin/env node
/**
 * Merge a Trello board JSON export into one Drillmaster student workspace.
 *
 * Target boards are not always empty. Some already have lists, and those lists
 * may already have cards with notes, comments, and files. Keep that content.
 * Do not dump Trello cards into a differently named column.
 *
 * List shape comes from Trello, not from Drillmaster templates:
 *   - Trello boards differ: list count and list names are not the same student
 *     to student, and they will not match Session Summaries / Study Sheets / Info.
 *   - Every Trello list must exist on the workspace under that Trello list's
 *     exact name (emoji stripped, spacing trimmed). No alias mapping
 *     (e.g. Files is not Study Sheets).
 *   - Match an existing list only by trelloListId (re-runs) or exact name.
 *   - If no exact-name list exists, create one. Unmatched existing lists and
 *     their cards stay on the board, shifted after the Trello columns.
 *
 * Workflow:
 *   1. Create the student board in Drillmaster if it does not exist yet.
 *      New boards start with no lists; older boards may already have columns.
 *   2. Run this import. It aligns lists to the Trello export (count + exact
 *      names + order), then cards, comments, and PDFs.
 *
 * Safe to re-run: imported Trello lists, cards, comments, and attachments use
 * stable ids (trello_<trelloId>). Existing Drillmaster lists/cards are kept.
 *
 * Usage:
 *   node scripts/import-trello-board.mjs --json /path/to/board.json --email student@email.com
 *
 * Options:
 *   --dry-run          Print the plan; do not write
 *   --skip-attachments Skip PDF download/upload
 *
 * PDFs: reads TRELLO_API_KEY and TRELLO_TOKEN from gitignored .env (or the shell).
 * Auth: uses the local `firebase login` refresh token (same as storage:provision).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const PROJECT_ID = "drillmaster-cee20";
const STORAGE_BUCKET = "drillmaster-cee20.firebasestorage.app";
const FIREBASE_CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const FIREBASE_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const FIREBASE_TOOLS_PATH = path.join(os.homedir(), ".config/configstore/firebase-tools.json");

/** Infer Drillmaster list kind from a Trello title. Titles themselves are kept as exported. */
const LIST_KIND_BY_TITLE = {
  "session summaries": "sessions",
  "summary & assignments": "sessions",
  "summary and assignments": "sessions",
  completed: "sessions",
  "viaan homework": "sessions",
  info: "info",
  "goggle doc for homework": "info",
  "google docs for homwork": "info",
  "google doc for homework": "info",
  tests: "tests",
  "study sheets": "custom",
  files: "custom",
};

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const out = { json: "", email: "", dryRun: false, skipAttachments: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--skip-attachments") out.skipAttachments = true;
    else if (arg === "--json") out.json = argv[++i] ?? "";
    else if (arg === "--email") out.email = argv[++i] ?? "";
    else if (arg === "--help" || arg === "-h") out.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function printUsage() {
  console.log(`node scripts/import-trello-board.mjs --json <export.json> --email <student@email.com> [--dry-run] [--skip-attachments]`);
}

function trelloDocId(trelloId) {
  return `trello_${trelloId}`;
}

function normalizeTitle(value) {
  return String(value || "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[^\p{L}\p{N}&]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function titleForTrelloList(name) {
  return (
    String(name || "List")
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/\u200c/g, "")
      .replace(/\s+/g, " ")
      .trim() || "List"
  );
}

function exactListTitleKey(value) {
  return titleForTrelloList(value).toLowerCase();
}

function kindForTrelloList(name) {
  const key = normalizeTitle(name);
  if (LIST_KIND_BY_TITLE[key]) return LIST_KIND_BY_TITLE[key];
  if (key.includes("session")) return "sessions";
  if (key.includes("google doc")) return "info";
  if (key.includes("test")) return "tests";
  return "custom";
}

function isPdfAttachment(att) {
  const name = String(att?.name || att?.fileName || "").toLowerCase();
  const mime = String(att?.mimeType || "").toLowerCase();
  return name.endsWith(".pdf") || mime.includes("pdf");
}

function cleanText(value) {
  return String(value || "")
    .replace(/\u200c/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeStorageFileName(name) {
  const trimmed = name.trim() || "document.pdf";
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
}

function parseSessionMeta(desc) {
  const lines = String(desc || "").replace(/\r\n/g, "\n").split("\n");
  const meta = {};
  const used = new Set();
  const matchers = [
    ["studentName", /^name:\s*(.+)$/i],
    ["sessionDate", /^date:\s*(.+)$/i],
    ["startTime", /^start time:\s*(.+)$/i],
    ["duration", /^duration:\s*(.+)$/i],
    ["location", /^location:\s*(.+)$/i],
  ];
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const line = lines[i].replace(/\u200c/g, "").trim();
    if (!line) continue;
    for (const [key, pattern] of matchers) {
      if (meta[key]) continue;
      const match = line.match(pattern);
      if (match) {
        meta[key] = match[1].trim();
        used.add(i);
      }
    }
  }
  const rest = lines
    .filter((_, index) => !used.has(index))
    .join("\n");
  return {
    sessionMeta: Object.keys(meta).length ? meta : undefined,
    description: cleanText(rest),
  };
}

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === "object") {
    const fields = {};
    for (const [key, nested] of Object.entries(value)) {
      if (nested !== undefined) fields[key] = encodeValue(nested);
    }
    return { mapValue: { fields } };
  }
  throw new Error(`Cannot encode value: ${typeof value}`);
}

function encodeFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) fields[key] = encodeValue(value);
  }
  return fields;
}

function decodeValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  return undefined;
}

function decodeFields(fields = {}) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = decodeValue(value);
  }
  return out;
}

function docIdFromName(name) {
  return String(name).split("/").pop();
}

async function refreshFirebaseAccessToken() {
  if (!fs.existsSync(FIREBASE_TOOLS_PATH)) {
    throw new Error("Firebase CLI is not logged in. Run: firebase login");
  }
  const cfg = JSON.parse(fs.readFileSync(FIREBASE_TOOLS_PATH, "utf8"));
  const refreshToken = cfg.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error("Missing Firebase refresh token. Run: firebase login --reauth");
  }
  const body = new URLSearchParams({
    client_id: FIREBASE_CLIENT_ID,
    client_secret: FIREBASE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/firebase",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(
      `Could not refresh Firebase login token. Run: firebase login --reauth\n${JSON.stringify(json)}`,
    );
  }
  return { accessToken: json.access_token, email: cfg.user?.email || "" };
}

function firestoreRoot() {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
}

async function firestoreRequest(accessToken, pathname, { method = "GET", json } = {}) {
  const url = pathname.startsWith("http") ? pathname : `${firestoreRoot()}${pathname}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: json ? JSON.stringify(json) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 500) };
  }
  if (!res.ok) {
    throw new Error(`${method} ${url} failed ${res.status}: ${text.slice(0, 800)}`);
  }
  return parsed;
}

async function listDocuments(accessToken, relativePath) {
  const docs = [];
  let pageToken = "";
  do {
    const qs = new URLSearchParams({ pageSize: "100" });
    if (pageToken) qs.set("pageToken", pageToken);
    const parsed = await firestoreRequest(accessToken, `${relativePath}?${qs}`);
    docs.push(...(parsed.documents || []));
    pageToken = parsed.nextPageToken || "";
  } while (pageToken);
  return docs.map((doc) => ({
    id: docIdFromName(doc.name),
    data: decodeFields(doc.fields),
  }));
}

async function upsertDocument(accessToken, relativePath, fields) {
  const mask = Object.keys(fields)
    .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
    .join("&");
  return firestoreRequest(accessToken, `${relativePath}?${mask}`, {
    method: "PATCH",
    json: { fields: encodeFields(fields) },
  });
}

function loadTrelloBoard(jsonPath) {
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (!raw.cards || !raw.lists) {
    throw new Error("That file does not look like a Trello board JSON export.");
  }
  return raw;
}

function memberName(board, memberId, fallback = "Tutor") {
  const member = (board.members || []).find((item) => item.id === memberId);
  return member?.fullName || member?.username || fallback;
}

function buildImportPlan(board) {
  const lists = [...(board.lists || [])]
    .filter((list) => {
      if (!list.closed) return true;
      return (board.cards || []).some((card) => card.idList === list.id && !card.closed);
    })
    .sort((a, b) => (a.pos || 0) - (b.pos || 0));

  const commentsByCard = new Map();
  for (const action of board.actions || []) {
    if (action.type !== "commentCard") continue;
    const cardId = action.data?.card?.id || action.data?.idCard;
    if (!cardId) continue;
    const list = commentsByCard.get(cardId) || [];
    list.push({
      id: action.id,
      date: action.date,
      text: action.data?.text || "",
      authorName: action.memberCreator?.fullName || "Tutor",
      authorId: action.idMemberCreator || "",
    });
    commentsByCard.set(cardId, list);
  }
  for (const list of commentsByCard.values()) {
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  const createDates = new Map();
  for (const action of board.actions || []) {
    if (action.type === "createCard" && action.data?.card?.id) {
      createDates.set(action.data.card.id, action.date);
    }
  }

  const plannedLists = lists.map((list, index) => {
    const title = titleForTrelloList(list.name);
    const kind = kindForTrelloList(list.name);
    return {
      trelloId: list.id,
      trelloTitle: String(list.name || "List").trim() || "List",
      title,
      kind,
      position: index,
      cards: (board.cards || [])
        .filter((card) => card.idList === list.id && !card.closed)
        .sort((a, b) => (a.pos || 0) - (b.pos || 0))
        .map((card) => {
          const parsed =
            kind === "sessions"
              ? parseSessionMeta(card.desc || "")
              : { sessionMeta: undefined, description: cleanText(card.desc || "") };
          const attachments = [...(card.attachments || [])]
            .filter((att) => att.isUpload && isPdfAttachment(att))
            .sort((a, b) => (a.pos || 0) - (b.pos || 0));
          return {
            trelloId: card.id,
            shortLink: card.shortLink || "",
            title: String(card.name || "Untitled").trim() || "Untitled",
            description: parsed.description,
            sessionMeta: parsed.sessionMeta,
            completed: Boolean(card.dueComplete),
            due: card.due || null,
            createdAt: createDates.get(card.id) || card.dateLastActivity || new Date().toISOString(),
            updatedAt: card.dateLastActivity || createDates.get(card.id) || new Date().toISOString(),
            comments: commentsByCard.get(card.id) || [],
            attachments,
          };
        }),
    };
  });

  return {
    trelloBoardId: board.id,
    trelloBoardName: board.name,
    trelloShortUrl: board.shortUrl || "",
    lists: plannedLists,
  };
}

function findStudentBoard(boards, email) {
  const needle = email.trim().toLowerCase();
  const exact = boards.filter((board) => String(board.data.studentEmail || "").toLowerCase() === needle);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    throw new Error(`More than one workspace board uses ${email}.`);
  }
  const fuzzy = boards.filter((board) =>
    String(board.data.studentEmail || "").toLowerCase().includes(needle.split("@")[0]),
  );
  if (fuzzy.length === 1) return fuzzy[0];
  throw new Error(
    `No workspace board found for ${email}. Create the student board in Drillmaster first, then run this import.`,
  );
}

function trelloAuthHeader(key, token) {
  return `OAuth oauth_consumer_key="${key}", oauth_token="${token}"`;
}

async function downloadTrelloPdf(att, cardId, key, token) {
  const fileName = encodeURIComponent(att.fileName || att.name || "file.pdf");
  const candidates = [
    `https://api.trello.com/1/cards/${cardId}/attachments/${att.id}/download/${fileName}`,
    att.url,
  ].filter(Boolean);

  let lastError = "no URL";
  for (const url of candidates) {
    const headers = {};
    if (key && token) headers.Authorization = trelloAuthHeader(key, token);
    const res = await fetch(url, { redirect: "follow", headers });
    if (!res.ok) {
      lastError = `${res.status} ${res.statusText}`;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5 || buf.subarray(0, 4).toString() !== "%PDF") {
      lastError = "response was not a PDF";
      continue;
    }
    return buf;
  }
  throw new Error(lastError);
}

async function uploadPdf(accessToken, storagePath, bytes) {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/pdf",
    },
    body: bytes,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload failed ${res.status}: ${text.slice(0, 400)}`);
  }
}

async function main() {
  loadDotEnv(path.join(ROOT, ".env"));
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    return;
  }
  if (!args.json || !args.email) {
    printUsage();
    process.exit(1);
  }
  if (!fs.existsSync(args.json)) {
    throw new Error(`JSON not found: ${args.json}`);
  }

  const trello = loadTrelloBoard(args.json);
  const plan = buildImportPlan(trello);
  const trelloKey = process.env.TRELLO_API_KEY || "";
  const trelloToken = process.env.TRELLO_TOKEN || "";
  const wantPdfs = !args.skipAttachments;

  console.log(`Trello board: ${plan.trelloBoardName} (${plan.trelloShortUrl || plan.trelloBoardId})`);
  console.log(`Trello lists (${plan.lists.length}), using exact Trello names:`);
  for (const list of plan.lists) {
    const pdfs = list.cards.reduce((n, card) => n + card.attachments.length, 0);
    const comments = list.cards.reduce((n, card) => n + card.comments.length, 0);
    const from = list.trelloTitle && titleForTrelloList(list.trelloTitle) !== list.title ? ` ← ${list.trelloTitle}` : "";
    console.log(`  - ${list.title}${from} (${list.kind}): ${list.cards.length} cards, ${comments} comments, ${pdfs} PDFs`);
  }

  const { accessToken, email: operatorEmail } = await refreshFirebaseAccessToken();
  console.log(`Firebase operator: ${operatorEmail || "(unknown)"}`);

  const boards = await listDocuments(accessToken, "/workspace_boards");
  const board = findStudentBoard(boards, args.email);
  const boardId = board.id;
  const createdByUid = board.data.createdByUid || "";
  console.log(`Workspace board: ${board.data.studentName} <${board.data.studentEmail}> id=${boardId}`);

  const existingLists = await listDocuments(accessToken, `/workspace_boards/${boardId}/lists`);
  const existingCards = await listDocuments(accessToken, `/workspace_boards/${boardId}/cards`);
  const liveLists = existingLists.filter((item) => !item.data.deletedAt);
  const liveCards = existingCards.filter((item) => !item.data.deletedAt);
  const nativeCards = liveCards.filter((item) => !item.data.trelloCardId);
  console.log(
    `Existing Drillmaster lists (${liveLists.length}): ${liveLists.map((item) => item.data.title).join(", ") || "(none)"}`,
  );
  if (liveLists.length !== plan.lists.length) {
    console.log(
      `List count differs (workspace ${liveLists.length} vs Trello ${plan.lists.length}). Matching by exact name only; extra workspace lists and their cards are kept.`,
    );
  }
  console.log(`Existing Drillmaster cards kept: ${nativeCards.length}`);
  for (const card of nativeCards) {
    console.log(`  keep ${card.id} "${card.data.title}"`);
  }

  const usedListIds = new Set();
  const listMatches = plan.lists.map((list) => {
    const byTrelloId = liveLists.find(
      (item) => item.data.trelloListId === list.trelloId && !usedListIds.has(item.id),
    );
    const byExactName = liveLists.find(
      (item) =>
        !usedListIds.has(item.id) && exactListTitleKey(item.data.title) === exactListTitleKey(list.title),
    );
    const match = byTrelloId || byExactName || null;
    if (match) usedListIds.add(match.id);
    return { list, match, how: byTrelloId ? "trelloListId" : match ? "exact name" : "create" };
  });
  const leftoverLists = liveLists.filter((item) => !usedListIds.has(item.id));

  console.log("List alignment (Trello count and exact names):");
  for (const row of listMatches) {
    if (row.match) {
      console.log(
        `  ${row.list.title}: reuse "${row.match.data.title}" (${row.how}, id=${row.match.id})`,
      );
    } else {
      console.log(`  ${row.list.title}: create (no exact-name match)`);
    }
  }
  for (const leftover of leftoverLists) {
    console.log(
      `  keep extra workspace list "${leftover.data.title}" id=${leftover.id} (cards stay on this list)`,
    );
  }

  if (args.dryRun) {
    console.log("Dry run complete. No writes.");
    return;
  }

  const listIdByTrello = new Map();
  const now = new Date();

  for (const row of listMatches) {
    const { list, match } = row;
    if (match) {
      await upsertDocument(accessToken, `/workspace_boards/${boardId}/lists/${match.id}`, {
        title: list.title,
        kind: list.kind,
        position: list.position,
        trelloListId: list.trelloId,
        updatedAt: now,
      });
      listIdByTrello.set(list.trelloId, match.id);
      match.data.title = list.title;
      match.data.kind = list.kind;
      match.data.position = list.position;
    } else {
      const newId = trelloDocId(list.trelloId);
      await upsertDocument(accessToken, `/workspace_boards/${boardId}/lists/${newId}`, {
        title: list.title,
        kind: list.kind,
        position: list.position,
        trelloListId: list.trelloId,
        createdAt: now,
        updatedAt: now,
      });
      listIdByTrello.set(list.trelloId, newId);
      liveLists.push({
        id: newId,
        data: { title: list.title, kind: list.kind, position: list.position },
      });
    }
  }

  leftoverLists.sort(
    (a, b) => (Number(a.data.position) || 0) - (Number(b.data.position) || 0) || a.id.localeCompare(b.id),
  );
  for (let i = 0; i < leftoverLists.length; i++) {
    const position = plan.lists.length + i;
    if (Number(leftoverLists[i].data.position) === position) continue;
    await upsertDocument(accessToken, `/workspace_boards/${boardId}/lists/${leftoverLists[i].id}`, {
      position,
      updatedAt: now,
    });
    leftoverLists[i].data.position = position;
  }

  const nextCardPositionByList = new Map();
  let nativePinned = 0;
  for (const listId of new Set(listIdByTrello.values())) {
    const natives = liveCards
      .filter((card) => card.data.listId === listId && !card.data.trelloCardId)
      .sort((a, b) => (Number(a.data.position) || 0) - (Number(b.data.position) || 0));
    for (let i = 0; i < natives.length; i++) {
      nativePinned += 1;
      if (Number(natives[i].data.position) !== i) {
        await upsertDocument(accessToken, `/workspace_boards/${boardId}/cards/${natives[i].id}`, {
          position: i,
          updatedAt: now,
        });
        natives[i].data.position = i;
      }
    }
    nextCardPositionByList.set(listId, natives.length);
  }
  console.log(`Native cards pinned at top: ${nativePinned}`);

  let cardsCreated = 0;
  let cardsUpdated = 0;
  let commentsWritten = 0;
  let pdfsUploaded = 0;
  let pdfsFailed = 0;
  const pdfErrors = [];

  for (const list of plan.lists) {
    const listId = listIdByTrello.get(list.trelloId);
    if (!nextCardPositionByList.has(listId)) nextCardPositionByList.set(listId, 0);

    for (const card of list.cards) {
      const position = nextCardPositionByList.get(listId);
      nextCardPositionByList.set(listId, position + 1);
      const cardId = trelloDocId(card.trelloId);
      const payload = {
        listId,
        title: card.title,
        description: card.description,
        position,
        completed: card.completed,
        trelloCardId: card.trelloId,
        trelloShortLink: card.shortLink || "",
        commentCount: card.comments.length,
        attachmentCount: card.attachments.length,
        createdAt: new Date(card.createdAt),
        updatedAt: new Date(card.updatedAt),
      };
      if (card.sessionMeta) payload.sessionMeta = card.sessionMeta;
      else payload.sessionMeta = null;
      if (card.due) payload.dueAt = new Date(card.due);

      const already = existingCards.some((item) => item.id === cardId);
      await upsertDocument(accessToken, `/workspace_boards/${boardId}/cards/${cardId}`, payload);
      if (already) cardsUpdated += 1;
      else cardsCreated += 1;

      for (const comment of card.comments) {
        const commentId = trelloDocId(comment.id);
        await upsertDocument(
          accessToken,
          `/workspace_boards/${boardId}/cards/${cardId}/comments/${commentId}`,
          {
            body: cleanText(comment.text) || "(empty Trello comment)",
            authorUid: createdByUid || "trello-import",
            authorName: comment.authorName,
            trelloCommentId: comment.id,
            createdAt: new Date(comment.date),
          },
        );
        commentsWritten += 1;
      }

      if (!wantPdfs || !trelloKey || !trelloToken) continue;

      for (const att of card.attachments) {
        const attachmentId = trelloDocId(att.id);
        const fileName = sanitizeStorageFileName(att.name || att.fileName || "document.pdf");
        const storagePath = `workspace/${boardId}/cards/${cardId}/${attachmentId}_${fileName}`;
        try {
          const bytes = await downloadTrelloPdf(att, card.trelloId, trelloKey, trelloToken);
          await uploadPdf(accessToken, storagePath, bytes);
          await upsertDocument(
            accessToken,
            `/workspace_boards/${boardId}/cards/${cardId}/attachments/${attachmentId}`,
            {
              kind: "file",
              fileName: att.name || att.fileName || fileName,
              storagePath,
              contentType: "application/pdf",
              sizeBytes: bytes.length,
              uploadedByUid: createdByUid || "trello-import",
              uploadedByName: memberName(trello, att.idMember, "Trello import"),
              trelloAttachmentId: att.id,
              createdAt: att.date ? new Date(att.date) : now,
            },
          );
          pdfsUploaded += 1;
        } catch (err) {
          pdfsFailed += 1;
          pdfErrors.push(`${card.title} / ${att.name}: ${err instanceof Error ? err.message : err}`);
        }
      }
    }
  }

  await upsertDocument(accessToken, `/workspace_boards/${boardId}`, {
    trelloImport: {
      trelloBoardId: plan.trelloBoardId,
      trelloBoardName: plan.trelloBoardName,
      trelloShortUrl: plan.trelloShortUrl,
      importedAt: now.toISOString(),
      sourceFile: path.basename(args.json),
    },
    updatedAt: now,
  });

  console.log("\nImport finished");
  console.log(`  cards created: ${cardsCreated}`);
  console.log(`  cards updated: ${cardsUpdated}`);
  console.log(`  comments: ${commentsWritten}`);
  console.log(`  PDFs uploaded: ${pdfsUploaded}`);
  if (!trelloKey || !trelloToken) {
    const pending = plan.lists.reduce((n, list) => n + list.cards.reduce((m, card) => m + card.attachments.length, 0), 0);
    console.log(`  PDFs skipped (set TRELLO_API_KEY and TRELLO_TOKEN, then re-run): ${pending}`);
  } else if (pdfsFailed) {
    console.log(`  PDFs failed: ${pdfsFailed}`);
    for (const line of pdfErrors.slice(0, 12)) console.log(`    ${line}`);
    if (pdfErrors.length > 12) console.log(`    … ${pdfErrors.length - 12} more`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
