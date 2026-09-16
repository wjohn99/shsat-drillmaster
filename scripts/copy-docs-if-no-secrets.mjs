#!/usr/bin/env node
/**
 * Copy dist/ → docs/ only when the production bundle does not contain API keys.
 * GitHub Pages on the public repo must not receive baked-in Firebase keys.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const DOCS = path.join(ROOT, "docs");
const KEY_PATTERN = /AIza[0-9A-Za-z_-]{20,}/;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

if (!fs.existsSync(DIST)) {
  console.error("dist/ is missing. Run npm run build first.");
  process.exit(1);
}

for (const file of walk(DIST)) {
  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (KEY_PATTERN.test(text)) {
    console.error(
      "Refusing to copy dist/ into docs/: the production bundle contains a Google API key.",
    );
    console.error(
      "docs/ is committed to the public GitHub repo. Production deploys must use GitHub Actions secrets.",
    );
    console.error("Local preview: npm run preview");
    process.exit(1);
  }
}

fs.rmSync(DOCS, { recursive: true, force: true });
fs.mkdirSync(DOCS, { recursive: true });
const result = spawnSync("cp", ["-R", `${DIST}/.`, DOCS], { stdio: "inherit" });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log("Copied key-free dist/ to docs/.");
