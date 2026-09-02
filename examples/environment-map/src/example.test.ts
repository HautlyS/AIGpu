import { describe, it, expect } from "vitest";
import { runEnvMapExample } from "./example";

describe("environment-map example", () => {
  it("runs without errors", async () => {
    const result = await runEnvMapExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
