import { describe, it, expect } from "vitest";
import { runInstancedExample } from "./example";

describe("instanced-rendering example", () => {
  it("runs without errors", async () => {
    const result = await runInstancedExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
