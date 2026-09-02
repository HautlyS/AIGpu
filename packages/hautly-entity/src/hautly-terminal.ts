/**
 * Hautly Terminal — ANSI terminal renderer.
 *
 * Renders Hautly entities directly in any ANSI-compatible terminal
 * (Linux, macOS, Windows Terminal, mintty, ConEmu, kitty, alacritty, etc.).
 * Uses raw ANSI escape codes — no external dependencies like blessed.
 */

import { createHautly, type HautlyEngine, type HautlyOptions, type HautlyPatch } from "./hautly-core.ts";
import { getRenderer, type Renderer, type RenderedFrame } from "./hautly-renderers.ts";
import { createSpeechController, type SpeechController, type AIResponseAdapter } from "./hautly-speech.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TerminalHautlyOptions extends HautlyOptions {
  /** Pre-built renderer name or custom Renderer. Default: "orb". */
  renderer?: string | Renderer;
  /** ANSI color mode. Default: "256" on modern terminals, "true" if TERM supports it. */
  colorMode?: "basic" | "256" | "true";
  /** Enable/disable frame rate limiting. Default: 20. */
  fps?: number;
  /** Position offset in the terminal buffer. */
  offset?: { x: number; y: number };
}

export interface TerminalHautly {
  readonly engine: HautlyEngine;
  readonly speech: SpeechController;
  /** Render one frame to stdout. */
  render(): void;
  /** Start an animation loop. Returns stop function. */
  start(): () => void;
  /** Stop the animation loop. */
  stop(): void;
  /** Clear the Hautly region from the terminal. */
  clear(): void;
  /** Set state and re-render. */
  update(patch: HautlyPatch): this;
  /** Speak a message with typing animation. */
  say(text: string): this;
  /** Ask an AI and stream the response. */
  ask(adapter: AIResponseAdapter, message: string): Promise<this>;
  /** Resize the rendering area. */
  resize(width: number, height: number): this;
  /** Position the entity at a specific terminal location. */
  moveTo(x: number, y: number): this;
}

// ─── ANSI Helpers ────────────────────────────────────────────────────────────

const ESC = "\x1b";

function moveCursor(x: number, y: number): string {
  return `${ESC}[${y + 1};${x + 1}H`;
}

function hideCursor(): string {
  return `${ESC}[?25l`;
}

function showCursor(): string {
  return `${ESC}[?25h`;
}

function clearRegion(x: number, y: number, w: number, h: number): string {
  let buf = "";
  for (let row = 0; row < h; row++) {
    buf += moveCursor(x, y + row) + " ".repeat(w);
  }
  return buf;
}

