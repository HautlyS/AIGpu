import { describe, it, expect } from "vitest";
import { runGradientExample } from "./example";

describe("gradient example", () => {
  it("runs without errors", async () => {
    const result = await runGradientExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
