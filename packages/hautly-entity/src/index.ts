/**
 * Hautly Entity — alive ASCII orb-spirit with AI connectivity.
 *
 * A cross-platform, framework-agnostic entity engine that renders
 * responsive ASCII orb-spirals with breathing animations, eye tracking,
 * particle auras, and dynamic speech bubbles.
 *
 * @packageDocumentation
 */

// Core engine
export {
  createHautly,
  MOOD_PALETTES,
  type HautlyEngine,
  type HautlyState,
  type HautlyMood,
  type HautlyForm,
  type HautlyOptions,
  type HautlyPatch,
  type EyeDirection,
  type Particle,
  type FrameOutput,
  type SpeechBubble,
  type MoodPalette,
} from "./hautly-core.ts";

// Renderers
export {
  orbRenderer,
  crystalRenderer,
  jellyRenderer,
  phoenixRenderer,
  nebulaRenderer,
  createCustomRenderer,
  getRenderer,
  RENDERERS,
  type Renderer,
  type RenderedFrame,
} from "./hautly-renderers.ts";

// Speech system
export {
  createSpeechController,
  createHttpAIAdapter,
  createLocalAIAdapter,
  computeBubbleGeometry,
  renderBubbleToAnsi,
  type SpeechController,
  type SpeechConfig,
  type SpeechState,
  type AIResponseAdapter,
  type BubbleGeometry,
} from "./hautly-speech.ts";

// Terminal renderer
export {
  createTerminalHautly,
  createTerminalLayout,
  hautlyTerminal,
  type TerminalHautly,
  type TerminalHautlyOptions,
  type TerminalLayout,
} from "./hautly-terminal.ts";

// Web (HTML/Canvas) renderer
export {
  createWebHautly,
  hautlyWeb,
  type WebHautly,
  type WebHautlyOptions,
} from "./hautly-web.ts";

// React adapter
export {
  useHautly,
  HautlyEntity,
  type UseHautlyReturn,
  type UseHautlyOptions as UseHautlyReactOptions,
  type HautlyEntityProps,
} from "./hautly-react.tsx";

// Vue adapter
export {
  useHautly as useHautlyVue,
  HautlyEntity as HautlyEntityVue,
  type UseHautlyReturn as UseHautlyVueReturn,
  type UseHautlyOptions as UseHautlyVueOptions,
  type HautlyEntityProps as HautlyEntityVueProps,
} from "./hautly-vue.ts";

// Svelte adapter
export {
  hautly as hautlyAction,
  type HautlyAction,
  type HautlyActionOptions,
} from "./hautly-svelte.ts";

// WebGPU bridge
export {
  createWebGPUHautly,
  hautlyGPU,
  type WebGPUHautly,
  type WebGPUHautlyOptions,
} from "./hautly-webgpu.ts";

// Agent adapters — first-class integrations with coding agents
export {
  createOpencodeAdapter,
  createOpencodeSkillAdapter,
  createClaudeCodeAdapter,
  createClaudeCodeSkillAdapter,
  createCodexAdapter,
  createCodexSkillAdapter,
  createAgentAdapter,
  createAgentAIAdapter,
  type AgentAdapter,
  type AgentAdapterConfig,
  type AgentEvent,
  type AgentEventType,
  type OpencodeAdapterConfig,
  type ClaudeCodeAdapterConfig,
  type CodexAdapterConfig,
  type UniversalAdapterConfig,
  type SupportedAgent,
} from "./hautly-agents.ts";
