import { expect, test } from "vitest";
import { FLARE, runNextjsFlareExample } from "./example.ts";

test("nextjs-flare shader declares uniforms and implements volumetric rim glow", () => {
  expect(FLARE).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(FLARE).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(FLARE).toContain("@fragment fn main");
  expect(FLARE).toContain("smoothstep");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("nextjs-flare renders without errors", async () => {
  const { gpu, target } = await runNextjsFlareExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
