import { describe, it, expect } from "vitest";
import { runRadianceExample } from "./example";

describe("radiance-cascades example", () => {
  it("runs without errors", async () => {
    const result = await runRadianceExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
