/**
 * Shared client-environment typing surface. Attach it to `aigpu-env.d.ts`
 * via `/// <reference types="aigpu/client" />` to make `.wgsl` imports legal
 * for `tsc` while runtime reflection remains the authority for validation.
 */
export type AIGPUClientEnvironment = {
  readonly gpu?: GPU;
};

export { wgslVitePlugin } from "@aigpu/wgsl/loader-vite";
export type { ShaderSource } from "@aigpu/wgsl";
export type { ViteLoadResult, WgslVitePluginOptions } from "@aigpu/wgsl/loader-vite";
