# @hautly/entity

> **Hautly** — an alive ASCII orb-spirit entity with GPU acceleration, AI connectivity, and multi-platform rendering.

Hautly is a cross-platform ASCII entity engine that creates responsive, animated orb-spirals with breathing patterns, eye tracking, particle auras, and dynamic speech bubbles. It connects to any AI framework and renders on any platform.

## Features

- **5 built-in forms**: orb, crystal, jelly, phoenix, nebula (+ custom)
- **8 moods**: idle, listening, thinking, speaking, excited, sleepy, error, healing
- **Alive animations**: breathing, blinking, eye tracking (follows mouse), particle aura
- **Speech bubbles**: typing animation, word-wrap, auto-dismiss
- **AI-agnostic**: connect any LLM, local model, or API via simple adapter
- **Agent integrations**: first-class adapters for Opencode, Claude Code, Codex
- **Multi-platform**: Terminal (ANSI), HTML/Canvas, React, Vue, Svelte, WebGPU
- **GPU-accelerated**: optional WebGPU glow layer via AIGpu

## Install

```sh
npm install @hautly/entity
```

## Quick Start

### Terminal (Linux/macOS/Windows)

```ts
import { hautlyTerminal } from "@hautly/entity/terminal";

const h = await hautlyTerminal({ form: "orb", mood: "idle" });
h.say("Hello from Hautly!");
```

### HTML/Canvas (Browser)

```ts
import { hautlyWeb } from "@hautly/entity/web";

const h = hautlyWeb({ target: "#app", form: "orb" });
h.say("I'm alive!");
```

### React

```tsx
import { HautlyEntity } from "@hautly/entity/react";

function App() {
  return <HautlyEntity form="orb" mood="idle" width={400} height={300} />;
}
```

### Vue 3

```vue
<script setup>
import { HautlyEntity } from "@hautly/entity/vue";
</script>

<template>
  <HautlyEntity form="orb" mood="idle" :width="400" :height="300" />
</template>
```

### Svelte

```svelte
<script>
  import { hautly } from "@hautly/entity/svelte";
</script>

<canvas use:hautly={{ form: "orb", mood: "idle" }} />
```

### WebGPU (GPU-accelerated)

```ts
import { hautlyGPU } from "@hautly/entity/webgpu";

const h = hautlyGPU({ target: "#app", gpuGlow: true });
h.say("GPU-powered entity!");
```

## Agent Integrations

### Opencode

```ts
import { createOpencodeAdapter } from "@hautly/entity/agents";
import { createTerminalHautly } from "@hautly/entity/terminal";

const h = createTerminalHautly({ form: "orb" });
const adapter = createOpencodeAdapter({ engine: h.engine });

// Hautly reacts to every agent event automatically
adapter.emit({ agentId: "op", type: "thinking", message: "Analyzing..." });
adapter.emit({ agentId: "op", type: "tool:call", tool: "read_file" });
adapter.emit({ agentId: "op", type: "message:assistant", message: "Done!" });

h.start();
```

### Claude Code

```ts
import { createClaudeCodeAdapter } from "@hautly/entity/agents";

const adapter = createClaudeCodeAdapter({
  engine: h.engine,
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Codex

```ts
import { createCodexAdapter } from "@hautly/entity/agents";

const adapter = createCodexAdapter({
  engine: h.engine,
  apiKey: process.env.OPENAI_API_KEY,
});
```

### Auto-detect

```ts
import { createAgentAdapter } from "@hautly/entity/agents";

// Automatically detects from environment variables
const adapter = createAgentAdapter({ agent: "auto", engine: h.engine });
```

## AI Response Integration

```ts
import { hautlyWeb, createHttpAIAdapter } from "@hautly/entity";

const ai = createHttpAIAdapter({
  endpoint: "https://api.openai.com/v1/chat/completions",
  headers: { Authorization: "Bearer sk-..." },
});

const h = hautlyWeb({ target: "#app" });
await h.ask(ai, "What is WebGPU?");
```

## Entity Forms

| Form | Shape | Behavior |
|------|-------|----------|
| `orb` | Glowing sphere | Breathing, rings, aura particles |
| `crystal` | Faceted diamond | Internal refraction, sparkle edges |
| `jelly` | Wobbling blob | Sine-distorted body, tentacles |
| `phoenix` | Rising flame | Upward cone, tail feathers, sparks |
| `nebula` | Cosmic cloud | Layered noise, embedded stars |
| `custom` | User-defined | `createCustomRenderer()` API |

## Mood System

| Mood | Behavior | Colors |
|------|----------|--------|
| `idle` | Calm breathing, slow particles | Blue |
| `listening` | Alert eyes, gentle pulse | Green |
| `thinking` | Spinning rings, dense particles | Purple |
| `speaking` | Active glow, speech bubble | Gold |
| `excited` | Fast breathing, bright colors | Red-pink |
| `sleepy` | Slow drift, dim glow | Muted blue |
| `error` | Red pulse, glitch particles | Red |
| `healing` | Green aura, rising particles | Green |

## Mouse Interaction

In browser mode, Hautly's eyes follow the mouse cursor and the entity gently attracts toward hover position. Click triggers an excited response.

## Package Structure

```
@hautly/entity
  ├── src/index.ts          # Main exports
  ├── src/hautly-core.ts    # Core engine (mood, breathing, particles, speech)
  ├── src/hautly-renderers.ts # Form renderers (orb, crystal, jelly, phoenix, nebula)
  ├── src/hautly-speech.ts  # Speech bubble system + AI adapters
  ├── src/hautly-terminal.ts # ANSI terminal renderer
  ├── src/hautly-web.ts     # HTML/Canvas renderer
  ├── src/hautly-react.tsx  # React adapter
  ├── src/hautly-vue.ts     # Vue 3 adapter
  ├── src/hautly-svelte.ts  # Svelte action
  ├── src/hautly-webgpu.ts  # WebGPU glow bridge
  └── src/hautly-agents.ts  # Agent integrations
```

## License

MIT
