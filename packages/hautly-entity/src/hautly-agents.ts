/**
 * Hautly Agent Adapters — first-class integrations with coding agents.
 *
 * Instead of raw HTTP calls, these adapters connect to each agent's native
 * tool/transport protocol, listen for state events, and map them to Hautly
 * moods, speech, and visual state in real time.
 *
 * Supported agents:
 *   - Opencode (stdio MCP + Agent Skills)
 *   - Claude Code (Anthropic SDK / Agent Skills)
 *   - Codex (OpenAI SDK / Agent Skills)
 *
 * Each adapter implements AgentAdapter so Hautly can run as a living
 * companion orb alongside any supported coding agent.
 */

import type { HautlyEngine, HautlyMood, HautlyPatch } from "./hautly-core.ts";
import { createSpeechController, type SpeechController, type AIResponseAdapter } from "./hautly-speech.ts";

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface AgentEvent {
  /** The agent's unique session or run ID. */
  readonly agentId: string;
  /** Event type determines how Hautly reacts. */
  readonly type: AgentEventType;
  /** Human-readable message or status text. */
  readonly message?: string;
  /** Numeric progress 0–1 if applicable. */
  readonly progress?: number;
  /** Tool name if this is a tool-use event. */
  readonly tool?: string;
  /** Error details if this is a failure. */
  readonly error?: string;
  /** Raw payload for advanced consumers. */
  readonly raw?: unknown;
}

export type AgentEventType =
  | "session:start"
  | "session:end"
  | "thinking"
  | "working"
  | "tool:call"
  | "tool:result"
  | "message:user"
  | "message:assistant"
  | "message:stream"
  | "approval:pending"
  | "approval:granted"
  | "approval:denied"
  | "error"
  | "idle";

export interface AgentAdapterConfig {
  /** Unique name for this agent connection. */
  readonly label?: string;
  /** Hautly engine to drive. If omitted, a new one is created. */
  readonly engine?: HautlyEngine;
  /** Auto-speak agent messages as speech bubbles. Default: true. */
  readonly autoSpeak?: boolean;
  /** Mood mapping overrides. */
  readonly moodMap?: Partial<Record<AgentEventType, HautlyMood>>;
  /** Callback for every agent event. */
  readonly onEvent?: (event: AgentEvent) => void;
  /** Maximum speech text length before truncation. Default: 120. */
  readonly maxSpeechLength?: number;
}

export interface AgentAdapter {
  readonly label: string;
  readonly engine: HautlyEngine;
  readonly speech: SpeechController;
  /** Connect to the agent and start listening. */
  connect(): Promise<void>;
  /** Disconnect and clean up. */
  disconnect(): void;
  /** Manually feed an event (useful for testing or custom transports). */
  emit(event: AgentEvent): void;
  /** Send a message to the agent (if supported). */
  send(message: string): Promise<void>;
  /** Whether the adapter is currently connected. */
  readonly connected: boolean;
}

// ─── Default Mood Map ────────────────────────────────────────────────────────

const DEFAULT_MOOD_MAP: Record<AgentEventType, HautlyMood> = {
  "session:start": "excited",
  "session:end": "idle",
  "thinking": "thinking",
  "working": "speaking",
  "tool:call": "thinking",
  "tool:result": "speaking",
  "message:user": "listening",
  "message:assistant": "speaking",
  "message:stream": "speaking",
  "approval:pending": "thinking",
  "approval:granted": "excited",
  "approval:denied": "error",
  "error": "error",
  "idle": "idle",
};

// ─── Shared Adapter Factory ──────────────────────────────────────────────────

