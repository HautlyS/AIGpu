/**
 * Hautly Svelte — Svelte adapter.
 *
 * Provides `hautly()` action and `<HautlyEntity />` component.
 * No Svelte runtime dependency in the adapter — pure action-based.
 */

import { createHautly, type HautlyEngine, type HautlyOptions, type HautlyPatch, type HautlyMood } from "./hautly-core.ts";
import { getRenderer, type Renderer } from "./hautly-renderers.ts";
import { createSpeechController, type SpeechController, type AIResponseAdapter } from "./hautly-speech.ts";

// ─── Action Options ──────────────────────────────────────────────────────────

export interface HautlyActionOptions extends HautlyOptions {
  renderer?: string | Renderer;
  fontSize?: number;
}

export interface HautlyAction {
  engine: HautlyEngine;
  speech: SpeechController;
  update: (patch: HautlyPatch) => void;
  say: (text: string) => void;
  ask: (adapter: AIResponseAdapter, message: string) => Promise<void>;
  destroy: () => void;
}

// ─── Svelte Action ───────────────────────────────────────────────────────────

/**
 * Svelte action for mounting Hautly on a canvas element.
 *
 * Usage:
 * ```svelte
 * <canvas use:hautly={{ form: "orb", mood: "idle" }} />
 * ```
 */
export function hautly(
  canvas: HTMLCanvasElement,
  options: HautlyActionOptions = {},
): { update: (newOptions: HautlyActionOptions) => void; destroy: () => void } {
  const engine = createHautly(options);
  const speech = createSpeechController(engine);

  const rendererName = typeof options.renderer === "string" ? options.renderer : "orb";
  const customRenderer = typeof options.renderer === "object" ? options.renderer : null;
  const renderer = customRenderer ?? getRenderer(rendererName);

  const fontSize = options.fontSize ?? 14;
  const ctx = canvas.getContext("2d");
  let rafId = 0;
  let lastTime = performance.now() / 1000;
  let running = true;

  function tick() {
    if (!running) return;

    const now = performance.now() / 1000;
    const dt = Math.min(now - lastTime, 0.1);
    lastTime = now;

    engine.tick(dt);
    speech.tick(dt);

    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const frameW = Math.floor(rect.width / (fontSize * 0.6));
      const frameH = Math.floor(rect.height / fontSize);
      const frame = renderer.render(engine.state, frameW, frameH);

      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.font = `${fontSize}px monospace`;
      ctx.textBaseline = "top";

      const cellW = rect.width / frameW;
      const cellH = rect.height / frameH;

      for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
          const idx = y * frameW + x;
          const char = frame.cells[idx];
          if (char === " ") continue;

          const color = frame.colors[idx];
          ctx.fillStyle = color ? ansiToCss(color) : "#ffffff";
          ctx.fillText(char, x * cellW, y * cellH);
        }
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return {
    update(newOptions: HautlyActionOptions) {
      engine.set(newOptions.initial ?? {});
    },
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
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
