import { describe, it, expect } from "vitest";
import { runOptimizedBlackHoleExample } from "./example";

describe("optimized-black-hole example", () => {
  it("runs without errors", async () => {
    const result = await runOptimizedBlackHoleExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
