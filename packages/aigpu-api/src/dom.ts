import { createGpu, type InitOptions } from "./init.ts";
import { agentAnimation, type AgentAnimation, type AgentAnimationOptions, type AgentAnimationPatch } from "./agent.ts";
import { clock } from "./clock.ts";
import { frameLoop, type FrameLoopHandle } from "./frame.ts";
import { surface, type Surface, type SurfaceCanvas, type SurfaceOptions } from "./surface.ts";
import type { Gpu } from "./kernel.ts";

export interface AgentCanvasOptions extends AgentAnimationOptions {
  /** Reuse an existing AIGpu context instead of creating and owning one. */
  readonly gpu?: Gpu;
  /** Browser initialization options used when `gpu` is omitted. */
  readonly init?: InitOptions;
  /** Canvas configuration, including DPR and automatic layout resize. */
  readonly surface?: SurfaceOptions;
}

export interface MountedAgentCanvas {
  readonly gpu: Gpu;
  readonly surface: Surface;
  readonly animation: AgentAnimation;
}

export interface AgentCanvasController {
  /** Resolves after GPU context, surface, animation, and frame loop are ready. */
  readonly ready: Promise<MountedAgentCanvas>;
  /** The mounted resources, or undefined while asynchronous setup is pending. */
  readonly mounted: MountedAgentCanvas | undefined;
  /** Apply a state patch now or queue it until setup completes. */
  set(patch: AgentAnimationPatch): this;
  /** Resize a manually-sized surface. Layout-backed canvases resize automatically. */
  resize(size: readonly [number, number]): this;
  /** Stop rendering and release the surface; an internally-created GPU is also disposed. */
  destroy(): void;
}

/**
 * Mounts an AIGpu agent animation without React, Vue, Svelte, or a DOM helper library.
 * Framework adapters in `@aigpu/integrations` are thin lifecycle wrappers around this function.
 */
export function mountAgentCanvas(canvas: SurfaceCanvas, options: AgentCanvasOptions = {}): AgentCanvasController {
  let mounted: MountedAgentCanvas | undefined;
  let destroyed = false;
  let frameHandle: FrameLoopHandle | undefined;
  let pending: AgentAnimationPatch[] = [];
  const suppliedGpu = options.gpu;

  const ready = (async () => {
    const gpu = suppliedGpu ?? await createGpu("browser", options.init);
    if (destroyed) {
      if (!suppliedGpu) gpu.dispose();
      throw new Error("AIGpu canvas was destroyed before it finished mounting");
    }
    const canvasSurface = surface(gpu, canvas, options.surface);
    const animation = agentAnimation(gpu, options);
    for (const patch of pending) animation.set(patch);
    pending = [];
    const time = clock(gpu);
    const current: MountedAgentCanvas = { gpu, surface: canvasSurface, animation };
    mounted = current;
    frameHandle = frameLoop(gpu, (frame) => {
      if (destroyed) return;
      animation.tick(time.time);
      frame.pass(canvasSurface, animation.effect);
    });
    if (destroyed) frameHandle.stop();
    return current;
  })();

  // A framework cleanup may run before an async adapter has a chance to await `ready`.
  // Keep that cancellation from becoming an unhandled rejection while still exposing the
  // original promise to callers that want to observe setup failures.
  void ready.catch(() => undefined);

  return {
    ready,
    get mounted() { return mounted; },
    set(patch: AgentAnimationPatch) {
      if (destroyed) return this;
      if (mounted) mounted.animation.set(patch);
      else pending.push(patch);
      return this;
    },
    resize(size: readonly [number, number]) {
      if (!destroyed) mounted?.surface.resize(size);
      return this;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pending = [];
      frameHandle?.stop();
      mounted?.surface.dispose();
      if (!suppliedGpu) mounted?.gpu.dispose();
    },
  };
}

/** Mounts into a selector, useful for framework-free HTML and small demos. */
export function mountAgentCanvasSelector(selector: string, options: AgentCanvasOptions = {}): AgentCanvasController {
  const canvas = document.querySelector(selector);
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError(`AIGpu expected a canvas for selector ${selector}`);
  return mountAgentCanvas(canvas, options);
}
