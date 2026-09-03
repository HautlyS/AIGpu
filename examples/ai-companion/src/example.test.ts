import { expect, test } from "vitest";
import { AI_COMPANION, createAICompanion, runAICompanionExample } from "./example.ts";

test("ai-companion shader declares uniforms with AI state and connection strength", () => {
  expect(AI_COMPANION).toContain("aiState: f32");
  expect(AI_COMPANION).toContain("responseIntensity: f32");
  expect(AI_COMPANION).toContain("connectionStrength: f32");
  expect(AI_COMPANION).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(AI_COMPANION).toContain("@fragment fn main");
  expect(AI_COMPANION).toContain("fn connectionLine");
  expect(AI_COMPANION).toContain("fn fbm");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("ai-companion creates and manages state", async () => {
  const companion = await createAICompanion();
  try {
    expect(companion.gpu).toBeDefined();
    expect(companion.target).toBeDefined();
    expect(companion.getState().aiState).toBe("idle");
    companion.updateState({ aiState: "processing", responseIntensity: 0.3 });
    expect(companion.getState().aiState).toBe("processing");
  } finally {
    companion.dispose();
  }
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("ai-companion simulates response", async () => {
  const companion = await createAICompanion();
  try {
    const response = await companion.simulateAIResponse("Test input");
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  } finally {
    companion.dispose();
  }
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("ai-companion full example runs without errors", async () => {
  const result = await runAICompanionExample();
  try {
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  } finally {
    result.dispose();
  }
});
