/**
 * Hautly WebGPU — GPU-accelerated rendering bridge.
 *
 * Connects Hautly's ASCII entity engine with AIGpu's WebGPU/WGSL pipeline.
 * The GPU renders the entity's glow, particles, and aura while the CPU
 * generates the ASCII character grid — combining pixel-perfect GPU effects
 * with the ASCII aesthetic.
 */

import { createHautly, type HautlyEngine, type HautlyOptions, type HautlyPatch, type HautlyMood } from "./hautly-core.ts";
import { getRenderer, type Renderer, type RenderedFrame } from "./hautly-renderers.ts";
import { createSpeechController, type SpeechController, type AIResponseAdapter } from "./hautly-speech.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WebGPUHautlyOptions extends HautlyOptions {
  renderer?: string | Renderer;
  /** AIGpu GPU context — if omitted, one is created. */
  gpu?: any;
  /** Canvas for the GPU surface. */
  canvas?: HTMLCanvasElement;
  /** Canvas for the ASCII overlay. */
  asciiCanvas?: HTMLCanvasElement;
  /** Font size for ASCII characters. Default: 14. */
  fontSize?: number;
  /** Enable GPU glow behind the ASCII. Default: true. */
  gpuGlow?: boolean;
  /** Particle count for GPU layer. Default: 200. */
  gpuParticles?: number;
}

export interface WebGPUHautly {
  readonly engine: HautlyEngine;
  readonly speech: SpeechController;
  /** The GPU-accelerated rendering loop. */
  start(): this;
  /** Stop all rendering. */
  stop(): this;
  /** Update entity state. */
  update(patch: HautlyPatch): this;
  /** Speak a message. */
  say(text: string): this;
  /** Ask an AI adapter. */
  ask(adapter: AIResponseAdapter, message: string): Promise<this>;
  /** Destroy all resources. */
  destroy(): void;
}

// ─── GPU Shader (AIGpu WGSL) ────────────────────────────────────────────────

const HAUTLY_GLOW_SHADER = /* wgsl */ `
struct Params {
  time: f32,
  mood: f32,
  energy: f32,
  breath: f32,
  pulse: f32,
  auraIntensity: f32,
  pad: vec2f,
  coreColor: vec4f,
  auraColor: vec4f,
}

@group(0) @binding(0) var<uniform> params: Params;

const TAU: f32 = 6.28318530718;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let p = uv - vec2f(0.5);
  let dist = length(p);
  let angle = atan2(p.y, p.x);

  // Orb core
  let breathScale = 1.0 + params.breath * 0.08;
  let coreRadius = 0.22 * breathScale;
  let core = 1.0 - smoothstep(coreRadius - 0.03, coreRadius, dist);

  // Inner ring
  let ringDist = abs(dist - coreRadius - 0.04);
  let ring = 1.0 - smoothstep(0.01, 0.03, ringDist);

  // Outer halo
  let haloDist = abs(dist - coreRadius - 0.12 - params.pulse * 0.03);
  let halo = (1.0 - smoothstep(0.015, 0.08, haloDist)) * params.auraIntensity;

  // Particle glow spots
  var particleGlow = 0.0;
  for (var i = 0; i < 8; i++) {
    let a = f32(i) * TAU / 8.0 + params.time * 0.5;
    let r = coreRadius + 0.15 + sin(params.time + f32(i)) * 0.05;
    let pp = vec2f(cos(a), sin(a)) * r;
    let d = length(p - pp);
    particleGlow += (1.0 - smoothstep(0.0, 0.04, d)) * 0.3;
  }

  // Mood-based glow variation
  let moodPulse = 0.8 + 0.2 * sin(params.time * (1.0 + params.mood * 0.3));

  // Compose
  let glow = core * (0.6 + params.pulse * 0.4) + ring * 0.5 + halo * 0.35 + particleGlow;
  let color = params.auraColor.rgb * (0.3 + halo) + params.coreColor.rgb * glow * moodPulse;
  let alpha = max(core, max(ring, max(halo * 0.5, particleGlow * 0.3)));

  return vec4f(color * alpha, alpha * 0.85);
}
`;

