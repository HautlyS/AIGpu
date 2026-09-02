import { describe, it, expect } from "vitest";
import { runFractalExample } from "./example";

describe("raymarched-fractal example", () => {
  it("runs without errors", async () => {
    const result = await runFractalExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
