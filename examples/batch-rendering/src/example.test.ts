import { expect, test } from "vitest";
import { BATCH, runBatchExample } from "./example.ts";

test("batch-rendering shader declares uniform time and vertex inputs", () => {
  expect(BATCH).toContain("struct Uniforms { time: f32 }");
  expect(BATCH).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(BATCH).toContain("@vertex fn vs(@location(0) pos: vec3f)");
  expect(BATCH).toContain("@fragment fn fs");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("batch-rendering renders multiple shapes without errors", async () => {
  const { gpu, target } = await runBatchExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
