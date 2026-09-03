import { expect, test } from "vitest";
import { DEPTH_VISUALIZE, runDepthExample } from "./example.ts";

test("depth-estimation shader declares uniforms and uses noise for depth", () => {
  expect(DEPTH_VISUALIZE).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(DEPTH_VISUALIZE).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(DEPTH_VISUALIZE).toContain("@fragment fn main");
  expect(DEPTH_VISUALIZE).toContain("fn noise");
  expect(DEPTH_VISUALIZE).toContain("fn hash");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("depth-estimation renders without errors", async () => {
  const { gpu, target } = await runDepthExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
