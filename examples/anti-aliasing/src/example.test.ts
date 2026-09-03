import { expect, test } from "vitest";
import { SCENE, runAntiAliasingExample } from "./example.ts";

test("anti-aliasing shader declares uniforms and uses smoothstep for edges", () => {
  expect(SCENE).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(SCENE).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(SCENE).toContain("@fragment fn main");
  expect(SCENE).toContain("smoothstep");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("anti-aliasing scene renders without errors", async () => {
  const { gpu, target } = await runAntiAliasingExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
