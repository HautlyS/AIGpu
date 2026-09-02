#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const roots = ["README.md", "PRODUCTION.md", "docs", "packages", "examples", "skills"];
const files = [];

async function collect(path) {
  const absolute = join(root, path);
  try {
    const entries = await readdir(absolute, { withFileTypes: true });
    for (const entry of entries) {
      if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
      const child = join(path, entry.name);
      if (entry.isDirectory()) await collect(child);
      else if (/\.md$|\.mdx$/.test(entry.name)) files.push(child);
    }
  } catch {
    if (/\.md$|\.mdx$/.test(path)) files.push(path);
  }
}

for (const path of roots) await collect(path);
let snippets = 0;
for (const path of files) {
  const source = await readFile(join(root, path), "utf8");
  for (const [, language, body] of source.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm)) {
    if (!body.trim()) throw new Error(`${path}: empty ${language || "code"} fence`);
    snippets += 1;
  }
}
if (snippets < 10) throw new Error(`expected at least 10 non-empty snippets, found ${snippets}`);
console.log(`Validated ${snippets} non-empty documentation snippets across ${files.length} Markdown files.`);
