import { expect, test } from "vitest";
import { loadRecipe, statusSequence, visualRecipes } from "./gallery.ts";

test("the gallery exposes eight distinct visual recipes", () => {
  expect(visualRecipes).toHaveLength(8);
  expect(new Set(visualRecipes.map((recipe) => recipe.mood)).size).toBe(8);
});

test("every recipe shader compiles through AIGpu WGSL", async () => {
  for (const recipe of visualRecipes) {
    const source = await loadRecipe(recipe);
    expect(source).toContain("@fragment");
    expect(source).toContain("struct AgentParams");
    expect(source).toContain("const STYLE: u32");
  }
});

test("recipes provide agent event sequences for interactive demos", () => {
  for (const recipe of visualRecipes) {
    const sequence = statusSequence(recipe);
    expect(sequence.length).toBeGreaterThanOrEqual(2);
    expect(sequence.every((status) => typeof status === "string")).toBe(true);
  }
});
