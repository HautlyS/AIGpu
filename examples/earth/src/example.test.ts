import { describe, it, expect } from "vitest";
import { runEarthExample } from "./example";

describe("earth example", () => {
  it("runs without errors", async () => {
    const result = await runEarthExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
