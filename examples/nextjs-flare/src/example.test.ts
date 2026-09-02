import { describe, it, expect } from "vitest";
import { runNextjsFlareExample } from "./example";

describe("nextjs-flare example", () => {
  it("runs without errors", async () => {
    const result = await runNextjsFlareExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
