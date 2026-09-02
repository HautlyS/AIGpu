import { describe, it, expect } from "vitest";
import { runGlassExample } from "./example";

describe("glass-fractal example", () => {
  it("runs without errors", async () => {
    const result = await runGlassExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
