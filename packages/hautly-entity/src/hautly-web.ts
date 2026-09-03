/**
 * Hautly Web — HTML/Canvas adapter (framework-agnostic).
 *
 * Renders Hautly entities on a Canvas2D element or as styled DOM overlays.
 * Works in any HTML page without React, Vue, or Svelte.
 * Fully responsive: auto-resizes to container, supports hover/click mesh effects.
 */

import { createHautly, type HautlyEngine, type HautlyOptions, type HautlyPatch, type HautlyMood } from "./hautly-core.ts";
import { getRenderer, type Renderer, type RenderedFrame } from "./hautly-renderers.ts";
import { createSpeechController, type SpeechController, type AIResponseAdapter, computeBubbleGeometry, renderBubbleToAnsi } from "./hautly-speech.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WebHautlyOptions extends HautlyOptions {
  renderer?: string | Renderer;
  canvas?: HTMLCanvasElement;
  container?: HTMLElement;
  /** Rendering mode. Default: "canvas". */
  mode?: "canvas" | "dom";
  /** Canvas pixel density. Default: devicePixelRatio. */
  dpr?: number;
  /** Background color. Default: "transparent". */
  background?: string;
  /** Font size for canvas text. Default: 14. */
  fontSize?: number;
  /** Enable click-to-speak. Default: false. */
  interactive?: boolean;
  /** Callback when user clicks the entity. */
  onClick?: (engine: HautlyEngine) => void;
  /** Enable hover mesh effect. Default: true when interactive. */
  hoverEffect?: boolean;
  /** Enable click burst effect. Default: true when interactive. */
  clickEffect?: boolean;
}

export interface WebHautly {
  readonly engine: HautlyEngine;
  readonly speech: SpeechController;
  /** The root DOM element (container or canvas). */
  readonly element: HTMLElement;
  /** Start the render loop. */
  start(): this;
  /** Stop the render loop. */
  stop(): this;
  /** Update entity state. */
  update(patch: HautlyPatch): this;
  /** Speak a message. */
  say(text: string): this;
  /** Ask an AI adapter. */
  ask(adapter: AIResponseAdapter, message: string): Promise<this>;
  /** Destroy the instance and clean up. */
  destroy(): void;
  /** Resize the rendering area. */
  resize(width: number, height: number): this;
  /** Set position (absolute or relative to container). */
  setPosition(x: number, y: number): this;
}

// ─── Mesh Effect State ───────────────────────────────────────────────────────

interface MeshEffect {
  type: "hover" | "click";
  x: number;
  y: number;
  strength: number;
  decay: number;
  born: number;
}

// ─── Canvas Renderer ─────────────────────────────────────────────────────────

function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  frame: RenderedFrame,
  fontSize: number,
  background: string,
  meshEffects: MeshEffect[],
  t: number,
): void {
  const { width, height, cells, colors } = frame;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  if (background === "transparent") {
    ctx.clearRect(0, 0, cw, ch);
  } else {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, cw, ch);
  }

  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = "top";

  const cellW = cw / width;
  const cellH = ch / height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const char = cells[idx];
      if (char === " ") continue;

      const color = colors[idx];
      let finalColor = color ? ansiToCss(color) : "#ffffff";
      let offsetX = 0;
      let offsetY = 0;
      let scale = 1;

      // Apply mesh distortion effects
      for (const effect of meshEffects) {
        const ex = (x / width - effect.x) * cw;
        const ey = (y / height - effect.y) * ch;
        const dist = Math.sqrt(ex * ex + ey * ey);
        const radius = 120 * effect.strength;
        if (dist < radius) {
          const falloff = 1 - dist / radius;
          if (effect.type === "hover") {
            // Gentle ripple on hover
            const wave = Math.sin(dist * 0.05 - t * 8) * falloff * effect.strength * 3;
            offsetX += wave * (ex / (dist || 1));
            offsetY += wave * (ey / (dist || 1));
            // Brighten nearby cells
            const brighten = falloff * effect.strength * 0.3;
            finalColor = brightenColor(finalColor, brighten);
          } else if (effect.type === "click") {
            // Burst shockwave on click
            const age = t - effect.born;
            const waveRadius = age * 300;
            const waveDist = Math.abs(dist - waveRadius);
            const waveStrength = Math.max(0, 1 - age * effect.decay) * falloff;
            if (waveDist < 40) {
              const push = (1 - waveDist / 40) * waveStrength * 8;
              offsetX += push * (ex / (dist || 1));
              offsetY += push * (ey / (dist || 1));
              finalColor = brightenColor(finalColor, waveStrength * 0.5);
              scale = 1 + waveStrength * 0.3;
            }
          }
        }
      }

      ctx.save();
      if (scale !== 1) {
        const sx = x * cellW + cellW / 2 + offsetX;
        const sy = y * cellH + cellH / 2 + offsetY;
        ctx.translate(sx, sy);
        ctx.scale(scale, scale);
        ctx.translate(-sx, -sy);
      }
      ctx.fillStyle = finalColor;
      ctx.fillText(char, x * cellW + offsetX, y * cellH + offsetY);
      ctx.restore();
    }
  }
}

