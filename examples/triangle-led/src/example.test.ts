import { describe, it, expect } from "vitest";
import { runTriangleLedExample } from "./example";

describe("triangle-led example", () => {
  it("runs without errors", async () => {
    const result = await runTriangleLedExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