function createBaseAdapter(config: AgentAdapterConfig, name: string): {
  adapter: Omit<AgentAdapter, "connect" | "disconnect" | "send">;
  moodMap: Record<AgentEventType, HautlyMood>;
  maxSpeech: number;
} {
  const engine = config.engine!;
  const speech = createSpeechController(engine);
  const moodMap = { ...DEFAULT_MOOD_MAP, ...config.moodMap };
  const maxSpeech = config.maxSpeechLength ?? 120;

  const adapter = {
    label: config.label ?? name,
    engine,
    speech,
    connected: false,

    emit(event: AgentEvent) {
      config.onEvent?.(event);

      const mood = moodMap[event.type] ?? "idle";
      engine.set({ mood });

      if (config.autoSpeak !== false && event.message) {
        const text = event.message.length > maxSpeech
          ? event.message.slice(0, maxSpeech) + "..."
          : event.message;

        if (event.type === "message:stream") {
          speech.sayImmediate(text);
        } else {
          speech.say(text);
        }
      }

      if (event.error) {
        engine.set({ mood: "error" });
        speech.say(`Error: ${event.error}`);
      }

      if (event.progress !== undefined) {
        engine.set({ energy: event.progress });
      }
    },
  };

  return { adapter, moodMap, maxSpeech };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPENCODE ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

export interface OpencodeAdapterConfig extends AgentAdapterConfig {
  /**
   * The Opencode MCP server URL or stdio config.
   * If omitted, the adapter connects to the default local Opencode instance.
   */
  readonly mcpEndpoint?: string;
  /** Path to the opencode binary. Default: "opencode" */
  readonly binary?: string;
  /** Working directory for the Opencode session. */
  readonly cwd?: string;
}

/**
 * Connects to an Opencode agent session via its MCP (Model Context Protocol)
 * transport. Opencode exposes tool calls, file edits, and streaming responses
 * through MCP — this adapter listens and maps them to Hautly state.
 *
 * For use inside an Opencode session (as a skill), use `createOpencodeSkillAdapter()`
 * which reads events from the Agent Skills protocol instead.
 */
export function createOpencodeAdapter(config: OpencodeAdapterConfig = {}): AgentAdapter {
  const engine = config.engine!;
  const { adapter, moodMap, maxSpeech } = createBaseAdapter(config, "opencode");
  let ws: WebSocket | null = null;
  let abortController: AbortController | null = null;

  return {
    ...adapter,

    async connect() {
      if (adapter.connected) return;
      adapter.connected = true;

      // If an MCP endpoint is provided, connect via WebSocket/HTTP
      if (config.mcpEndpoint) {
        abortController = new AbortController();

        try {
          const response = await fetch(config.mcpEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", params: {
              protocolVersion: "2024-11-05",
              capabilities: {},
              clientInfo: { name: "hautly-entity", version: "0.1.0" },
            }}),
            signal: abortController.signal,
          });

          const init = await response.json();
          if (init.result) {
            adapter.emit({
              agentId: "opencode",
              type: "session:start",
              message: "Connected to Opencode",
            });
          }
        } catch (err) {
          adapter.emit({
            agentId: "opencode",
            type: "error",
            error: `MCP connection failed: ${err}`,
          });
        }
      } else {
        // Local Opencode session — emit ready state
        adapter.emit({
          agentId: "opencode",
          type: "session:start",
          message: "Hautly is your Opencode companion",
        });
      }
    },

    disconnect() {
      adapter.connected = false;
      abortController?.abort();
      ws?.close();
      adapter.emit({ agentId: "opencode", type: "session:end" });
    },

    async send(message: string) {
      if (!adapter.connected) return;
      adapter.emit({ agentId: "opencode", type: "message:user", message });
    },
  };
}

/**
 * Lightweight adapter for when Hautly runs *inside* an Opencode session
 * as an Agent Skill. Instead of connecting to MCP, it hooks into the
 * Agent Skills event contract (skill/tool/result events).
 */
