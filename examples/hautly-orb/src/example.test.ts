import { expect, test } from "vitest";
import { HAUTLY_ORB, createHautly, runHautlyExample } from "./example.ts";

test("hautly-orb shader declares uniforms with status and intensity", () => {
  expect(HAUTLY_ORB).toContain("status: f32");
  expect(HAUTLY_ORB).toContain("intensity: f32");
  expect(HAUTLY_ORB).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(HAUTLY_ORB).toContain("@fragment fn main");
  expect(HAUTLY_ORB).toContain("fn fbm");
  expect(HAUTLY_ORB).toContain("fn noise");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("hautly-orb creates instance and exposes state API", async () => {
  const hautly = await createHautly();
  try {
    expect(hautly.gpu).toBeDefined();
    expect(hautly.target).toBeDefined();
    expect(hautly.getStatus().status).toBe("idle");
    hautly.updateState({ status: "thinking", intensity: 0.8 });
    expect(hautly.getStatus().status).toBe("thinking");
  } finally {
    hautly.dispose();
  }
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("hautly-orb full example runs without errors", async () => {
  const result = await runHautlyExample();
  try {
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  } finally {
    result.dispose();
  }
});
