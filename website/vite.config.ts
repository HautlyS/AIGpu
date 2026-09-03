import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      // More specific aliases first (order matters for Vite)
      { find: "@hautly/entity/vue", replacement: resolve(__dirname, "../packages/hautly-entity/src/hautly-vue.ts") },
      { find: "@hautly/entity/speech", replacement: resolve(__dirname, "../packages/hautly-entity/src/hautly-speech.ts") },
      { find: "@hautly/entity/web", replacement: resolve(__dirname, "../packages/hautly-entity/src/hautly-web.ts") },
      { find: "@hautly/entity/webgpu", replacement: resolve(__dirname, "../packages/hautly-entity/src/hautly-webgpu.ts") },
      { find: "@hautly/entity/terminal", replacement: resolve(__dirname, "../packages/hautly-entity/src/hautly-terminal.ts") },
      { find: "@hautly/entity/react", replacement: resolve(__dirname, "../packages/hautly-entity/src/hautly-react.tsx") },
      { find: "@hautly/entity/svelte", replacement: resolve(__dirname, "../packages/hautly-entity/src/hautly-svelte.ts") },
      { find: "@hautly/entity/renderers", replacement: resolve(__dirname, "../packages/hautly-entity/src/hautly-renderers.ts") },
      { find: "@hautly/entity/agents", replacement: resolve(__dirname, "../packages/hautly-entity/src/hautly-agents.ts") },
      { find: "@hautly/entity", replacement: resolve(__dirname, "../packages/hautly-entity/src/index.ts") },
      // Framework adapters (source). Must precede the bare "aigpu" prefix below.
      { find: "@aigpu/vue", replacement: resolve(__dirname, "../packages/aigpu-vue/src/index.ts") },
      { find: "@aigpu/react", replacement: resolve(__dirname, "../packages/aigpu-react/src/index.ts") },
      { find: "@aigpu/svelte", replacement: resolve(__dirname, "../packages/aigpu-svelte/src/index.ts") },
      // aigpu entrypoint subpaths (mirror vitest.config.ts). Must precede bare "aigpu".
      { find: "aigpu/node", replacement: resolve(__dirname, "../packages/aigpu-api/src/node.ts") },
      { find: "aigpu/mock", replacement: resolve(__dirname, "../packages/aigpu-api/src/mock.ts") },
      { find: "aigpu/scene", replacement: resolve(__dirname, "../packages/aigpu-api/src/scene.ts") },
      { find: "aigpu/core", replacement: resolve(__dirname, "../packages/aigpu-api/src/core.ts") },
      { find: "aigpu/dom", replacement: resolve(__dirname, "../packages/aigpu-api/src/dom.ts") },
      { find: "aigpu/tools", replacement: resolve(__dirname, "../packages/aigpu-api/src/agent-tools.ts") },
      { find: "aigpu", replacement: resolve(__dirname, "../packages/aigpu-api/src/index.ts") },
      // Subpath aliases must come before their bare parents (Vite matches prefixes in order).
      { find: "@aigpu/wgsl/loader-webpack", replacement: resolve(__dirname, "../packages/wgsl/src/loader-webpack/index.ts") },
      { find: "@aigpu/wgsl/loader-vite", replacement: resolve(__dirname, "../packages/wgsl/src/loader-vite/index.ts") },
      { find: "@aigpu/wgsl/runtime", replacement: resolve(__dirname, "../packages/wgsl/src/runtime/resolve-shader.ts") },
      { find: "@aigpu/wgsl/reflect-source", replacement: resolve(__dirname, "../packages/wgsl/src/runtime/reflect-source.ts") },
      { find: "@aigpu/core", replacement: resolve(__dirname, "../packages/core/src/index.ts") },
      { find: "@aigpu/wgsl", replacement: resolve(__dirname, "../packages/wgsl/src/index.ts") },
    ],
  },
  optimizeDeps: {
    exclude: ["aigpu", "@aigpu/core", "@aigpu/wgsl", "@aigpu/vue", "@aigpu/react", "@aigpu/svelte", "@hautly/entity"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
