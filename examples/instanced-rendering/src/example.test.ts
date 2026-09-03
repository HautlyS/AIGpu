import { expect, test } from "vitest";
import { INSTANCED, runInstancedExample } from "./example.ts";

test("instanced-rendering shader declares uniform time and per-instance inputs", () => {
  expect(INSTANCED).toContain("struct Uniforms { time: f32 }");
  expect(INSTANCED).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(INSTANCED).toContain("@location(1) offset: vec3f");
  expect(INSTANCED).toContain("@location(2) color: vec3f");
  expect(INSTANCED).toContain("@vertex fn vs");
  expect(INSTANCED).toContain("@fragment fn fs");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("instanced-rendering renders 1000 instances without errors", async () => {
  const { gpu, target } = await runInstancedExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