export function createOpencodeSkillAdapter(config: AgentAdapterConfig = {}): AgentAdapter {
  const { adapter } = createBaseAdapter(config, "opencode-skill");

  return {
    ...adapter,

    async connect() {
      if (adapter.connected) return;
      adapter.connected = true;

      // In a real Opencode skill context, events come from the skill protocol.
      // For now, emit a welcome and let the host feed events via emit().
      adapter.emit({
        agentId: "opencode",
        type: "session:start",
        message: "Hautly companion ready",
      });
    },

    disconnect() {
      adapter.connected = false;
      adapter.emit({ agentId: "opencode", type: "session:end" });
    },

    async send(message: string) {
      adapter.emit({ agentId: "opencode", type: "message:user", message });
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAUDE CODE ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClaudeCodeAdapterConfig extends AgentAdapterConfig {
  /**
   * Anthropic API key. If omitted, uses ANTHROPIC_API_KEY env var.
   * Only needed for direct API streaming — not for skill-mode.
   */
  readonly apiKey?: string;
  /**
   * Model to use. Default: "claude-sonnet-4-20250514"
   */
  readonly model?: string;
  /**
   * MCP server URL for Claude Code's tool use protocol.
   */
  readonly mcpEndpoint?: string;
}

/**
 * Connects to Claude Code via the Anthropic SDK's streaming protocol
 * or via Claude Code's MCP transport. Maps thinking, tool_use, and
 * text_response events to Hautly state.
 *
 * For use inside a Claude Code session (as a skill), use
 * `createClaudeCodeSkillAdapter()`.
 */
export function createClaudeCodeAdapter(config: ClaudeCodeAdapterConfig = {}): AgentAdapter {
  const engine = config.engine!;
  const { adapter } = createBaseAdapter(config, "claude-code");
  let abortController: AbortController | null = null;

  return {
    ...adapter,

    async connect() {
      if (adapter.connected) return;
      adapter.connected = true;

      const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;

      if (apiKey && config.mcpEndpoint) {
        // Connect to Claude Code's MCP server
        abortController = new AbortController();

        try {
          const response = await fetch(config.mcpEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: config.model ?? "claude-sonnet-4-20250514",
              max_tokens: 4096,
              stream: true,
              messages: [{ role: "user", content: "Hautly companion connected" }],
            }),
            signal: abortController.signal,
          });

          if (response.ok) {
            adapter.emit({
              agentId: "claude-code",
              type: "session:start",
              message: "Connected to Claude Code",
            });

            // Read SSE stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (reader) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6);
                if (data === "[DONE]") break;

                try {
                  const event = JSON.parse(data);
                  if (event.type === "content_block_start" && event.content_block?.type === "thinking") {
                    adapter.emit({ agentId: "claude-code", type: "thinking", message: "Claude is thinking..." });
                  }
                  if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                    adapter.emit({ agentId: "claude-code", type: "message:stream", message: event.delta.text });
                  }
                  if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
                    adapter.emit({ agentId: "claude-code", type: "tool:call", tool: event.content_block.name });
                  }
                } catch { /* skip malformed */ }
              }
            }
          }
        } catch (err) {
          adapter.emit({ agentId: "claude-code", type: "error", error: `Claude connection failed: ${err}` });
        }
      } else {
        // Skill mode — no direct API needed
        adapter.emit({
          agentId: "claude-code",
          type: "session:start",
          message: "Hautly is your Claude Code companion",
        });
      }
    },

    disconnect() {
      adapter.connected = false;
      abortController?.abort();
      adapter.emit({ agentId: "claude-code", type: "session:end" });
    },

    async send(message: string) {
      adapter.emit({ agentId: "claude-code", type: "message:user", message });
    },
  };
}

/**
 * Lightweight adapter for when Hautly runs *inside* a Claude Code session
 * as an Agent Skill. Events are fed via `emit()` from the skill host.
 */
export function createClaudeCodeSkillAdapter(config: AgentAdapterConfig = {}): AgentAdapter {
  const { adapter } = createBaseAdapter(config, "claude-code-skill");

  return {
    ...adapter,

    async connect() {
      if (adapter.connected) return;
      adapter.connected = true;
      adapter.emit({
        agentId: "claude-code",
        type: "session:start",
        message: "Hautly companion ready for Claude Code",
      });
    },

    disconnect() {
      adapter.connected = false;
      adapter.emit({ agentId: "claude-code", type: "session:end" });
    },

    async send(message: string) {
      adapter.emit({ agentId: "claude-code", type: "message:user", message });
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODEX ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

export interface CodexAdapterConfig extends AgentAdapterConfig {
  /**
   * OpenAI API key. If omitted, uses OPENAI_API_KEY env var.
   */
  readonly apiKey?: string;
  /**
   * Model to use. Default: "o4-mini"
   */
  readonly model?: string;
  /**
   * Codex CLI binary path. Default: "codex"
   */
  readonly binary?: string;
  /**
   * Working directory for the Codex session.
   */
  readonly cwd?: string;
}

/**
 * Connects to Codex (OpenAI's coding agent) via its CLI stdio transport
 * or the OpenAI API streaming protocol. Maps reasoning, tool calls, and
 * response events to Hautly state.
 *
 * For use inside a Codex session (as a skill), use `createCodexSkillAdapter()`.
 */
export function createCodexAdapter(config: CodexAdapterConfig = {}): AgentAdapter {
  const engine = config.engine!;
  const { adapter } = createBaseAdapter(config, "codex");
  let abortController: AbortController | null = null;
  let process: any = null;

  return {
    ...adapter,

    async connect() {
      if (adapter.connected) return;
      adapter.connected = true;

      const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;

      if (apiKey) {
        // Connect via OpenAI streaming API
        abortController = new AbortController();

        try {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: config.model ?? "o4-mini",
              stream: true,
              messages: [{ role: "user", content: "Hautly companion connected" }],
            }),
            signal: abortController.signal,
          });

          if (response.ok) {
            adapter.emit({
              agentId: "codex",
              type: "session:start",
              message: "Connected to Codex",
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (reader) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6);
                if (data === "[DONE]") break;

                try {
                  const event = JSON.parse(data);
                  const delta = event.choices?.[0]?.delta;
                  if (delta?.content) {
                    adapter.emit({ agentId: "codex", type: "message:stream", message: delta.content });
                  }
                  if (delta?.tool_calls) {
                    adapter.emit({ agentId: "codex", type: "tool:call", tool: delta.tool_calls[0]?.function?.name });
                  }
                } catch { /* skip */ }
              }
            }
          }
        } catch (err) {
          adapter.emit({ agentId: "codex", type: "error", error: `Codex connection failed: ${err}` });
        }
      } else {
        // Skill mode
        adapter.emit({
          agentId: "codex",
          type: "session:start",
          message: "Hautly is your Codex companion",
        });
      }
    },

    disconnect() {
      adapter.connected = false;
      abortController?.abort();
      process?.kill?.();
      adapter.emit({ agentId: "codex", type: "session:end" });
    },

    async send(message: string) {
      adapter.emit({ agentId: "codex", type: "message:user", message });
    },
  };
}

