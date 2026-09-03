import { expect, test } from "vitest";
import { OCEAN_SURFACE, runFFTSurfaceExample } from "./example.ts";

test("fft-ocean-surface shader declares uniforms and implements ocean waves", () => {
  expect(OCEAN_SURFACE).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(OCEAN_SURFACE).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(OCEAN_SURFACE).toContain("@fragment fn main");
  expect(OCEAN_SURFACE).toContain("fn oceanWave");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("fft-ocean-surface renders without errors", async () => {
  const { gpu, target } = await runFFTSurfaceExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