function brightenColor(color: string, amount: number): string {
  const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (!match) return color;
  const r = Math.min(255, Math.round(Number(match[1]) + amount * 255));
  const g = Math.min(255, Math.round(Number(match[2]) + amount * 255));
  const b = Math.min(255, Math.round(Number(match[3]) + amount * 255));
  return `rgb(${r},${g},${b})`;
}

// ─── DOM Renderer ────────────────────────────────────────────────────────────

function renderToDom(
  container: HTMLElement,
  frame: RenderedFrame,
  fontSize: number,
): void {
  container.innerHTML = "";

  const pre = document.createElement("pre");
  pre.style.cssText = `
    margin: 0; padding: 0;
    font-family: monospace;
    font-size: ${fontSize}px;
    line-height: 1;
    letter-spacing: 0;
    white-space: pre;
    color: #fff;
    background: transparent;
  `;

  const { width, height, cells, colors } = frame;

  for (let y = 0; y < height; y++) {
    const row = document.createElement("div");
    row.style.height = `${fontSize}px`;

    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const char = cells[idx];
      if (char === " ") {
        row.appendChild(document.createTextNode(" "));
        continue;
      }

      const span = document.createElement("span");
      span.textContent = char;
      const color = colors[idx];
      if (color) {
        span.style.color = ansiToCss(color);
      }
      row.appendChild(span);
    }

    pre.appendChild(row);
  }

  container.appendChild(pre);
}

// ─── Speech Bubble on Canvas ─────────────────────────────────────────────────

function renderSpeechOnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  entityX: number,
  entityY: number,
  canvasW: number,
  canvasH: number,
  fontSize: number,
  color: string,
): void {
  if (!text) return;

  const geo = computeBubbleGeometry(text, entityX, entityY, canvasW / (fontSize * 0.6), canvasH / fontSize);
  const cellW = canvasW / geo.width;
  const cellH = canvasH / geo.height;

  ctx.font = `${fontSize}px monospace`;

  for (let r = 0; r < geo.height; r++) {
    for (let c = 0; c < geo.width; c++) {
      let ch = " ";
      if (r === 0) ch = c === 0 ? "╭" : c === geo.width - 1 ? "╮" : "─";
      else if (r === geo.height - 1) ch = c === 0 ? "╰" : c === geo.width - 1 ? "╯" : "─";
      else if (c === 0 || c === geo.width - 1) ch = "│";
      else if (r - 1 < geo.lines.length) {
        const lineText = geo.lines[r - 1];
        const ci = c - 1;
        ch = ci < lineText.length ? lineText[ci] : " ";
      }

      ctx.fillStyle = ch !== " " ? color : "transparent";
      ctx.fillText(ch, (geo.x + c) * cellW, (geo.y + r) * cellH);
    }
  }
}

// ─── ANSI to CSS ─────────────────────────────────────────────────────────────

