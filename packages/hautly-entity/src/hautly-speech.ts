/**
 * Hautly Speech — dynamic speech bubble system with AI response integration.
 *
 * Handles typing animation, word-wrapping, tail pointing, mood reactions,
 * and a framework-agnostic AI response adapter.
 */

import type { HautlyMood, HautlyEngine } from "./hautly-core.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SpeechConfig {
  /** Characters per second for typing animation. */
  readonly typingSpeed: number;
  /** Seconds to hold after fully typed before auto-dismiss. */
  readonly holdDuration: number;
  /** Maximum visible lines in bubble. */
  readonly maxLines: number;
  /** Maximum characters per line. */
  readonly maxLineWidth: number;
  /** Whether to auto-dismiss after hold. */
  readonly autoDismiss: boolean;
  /** Mood to set when speaking. */
  readonly speakMood: HautlyMood;
  /** Mood to restore after speaking. */
  readonly idleMood: HautlyMood;
}

export interface SpeechState {
  readonly text: string;
  readonly visibleText: string;
  readonly typing: boolean;
  readonly fullyTyped: boolean;
  readonly elapsed: number;
  readonly holdTimer: number;
}

export interface AIResponseAdapter {
  /**
   * Send a user message and receive a streaming or complete response.
   * The adapter is model/framework agnostic — it receives plain text
   * and returns plain text or an async iterable of text chunks.
   */
  send(message: string): AsyncIterable<string> | Promise<string>;
}

