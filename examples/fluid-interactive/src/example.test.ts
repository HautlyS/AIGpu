import { expect, test } from "vitest";
import { ADVECT, DIVERGENCE, runFluidExample } from "./example.ts";

test("fluid-interactive ADVECT shader uses compute with texture I/O", () => {
  expect(ADVECT).toContain("@compute @workgroup_size(8, 8)");
  expect(ADVECT).toContain("textureLoad");
  expect(ADVECT).toContain("textureStore");
  expect(ADVECT).toContain("var<uniform> dt: f32");
});

test("fluid-interactive DIVERGENCE shader uses compute for pressure", () => {
  expect(DIVERGENCE).toContain("@compute @workgroup_size(8, 8)");
  expect(DIVERGENCE).toContain("textureLoad");
  expect(DIVERGENCE).toContain("textureStore");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("fluid-interactive renders without errors", async () => {
  const { gpu, target } = await runFluidExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(128 * 128 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
