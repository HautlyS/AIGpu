import { expect, test } from "vitest";
import { FRACTAL, runFractalExample } from "./example.ts";

test("raymarched-fractal shader declares uniforms and implements Sierpinski fractal", () => {
  expect(FRACTAL).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(FRACTAL).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(FRACTAL).toContain("@fragment fn main");
  expect(FRACTAL).toContain("fn sierpinski");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("raymarched-fractal renders without errors", async () => {
  const { gpu, target } = await runFractalExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
