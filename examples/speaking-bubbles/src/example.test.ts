import { describe, it, expect } from "vitest";
import { runSpeakingBubblesExample, createSpeakingBubbles, SPEAKING_BUBBLES } from "./example.ts";

describe("speaking bubbles example", () => {
  it("has valid WGSL shader", () => {
    expect(SPEAKING_BUBBLES).toContain("@fragment fn main");
    expect(SPEAKING_BUBBLES).toContain("struct Uniforms");
    expect(SPEAKING_BUBBLES).toContain("fn bubbleSDF");
    expect(SPEAKING_BUBBLES).toContain("fn drawChar");
  });

  it("creates bubble system", async () => {
    const bubbles = await createSpeakingBubbles();
    expect(bubbles.gpu).toBeDefined();
    expect(bubbles.target).toBeDefined();
    expect(bubbles.startSpeaking).toBeDefined();
    expect(bubbles.stopSpeaking).toBeDefined();
    expect(bubbles.getState).toBeDefined();
    bubbles.dispose();
  });

  it("manages speaking state", async () => {
    const bubbles = await createSpeakingBubbles();
    
    expect(bubbles.getState().speaking).toBe(false);
    expect(bubbles.getState().bubbleCount).toBe(0);
    
    bubbles.startSpeaking("Test message");
    expect(bubbles.getState().speaking).toBe(true);
    expect(bubbles.getState().bubbleCount).toBe(1);
    expect(bubbles.getState().messages).toContain("Test message");
    
    bubbles.startSpeaking("Second message");
    expect(bubbles.getState().bubbleCount).toBe(2);
    
    bubbles.stopSpeaking();
    expect(bubbles.getState().speaking).toBe(false);
    expect(bubbles.getState().bubbleCount).toBe(0);
    expect(bubbles.getState().messages).toHaveLength(0);
    
    bubbles.dispose();
  });

  it("runs full example without errors", async () => {
    const result = await runSpeakingBubblesExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
    result.dispose();
  });
});
