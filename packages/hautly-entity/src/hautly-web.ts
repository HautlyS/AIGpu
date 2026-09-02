/**
 * Hautly Web — HTML/Canvas adapter (framework-agnostic).
 *
 * Renders Hautly entities on a Canvas2D element or as styled DOM overlays.
 * Works in any HTML page without React, Vue, or Svelte.
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

// ─── Canvas Renderer ─────────────────────────────────────────────────────────

function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  frame: RenderedFrame,
  fontSize: number,
  background: string,
): void {
  const { width, height, cells, colors } = frame;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  // Clear
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
      ctx.fillStyle = color ? ansiToCss(color) : "#ffffff";
      ctx.fillText(char, x * cellW, y * cellH);
    }
  }
}

// ─── DOM Renderer ────────────────────────────────────────────────────────────

function renderToDom(
  container: HTMLElement,
  frame: RenderedFrame,
  fontSize: number,
): void {
  // Clear previous content
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

  // Bubble border
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

  // Fallback: map common ANSI codes
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

  // Create or use provided element
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

  function computeSize() {
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      frameW = Math.floor(rect.width / (fontSize * 0.6));
      frameH = Math.floor(rect.height / fontSize);
    }
  }

  function tick() {
    if (!running) return;
    const now = performance.now() / 1000;
    const dt = Math.min(now - lastTime, 0.1);
    lastTime = now;

    engine.tick(dt);
    speech.tick(dt);

    render();
    rafId = requestAnimationFrame(tick);
  }

  function render() {
    const frame = activeRenderer.render(engine.state, frameW, frameH);

    if (mode === "canvas" && ctx) {
      renderToCanvas(ctx, frame, fontSize, background);

      // Overlay speech bubble
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

  // Interactive mode
  if (options.interactive && canvas) {
    canvas.style.pointerEvents = "auto";
    canvas.addEventListener("click", () => {
      options.onClick?.(engine);
    });
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
