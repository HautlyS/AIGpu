import { describe, it, expect } from "vitest";
import { runFFTSurfaceExample } from "./example";

describe("fft-ocean-surface example", () => {
  it("runs without errors", async () => {
    const result = await runFFTSurfaceExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
