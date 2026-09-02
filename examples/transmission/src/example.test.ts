import { describe, it, expect } from "vitest";
import { runTransmissionExample } from "./example";

describe("transmission example", () => {
  it("runs without errors", async () => {
    const result = await runTransmissionExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
