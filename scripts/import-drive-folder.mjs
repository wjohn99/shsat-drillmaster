#!/usr/bin/env node
/**
 * Import a Google Drive folder dump (zip or directory) into one student workspace.
 *
 * Folders become lists. Each file becomes a card:
 *   - PDFs, PNG, and JPEG upload as attachments
 *   - .docx / .html / .xlsx text lands in the card description
 * Same-named files (pdf + docx, or " (1)" copies) merge onto one card.
 *
 * Usage:
 *   node scripts/import-drive-folder.mjs --zip ~/Downloads/Henry.zip --email henry.rafalaf@gmail.com
 *   node scripts/import-drive-folder.mjs --dir /path/to/Henry\ R. --email henry.rafalaf@gmail.com --dry-run
 */

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
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

const NOTES_LIST = "Notes";
const SKIP_DIRS = new Set(["__macosx", "problems for jed"]);
const SKIP_FILES = new Set([".ds_store", "thumbs.db"]);

function parseArgs(argv) {
  const out = { zip: "", dir: "", email: "", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--zip") out.zip = argv[++i] ?? "";
    else if (arg === "--dir") out.dir = argv[++i] ?? "";
    else if (arg === "--email") out.email = argv[++i] ?? "";
    else if (arg === "--help" || arg === "-h") out.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function printUsage() {
  console.log(
    "node scripts/import-drive-folder.mjs --email student@email.com (--zip file.zip | --dir folder) [--dry-run]",
  );
}

function driveId(seed) {
  const hash = crypto.createHash("sha1").update(seed).digest("hex").slice(0, 20);
  return `drive_${hash}`;
}

function cleanText(value) {
  return String(value || "")
    .replace(/\u200c/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titleFromFileName(name) {
  return String(name || "Untitled")
    .replace(/\.(pdf|docx|html?|png|jpe?g|xlsx)$/i, "")
    .replace(/_s\b/g, "'s")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Untitled";
}

function cardMergeKey(fileName) {
  return titleFromFileName(fileName)
    .replace(/\(old[^)]*\)/gi, "")
    .replace(/\(\d+\)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function kindForList(title) {
  const key = title.toLowerCase();
  if (key === "notes" || key.includes("info") || key.includes("roadmap")) return "info";
  if (key.includes("test")) return "tests";
  if (key.includes("assignment") && key.includes("new")) return "tests";
  if (key.includes("assignment")) return "custom";
  return "custom";
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
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
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
  if (!res.ok) {
    throw new Error(`${method} ${url} failed ${res.status}: ${text.slice(0, 800)}`);
  }
  return text ? JSON.parse(text) : null;
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

async function runQuery(accessToken, structuredQuery) {
  const parsed = await firestoreRequest(
    accessToken,
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    { method: "POST", json: { structuredQuery } },
  );
  return (parsed || [])
    .filter((row) => row.document)
    .map((row) => ({
      id: docIdFromName(row.document.name),
      data: decodeFields(row.document.fields),
    }));
}

async function upsertDocument(accessToken, relativePath, fields) {
  const defined = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
  const mask = Object.keys(defined)
    .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
    .join("&");
  return firestoreRequest(accessToken, `${relativePath}?${mask}`, {
    method: "PATCH",
    json: { fields: encodeFields(defined) },
  });
}

async function uploadFile(accessToken, storagePath, bytes, contentType) {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: bytes,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload failed ${res.status}: ${text.slice(0, 400)}`);
  }
}

function extractDocxText(filePath) {
  try {
    const xml = execFileSync("unzip", ["-p", filePath, "word/document.xml"], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    return cleanText(
      xml
        .replace(/<\/w:p>/g, "\n")
        .replace(/<w:tab\b[^/]*\/>/g, "\t")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'"),
    );
  } catch {
    return "";
  }
}

function decodeXmlText(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractXlsxText(filePath) {
  try {
    const listing = execFileSync("unzip", ["-l", filePath], {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
    });
    const sheets = [...listing.matchAll(/xl\/worksheets\/sheet\d+\.xml/g)].map((match) => match[0]);
    let shared = [];
    try {
      const sharedXml = execFileSync("unzip", ["-p", filePath, "xl/sharedStrings.xml"], {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
      shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
        decodeXmlText(
          [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join(""),
        ),
      );
    } catch {
      shared = [];
    }
    const lines = [];
    for (const sheet of sheets) {
      const xml = execFileSync("unzip", ["-p", filePath, sheet], {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
      for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        const values = [...row[1].matchAll(/<c\b([^>]*)>(?:[\s\S]*?<v>([\s\S]*?)<\/v>)?/g)].map(
          (cell) => {
            const attrs = cell[1] || "";
            const raw = cell[2] || "";
            if (/\bt="s"/.test(attrs)) return shared[Number(raw)] || "";
            if (/\bt="inlineStr"/.test(attrs)) {
              const inline = row[1].slice(row[1].indexOf(attrs));
              return decodeXmlText(
                [...inline.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join(""),
              );
            }
            return decodeXmlText(raw);
          },
        );
        const line = values.map((value) => value.trim()).filter(Boolean).join("\t");
        if (line) lines.push(line);
      }
    }
    return cleanText(lines.join("\n"));
  } catch {
    return "";
  }
}

function extractHtmlText(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return cleanText(
    raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"'),
  );
}

function isPdf(name) {
  return name.toLowerCase().endsWith(".pdf");
}

function isImage(name) {
  const lower = name.toLowerCase();
  return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg");
}

function isNoteFile(name) {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".docx") ||
    lower.endsWith(".html") ||
    lower.endsWith(".htm") ||
    lower.endsWith(".xlsx")
  );
}

function contentTypeForFile(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/pdf";
}

function walkFiles(rootDir) {
  const files = [];
  function walk(dir, relList) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_FILES.has(entry.name.toLowerCase())) continue;
      if (entry.name.startsWith(".")) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name.toLowerCase())) continue;
        walk(abs, entry.name);
      } else if (entry.isFile()) {
        files.push({
          abs,
          name: entry.name,
          listTitle: relList || NOTES_LIST,
          mtime: fs.statSync(abs).mtime,
        });
      }
    }
  }
  walk(rootDir, "");
  return files;
}

function resolveDumpRoot(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => !e.name.startsWith("."));
  if (entries.length === 1 && entries[0].isDirectory()) {
    return path.join(dir, entries[0].name);
  }
  return dir;
}

function buildPlan(files) {
  const lists = new Map();
  for (const file of files) {
    if (!isPdf(file.name) && !isImage(file.name) && !isNoteFile(file.name)) continue;
    const listTitle = file.listTitle;
    if (!lists.has(listTitle)) {
      lists.set(listTitle, {
        title: listTitle,
        kind: kindForList(listTitle),
        cards: new Map(),
      });
    }
    const list = lists.get(listTitle);
    const key = cardMergeKey(file.name);
    if (!list.cards.has(key)) {
      list.cards.set(key, {
        key,
        title: titleFromFileName(file.name)
          .replace(/\(old[^)]*\)/gi, "")
          .replace(/\(\d+\)\s*$/g, "")
          .replace(/\s+/g, " ")
          .trim(),
        description: "",
        pdfs: [],
        notes: [],
        createdAt: file.mtime,
      });
    }
    const card = list.cards.get(key);
    if (file.mtime < card.createdAt) card.createdAt = file.mtime;
    if (isPdf(file.name) || isImage(file.name)) {
      card.pdfs.push(file);
    } else {
      card.notes.push(file);
    }
  }

  const preferredOrder = [NOTES_LIST, "Assignments (New)", "Assignments (Old)", "For Penney & Andrew"];
  const titles = [...lists.keys()].sort((a, b) => {
    const ai = preferredOrder.indexOf(a);
    const bi = preferredOrder.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.localeCompare(b);
  });

  return titles
    .map((title, position) => {
      const list = lists.get(title);
      const cards = [...list.cards.values()]
        .map((card) => {
          const noteTexts = card.notes
            .map((note) => {
              const lower = note.name.toLowerCase();
              if (lower.endsWith(".docx")) return extractDocxText(note.abs);
              if (lower.endsWith(".xlsx")) return extractXlsxText(note.abs);
              return extractHtmlText(note.abs);
            })
            .filter(Boolean)
            .sort((a, b) => b.length - a.length);
          let description = noteTexts[0] || "";
          if (card.pdfs.length && description.length > 4000) {
            description = "";
          }
          return {
            ...card,
            description,
            seed: `${title}/${card.key}`,
          };
        })
        .sort((a, b) => a.title.localeCompare(b.title));
      return { title, kind: list.kind, position, cards, seed: title };
    })
    .filter((list) => list.cards.length > 0);
}

function findStudentBoard(boards, email) {
  const needle = email.trim().toLowerCase();
  const exact = boards.filter((board) => String(board.data.studentEmail || "").toLowerCase() === needle);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) throw new Error(`More than one workspace board uses ${email}.`);
  const byName = boards.filter((board) =>
    String(board.data.studentName || "").toLowerCase().includes("rafalaf"),
  );
  if (byName.length === 1) return byName[0];
  throw new Error(
    `No workspace board found for ${email}. Create Henry Rafalaf's board in Drillmaster first, or the student must have signed in once.`,
  );
}

async function findOrCreateBoard(accessToken, email, operatorEmail) {
  const boards = await listDocuments(accessToken, "/workspace_boards");
  try {
    return { board: findStudentBoard(boards, email), created: false };
  } catch (err) {
    const users = await runQuery(accessToken, {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "email" },
          op: "EQUAL",
          value: { stringValue: email.trim().toLowerCase() },
        },
      },
      limit: 5,
    });
    const user = users[0];
    if (!user) throw err;
    const tutors = await runQuery(accessToken, {
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "email" },
          op: "EQUAL",
          value: { stringValue: operatorEmail.trim().toLowerCase() },
        },
      },
      limit: 1,
    });
    const tutor = tutors[0];
    const tutorUid = tutor?.id || "";
    const now = new Date();
    const boardId = user.id;
    await upsertDocument(accessToken, `/workspace_boards/${boardId}`, {
      studentUid: user.id,
      studentName: user.data.displayName || "Henry Rafalaf",
      studentEmail: email.trim().toLowerCase(),
      color: "#0ea5e9",
      createdByUid: tutorUid,
      assignedTutorUid: tutorUid,
      assignedTutorName: tutor?.data.displayName || operatorEmail,
      assignedTutorEmail: operatorEmail,
      createdAt: now,
      roadmap: {
        startingPoint: "",
        currentScores: "",
        targetComposite: null,
        targetSchool: "undecided",
        testDate: "",
        currentPriority: "",
        longTermPriorities: "",
        strengthsNotes: "",
        growthNotes: "",
        nextSessionDate: "",
        nextSessionTime: "",
        nextSessionNotes: "",
        followUps: [],
        status: null,
        statusManual: false,
      },
      roadmapUpdatedAt: now,
      updatedAt: now,
    });
    return {
      board: {
        id: boardId,
        data: {
          studentUid: user.id,
          studentName: user.data.displayName || "Henry Rafalaf",
          studentEmail: email,
          createdByUid: tutorUid,
        },
      },
      created: true,
    };
  }
}

