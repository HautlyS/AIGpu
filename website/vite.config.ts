import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      aigpu: resolve(__dirname, "../packages/aigpu-api/src/index.ts"),
      "@hautly/entity": resolve(__dirname, "../packages/hautly-entity/src/index.ts"),
      "@hautly/entity/vue": resolve(__dirname, "../packages/hautly-entity/src/hautly-vue.ts"),
      "@hautly/entity/speech": resolve(__dirname, "../packages/hautly-entity/src/hautly-speech.ts"),
      "@hautly/entity/web": resolve(__dirname, "../packages/hautly-entity/src/hautly-web.ts"),
      "@hautly/entity/webgpu": resolve(__dirname, "../packages/hautly-entity/src/hautly-webgpu.ts"),
      "@hautly/entity/terminal": resolve(__dirname, "../packages/hautly-entity/src/hautly-terminal.ts"),
      "@hautly/entity/react": resolve(__dirname, "../packages/hautly-entity/src/hautly-react.tsx"),
      "@hautly/entity/svelte": resolve(__dirname, "../packages/hautly-entity/src/hautly-svelte.ts"),
      "@hautly/entity/renderers": resolve(__dirname, "../packages/hautly-entity/src/hautly-renderers.ts"),
      "@hautly/entity/agents": resolve(__dirname, "../packages/hautly-entity/src/hautly-agents.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
