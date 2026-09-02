import { expect, test } from "vitest";
import { agentCanvas, mountAgentCanvas } from "../src/index.ts";

test("Svelte adapter exposes a standard action and shared DOM mount", () => {
  expect(typeof agentCanvas).toBe("function");
  expect(typeof mountAgentCanvas).toBe("function");
});
