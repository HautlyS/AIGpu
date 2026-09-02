import { describe, it, expect } from "vitest";
import { runFluidExample } from "./example";

describe("fluid-interactive example", () => {
  it("runs without errors", async () => {
    const result = await runFluidExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
