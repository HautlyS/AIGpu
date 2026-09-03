import { init } from "aigpu";

/**
 * One shared GPU for the whole showcase page, created lazily on the first
 * canvas that actually enters the viewport — never eagerly on page load.
 *
 * Rationale: every `init()` is a `requestAdapter() + requestDevice()` round
 * trip. Seven sections each owning a GPU storms the browser with duplicate
 * adapters and can exhaust device limits; a singleton also collapses the
 * "No available adapters" console spam to a single diagnostic.
 *
 * Lifecycle: the singleton lives as long as the page. Components stop their
 * own frame loops on unmount but must NOT dispose the shared gpu.
 */

let sharedGpu: any = null;
let sharedPromise: Promise<any> | null = null;

export const WEBGPU_UNSUPPORTED_MSG =
  "WebGPU is not supported in this browser — try Chrome or Edge 113+ with hardware acceleration enabled.";

export const WEBGPU_DISABLED_MSG =
  "WebGPU found no usable adapter (see chrome://gpu) — enable hardware acceleration, or relaunch Chrome with --enable-unsafe-swiftshader for software rendering.";

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

/** True when the error means "adapter request returned null" (disabled/blocklisted). */
export function isNoAdapterError(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  if (code === "AIGPU-RING1-UNSUPPORTED") return true;
  const message = e instanceof Error ? e.message : String(e ?? "");
  return message.includes("requestAdapter() returned null");
}

export function describeWebGPUError(e: unknown): string {
  if (!isWebGPUAvailable()) return WEBGPU_UNSUPPORTED_MSG;
  if (isNoAdapterError(e)) return WEBGPU_DISABLED_MSG;
  return e instanceof Error ? e.message : WEBGPU_DISABLED_MSG;
}

export function getSharedGpu(): Promise<any> {
  if (sharedGpu) return Promise.resolve(sharedGpu);
  if (!sharedPromise) {
    sharedPromise = (async () => {
      if (!isWebGPUAvailable()) throw new Error(WEBGPU_UNSUPPORTED_MSG);
      const gpu = await init();
      sharedGpu = gpu;
      return gpu;
    })().catch((error) => {
      // Never cache a failure: a later retry (or reload) must try again.
      sharedPromise = null;
      throw error;
    });
  }
  return sharedPromise;
}

/** Forget the in-flight attempt so a manual retry re-requests the adapter. */
export function resetSharedGpu(): void {
  sharedPromise = null;
}
