import { describe, it, expect } from "vitest";
import { runAntiAliasingExample } from "./example";

describe("anti-aliasing example", () => {
  it("runs without errors", async () => {
    const result = await runAntiAliasingExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
