import { expect, test } from "vitest";
import { AGENT_MARK, runAgentRadianceExample } from "./example.ts";

test("agent-radiance shader declares uniforms and implements circular dot pattern", () => {
  expect(AGENT_MARK).toContain("struct Uniforms { time: f32, resolution: vec2f }");
  expect(AGENT_MARK).toContain("@group(0) @binding(0) var<uniform> u: Uniforms");
  expect(AGENT_MARK).toContain("@fragment fn main");
  expect(AGENT_MARK).toContain("fn agentDot");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("agent-radiance renders without errors", async () => {
  const { gpu, target } = await runAgentRadianceExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(512 * 512 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
