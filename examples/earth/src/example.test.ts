import { expect, test } from "vitest";
import { EARTH, runEarthExample } from "./example.ts";

test("earth shader declares uniforms and uses noise for terrain", () => {
  expect(EARTH).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(EARTH).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(EARTH).toContain("@fragment fn main");
  expect(EARTH).toContain("fn noise");
  expect(EARTH).toContain("fn hash");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("earth renders without errors", async () => {
  const { gpu, target } = await runEarthExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
