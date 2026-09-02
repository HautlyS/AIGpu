import { expect, test } from "vitest";
import { resolveShader } from "@aigpu/wgsl/runtime";
import { REPRESENTATIVE_GRADIENT_WGSL } from "../../aigpu-api/tests/fixtures/representative-gradient.ts";

const validation = process.env.AIGPU_DOCKER_TEST === "1";

test.skipIf(!validation)("naga validates the representative snapshot shader set", async () => {
  await expect(resolveShader({
    entry: "/representative-gradient.wgsl",
    modules: { "/representative-gradient.wgsl": REPRESENTATIVE_GRADIENT_WGSL },
    validate: true,
  })).resolves.toMatchObject({ deps: ["/representative-gradient.wgsl"] });
});
