import { expect, test } from "vitest";
import { mountAgentCanvas, useAgentCanvas } from "../src/index.ts";

test("React adapter exposes the hook and shared DOM mount", () => {
  expect(typeof useAgentCanvas).toBe("function");
  expect(typeof mountAgentCanvas).toBe("function");
});
