import { expect, test } from "vitest";
import { SPEAKING_BUBBLES, createSpeakingBubbles, runSpeakingBubblesExample } from "./example.ts";

test("speaking-bubbles shader declares uniforms with bubbleCount and speaking state", () => {
  expect(SPEAKING_BUBBLES).toContain("bubbleCount: f32");
  expect(SPEAKING_BUBBLES).toContain("speaking: f32");
  expect(SPEAKING_BUBBLES).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(SPEAKING_BUBBLES).toContain("@fragment fn main");
  expect(SPEAKING_BUBBLES).toContain("fn bubbleSDF");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("speaking-bubbles creates and manages state", async () => {
  const bubbles = await createSpeakingBubbles();
  try {
    expect(bubbles.gpu).toBeDefined();
    expect(bubbles.target).toBeDefined();
    expect(bubbles.getState().speaking).toBe(false);
    bubbles.startSpeaking("Test");
    expect(bubbles.getState().speaking).toBe(true);
    expect(bubbles.getState().bubbleCount).toBe(1);
    bubbles.stopSpeaking();
    expect(bubbles.getState().speaking).toBe(false);
  } finally {
    bubbles.dispose();
  }
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("speaking-bubbles full example runs without errors", async () => {
  const result = await runSpeakingBubblesExample();
  try {
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  } finally {
    result.dispose();
  }
});
