import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

const packageDir = new URL("..", import.meta.url).pathname;

/**
 * Parses `npm pack --json` stdout. Some npm versions print `npm notice`
 * lines to stdout after the JSON payload, so the JSON is extracted by
 * bracket-matching instead of parsing the whole output.
 */
function parsePackJson(output: string): unknown {
  const start = output.search(/[{\[]/u);
  if (start === -1) throw new Error("npm pack produced no JSON");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < output.length; i++) {
    const ch = output[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return JSON.parse(output.slice(start, i + 1));
    }
  }
  throw new Error("npm pack produced truncated JSON");
}

test("dry-run pack includes bundled docs artifact", () => {
  const output = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: packageDir, encoding: "utf8" });
  const packObject = parsePackJson(output) as Record<string, { files: { path: string }[]; size: number }>;
  const pack = Object.values(packObject)[0] as { files: { path: string }[]; size: number };
  const files = pack.files.map((file) => file.path);

  expect(files).toContain("bin/aigpu.js");
  expect(files).toContain("lib/generated/docs-manifest.generated.js");
  expect(pack.size).toBeLessThan(900_000);
});

test("packed install exposes aigpu docs bin", () => {
  const packDir = mkdtempSync(join(tmpdir(), "aigpu-pack-"));
  const installDir = mkdtempSync(join(tmpdir(), "aigpu-install-"));
  try {
    const output = execFileSync("npm", ["pack", "--pack-destination", packDir], { cwd: packageDir, encoding: "utf8" });
    const tarball = join(packDir, output.trim().split(/\r?\n/u).at(-1));
    execFileSync("npm", ["install", tarball, "--prefix", installDir], { stdio: "pipe" });
    const bin = join(installDir, "node_modules/.bin/aigpu");
    const result = execFileSync(bin, ["docs", "path", "Buffer"], { encoding: "utf8" });
    expect(result).toBe("/aigpu/core/buffer.docs.md\n");
  } finally {
    rmSync(packDir, { recursive: true, force: true });
    rmSync(installDir, { recursive: true, force: true });
  }
}, 60_000);