function sanitizeStorageName(name, contentType) {
  const trimmed = name.trim() || "file";
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
  if (contentType === "image/png") return safe.endsWith(".png") ? safe : `${safe}.png`;
  if (contentType === "image/jpeg") return /\.jpe?g$/.test(safe) ? safe : `${safe}.jpg`;
  return safe.endsWith(".pdf") ? safe : `${safe}.pdf`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    return;
  }
  if (!args.email || (!args.zip && !args.dir)) {
    printUsage();
    process.exit(1);
  }

  let workDir = args.dir;
  if (args.zip) {
    if (!fs.existsSync(args.zip)) throw new Error(`Zip not found: ${args.zip}`);
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), "drive-import-"));
    execFileSync("python3", [
      "-c",
      `
import os, sys, zipfile
dest = sys.argv[2]
with zipfile.ZipFile(sys.argv[1]) as archive:
    for info in archive.infolist():
        name = info.filename.replace("\\\\", "/").lstrip("/")
        if not name or name.endswith("/"):
            continue
        parts = [part for part in name.split("/") if part not in ("", ".")]
        if any(part == ".." for part in parts):
            continue
        out = os.path.join(dest, *parts)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with archive.open(info) as src, open(out, "wb") as dst:
            dst.write(src.read())
`,
      args.zip,
      workDir,
    ]);
  }
  if (!workDir || !fs.existsSync(workDir)) {
    throw new Error(`Folder not found: ${workDir}`);
  }

  const dumpRoot = resolveDumpRoot(workDir);
  const files = walkFiles(dumpRoot);
  const plan = buildPlan(files);

  console.log(`Drive dump: ${dumpRoot}`);
  console.log(`Lists (${plan.length}):`);
  for (const list of plan) {
    const pdfs = list.cards.reduce((n, card) => n + card.pdfs.length, 0);
    const notes = list.cards.reduce((n, card) => n + (card.description ? 1 : 0), 0);
    console.log(`  - ${list.title} (${list.kind}): ${list.cards.length} cards, ${notes} notes, ${pdfs} PDFs`);
    for (const card of list.cards) {
      const bits = [];
      if (card.description) bits.push(`${card.description.length} chars`);
      if (card.pdfs.length) bits.push(card.pdfs.map((f) => f.name).join(", "));
      console.log(`      • ${card.title}${bits.length ? ` [${bits.join("; ")}]` : ""}`);
    }
  }

  const { accessToken, email: operatorEmail } = await refreshFirebaseAccessToken();
  console.log(`Firebase operator: ${operatorEmail || "(unknown)"}`);

  const { board, created } = await findOrCreateBoard(accessToken, args.email, operatorEmail);
  const boardId = board.id;
  const createdByUid = board.data.createdByUid || "";
  console.log(
    `Workspace board: ${board.data.studentName} <${board.data.studentEmail}> id=${boardId}${created ? " (created)" : ""}`,
  );

  if (args.dryRun) {
    console.log("Dry run complete. No writes.");
    return;
  }

  const existingLists = await listDocuments(accessToken, `/workspace_boards/${boardId}/lists`);
  const liveLists = existingLists.filter((item) => !item.data.deletedAt);
  const now = new Date();
  const listIdBySeed = new Map();

  for (const list of plan) {
    const match = liveLists.find(
      (item) => String(item.data.title || "").trim().toLowerCase() === list.title.toLowerCase(),
    );
    const listId = match?.id || driveId(`list:${list.seed}`);
    await upsertDocument(accessToken, `/workspace_boards/${boardId}/lists/${listId}`, {
      title: list.title,
      kind: list.kind,
      position: list.position,
      driveImportKey: list.seed,
      createdAt: match ? undefined : now,
      updatedAt: now,
    });
    listIdBySeed.set(list.seed, listId);
  }

  let cardsWritten = 0;
  let pdfsUploaded = 0;
  let pdfsFailed = 0;
  const pdfErrors = [];

  for (const list of plan) {
    const listId = listIdBySeed.get(list.seed);
    for (let i = 0; i < list.cards.length; i++) {
      const card = list.cards[i];
      const cardId = driveId(`card:${card.seed}`);
      await upsertDocument(accessToken, `/workspace_boards/${boardId}/cards/${cardId}`, {
        listId,
        title: card.title,
        description: card.description,
        position: i,
        completed: false,
        driveImportKey: card.seed,
        commentCount: 0,
        attachmentCount: card.pdfs.length,
        createdAt: card.createdAt,
        updatedAt: now,
      });
      cardsWritten += 1;

      for (const pdf of card.pdfs) {
        const attachmentId = driveId(`att:${pdf.abs}`);
        const contentType = contentTypeForFile(pdf.name);
        const fileName = sanitizeStorageName(pdf.name, contentType);
        const storagePath = `workspace/${boardId}/cards/${cardId}/${attachmentId}_${fileName}`;
        try {
          const bytes = fs.readFileSync(pdf.abs);
          if (contentType === "application/pdf" && (bytes.length < 5 || bytes.subarray(0, 4).toString() !== "%PDF")) {
            throw new Error("not a PDF");
          }
          await uploadFile(accessToken, storagePath, bytes, contentType);
          await upsertDocument(
            accessToken,
            `/workspace_boards/${boardId}/cards/${cardId}/attachments/${attachmentId}`,
            {
              kind: "file",
              fileName: pdf.name,
              storagePath,
              contentType,
              sizeBytes: bytes.length,
              uploadedByUid: createdByUid || "drive-import",
              uploadedByName: "Drive import",
              driveImportKey: pdf.name,
              createdAt: pdf.mtime,
            },
          );
          pdfsUploaded += 1;
        } catch (err) {
          pdfsFailed += 1;
          pdfErrors.push(`${card.title} / ${pdf.name}: ${err instanceof Error ? err.message : err}`);
        }
      }
    }
  }

  await upsertDocument(accessToken, `/workspace_boards/${boardId}`, {
    driveImport: {
      importedAt: now.toISOString(),
      source: args.zip ? path.basename(args.zip) : path.basename(dumpRoot),
    },
    updatedAt: now,
  });

  console.log("\nImport finished");
  console.log(`  cards: ${cardsWritten}`);
  console.log(`  PDFs uploaded: ${pdfsUploaded}`);
  if (pdfsFailed) {
    console.log(`  PDFs failed: ${pdfsFailed}`);
    for (const line of pdfErrors) console.log(`    ${line}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
