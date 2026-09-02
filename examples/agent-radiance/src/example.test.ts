import { describe, it, expect } from "vitest";
import { runAgentRadianceExample } from "./example";

describe("agent-radiance example", () => {
  it("runs without errors", async () => {
    const result = await runAgentRadianceExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
