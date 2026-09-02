/// <reference types="@webgpu/types" />

declare module "aigpu/client" {
  export interface AIGPUClientEnvironment {
    readonly gpu?: GPU;
  }

  export { wgslVitePlugin } from "@aigpu/wgsl/loader-vite";
  export type { ViteLoadResult, WgslVitePluginOptions } from "@aigpu/wgsl/loader-vite";
}

declare module "*.wgsl" {
  const source: { readonly version: 1; readonly wgsl: string };
  export default source;
}
