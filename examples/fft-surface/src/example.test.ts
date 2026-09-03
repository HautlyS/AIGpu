import { expect, test } from "vitest";
import { FFT_SURFACE, runFFTSurfaceExample } from "./example.ts";

test("fft-surface shader declares uniforms and implements wave pattern", () => {
  expect(FFT_SURFACE).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(FFT_SURFACE).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(FFT_SURFACE).toContain("@fragment fn main");
  expect(FFT_SURFACE).toContain("fn oceanWave");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("fft-surface renders without errors", async () => {
  const { gpu, target } = await runFFTSurfaceExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
