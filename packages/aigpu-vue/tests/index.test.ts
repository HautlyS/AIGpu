import { expect, test } from "vitest";
import { mountAgentCanvas, useAgentCanvas } from "../src/index.ts";

test("Vue adapter exposes the composable and shared DOM mount", () => {
  expect(typeof useAgentCanvas).toBe("function");
  expect(typeof mountAgentCanvas).toBe("function");
});
