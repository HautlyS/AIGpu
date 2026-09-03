import { expect, test } from "vitest";
import { JFA_INIT, RADIANCE_CASCADE, runRadianceExample } from "./example.ts";

test("radiance-cascades JFA_INIT shader uses compute for seed propagation", () => {
  expect(JFA_INIT).toContain("@compute @workgroup_size(8, 8)");
  expect(JFA_INIT).toContain("var<storage, read> seeds");
  expect(JFA_INIT).toContain("textureStore");
});

test("radiance-cascades RADIANCE_CASCADE shader uses compute for cascade stepping", () => {
  expect(RADIANCE_CASCADE).toContain("@compute @workgroup_size(8, 8)");
  expect(RADIANCE_CASCADE).toContain("var<uniform> cascade: u32");
  expect(RADIANCE_CASCADE).toContain("textureLoad");
  expect(RADIANCE_CASCADE).toContain("textureStore");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("radiance-cascades renders without errors", async () => {
  const { gpu, target } = await runRadianceExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(256 * 256 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
