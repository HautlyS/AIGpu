import { describe, it, expect } from "vitest";
import { runMnistExample } from "./example";

describe("mnist-classifier example", () => {
  it("runs without errors", async () => {
    const result = await runMnistExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
