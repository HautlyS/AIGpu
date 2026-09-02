import { describe, it, expect } from "vitest";
import { runAirPaintingExample } from "./example";

describe("air-painting example", () => {
  it("runs without errors", async () => {
    const result = await runAirPaintingExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
