#!/usr/bin/env node
/**
 * Creates the Firebase default Storage bucket when the console wizard fails.
 * Uses credentials from `firebase login` (~/.config/configstore/firebase-tools.json).
 *
 * Usage: node scripts/provision-firebase-storage.mjs [projectId] [location]
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT_ID = process.argv[2] || "drillmaster-cee20";
const LOCATION = process.argv[3] || "us-central1";
const BUCKET_NAME = `${PROJECT_ID}.firebasestorage.app`;

const CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

const CONFIG_PATH = path.join(os.homedir(), ".config/configstore/firebase-tools.json");

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error("Firebase CLI not logged in. Run: firebase login");
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
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
  return json.access_token;
}

async function getAccessToken(cfg) {
  if (!cfg.tokens?.refresh_token) {
    throw new Error("Missing refresh token. Run: firebase login --reauth");
  }
  return refreshAccessToken(cfg.tokens.refresh_token);
}

async function apiFetch(url, accessToken, { method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, text };
}

async function enableService(accessToken, serviceName) {
  const url = `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/${serviceName}:enable`;
  return apiFetch(url, accessToken, { method: "POST", body: {} });
}

function printBillingGuardrails() {
  console.log(`
Billing guardrails (set up once in Google Cloud Console):
  Budget alert: https://console.cloud.google.com/billing/budgets?project=${PROJECT_ID}
  Suggested: email alert at $5, $10, and hard review at $25/month.

App limits already enforced: tutor-only PDF uploads, 25 MB/file, 10 PDFs/card,
200 MB PDF cap per student board, workspace path only.
`);
}

function print403Help(email, detailText = "") {
  if (detailText.includes("delinquent") || detailText.includes("accountDisabled")) {
    console.error(`
BILLING IS DELINQUENT — this is why Storage setup fails (console "unknown error" too).

Your GCP billing account is suspended or has a failed payment. Storage cannot be
created until billing is active again.

Fix billing:
  https://console.cloud.google.com/billing?project=${PROJECT_ID}

1. Open the linked billing account for project ${PROJECT_ID}
2. Resolve any payment issue (update card, pay overdue balance, remove suspension)
3. Confirm status shows Active (not delinquent / closed)
4. Wait 5–10 minutes, then run:
     npm run storage:provision
     firebase deploy --only storage --project ${PROJECT_ID}

Account: ${email ?? "your firebase login email"}
`);
    return;
  }

  console.error(`
Permission denied (403). The bucket was NOT created.

Fix these in order (same Google account: ${email ?? "your firebase login email"}):

1) IAM role on the GCP project
   https://console.cloud.google.com/iam-admin/iam?project=${PROJECT_ID}
   Your account needs Owner, OR Editor + Firebase Admin.

2) Enable APIs (click Enable on each page)
   https://console.cloud.google.com/apis/library/firebasestorage.googleapis.com?project=${PROJECT_ID}
   https://console.cloud.google.com/apis/library/storage.googleapis.com?project=${PROJECT_ID}

3) Refresh Firebase login, then rerun:
   firebase login --reauth
   npm run storage:provision
`);
}

async function tryCreateDefaultBucket(accessToken, email) {
  const path = `/v1alpha/projects/${PROJECT_ID}/defaultBucket`;
  const existing = await apiFetch(
    `https://firebasestorage.googleapis.com${path}`,
    accessToken,
  );

  if (existing.status === 200) {
    console.log("Default bucket already exists:");
    console.log(JSON.stringify(existing.json, null, 2));
    return true;
  }

  if (existing.status !== 404) {
    console.error("Unexpected GET defaultBucket:", existing.status, existing.text);
    if (existing.status === 403) print403Help(email, existing.text);
    return false;
  }

  console.log("Creating default Firebase Storage bucket…");
  const created = await apiFetch(`https://firebasestorage.googleapis.com${path}`, accessToken, {
    method: "POST",
    body: { location: LOCATION },
  });

  if (created.status >= 200 && created.status < 300) {
    console.log("Default bucket created:");
    console.log(JSON.stringify(created.json, null, 2));
    return true;
  }

  console.error("defaultBucket.create failed:", created.status, created.text);
  if (created.status === 403) print403Help(email, created.text);
  return false;
}

async function tryGcsThenLink(accessToken, email) {
  console.log("\nTrying Google Cloud Storage bucket + Firebase link fallback…");

  const insert = await apiFetch(
    `https://storage.googleapis.com/storage/v1/b?project=${PROJECT_ID}`,
    accessToken,
    {
      method: "POST",
      body: {
        name: BUCKET_NAME,
        location: LOCATION.toUpperCase(),
        uniformBucketLevelAccess: { enabled: true },
      },
    },
  );

  if (insert.status !== 200 && insert.status !== 409) {
    console.error("GCS bucket create failed:", insert.status, insert.text);
    if (insert.status === 403) print403Help(email, insert.text);
    return false;
  }

  if (insert.status === 409) {
    console.log("GCS bucket already exists; attempting Firebase link…");
  } else {
    console.log("GCS bucket created:", BUCKET_NAME);
  }

  const link = await apiFetch(
    `https://firebasestorage.googleapis.com/v1alpha/projects/_/buckets/${BUCKET_NAME}:addFirebase`,
    accessToken,
    { method: "POST", body: {} },
  );

  if (link.status >= 200 && link.status < 300) {
    console.log("Bucket linked to Firebase:");
    console.log(JSON.stringify(link.json, null, 2));
    return true;
  }

  console.error("addFirebase link failed:", link.status, link.text);
  if (link.status === 403) print403Help(email, link.text);
  return false;
}

async function main() {
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Location: ${LOCATION}`);
  console.log(`Expected bucket: ${BUCKET_NAME}`);

  const cfg = loadConfig();
  const email = cfg.user?.email;
  console.log(`Logged in as: ${email ?? "(unknown)"}`);

  const token = await getAccessToken(cfg);

  console.log("\nEnabling required APIs (safe if already enabled)…");
  for (const service of ["firebasestorage.googleapis.com", "storage.googleapis.com"]) {
    const res = await enableService(token, service);
    console.log(`  ${service}: HTTP ${res.status}`);
  }

  if (await tryCreateDefaultBucket(token, email)) {
    console.log(`\nSuccess. Next:\n  firebase deploy --only storage --project ${PROJECT_ID}`);
    printBillingGuardrails();
    return;
  }

  if (await tryGcsThenLink(token, email)) {
    console.log(`\nSuccess. Next:\n  firebase deploy --only storage --project ${PROJECT_ID}`);
    printBillingGuardrails();
    return;
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