function trueColor(r: number, g: number, b: number): string {
  return `${ESC}[38;2;${r};${g};${b}m`;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

// ─── Frame to ANSI ───────────────────────────────────────────────────────────

function frameToAnsi(frame: RenderedFrame, offsetX: number, offsetY: number): string {
  let buf = "";
  for (let y = 0; y < frame.height; y++) {
    buf += moveCursor(offsetX, offsetY + y);
    for (let x = 0; x < frame.width; x++) {
      const idx = y * frame.width + x;
      const color = frame.colors[idx];
      const char = frame.cells[idx];
      if (color) {
        buf += color + char + "\x1b[0m";
      } else {
        buf += char;
      }
    }
  }
  return buf;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createTerminalHautly(options: TerminalHautlyOptions = {}): TerminalHautly {
  const width = options.initial?.energy !== undefined ? 60 : 50;
  const height = 20;

  const engine = createHautly(options);
  const speech = createSpeechController(engine, {
    typingSpeed: 35,
    holdDuration: 3.5,
    maxLineWidth: width - 4,
  });

  const rendererName = typeof options.renderer === "string" ? options.renderer : "orb";
  const customRenderer = typeof options.renderer === "object" ? options.renderer : null;
  let activeRenderer: Renderer = customRenderer ?? getRenderer(rendererName);
  let offsetX = options.offset?.x ?? 1;
  let offsetY = options.offset?.y ?? 1;
  let currentWidth = width;
  let currentHeight = height;
  let animFrame: ReturnType<typeof setInterval> | undefined;
  let lastTime = performance.now() / 1000;
  let running = false;

  function tick() {
    const now = performance.now() / 1000;
    const dt = Math.min(now - lastTime, 0.1);
    lastTime = now;

    engine.tick(dt);
    speech.tick(dt);
  }

  function renderFrame(): string {
    const frame = activeRenderer.render(engine.state, currentWidth, currentHeight);
    return frameToAnsi(frame, offsetX, offsetY);
  }

  const instance: TerminalHautly = {
    engine,
    speech,

    render(): void {
      process.stdout.write(hideCursor() + renderFrame());
    },

    start(): () => void {
      if (running) return () => instance.stop();
      running = true;
      lastTime = performance.now() / 1000;

      process.stdout.write(hideCursor());
      instance.render();

      const fps = options.fps ?? 20;
      animFrame = setInterval(() => {
        tick();
        instance.render();
      }, 1000 / fps);

      return () => instance.stop();
    },

    stop(): void {
      if (animFrame) clearInterval(animFrame);
      animFrame = undefined;
      running = false;
      process.stdout.write(showCursor());
    },

    clear(): void {
      process.stdout.write(clearRegion(offsetX, offsetY, currentWidth, currentHeight));
    },

    update(patch: HautlyPatch): TerminalHautly {
      engine.set(patch);
      return this;
    },

    say(text: string): TerminalHautly {
      speech.say(text);
      return this;
    },

    async ask(adapter: AIResponseAdapter, message: string): Promise<TerminalHautly> {
      await speech.ask(adapter, message);
      return this;
    },

    resize(w: number, h: number): TerminalHautly {
      currentWidth = w;
      currentHeight = h;
      return this;
    },

    moveTo(x: number, y: number): TerminalHautly {
      offsetX = x;
      offsetY = y;
      return this;
    },
  };

  return instance;
}

// ─── Multi-Entity Terminal Layout ────────────────────────────────────────────

export interface TerminalLayout {
  readonly entities: TerminalHautly[];
  /** Render all entities in a single frame. */
  renderAll(): void;
  /** Start all animation loops. */
  startAll(): () => void;
  /** Stop all animation loops. */
  stopAll(): void;
  /** Clear all entities from the terminal. */
  clearAll(): void;
}

export function createTerminalLayout(
  configs: Array<TerminalHautlyOptions & { x?: number; y?: number }>,
): TerminalLayout {
  const cols = Math.ceil(Math.sqrt(configs.length));
  const termWidth = process.stdout.columns ?? 80;
  const termHeight = process.stdout.rows ?? 24;
  const cellW = Math.floor(termWidth / cols);
  const cellH = Math.floor(termHeight / Math.ceil(configs.length / cols));

  const entities = configs.map((cfg, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return createTerminalHautly({
      ...cfg,
      offset: { x: cfg.x ?? col * cellW + 2, y: cfg.y ?? row * cellH + 1 },
    });
  });

  return {
    entities,
    renderAll(): void {
      let buf = hideCursor();
      for (const e of entities) {
        const frame = (e as any).render();
      }
      process.stdout.write(buf);
    },
    startAll(): () => void {
      const stops = entities.map(e => e.start());
      return () => stops.forEach(s => s());
    },
    stopAll(): void {
      entities.forEach(e => e.stop());
    },
    clearAll(): void {
      entities.forEach(e => e.clear());
    },
  };
}

// ─── Quick Launch Helper ─────────────────────────────────────────────────────

/**
 * One-liner to launch a Hautly entity in the terminal.
 * Usage: `await hautlyTerminal({ mood: "idle", form: "orb" })`
 */
export async function hautlyTerminal(
  options: TerminalHautlyOptions = {},
): Promise<TerminalHautly> {
  const h = createTerminalHautly(options);
  const stop = h.start();

  process.on("SIGINT", () => {
    h.clear();
    h.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    h.clear();
    h.stop();
    process.exit(0);
  });

  return h;
}
