import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression test for https://github.com/hautlys/AIGpu/issues/241.
 *
 * `@aigpu/wgsl/runtime` used to declare only `types` + `import` conditions, so any
 * CommonJS consumer (`require("@aigpu/wgsl/runtime")`, plain `tsx`/ts-node projects
 * without `"type": "module"`) failed with ERR_PACKAGE_PATH_NOT_EXPORTED.
 *
 * The root vitest config aliases `@aigpu/wgsl/runtime` straight to `src/`, which
 * bypasses the exports map entirely, so a normal `import` test cannot catch this.
 * This test installs the real package (real `package.json` + built `dist/`) into a
 * temp project WITHOUT `"type": "module"` and resolves/requires the bare specifier
 * through Node's real CJS resolver. It therefore needs `pnpm build` to have run.
 */
describe("@aigpu/wgsl/runtime (CommonJS consumers)", () => {
  it("resolves and requires the bare './runtime' subpath from a CJS project", async () => {
    const dir = await createCjsProject();
    const requireFromProject = createRequire(join(dir, "index.cjs"));

    expect(() => requireFromProject.resolve("@aigpu/wgsl/runtime")).not.toThrow();

    const runtime = requireFromProject("@aigpu/wgsl/runtime");
    expect(typeof runtime.resolveShader).toBe("function");
  });
});

async function createCjsProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "vgsl-cjs-require-"));
  // Deliberately no "type": "module" here: this is a CommonJS consumer.
  await writeFile(join(dir, "package.json"), JSON.stringify({ name: "vgsl-cjs-consumer", version: "0.0.0" }, null, 2));
  await writeFile(join(dir, "index.cjs"), 'require("@aigpu/wgsl/runtime");\n');
  await installWorkspacePackage(dir);
  return dir;
}

async function installWorkspacePackage(dir: string): Promise<void> {
  const scopeDir = join(dir, "node_modules", "@aigpu");
  await mkdir(scopeDir, { recursive: true });
  await symlink(resolve("packages/wgsl"), join(scopeDir, "wgsl"), "dir");
}
