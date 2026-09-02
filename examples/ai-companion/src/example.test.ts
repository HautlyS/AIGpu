import { describe, it, expect } from "vitest";
import { runAICompanionExample, createAICompanion, AI_COMPANION } from "./example.ts";

describe("ai companion example", () => {
  it("has valid WGSL shader", () => {
    expect(AI_COMPANION).toContain("@fragment fn main");
    expect(AI_COMPANION).toContain("struct Uniforms");
    expect(AI_COMPANION).toContain("fn connectionLine");
    expect(AI_COMPANION).toContain("fn fbm");
  });

  it("creates AI companion", async () => {
    const companion = await createAICompanion();
    expect(companion.gpu).toBeDefined();
    expect(companion.target).toBeDefined();
    expect(companion.updateState).toBeDefined();
    expect(companion.simulateAIResponse).toBeDefined();
    expect(companion.getState).toBeDefined();
    companion.dispose();
  });

  it("manages AI state", async () => {
    const companion = await createAICompanion();
    
    expect(companion.getState().aiState).toBe("idle");
    expect(companion.getState().connectionStrength).toBe(0.5);
    
    companion.updateState({ aiState: "processing", responseIntensity: 0.3 });
    expect(companion.getState().aiState).toBe("processing");
    expect(companion.getState().responseIntensity).toBe(0.3);
    
    companion.updateState({ connectionStrength: 0.8 });
    expect(companion.getState().connectionStrength).toBe(0.8);
    
    companion.dispose();
  });

  it("simulates AI response", async () => {
    const companion = await createAICompanion();
    
    const response = await companion.simulateAIResponse("Test input");
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
    
    companion.dispose();
  });

  it("runs full example without errors", async () => {
    const result = await runAICompanionExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
    result.dispose();
  });
});
