import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

const packageDir = new URL("..", import.meta.url).pathname;

test("dry-run pack includes bundled docs artifact", () => {
  const output = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: packageDir, encoding: "utf8" });
  const jsonStart = output.indexOf("{");
  const packObject = JSON.parse(output.slice(jsonStart));
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
