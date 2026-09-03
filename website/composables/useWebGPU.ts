import { ref, type Ref } from "vue";
import { init, type FrameLoopHandle } from "aigpu";

export const WEBGPU_UNAVAILABLE_MSG =
  "WebGPU unavailable — try Chrome/Edge + HTTPS.";

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

/** Shared mount helper: guards WebGPU, surfaces a friendly error, tracks loop+gpu for cleanup. */
export function useGpuMount() {
  const gpuError: Ref<string | null> = ref(null);
  let loop: FrameLoopHandle | null = null;
  let gpu: { dispose(): void } | null = null;

  async function withGpu<T>(
    run: (gpu: any) => Promise<T> | T,
  ): Promise<T | null> {
    gpuError.value = null;
    if (!isWebGPUAvailable()) {
      gpuError.value = WEBGPU_UNAVAILABLE_MSG;
      return null;
    }
    try {
      const g: any = await init();
      gpu = g;
      return await run(g);
    } catch (e) {
      console.error("[aigpu] WebGPU init failed:", e);
      gpuError.value =
        e instanceof Error ? e.message : WEBGPU_UNAVAILABLE_MSG;
      try {
        gpu?.dispose();
      } catch {
        /* ignore */
      }
      gpu = null;
      return null;
    }
  }

  function setLoop(handle: FrameLoopHandle | null) {
    loop = handle;
  }

  function cleanup() {
    try {
      loop?.stop();
    } catch {
      /* ignore */
    }
    loop = null;
    try {
      gpu?.dispose();
    } catch {
      /* ignore */
    }
    gpu = null;
  }

  function getGpu(): any {
    return gpu;
  }

  return { gpuError, withGpu, setLoop, cleanup, getGpu };
}
