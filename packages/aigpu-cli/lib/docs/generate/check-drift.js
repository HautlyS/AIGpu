#!/usr/bin/env node
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { computeStamp, generateDocs } from "./generate.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../../..");
const committedSkillDir = resolve(root, "skills/aigpu");
const committedManifestOut = resolve(root, "packages/aigpu-cli/lib/generated/docs-manifest.generated.js");
const scratch = mkdtempSync(join(tmpdir(), "aigpu-skill-drift-"));
const freshSkillDir = join(scratch, "skill");
const freshManifestOut = join(scratch, "manifest.js");

try {
  generateDocs({ root, skillDir: freshSkillDir, manifestOut: freshManifestOut, stamp: computeStamp(root) });
  const issues = [];
  if (read(committedManifestOut) !== read(freshManifestOut)) issues.push(`docs manifest differs: ${relative(root, committedManifestOut)}`);
  const committed = files(committedSkillDir);
  const fresh = files(freshSkillDir);
  for (const path of fresh) if (!committed.has(path)) issues.push(`missing skill file: skills/aigpu/${path}`);
  for (const path of committed) if (!fresh.has(path)) issues.push(`stale skill file: skills/aigpu/${path}`);
  for (const path of committed) {
    if (!fresh.has(path)) continue;
    const left = normalizeStamp(path, read(join(committedSkillDir, path)));
    const right = normalizeStamp(path, read(join(freshSkillDir, path)));
    if (left !== right) issues.push(`skill content differs: skills/aigpu/${path}`);
  }
  if (issues.length) {
    console.error("AIGpu docs or skill output is out of date. Run `pnpm --dir packages/aigpu-cli generate:docs`.");
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exitCode = 1;
  } else {
    console.log("AIGpu docs manifest and skill are current.");
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function files(directory) {
  const result = new Set();
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else result.add(relative(directory, path));
    }
  };
  if (statSync(directory).isDirectory()) walk(directory);
  return result;
}

function read(path) {
  try { return readFileSync(path, "utf8"); } catch { return null; }
}

function normalizeStamp(path, content) {
  if (path !== "SKILL.md" || content === null) return content;
  return content.replace(/^(gitSha|generatedAt): .*$/gmu, "$1: <stamp>");
}
