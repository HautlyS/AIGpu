import { describe, it, expect } from "vitest";
import { runFluidExample, FLUID_DISPLAY } from "./example.ts";

describe("fluid example", () => {
  it("has valid WGSL shader", () => {
    expect(FLUID_DISPLAY).toContain("@fragment fn main");
    expect(FLUID_DISPLAY).toContain("struct Uniforms");
  });

  it("runs without errors", async () => {
    const result = await runFluidExample();
    expect(result.gpu).toBeDefined();
    expect(result.target).toBeDefined();
  });
});