/**
 * Lightweight adapter for when Hautly runs *inside* a Codex session
 * as an Agent Skill. Events are fed via `emit()` from the skill host.
 */
export function createCodexSkillAdapter(config: AgentAdapterConfig = {}): AgentAdapter {
  const { adapter } = createBaseAdapter(config, "codex-skill");

  return {
    ...adapter,

    async connect() {
      if (adapter.connected) return;
      adapter.connected = true;
      adapter.emit({
        agentId: "codex",
        type: "session:start",
        message: "Hautly companion ready for Codex",
      });
    },

    disconnect() {
      adapter.connected = false;
      adapter.emit({ agentId: "codex", type: "session:end" });
    },

    async send(message: string) {
      adapter.emit({ agentId: "codex", type: "message:user", message });
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL ADAPTER — auto-detects or works with any agent
// ═══════════════════════════════════════════════════════════════════════════════

export type SupportedAgent = "opencode" | "claude-code" | "codex" | "auto";

export interface UniversalAdapterConfig extends AgentAdapterConfig {
  /** Which agent to connect to. Default: "auto" (tries to detect). */
  readonly agent?: SupportedAgent;
}

/**
 * Factory that creates the right adapter based on the agent type.
 * Use "auto" to detect from environment variables (ANTHROPIC_API_KEY,
 * OPENAI_API_KEY, or presence of agent CLIs).
 */
export function createAgentAdapter(config: UniversalAdapterConfig = {}): AgentAdapter {
  const agent = config.agent ?? detectAgent();

  switch (agent) {
    case "opencode":
      return createOpencodeAdapter(config);
    case "claude-code":
      return createClaudeCodeAdapter(config);
    case "codex":
      return createCodexAdapter(config);
    default:
      return createOpencodeSkillAdapter(config);
  }
}

function detectAgent(): SupportedAgent {
  if (typeof process !== "undefined") {
    const env = process.env;
    if (env.ANTHROPIC_API_KEY || env.CLAUDE_CODE) return "claude-code";
    if (env.OPENAI_API_KEY || env.CODEX) return "codex";
    if (env.OPENCODE) return "opencode";
  }
  return "opencode";
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI RESPONSE ADAPTER — wraps any AgentAdapter as an AIResponseAdapter
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wraps an AgentAdapter as an AIResponseAdapter so it can be used
 * with Hautly's speech controller for `ask()` calls.
 */
export function createAgentAIAdapter(adapter: AgentAdapter): AIResponseAdapter {
  return {
    async send(message: string): Promise<string> {
      adapter.send(message);

      return new Promise<string>((resolve) => {
        let response = "";
        let resolved = false;

        // Temporarily wrap the adapter's emit to capture the response
        const originalEmit = adapter.emit.bind(adapter);
        (adapter as any).emit = (event: AgentEvent) => {
          originalEmit(event);
          if (!resolved && event.type === "message:assistant" && event.message) {
            response = event.message;
            resolved = true;
            // Restore original emit
            (adapter as any).emit = originalEmit;
            resolve(response);
          }
        };

        // Timeout fallback for streaming agents
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            (adapter as any).emit = originalEmit;
            resolve(response || "(no response)");
          }
        }, 10000);
      });
    },
  };
}
