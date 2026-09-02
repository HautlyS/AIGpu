import { describe, it, expect } from "vitest";
import { runBatchExample } from "./example";

describe("batch-rendering example", () => {
  it("runs without errors", async () => {
    const result = await runBatchExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
