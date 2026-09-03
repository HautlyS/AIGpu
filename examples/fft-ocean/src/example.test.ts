import { expect, test } from "vitest";
import { SPECTRUM_INIT, IFFT, runFFTOceanExample } from "./example.ts";

test("fft-ocean spectrum init shader uses compute with Phillips spectrum", () => {
  expect(SPECTRUM_INIT).toContain("@compute @workgroup_size(8, 8)");
  expect(SPECTRUM_INIT).toContain("fn phillips");
  expect(SPECTRUM_INIT).toContain("textureStorage_2d");
});

test("fft-ocean IFFT shader uses compute with texture I/O", () => {
  expect(IFFT).toContain("@compute @workgroup_size(8, 8)");
  expect(IFFT).toContain("textureLoad");
  expect(IFFT).toContain("textureStore");
});

test.skipIf(process.env.AIGPU_DOCKER_TEST !== "1")("fft-ocean renders without errors", async () => {
  const { gpu, target } = await runFFTOceanExample();
  try {
    const pixels = await target.read();
    expect(pixels.length).toBe(256 * 256 * 4);
    expect(pixels.some((v) => v > 10)).toBe(true);
  } finally {
    gpu.dispose();
  }
});
