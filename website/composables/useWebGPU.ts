import { ref, type Ref } from "vue";
import type { FrameLoopHandle } from "aigpu";
import { describeWebGPUError, getSharedGpu, isWebGPUAvailable } from "./sharedGpu";

export const WEBGPU_UNAVAILABLE_MSG =
  "WebGPU unavailable — try Chrome/Edge + HTTPS.";

/** Reloads the page: required after enabling WebGPU/flags in the browser. */
export function retryWebGPU(): void {
  window.location.reload();
}

export function useGpuMount() {
  const gpuError: Ref<string | null> = ref(null);
  let loop: FrameLoopHandle | null = null;

  async function withGpu<T>(
    run: (gpu: any) => Promise<T> | T,
  ): Promise<T | null> {
    gpuError.value = null;
    if (!isWebGPUAvailable()) {
      gpuError.value = describeWebGPUError(null);
      return null;
    }
    try {
      // Shared singleton: one adapter+device for the whole page.
      const g: any = await getSharedGpu();
      return await run(g);
    } catch (e) {
      console.error("[aigpu] WebGPU init failed:", e);
      gpuError.value = describeWebGPUError(e);
      return null;
    }
  }

  function setLoop(handle: FrameLoopHandle | null) {
    loop = handle;
  }

  function cleanup() {
    // Stop our own loop only — the shared gpu outlives every section.
    try {
      loop?.stop();
    } catch {
      /* ignore */
    }
    loop = null;
  }

  return { gpuError, withGpu, setLoop, cleanup, retryWebGPU };
}
