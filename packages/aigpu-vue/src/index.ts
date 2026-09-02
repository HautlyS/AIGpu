import { onBeforeUnmount, onMounted, ref, shallowRef, watch, type Ref, type ShallowRef } from "vue";
import { mountAgentCanvas, type AgentCanvasController, type AgentCanvasOptions, type MountedAgentCanvas } from "aigpu/dom";
import type { AgentAnimationPatch } from "aigpu";

export interface UseAgentCanvasOptions extends AgentCanvasOptions {
  /** Optional live patch watched and applied to the mounted animation. */
  readonly patch?: AgentAnimationPatch;
}

export interface UseAgentCanvasResult {
  readonly canvas: Ref<HTMLCanvasElement | null>;
  readonly controller: Readonly<ShallowRef<AgentCanvasController | null>>;
  readonly mounted: Readonly<ShallowRef<MountedAgentCanvas | null>>;
}

/** Vue 3 composable. Vue is a peer dependency of this adapter only; AIGpu itself stays framework-free. */
export function useAgentCanvas(options: UseAgentCanvasOptions = {}): UseAgentCanvasResult {
  const canvas = ref<HTMLCanvasElement | null>(null);
  const controller = shallowRef<AgentCanvasController | null>(null);
  const mounted = shallowRef<MountedAgentCanvas | null>(null);

  onMounted(() => {
    if (!canvas.value) return;
    const next = mountAgentCanvas(canvas.value, options);
    controller.value = next;
    void next.ready.then((resources) => { mounted.value = resources; }).catch(() => undefined);
  });
  onBeforeUnmount(() => {
    controller.value?.destroy();
    controller.value = null;
    mounted.value = null;
  });
  watch(() => options.patch, (patch) => {
    if (patch) controller.value?.set(patch);
  }, { deep: true });

  return { canvas, controller, mounted };
}

export { mountAgentCanvas } from "aigpu/dom";
export type { AgentCanvasController, AgentCanvasOptions, MountedAgentCanvas } from "aigpu/dom";
