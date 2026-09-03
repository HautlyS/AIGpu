import { expect, test } from "vitest";
import { PARTICLES, runParticleOrbitExample } from "./example.ts";

test("particle-orbit shader declares uniforms and implements orbiting particles", () => {
  expect(PARTICLES).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(PARTICLES).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(PARTICLES).toContain("@fragment fn main");
  expect(PARTICLES).toContain("fn hash");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("particle-orbit renders without errors", async () => {
  const { gpu, target } = await runParticleOrbitExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
