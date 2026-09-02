import { describe, it, expect } from "vitest";
import { runClippingExample } from "./example";

describe("clipping example", () => {
  it("runs without errors", async () => {
    const result = await runClippingExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
