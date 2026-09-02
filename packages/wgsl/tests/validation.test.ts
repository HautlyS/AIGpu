import { expect, test } from "vitest";
import { resolveShader } from "@aigpu/wgsl/runtime";

const validation = process.env.AIGPU_DOCKER_TEST === "1";

test.skipIf(!validation)("validation maps module line", async () => await expect(resolveShader({ entry: "/a.wgsl", modules: { "/a.wgsl": "const A = 1u;\nconst B = 1u;\nconst C = 1u;\nconst D = 1u;\nfn main(){ let x: u32 = 1.0; }" } })).rejects.toMatchObject({ range: { file: "a.wgsl", start: { line: 5 } } }));
test.skipIf(!validation)("validation handles emitted fallback", async () => await expect(resolveShader({ entry: "/a.wgsl", modules: { "/a.wgsl": "fn bad( {" } })).rejects.toMatchObject({ range: { file: "a.wgsl" }, code: "AIGPU-WGSL-NAGA-UNKNOWN" }));
test("validate false skips validation", async () => await expect(resolveShader({ entry: "/a.wgsl", modules: { "/a.wgsl": "fn bad( {" }, validate: false })).resolves.toHaveProperty("wgsl"));
test.skipIf(!validation)("approximate diagnostic tagged", async () => await expect(resolveShader({ entry: "/m.wgsl", modules: { "/m.wgsl": "import { f } from './f.wgsl'; fn main(){ let x: u32 = f(); }", "/f.wgsl": "export fn f() -> f32 { return 1.0; }" } })).rejects.toMatchObject({ code: "AIGPU-WGSL-NAGA-UNKNOWN", columnPrecise: false, relatedDiagnostics: [expect.objectContaining({ code: "AIGPU-WGSL-COL-APPROX" })] }));
test.skipIf(!validation)("precise diagnostic before substitution", async () => { try { await resolveShader({ entry: "/m.wgsl", modules: { "/m.wgsl": "@compute @workgroup_size(1) fn main(){ let x: u32 = 1.0; }" } }); throw new Error("expected validation failure"); } catch (error) { expect(error).toMatchObject({ code: "AIGPU-WGSL-NAGA-UNKNOWN", range: { file: "m.wgsl" }, columnPrecise: true }); expect(JSON.stringify(error)).not.toContain("AIGPU-WGSL-COL-APPROX"); } });
test.skipIf(!validation)("minified signed exponent literals validate after minifying", async () => {
  await expect(resolveShader({
    entry: "/m.wgsl",
    minify: true,
    modules: { "/m.wgsl": "@compute @workgroup_size(1) fn main(){ let a = 1e-8; let b = 1e+8; let c = 1E-8; let d = 1E+8; let e = 1.0e-8; let f = 1.0e+8; let g = 0x1p-8; let h = 0x1p+8; let i = 0x1P-8; let j = 0x1P+8; let k = 0x1.8p-2; }" },
  })).resolves.toHaveProperty("wgsl");
});

test.skipIf(!validation)("minified resolve validates emitted shader before minifying return output", async () => {
  try {
    await resolveShader({ entry: "/m.wgsl", minify: true, modules: { "/m.wgsl": "@compute @workgroup_size(1) fn main(){ let x: u32 = 1.0; }" } });
    throw new Error("expected validation failure");
  } catch (error) {
    expect(error).toMatchObject({ code: "AIGPU-WGSL-NAGA-UNKNOWN", range: { file: "m.wgsl" }, columnPrecise: true });
    expect(JSON.stringify(error)).not.toContain("AIGPU-WGSL-COL-APPROX");
  }
});
