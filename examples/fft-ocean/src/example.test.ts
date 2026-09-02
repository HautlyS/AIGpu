import { describe, it, expect } from "vitest";
import { runFFTOceanExample } from "./example";

describe("fft-ocean example", () => {
  it("runs without errors", async () => {
    const result = await runFFTOceanExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