export interface SpeechController {
  readonly state: SpeechState;
  /** Queue a message for display with typing animation. */
  say(text: string): this;
  /** Immediately show full text without animation. */
  sayImmediate(text: string): this;
  /** Send user input to an AI adapter and stream the response. */
  ask(adapter: AIResponseAdapter, message: string): Promise<this>;
  /** Dismiss the current bubble. */
  dismiss(): this;
  /** Advance the animation by dt seconds. */
  tick(dt: number): this;
  /** Check if a bubble is active. */
  readonly active: boolean;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: SpeechConfig = {
  typingSpeed: 30,
  holdDuration: 4,
  maxLines: 6,
  maxLineWidth: 36,
  autoDismiss: true,
  speakMood: "speaking",
  idleMood: "idle",
};

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createSpeechController(
  engine: HautlyEngine,
  config: Partial<SpeechConfig> = {},
): SpeechController {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  let text = "";
  let visibleText = "";
  let typing = false;
  let fullyTyped = false;
  let elapsed = 0;
  let holdTimer = 0;
  let queue: string[] = [];

  function showNext() {
    if (queue.length === 0) return;
    text = queue.shift()!;
    visibleText = "";
    typing = true;
    fullyTyped = false;
    elapsed = 0;
    holdTimer = 0;
    engine.set({ speaking: true, speechText: text, mood: cfg.speakMood });
  }

  return {
    get state(): SpeechState {
      return { text, visibleText, typing, fullyTyped, elapsed, holdTimer };
    },
    get active(): boolean {
      return typing || (fullyTyped && holdTimer < cfg.holdDuration);
    },

    say(newText: string): SpeechController {
      queue.push(newText);
      if (!typing && !fullyTyped) showNext();
      return this;
    },

    sayImmediate(newText: string): SpeechController {
      text = newText;
      visibleText = newText;
      typing = false;
      fullyTyped = true;
      elapsed = 0;
      holdTimer = 0;
      engine.set({ speaking: true, speechText: newText, mood: cfg.speakMood });
      return this;
    },

    async ask(adapter: AIResponseAdapter, message: string): Promise<SpeechController> {
      this.say(message);
      const result = await adapter.send(message);
      if (typeof result === "string") {
        this.say(result);
      } else {
        let response = "";
        for await (const chunk of result) {
          response += chunk;
          this.sayImmediate(response);
        }
      }
      return this;
    },

    dismiss(): SpeechController {
      text = "";
      visibleText = "";
      typing = false;
      fullyTyped = false;
      holdTimer = cfg.holdDuration;
      engine.set({ speaking: false, speechText: "", mood: cfg.idleMood });
      if (queue.length > 0) showNext();
      return this;
    },

    tick(dt: number): SpeechController {
      elapsed += dt;

      if (typing) {
        const charsToShow = Math.floor(elapsed * cfg.typingSpeed);
        if (charsToShow >= text.length) {
          visibleText = text;
          typing = false;
          fullyTyped = true;
          elapsed = 0;
        } else {
          visibleText = text.slice(0, charsToShow);
        }
        engine.set({ speechText: visibleText });
      }

      if (fullyTyped) {
        holdTimer += dt;
        if (cfg.autoDismiss && holdTimer >= cfg.holdDuration) {
          this.dismiss();
        }
      }

      return this;
    },
  };
}

// ─── Built-in AI Adapter (HTTP, model-agnostic) ──────────────────────────────

export interface HttpAIAdapterConfig {
  readonly endpoint: string;
  readonly model?: string;
  readonly headers?: Record<string, string>;
  readonly method?: "GET" | "POST";
}

/**
 * A minimal HTTP adapter that posts messages to any OpenAI-compatible endpoint.
 * Framework agnostic — works in browser, Node, Deno, Bun, or Cloudflare Workers.
 */
export function createHttpAIAdapter(config: HttpAIAdapterConfig): AIResponseAdapter {
  return {
    async *send(message: string): AsyncGenerator<string> {
      const body = JSON.stringify({
        model: config.model ?? "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }],
        stream: true,
      });

      const response = await fetch(config.endpoint, {
        method: config.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...config.headers,
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`AI adapter error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip malformed lines
          }
        }
      }
    },
  };
}

// ─── In-Memory Adapter (for testing/local) ───────────────────────────────────

export function createLocalAIAdapter(
  responder: (message: string) => string | Promise<string>,
): AIResponseAdapter {
  return {
    send: (message: string) => responder(message),
  };
}

// ─── Speech Bubble Geometry ──────────────────────────────────────────────────

export interface BubbleGeometry {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly tailX: number;
  readonly tailY: number;
  readonly lines: readonly string[];
}

export function computeBubbleGeometry(
  text: string,
  entityX: number,
  entityY: number,
  maxWidth: number,
  maxHeight: number,
): BubbleGeometry {
  const maxLineWidth = Math.min(maxWidth - 4, 36);
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (line.length + word.length + 1 > maxLineWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  }
  if (line) lines.push(line);

  const visibleLines = lines.slice(0, Math.min(lines.length, Math.floor((maxHeight - 3) / 1)));
  const bw = Math.min(maxWidth, Math.max(...visibleLines.map(l => l.length)) + 4);
  const bh = visibleLines.length + 2;
  const bx = Math.max(1, Math.min(entityX - bw / 2, maxWidth - bw - 1));
  const by = Math.max(1, entityY - bh - 3);

  return {
    x: bx,
    y: by,
    width: bw,
    height: bh,
    tailX: entityX,
    tailY: by + bh,
    lines: visibleLines,
  };
}

export function renderBubbleToAnsi(geo: BubbleGeometry, colorCode: string): string {
  const rows: string[] = [];
  const reset = "\x1b[0m";

  for (let r = 0; r < geo.height; r++) {
    let row = colorCode;
    for (let c = 0; c < geo.width; c++) {
      if (r === 0) {
        row += c === 0 ? "╭" : c === geo.width - 1 ? "╮" : "─";
      } else if (r === geo.height - 1) {
        row += c === 0 ? "╰" : c === geo.width - 1 ? "╯" : "─";
      } else if (c === 0 || c === geo.width - 1) {
        row += "│";
      } else if (r - 1 < geo.lines.length) {
        const lineText = geo.lines[r - 1];
        const charIdx = c - 1;
        row += charIdx < lineText.length ? lineText[charIdx] : " ";
      } else {
        row += " ";
      }
    }
    row += reset;
    rows.push(row);
  }

  // Tail
  if (geo.tailY < rows.length) {
    const tailRow = rows[geo.tailY];
    const tailCols = [geo.tailX - 1, geo.tailX, geo.tailX + 1];
    let newRow = colorCode;
    for (let i = 0; i < tailRow.length; i++) {
      if (tailCols.includes(i)) {
        newRow += i === tailCols[1] ? "∧" : "/";
      } else {
        newRow += tailRow[i];
      }
    }
    newRow += reset;
    rows[geo.tailY] = newRow;
  }

  return rows.join("\n");
}
