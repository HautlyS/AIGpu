import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { wgslVitePlugin } from "./packages/wgsl/src/loader-vite/index.ts";

export default defineConfig({
  plugins: [wgslVitePlugin()],
  test: {
    include: [
      "packages/**/*.test.ts",
      "examples/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    // Replaces the deprecated `poolMatchGlobs` entry that forced `forks` for
    // packages/adapter-node/tests and packages/render/tests. `forks` was
    // already the resolved pool for the whole suite (it is Vitest's default),
    // so pinning it globally preserves the previous behaviour exactly while
    // no longer depending on that default.
    pool: "forks",
    testTimeout: 30_000,
  },
  resolve: {
    alias: [
      { find: "aigpu/node", replacement: resolve("packages/aigpu-api/src/node.ts") },
      { find: "aigpu/mock", replacement: resolve("packages/aigpu-api/src/mock.ts") },
      { find: "aigpu/scene", replacement: resolve("packages/aigpu-api/src/scene.ts") },
      { find: "aigpu/core", replacement: resolve("packages/aigpu-api/src/core.ts") },
      { find: "aigpu/dom", replacement: resolve("packages/aigpu-api/src/dom.ts") },
      { find: "aigpu/tools", replacement: resolve("packages/aigpu-api/src/agent-tools.ts") },
      { find: "aigpu", replacement: resolve("packages/aigpu-api/src/index.ts") },
      { find: "@aigpu/wgsl/loader-webpack", replacement: resolve("packages/wgsl/src/loader-webpack/index.ts") },
      { find: "@aigpu/wgsl/loader-vite", replacement: resolve("packages/wgsl/src/loader-vite/index.ts") },
      { find: "@aigpu/wgsl/runtime", replacement: resolve("packages/wgsl/src/runtime/resolve-shader.ts") },
      { find: "@aigpu/wgsl/reflect-source", replacement: resolve("packages/wgsl/src/runtime/reflect-source.ts") },
      { find: "@aigpu/core", replacement: resolve("packages/core/src/index.ts") },
      { find: "@aigpu/adapter-node", replacement: resolve("packages/adapter-node/src/index.ts") },
      { find: "@aigpu/adapter-mock", replacement: resolve("packages/adapter-mock/src/index.ts") },
      { find: "@aigpu/wgsl", replacement: resolve("packages/wgsl/src/index.ts") },
      { find: "@aigpu/render/inspect", replacement: resolve("packages/render/src/inspect/index.ts") },
      { find: "@aigpu/render/utils", replacement: resolve("packages/render/src/utils/index.ts") },
      { find: "@aigpu/render/edit", replacement: resolve("packages/render/src/edit/index.ts") },
      { find: "@aigpu/render/perf", replacement: resolve("packages/render/src/perf/index.ts") },
    ],
  },
});
