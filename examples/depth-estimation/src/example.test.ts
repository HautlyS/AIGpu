import { describe, it, expect } from "vitest";
import { runDepthExample } from "./example";

describe("depth-estimation example", () => {
  it("runs without errors", async () => {
    const result = await runDepthExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
