import { expect, test } from "vitest";
import { ENV_MAP, runEnvMapExample } from "./example.ts";

test("environment-map shader declares uniforms and implements sky/reflection", () => {
  expect(ENV_MAP).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(ENV_MAP).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(ENV_MAP).toContain("@fragment fn main");
  expect(ENV_MAP).toContain("fn sky");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("environment-map renders without errors", async () => {
  const { gpu, target } = await runEnvMapExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
