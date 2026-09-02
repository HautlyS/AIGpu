import { expect, test } from "vitest";
import { AGENT_ANIMATION_SHADER, agentAnimation, agentStatusIndex } from "../src/agent.ts";
import { frame } from "../src/frame.ts";
import { init } from "../src/mock.ts";
import { target } from "../src/target-offscreen.ts";

test("agentAnimation maps state into a stable GPU effect", async () => {
  const gpu = await init();
  const agent = agentAnimation(gpu, {
    label: "test-agent",
    initial: { status: "thinking", progress: 0.25, activity: 0.4, speed: 1.5 },
  });

  expect(agent.state).toMatchObject({ status: "thinking", progress: 0.25, activity: 0.4, speed: 1.5 });
  expect(agentStatusIndex("success")).toBe(4);
  expect(AGENT_ANIMATION_SHADER).toContain("@group(0) @binding(0)");

  agent.set({ status: "working", progress: 2, activity: -1 }).tick(3.5);
  expect(agent.state).toMatchObject({ status: "working", progress: 1, activity: 0 });

  const output = target(gpu, { size: [4, 4], format: "rgba8unorm" });
  frame(gpu, (current) => current.pass(output, agent.effect));
  agent.reset();
  expect(agent.state).toMatchObject({ status: "thinking", progress: 0.25, activity: 0.4, speed: 1.5 });
  gpu.dispose();
});

test("agentAnimation rejects invalid values and protects its state snapshot", async () => {
  const gpu = await init();
  const agent = agentAnimation(gpu);

  expect(() => agent.set({ status: "unknown" as never })).toThrowError(/Unknown agent status/);
  expect(() => agent.set({ colors: { accent: [2, 0, 0, 1] } })).toThrowError(/colors\.accent/);
  expect(() => agent.tick(Number.NaN)).toThrowError(/finite number/);

  const snapshot = agent.state;
  (snapshot.colors.accent as number[])[0] = 0;
  expect(agent.state.colors.accent[0]).toBeGreaterThan(0);
  gpu.dispose();
});