// ─── Mood to Color Mapping ───────────────────────────────────────────────────

const MOOD_COLORS: Record<HautlyMood, { core: number[]; aura: number[] }> = {
  idle: { core: [0.39, 0.78, 1.0], aura: [0.12, 0.31, 0.63] },
  listening: { core: [0.47, 0.86, 0.71], aura: [0.12, 0.47, 0.31] },
  thinking: { core: [0.71, 0.55, 1.0], aura: [0.31, 0.16, 0.63] },
  speaking: { core: [1.0, 0.78, 0.31], aura: [0.63, 0.31, 0.08] },
  excited: { core: [1.0, 0.39, 0.47], aura: [0.78, 0.12, 0.20] },
  sleepy: { core: [0.47, 0.55, 0.71], aura: [0.20, 0.24, 0.35] },
  error: { core: [1.0, 0.24, 0.24], aura: [0.63, 0.08, 0.08] },
  healing: { core: [0.39, 1.0, 0.59], aura: [0.12, 0.59, 0.24] },
};

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createWebGPUHautly(options: WebGPUHautlyOptions = {}): WebGPUHautly {
  const engine = createHautly(options);
  const speech = createSpeechController(engine);

  const rendererName = typeof options.renderer === "string" ? options.renderer : "orb";
  const customRenderer = typeof options.renderer === "object" ? options.renderer : null;
  const renderer: Renderer = customRenderer ?? getRenderer(rendererName);

  const fontSize = options.fontSize ?? 14;
  const gpuGlow = options.gpuGlow ?? true;

  let gpuCanvas = options.canvas;
  let asciiCanvas = options.asciiCanvas;
  let gpuCtx: any = null;
  let asciiCtx: CanvasRenderingContext2D | null = null;
  let glowEffect: any = null;
  let clockRef: any = null;
  let frameLoopRef: any = null;
  let rafId = 0;
  let lastTime = performance.now() / 1000;
  let running = false;

  async function initGPU() {
    if (!gpuGlow) return;

    // Dynamic import of AIGpu — keeps the package optional
    try {
      const aigpu = await import("aigpu");
      const gpu = options.gpu ?? await aigpu.init();
      gpuCtx = gpu;

      if (!gpuCanvas) {
        gpuCanvas = document.createElement("canvas");
        gpuCanvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
        asciiCanvas?.parentElement?.appendChild(gpuCanvas);
      }

      const surf = aigpu.surface(gpu, gpuCanvas, { dpr: [1, 2] });
      glowEffect = aigpu.effect(gpu, HAUTLY_GLOW_SHADER, { label: "hautly-glow" });
      clockRef = aigpu.clock(gpu);

      frameLoopRef = aigpu.frameLoop(gpu, (frame: any) => {
        if (!running) return;
        const mood = engine.state.mood;
        const colors = MOOD_COLORS[mood];

        glowEffect.set({
          params: {
            time: clockRef.time,
            mood: ["idle", "listening", "thinking", "speaking", "excited", "sleepy", "error", "healing"].indexOf(mood),
            energy: engine.state.energy,
            breath: engine.state.breath,
            pulse: engine.state.pulse,
            auraIntensity: engine.state.auraIntensity,
            coreColor: [...colors.core, 1],
            auraColor: [...colors.aura, 1],
          },
        });

        frame.pass(surf, glowEffect);
      });
    } catch {
      // AIGpu not available — render ASCII only
      gpuGlow && console.warn("Hautly: AIGpu not available, falling back to ASCII-only rendering");
    }
  }

  function initAscii() {
    if (!asciiCanvas) {
      asciiCanvas = document.createElement("canvas");
      asciiCanvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;";
      asciiCanvas.parentElement?.appendChild(asciiCanvas);
    }
    asciiCtx = asciiCanvas.getContext("2d");
  }

  function renderAscii() {
    if (!asciiCtx || !asciiCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = asciiCanvas.getBoundingClientRect();
    asciiCanvas.width = rect.width * dpr;
    asciiCanvas.height = rect.height * dpr;
    asciiCtx.scale(dpr, dpr);

    const frameW = Math.floor(rect.width / (fontSize * 0.6));
    const frameH = Math.floor(rect.height / fontSize);
    const frame = renderer.render(engine.state, frameW, frameH);

    asciiCtx.clearRect(0, 0, rect.width, rect.height);
    asciiCtx.font = `${fontSize}px monospace`;
    asciiCtx.textBaseline = "top";

    const cellW = rect.width / frameW;
    const cellH = rect.height / frameH;

    for (let y = 0; y < frameH; y++) {
      for (let x = 0; x < frameW; x++) {
        const idx = y * frameW + x;
        const char = frame.cells[idx];
        if (char === " ") continue;

        const color = frame.colors[idx];
        asciiCtx.fillStyle = color ? ansiToCss(color) : "#ffffff";
        asciiCtx.fillText(char, x * cellW, y * cellH);
      }
    }
  }

  function tick() {
    if (!running) return;
    const now = performance.now() / 1000;
    const dt = Math.min(now - lastTime, 0.1);
    lastTime = now;

    engine.tick(dt);
    speech.tick(dt);
    renderAscii();

    rafId = requestAnimationFrame(tick);
  }

  const instance: WebGPUHautly = {
    engine,
    speech,

    start(): WebGPUHautly {
      if (running) return this;
      running = true;
      lastTime = performance.now() / 1000;
      initAscii();
      initGPU().then(() => tick());
      return this;
    },

    stop(): WebGPUHautly {
      running = false;
      cancelAnimationFrame(rafId);
      frameLoopRef?.stop();
      return this;
    },

    update(patch: HautlyPatch): WebGPUHautly {
      engine.set(patch);
      return this;
    },

    say(text: string): WebGPUHautly {
      speech.say(text);
      return this;
    },

    async ask(adapter: AIResponseAdapter, message: string): Promise<WebGPUHautly> {
      await speech.ask(adapter, message);
      return this;
    },

    destroy(): void {
      this.stop();
      glowEffect?.dispose?.();
      gpuCtx?.dispose?.();
      if (gpuCanvas?.parentElement) gpuCanvas.parentElement.removeChild(gpuCanvas);
      if (asciiCanvas?.parentElement) asciiCanvas.parentElement.removeChild(asciiCanvas);
    },
  };

  return instance;
}

// ─── ANSI to CSS ─────────────────────────────────────────────────────────────

function ansiToCss(ansiColor: string): string {
  const trueColorMatch = ansiColor.match(/\x1b\[38;2;(\d+);(\d+);(\d+)m/);
  if (trueColorMatch) {
    const [, r, g, b] = trueColorMatch;
    return `rgb(${r},${g},${b})`;
  }
  return "#ffffff";
}

// ─── Quick Launch ────────────────────────────────────────────────────────────

export function hautlyGPU(
  options: WebGPUHautlyOptions & { target?: string | HTMLElement } = {},
): WebGPUHautly {
  let container: HTMLElement | undefined;
  if (options.target) {
    container = typeof options.target === "string"
      ? document.querySelector(options.target) as HTMLElement
      : options.target;
  }

  if (container && !options.asciiCanvas) {
    const asciiCanvas = document.createElement("canvas");
    asciiCanvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;";
    container.style.position = "relative";
    container.appendChild(asciiCanvas);
    options = { ...options, asciiCanvas };
  }

  const h = createWebGPUHautly(options);
  h.start();
  return h;
}
