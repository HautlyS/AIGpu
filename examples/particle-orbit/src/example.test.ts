import { describe, it, expect } from "vitest";
import { runParticleOrbitExample } from "./example";

describe("particle-orbit example", () => {
  it("runs without errors", async () => {
    const result = await runParticleOrbitExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
