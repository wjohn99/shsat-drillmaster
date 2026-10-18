#!/usr/bin/env node
/**
 * Upload shared board-template PDFs to Firebase Storage.
 *
 * Reads compact template JSON (lists/cards/PDF metadata). Downloads each PDF
 * from Trello once, then stores it at workspace-templates/<id>/... so new
 * student boards can attach the same files without copying bytes.
 *
 * Usage:
 *   node scripts/seed-workspace-board-template.mjs --id shsat
 *   node scripts/seed-workspace-board-template.mjs --id shsat --dry-run
 *
 * PDFs: TRELLO_API_KEY and TRELLO_TOKEN from gitignored .env
 * Auth: local `firebase login` refresh token
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
  const out = { id: "shsat", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--id") out.id = argv[++i] ?? "shsat";
    else if (arg === "--help" || arg === "-h") out.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function printUsage() {
  console.log("node scripts/seed-workspace-board-template.mjs --id shsat [--dry-run]");
}

function templatePath(id) {
  return path.join(ROOT, "src/data/workspaceTemplates", `${id}.json`);
}

function listAttachments(template) {
  const rows = [];
  for (const list of template.lists || []) {
    for (const card of list.cards || []) {
      for (const att of card.attachments || []) {
        rows.push({ listTitle: list.title, cardTitle: card.title, att });
      }
    }
  }
  return rows;
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

function trelloAuthHeader(key, token) {
  return `OAuth oauth_consumer_key="${key}", oauth_token="${token}"`;
}

async function downloadTrelloPdf(att, key, token) {
  const cardId = att.trelloCardId;
  const attachmentId = att.trelloAttachmentId;
  if (!cardId || !attachmentId) {
    throw new Error("Template attachment is missing Trello ids");
  }
  const fileName = encodeURIComponent(att.trelloFileName || `${att.fileName}.pdf`);
  const candidates = [
    `https://api.trello.com/1/cards/${cardId}/attachments/${attachmentId}/download/${fileName}`,
    `https://trello.com/1/cards/${cardId}/attachments/${attachmentId}/download/${fileName}`,
  ];
  let lastError = "no URL";
  for (const url of candidates) {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { Authorization: trelloAuthHeader(key, token) },
    });
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

async function objectExists(accessToken, storagePath) {
  const url = `https://storage.googleapis.com/storage/v1/b/${STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 404) return false;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage lookup failed ${res.status}: ${text.slice(0, 400)}`);
  }
  return true;
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

  const file = templatePath(args.id);
  if (!fs.existsSync(file)) {
    throw new Error(`Template JSON not found: ${file}`);
  }
  const template = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = listAttachments(template);
  const trelloKey = process.env.TRELLO_API_KEY || "";
  const trelloToken = process.env.TRELLO_TOKEN || "";

  console.log(`Template: ${template.label || template.id} (${rows.length} PDFs)`);
  for (const row of rows) {
    console.log(`  ${row.cardTitle}: ${row.att.fileName} -> ${row.att.storagePath}`);
  }

  if (args.dryRun) {
    console.log("Dry run complete. No uploads.");
    return;
  }
  if (!trelloKey || !trelloToken) {
    throw new Error("Set TRELLO_API_KEY and TRELLO_TOKEN in .env, then re-run.");
  }

  const { accessToken, email } = await refreshFirebaseAccessToken();
  console.log(`Firebase operator: ${email || "(unknown)"}`);

  let uploaded = 0;
  let skipped = 0;
  const failed = [];
  for (const row of rows) {
    const storagePath = row.att.storagePath;
    try {
      if (await objectExists(accessToken, storagePath)) {
        skipped += 1;
        console.log(`skip exists ${storagePath}`);
        continue;
      }
      const bytes = await downloadTrelloPdf(row.att, trelloKey, trelloToken);
      await uploadPdf(accessToken, storagePath, bytes);
      uploaded += 1;
      console.log(`uploaded ${row.att.fileName} (${bytes.length} bytes)`);
    } catch (err) {
      failed.push(`${row.cardTitle} / ${row.att.fileName}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone. uploaded=${uploaded} skipped=${skipped} failed=${failed.length}`);
  for (const line of failed) console.log(`  ${line}`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
