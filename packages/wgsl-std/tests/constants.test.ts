import { mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { resolveShader } from "@aigpu/wgsl/runtime";

describe("CPU reference constants catalog", () => {
  test("math constants use documented f32-rounded values", () => {
    const constants = {
      pi: 3.1415927,
      tau: 6.2831855,
      halfPi: 1.5707964,
      quarterPi: 0.7853982,
      invPi: 0.3183099,
      invTau: 0.15915494,
      goldenRatio: 1.618034,
      goldenAngle: 2.3999631,
    } as const;

    expect(constants.pi).toBeCloseTo(Math.PI, 6);
    expect(constants.tau).toBeCloseTo(Math.PI * 2, 6);
    expect(constants.halfPi).toBeCloseTo(Math.PI / 2, 6);
    expect(constants.quarterPi).toBeCloseTo(Math.PI / 4, 6);
    expect(constants.invPi).toBeCloseTo(1 / Math.PI, 6);
    expect(constants.invTau).toBeCloseTo(1 / (Math.PI * 2), 6);
    expect(constants.goldenRatio).toBeCloseTo((1 + Math.sqrt(5)) / 2, 6);
    expect(constants.goldenAngle).toBeCloseTo(Math.PI * (3 - Math.sqrt(5)), 6);
  });
});

test("constants resolve from @aigpu/wgsl-std/constants and produce valid declarations", async () => {
  const dir = await workspaceFixture();
  const entry = join(dir, "app", "main.wgsl");
  await writeFile(entry, `import { pi, tau, halfPi, quarterPi, invPi, invTau, goldenRatio, goldenAngle } from "@aigpu/wgsl-std/constants";
fn main() -> f32 {
  return pi + tau + halfPi + quarterPi + invPi + invTau + goldenRatio + goldenAngle;
}`);

  const result = await resolveShader({ entry, validate: false });

  expect(result.deps.some((dep) => dep.endsWith("node_modules/@aigpu/wgsl-std/src/constants/index.wgsl"))).toBe(true);
  for (const name of ["pi", "tau", "halfPi", "quarterPi", "invPi", "invTau", "goldenRatio", "goldenAngle"]) {
    expect.soft(result.wgsl, name).toMatch(new RegExp(`const _vgsl_[0-9a-f]{8}__${name}: f32`, "u"));
  }
});

test("constants minified output is deterministic", async () => {
  const dir = await workspaceFixture();
  const entry = join(dir, "app", "main.wgsl");
  await writeFile(entry, `import { pi, invTau } from "@aigpu/wgsl-std/constants";
fn main() -> f32 {
  return pi * invTau;
}`);

  const first = await resolveShader({ entry, validate: false, minify: true });
  const second = await resolveShader({ entry, validate: false, minify: true });

  expect(first.wgsl).toBe(second.wgsl);
  expect(first.wgsl).not.toContain("\n");
  expect(first.wgsl).not.toContain("//");
  expect(first.wgsl).toContain("3.1415927");
  expect(first.wgsl).toContain("0.15915494");
});

async function workspaceFixture(): Promise<string> {
  const dir = await mkdirTemp();
  await mkdir(join(dir, "app"), { recursive: true });
  await mkdir(join(dir, "node_modules", "@aigpu"), { recursive: true });
  await symlink(resolve("packages/wgsl-std"), join(dir, "node_modules", "@aigpu", "wgsl-std"), "dir");
  return dir;
}

async function mkdirTemp(): Promise<string> {
  const { mkdtemp } = await import("node:fs/promises");
  return mkdtemp(join(tmpdir(), "aigpu-wgsl-std-"));
}
