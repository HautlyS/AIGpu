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
  /**
   * IntersectionObserver-based visibility gating. When true (default), the frame loop pauses when
   * the canvas scrolls out of view and resumes on re-entry, saving GPU/CPU work. An optional
   * `rootMargin` string controls the pre-load margin (default "200px").
   */
  readonly visibility?: boolean | { readonly rootMargin?: string };
  /**
   * ResizeObserver-based auto-resize. When true (default for layout-backed canvases), the canvas
   * automatically resizes to fill its CSS layout box on every frame tick (same as `autoResize` on
   * the surface). Set to false to disable.
   */
  readonly autoResize?: boolean;
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

  // IntersectionObserver for visibility gating
  const visibilityOpts = options.visibility;
  const visibilityEnabled = visibilityOpts !== false;
  let observer: IntersectionObserver | undefined;
  let isVisible = true;

  const ready = (async () => {
    const gpu = suppliedGpu ?? await createGpu("browser", options.init);
    if (destroyed) {
      if (!suppliedGpu) gpu.dispose();
      throw new Error("AIGpu canvas was destroyed before it finished mounting");
    }
    const canvasSurface = surface(gpu, canvas, {
      autoResize: options.autoResize,
      ...options.surface,
    });
    const animation = agentAnimation(gpu, options);
    for (const patch of pending) animation.set(patch);
    pending = [];
    const time = clock(gpu);
    const current: MountedAgentCanvas = { gpu, surface: canvasSurface, animation };
    mounted = current;

    // Set up IntersectionObserver for viewport gating
    if (visibilityEnabled && typeof IntersectionObserver !== "undefined" && canvas instanceof Element) {
      const rootMargin = typeof visibilityOpts === "object" ? visibilityOpts.rootMargin : "200px";
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const wasVisible = isVisible;
            isVisible = entry.isIntersecting;
            // Resume the loop when canvas re-enters viewport
            if (!wasVisible && isVisible && !destroyed) startLoop();
          }
        },
        { rootMargin },
      );
      observer.observe(canvas);
    }

    const startLoop = () => {
      if (destroyed || frameHandle) return;
      frameHandle = frameLoop(gpu, (frame) => {
        if (destroyed || !isVisible) { frameHandle?.stop(); frameHandle = undefined; return; }
        animation.tick(time.time);
        frame.pass(canvasSurface, animation.effect);
      });
    };
    startLoop();

    if (destroyed) frameHandle?.stop();
    return current;
  })();

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
      observer?.disconnect();
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