function ansiToCss(ansiColor: string): string {
  const trueColorMatch = ansiColor.match(/\x1b\[38;2;(\d+);(\d+);(\d+)m/);
  if (trueColorMatch) {
    const [, r, g, b] = trueColorMatch;
    return `rgb(${r},${g},${b})`;
  }

  const codeMatch = ansiColor.match(/\x1b\[38;5;(\d+)m/);
  if (codeMatch) {
    const code = parseInt(codeMatch[1]);
    const colors256 = [
      "#000000","#800000","#008000","#808000","#000080","#800080","#008080","#c0c0c0",
      "#808080","#ff0000","#00ff00","#ffff00","#0000ff","#ff00ff","#00ffff","#ffffff",
    ];
    if (code < 16) return colors256[code];
    if (code < 232) {
      const idx = code - 16;
      const r = Math.floor(idx / 36) * 51;
      const g = Math.floor((idx % 36) / 6) * 51;
      const b = (idx % 6) * 51;
      return `rgb(${r},${g},${b})`;
    }
    const gray = (code - 232) * 10 + 8;
    return `rgb(${gray},${gray},${gray})`;
  }

  return "#ffffff";
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createWebHautly(options: WebHautlyOptions = {}): WebHautly {
  const fontSize = options.fontSize ?? 14;
  const dpr = options.dpr ?? (typeof window !== "undefined" ? window.devicePixelRatio : 1);
  const background = options.background ?? "transparent";
  const mode = options.mode ?? "canvas";
  const hoverEnabled = options.hoverEffect !== false;
  const clickEnabled = options.clickEffect !== false;

  let element: HTMLElement;
  let canvas: HTMLCanvasElement | undefined;
  let ctx: CanvasRenderingContext2D | undefined;

  if (options.canvas) {
    canvas = options.canvas;
    element = canvas;
  } else if (options.container) {
    element = options.container;
  } else {
    element = document.createElement("div");
    element.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
    document.body.appendChild(element);
  }

  if (mode === "canvas") {
    canvas = canvas ?? document.createElement("canvas");
    if (!canvas.parentElement) element.appendChild(canvas);
    ctx = canvas.getContext("2d")!;
  }

  const engine = createHautly(options);
  const speech = createSpeechController(engine, {
    typingSpeed: 35,
    holdDuration: 4,
    maxLineWidth: 36,
  });

  const rendererName = typeof options.renderer === "string" ? options.renderer : "orb";
  const customRenderer = typeof options.renderer === "object" ? options.renderer : null;
  let activeRenderer: Renderer = customRenderer ?? getRenderer(rendererName);

  let frameW = 50;
  let frameH = 20;
  let rafId: number | undefined;
  let lastTime = performance.now() / 1000;
  let running = false;
  const meshEffects: MeshEffect[] = [];

  function computeSize() {
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const newW = Math.round(rect.width * dpr);
      const newH = Math.round(rect.height * dpr);
      if (canvas.width !== newW || canvas.height !== newH) {
        canvas.width = newW;
        canvas.height = newH;
        ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
      }
      frameW = Math.max(10, Math.floor(rect.width / (fontSize * 0.6)));
      frameH = Math.max(4, Math.floor(rect.height / fontSize));
    }
  }

  // Responsive: ResizeObserver on the canvas
  let resizeObserver: ResizeObserver | undefined;
  if (typeof ResizeObserver !== "undefined" && canvas) {
    resizeObserver = new ResizeObserver(() => computeSize());
    resizeObserver.observe(canvas);
  }

  // Responsive: listen for fullscreen changes
  function onFullscreenChange() { computeSize(); }
  document.addEventListener("fullscreenchange", onFullscreenChange);

  // IntersectionObserver for visibility gating
  let visibilityObserver: IntersectionObserver | undefined;
  let isVisible = true;
  if (typeof IntersectionObserver !== "undefined" && canvas) {
    visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisible = entry.isIntersecting;
          if (isVisible && !running) tick();
        }
      },
      { rootMargin: "200px" },
    );
    visibilityObserver.observe(canvas);
  }

  function tick() {
    if (!running || !isVisible) return;
    const now = performance.now() / 1000;
    const dt = Math.min(now - lastTime, 0.1);
    lastTime = now;

    engine.tick(dt);
    speech.tick(dt);

    // Decay mesh effects
    const t = now;
    for (let i = meshEffects.length - 1; i >= 0; i--) {
      const e = meshEffects[i];
      e.strength *= 0.96;
      if (e.strength < 0.01 || (e.type === "click" && t - e.born > 2)) {
        meshEffects.splice(i, 1);
      }
    }

    render();
    rafId = requestAnimationFrame(tick);
  }

  function render() {
    const frame = activeRenderer.render(engine.state, frameW, frameH);

    if (mode === "canvas" && ctx) {
      renderToCanvas(ctx, frame, fontSize, background, meshEffects, performance.now() / 1000);

      if (speech.active) {
        const speechColor = ansiToCss("\x1b[38;2;200;230;255m");
        renderSpeechOnCanvas(
          ctx,
          speech.state.visibleText,
          frameW / 2,
          Math.floor(frameH * 0.3),
          ctx.canvas.width / dpr,
          ctx.canvas.height / dpr,
          fontSize,
          speechColor,
        );
      }
    } else if (mode === "dom") {
      renderToDom(element, frame, fontSize);
    }
  }

  // Interactive mode with mesh effects
  if (options.interactive && canvas) {
    canvas.style.pointerEvents = "auto";
    canvas.style.cursor = "pointer";

    canvas.addEventListener("click", (e) => {
      const rect = canvas!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      if (clickEnabled) {
        meshEffects.push({ type: "click", x, y, strength: 1, decay: 1.5, born: performance.now() / 1000 });
      }
      engine.blink();
      options.onClick?.(engine);
    });

    if (hoverEnabled) {
      canvas.addEventListener("mousemove", (e) => {
        const rect = canvas!.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        // Track eye toward mouse
        const dx = x - 0.5;
        const dy = y - 0.5;
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          const dir = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? "right" : "left")
            : (dy > 0 ? "down" : "up");
          engine.set({ eye: dir });
        }
        // Add gentle hover ripple (throttled)
        if (Math.random() < 0.15) {
          meshEffects.push({ type: "hover", x, y, strength: 0.6, decay: 0, born: 0 });
        }
      });

      canvas.addEventListener("mouseleave", () => {
        engine.set({ eye: "center" });
      });
    }
  }

  const instance: WebHautly = {
    engine,
    speech,
    element,

    start(): WebHautly {
      if (running) return this;
      running = true;
      lastTime = performance.now() / 1000;
      computeSize();
      tick();
      return this;
    },

    stop(): WebHautly {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = undefined;
      return this;
    },

    update(patch: HautlyPatch): WebHautly {
      engine.set(patch);
      return this;
    },

    say(text: string): WebHautly {
      speech.say(text);
      return this;
    },

    async ask(adapter: AIResponseAdapter, message: string): Promise<WebHautly> {
      await speech.ask(adapter, message);
      return this;
    },

    destroy(): void {
      this.stop();
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (canvas?.parentElement) canvas.parentElement.removeChild(canvas);
      else if (element.parentElement && !options.container) element.parentElement.removeChild(element);
    },

    resize(w: number, h: number): WebHautly {
      if (canvas) {
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        computeSize();
      }
      return this;
    },

    setPosition(x: number, y: number): WebHautly {
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      return this;
    },
  };

  return instance;
}

// ─── Quick Launch ────────────────────────────────────────────────────────────

export function hautlyWeb(
  options: WebHautlyOptions & { target?: string | HTMLElement } = {},
): WebHautly {
  let container: HTMLElement | undefined;
  if (options.target) {
    container = typeof options.target === "string"
      ? document.querySelector(options.target) as HTMLElement
      : options.target;
  }

  const h = createWebHautly({ ...options, container });
  h.start();
  return h;
}
