#!/usr/bin/env node
/**
 * Fail if Google API keys or other credentials appear in git-tracked files.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const PATTERNS = [
  /AIza[0-9A-Za-z_-]{20,}/,
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /"private_key"\s*:\s*"-----BEGIN/,
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
];

function scanText(label, text) {
  for (const pattern of PATTERNS) {
    if (pattern.test(text)) {
      console.error(`Secret-like value found in ${label} (matched ${pattern}).`);
      console.error("Do not commit API keys. Use .env locally and GitHub Actions secrets for Pages.");
      process.exit(1);
    }
  }
}

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

for (const file of tracked) {
  if (file === ".env.example" || file.endsWith(".env.example")) continue;
  try {
    scanText(file, fs.readFileSync(file, "utf8"));
  } catch {
    // skip binary
  }
}

console.log("No committed API keys or private credentials found.");
