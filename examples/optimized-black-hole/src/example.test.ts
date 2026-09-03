import { expect, test } from "vitest";
import { OPTIMIZED_BH, runOptimizedBlackHoleExample } from "./example.ts";

test("optimized-black-hole shader declares uniforms and implements gravitational lensing", () => {
  expect(OPTIMIZED_BH).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(OPTIMIZED_BH).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(OPTIMIZED_BH).toContain("@fragment fn main");
  expect(OPTIMIZED_BH).toContain("smoothstep");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("optimized-black-hole renders without errors", async () => {
  const { gpu, target } = await runOptimizedBlackHoleExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
