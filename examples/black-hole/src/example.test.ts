import { expect, test } from "vitest";
import { BLACK_HOLE, runBlackHoleExample } from "./example.ts";

test("black-hole shader declares uniforms and uses raymarching", () => {
  expect(BLACK_HOLE).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(BLACK_HOLE).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(BLACK_HOLE).toContain("@fragment fn main");
  expect(BLACK_HOLE).toContain("fn raymarch");
  expect(BLACK_HOLE).toContain("fn scene");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("black-hole effect renders without errors", async () => {
  const { gpu, target } = await runBlackHoleExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
