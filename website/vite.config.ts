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
      { find: "aigpu", replacement: resolve(__dirname, "../packages/aigpu-api/src/index.ts") },
      { find: "@aigpu/core", replacement: resolve(__dirname, "../packages/aigpu-core/src/index.ts") },
      { find: "@aigpu/wgsl", replacement: resolve(__dirname, "../packages/aigpu-wgsl/src/index.ts") },
    ],
  },
  optimizeDeps: {
    exclude: ["aigpu", "@aigpu/core", "@aigpu/wgsl", "@hautly/entity"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
