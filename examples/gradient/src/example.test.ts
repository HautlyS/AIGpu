import { expect, test } from "vitest";
import { GRADIENT, runGradientExample } from "./example.ts";

test("gradient shader uses fullscreen fragment with vignette", () => {
  expect(GRADIENT).toContain("@fragment fn main(@location(0) uv: vec2f)");
  expect(GRADIENT).toContain("smoothstep");
  expect(GRADIENT).toContain("distance");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("gradient renders without errors", async () => {
  const { gpu, target } = await runGradientExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(256 * 256 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
