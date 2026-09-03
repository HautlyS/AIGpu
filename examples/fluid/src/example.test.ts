import { expect, test } from "vitest";
import { FLUID_DISPLAY, runFluidExample } from "./example.ts";

test("fluid shader declares uniforms and implements FBM noise", () => {
  expect(FLUID_DISPLAY).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(FLUID_DISPLAY).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(FLUID_DISPLAY).toContain("@fragment fn main");
  expect(FLUID_DISPLAY).toContain("fn fbm");
  expect(FLUID_DISPLAY).toContain("fn noise");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("fluid renders without errors", async () => {
  const { gpu, target } = await runFluidExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(256 * 256 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
