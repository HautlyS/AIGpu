import { expect, test } from "vitest";
import { CLIPPING, runClippingExample } from "./example.ts";

test("clipping shader declares uniforms and uses icosphere SDF", () => {
  expect(CLIPPING).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(CLIPPING).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(CLIPPING).toContain("@fragment fn main");
  expect(CLIPPING).toContain("fn icosphere");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("clipping example renders without errors", async () => {
  const { gpu, target } = await runClippingExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
