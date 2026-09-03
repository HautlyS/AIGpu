import { expect, test } from "vitest";
import { FROST, runAirPaintingExample } from "./example.ts";

test("air-painting shader declares uniforms with time and resolution", () => {
  expect(FROST).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(FROST).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(FROST).toContain("@fragment fn main");
  expect(FROST).toContain("fn noise");
  expect(FROST).toContain("fn hash");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("air-painting frost effect renders without errors", async () => {
  const { gpu, target } = await runAirPaintingExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
