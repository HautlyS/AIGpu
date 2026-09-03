import { expect, test } from "vitest";
import { applyIdentifierMinifyWgsl, buildIdentifierReplacements } from "../src/runtime/identifier-minify.ts";
import { analyzeWgslScopes, type ScopeAnalysis } from "../src/runtime/scope-walker.ts";

// Defense in depth for aigpu#251: the identifier renamer must not trust the scope analysis blindly.
// Before renaming a local name it verifies that every identifier token in the same function
// spelled the same way belongs to one of that name's recorded declarations. A scope-analysis bug
// therefore degrades to a missed optimization instead of dangling or misattributed identifiers.

const comparisonInitializer = "fn helper_fn(uv: vec2f) -> f32 { let flag = uv.x < 1.0; if (flag) { return 0.0; } return 1.0; }";

test("identifier minify leaves a local unrenamed when the scope analysis loses one of its references", () => {
  const analysis = analyzeWgslScopes(comparisonInitializer);
  const declaration = analysis.declarations.find((decl) => decl.name === "flag");
  const references = analysis.references.filter((ref) => ref.declarationId === declaration?.id);
  expect(declaration).toBeDefined();
  expect(references).toHaveLength(1);

  // Reproduce the pre-fix scope walker's observable failure without reintroducing the bug: drop the
  // reference the overshooting statement scan used to miss.
  const sabotaged: ScopeAnalysis = { ...analysis, references: analysis.references.filter((ref) => ref !== references[0]) };
  const replacements = buildIdentifierReplacements(sabotaged);

  expect(replacements.has(declaration!.tokenIndex)).toBe(false);
  expect(replacements.has(references[0]!.tokenIndex)).toBe(false);
  // Unaffected locals in the same function are still renamed.
  expect(replacements.has(analysis.declarations.find((decl) => decl.name === "uv")!.tokenIndex)).toBe(true);
});

test("identifier minify still renames locals whose occurrences are all accounted for", () => {
  const analysis = analyzeWgslScopes(comparisonInitializer);
  const declaration = analysis.declarations.find((decl) => decl.name === "flag");
  const replacements = buildIdentifierReplacements(analysis);

  expect(replacements.get(declaration!.tokenIndex)).toBeTypeOf("string");
  for (const ref of analysis.references.filter((item) => item.declarationId === declaration?.id)) {
    expect(replacements.get(ref.tokenIndex)).toBe(replacements.get(declaration!.tokenIndex));
  }
});

// A name legitimately reused by two disjoint sibling blocks renames to one short name per
// declaration, since the walker attributes each reference to its own block.
test("identifier minify renames a local name reused by sibling block scopes", () => {
  const result = applyIdentifierMinifyWgsl("fn f(seed: f32) -> f32 { var total = 0.0; { let x = seed; total = total + x; } { let x = seed * 2.0; total = total + x; } return total; }");

  expect(result.wgsl).not.toContain("let x=");
  const renamed = [...result.wgsl.matchAll(/let ([a-zA-Z]+)=/g)].map((m) => m[1]);
  expect(renamed).toHaveLength(2);
  expect(new Set(renamed).size).toBe(2);
  // The skip is per name, not per function: every unambiguous local is still shortened.
  expect(result.wgsl).not.toContain("seed");
  expect(result.wgsl).not.toContain("total");
});

test("identifier minify renames a shadowed local pair with scope-correct references", () => {
  const result = applyIdentifierMinifyWgsl("fn f(v: f32) -> f32 { var x = 10.0; if (v > 0.0) { var x = select(0.0, 1.0, v < 0.5); return x; } return x; }");

  // The outer and inner declarations each get their own short name, and every reference keeps
  // pointing at its innermost declaration.
  expect(result.wgsl).not.toContain("var x=");
  expect(result.wgsl).toMatch(/fn f\(a:f32\)/);
  expect(result.wgsl).toContain("var b=10.0");
  expect(result.wgsl).toContain("var c=select(0.0,1.0,a<0.5)");
  expect(result.wgsl).toContain("return c;");
  expect(result.wgsl).toContain("return b;");
});
