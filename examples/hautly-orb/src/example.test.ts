import { describe, it, expect } from "vitest";
import { runHautlyExample, createHautly, HAUTLY_ORB } from "./example.ts";

describe("hautly orb example", () => {
  it("has valid WGSL shader", () => {
    expect(HAUTLY_ORB).toContain("@fragment fn main");
    expect(HAUTLY_ORB).toContain("struct Uniforms");
    expect(HAUTLY_ORB).toContain("fn hash");
    expect(HAUTLY_ORB).toContain("fn noise");
    expect(HAUTLY_ORB).toContain("fn fbm");
  });

  it("creates hautly instance", async () => {
    const hautly = await createHautly();
    expect(hautly.gpu).toBeDefined();
    expect(hautly.target).toBeDefined();
    expect(hautly.updateState).toBeDefined();
    expect(hautly.getStatus).toBeDefined();
    hautly.dispose();
  });

  it("updates state correctly", async () => {
    const hautly = await createHautly();
    
    expect(hautly.getStatus().status).toBe("idle");
    
    hautly.updateState({ status: "thinking", intensity: 0.8 });
    expect(hautly.getStatus().status).toBe("thinking");
    expect(hautly.getStatus().intensity).toBe(0.8);
    
    hautly.updateState({ status: "speaking", message: "Test" });
    expect(hautly.getStatus().status).toBe("speaking");
    expect(hautly.getStatus().message).toBe("Test");
    
    hautly.dispose();
  });

  it("runs full example without errors", async () => {
    const result = await runHautlyExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
    result.dispose();
  });
});
