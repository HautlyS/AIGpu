/**
 * Hautly React — React adapter.
 *
 * Provides `useHautly()` hook and `<HautlyEntity />` component.
 */

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { createHautly, type HautlyEngine, type HautlyOptions, type HautlyPatch, type HautlyMood } from "./hautly-core.ts";
import { getRenderer, type Renderer } from "./hautly-renderers.ts";
import { createSpeechController, type SpeechController, type AIResponseAdapter } from "./hautly-speech.ts";

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseHautlyOptions extends HautlyOptions {
  renderer?: string | Renderer;
}

export interface UseHautlyReturn {
  engine: HautlyEngine;
  speech: SpeechController;
  /** The canvas ref to attach to an element. */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Whether the entity is mounted and rendering. */
  mounted: boolean;
  /** Update entity state. */
  update: (patch: HautlyPatch) => void;
  /** Speak a message. */
  say: (text: string) => void;
  /** Ask an AI adapter. */
  ask: (adapter: AIResponseAdapter, message: string) => Promise<void>;
  /** Current mood. */
  mood: HautlyMood;
}

export function useHautly(options: UseHautlyOptions = {}): UseHautlyReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HautlyEngine | null>(null);
  const speechRef = useRef<SpeechController | null>(null);
  const rafRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);
  const [mood, setMood] = useState<HautlyMood>(options.initial?.mood ?? "idle");

  const rendererName = typeof options.renderer === "string" ? options.renderer : "orb";
  const customRenderer = typeof options.renderer === "object" ? options.renderer : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createHautly({
      ...options,
      onMoodChange: (m) => {
        setMood(m);
        options.onMoodChange?.(m);
      },
    });
    const speech = createSpeechController(engine);
    const renderer = customRenderer ?? getRenderer(rendererName);

    engineRef.current = engine;
    speechRef.current = speech;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const fontSize = 14;
    let lastTime = performance.now() / 1000;
    let running = true;
    let isVisible = true;

    function computeSize() {
      const rect = canvas.getBoundingClientRect();
      const newW = Math.round(rect.width * dpr);
      const newH = Math.round(rect.height * dpr);
      if (canvas.width !== newW || canvas.height !== newH) {
        canvas.width = newW;
        canvas.height = newH;
      }
    }

    function tick() {
      if (!running || !isVisible) return;
      const now = performance.now() / 1000;
      const dt = Math.min(now - lastTime, 0.1);
      lastTime = now;

      engine.tick(dt);
      speech.tick(dt);

      computeSize();
      const rect = canvas.getBoundingClientRect();

      const frameW = Math.max(10, Math.floor(rect.width / (fontSize * 0.6)));
      const frameH = Math.max(4, Math.floor(rect.height / fontSize));
      const frame = renderer.render(engine.state, frameW, frameH);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;
      ctx.textBaseline = "top";

      const cellW = canvas.width / frameW;
      const cellH = canvas.height / frameH;

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

      rafRef.current = requestAnimationFrame(tick);
    }

    // ResizeObserver for responsive sizing
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => computeSize());
      resizeObserver.observe(canvas);
    }

    // IntersectionObserver for visibility gating (pause when off-screen)
    let visibilityObserver: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      visibilityObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const wasVisible = isVisible;
            isVisible = entry.isIntersecting;
            if (!wasVisible && isVisible && running) {
              lastTime = performance.now() / 1000;
              rafRef.current = requestAnimationFrame(tick);
            }
          }
        },
        { rootMargin: "200px" },
      );
      visibilityObserver.observe(canvas);
    }

    rafRef.current = requestAnimationFrame(tick);
    setMounted(true);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      engineRef.current = null;
      speechRef.current = null;
      setMounted(false);
    };
  }, []);

  const update = useCallback((patch: HautlyPatch) => {
    engineRef.current?.set(patch);
  }, []);

  const say = useCallback((text: string) => {
    speechRef.current?.say(text);
  }, []);

  const ask = useCallback(async (adapter: AIResponseAdapter, message: string) => {
    await speechRef.current?.ask(adapter, message);
  }, []);

  return {
    engine: engineRef.current!,
    speech: speechRef.current!,
    canvasRef,
    mounted,
    update,
    say,
    ask,
    mood,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface HautlyEntityProps extends UseHautlyOptions {
  /** CSS class for the container. */
  className?: string;
  /** Inline styles for the container. */
  style?: React.CSSProperties;
  /** Width of the entity. Default: 400. */
  width?: number;
  /** Height of the entity. Default: 300. */
  height?: number;
}

export function HautlyEntity({
  className,
  style,
  width = 400,
  height = 300,
  ...options
}: HautlyEntityProps) {
  const { canvasRef, mounted, update, say, ask, mood } = useHautly(options);

  return (
    <div
      className={className}
      style={{
        display: "inline-block",
        width,
        height,
        position: "relative",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-label={`Hautly entity: ${mood}`}
      />
    </div>
  );
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
