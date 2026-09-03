import { expect, test } from "vitest";
import { MNIST_VISUALIZE, runMnistExample } from "./example.ts";

test("mnist-classifier shader declares uniforms and uses hash for digit grid", () => {
  expect(MNIST_VISUALIZE).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(MNIST_VISUALIZE).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(MNIST_VISUALIZE).toContain("@fragment fn main");
  expect(MNIST_VISUALIZE).toContain("fn hash");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("mnist-classifier renders without errors", async () => {
  const { gpu, target } = await runMnistExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
