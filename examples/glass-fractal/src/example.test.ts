import { expect, test } from "vitest";
import { GLASS, runGlassExample } from "./example.ts";

test("glass-fractal shader declares uniforms and implements refraction/fresnel", () => {
  expect(GLASS).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(GLASS).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(GLASS).toContain("@fragment fn main");
  expect(GLASS).toContain("fresnel");
  expect(GLASS).toContain("refract");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("glass-fractal renders without errors", async () => {
  const { gpu, target } = await runGlassExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
