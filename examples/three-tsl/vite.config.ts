import { defineConfig } from "vite";
import { wgslVitePlugin } from "@aigpu/wgsl/loader-vite";

export default defineConfig({
  plugins: [wgslVitePlugin()],
});
