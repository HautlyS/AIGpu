import { expect, test } from "vitest";
import { LED_EMITTERS, runTriangleLedExample } from "./example.ts";

test("triangle-led shader declares uniforms and implements LED glow edges", () => {
  expect(LED_EMITTERS).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(LED_EMITTERS).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(LED_EMITTERS).toContain("@vertex fn vs");
  expect(LED_EMITTERS).toContain("@fragment fn fs");
  expect(LED_EMITTERS).toContain("smoothstep");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("triangle-led renders without errors", async () => {
  const { gpu, target } = await runTriangleLedExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
