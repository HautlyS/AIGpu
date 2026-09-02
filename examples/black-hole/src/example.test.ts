import { describe, it, expect } from "vitest";
import { runBlackHoleExample } from "./example";

describe("black-hole example", () => {
  it("runs without errors", async () => {
    const result = await runBlackHoleExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
