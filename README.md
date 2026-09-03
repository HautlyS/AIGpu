# AIGpu

> **GPU-accelerated TypeScript layer for AI agent animations — framework-free, offline-first, agent-native.**

AIGpu gives AI agents and developers a typed WebGPU/WGSL runtime to turn serializable agent state into GPU-rendered visuals. No hosted dashboard. No proprietary SDK. No vendor lock-in. Just a small TypeScript API that agents can read, generate, and validate autonomously.

```ts
import { agentAnimation, clock, frameLoop, init, surface } from "aigpu";

const gpu = await init();
const output = surface(gpu, document.querySelector("canvas")!, { dpr: [1, 2] });
const agent = agentAnimation(gpu, { initial: { status: "thinking", progress: 0.15 } });
const time = clock(gpu);

frameLoop(gpu, (frame) => {
  agent.tick(time.time);
  frame.pass(output, agent.effect);
});

agent.set({ status: "working", progress: 0.62 });
```

## Why AIGpu

Most agent interfaces start with text badges or CSS transitions. AIGpu treats an agent's visual state as a compact GPU signal. JavaScript updates only the data that changed; the WGSL shader evaluates the pulse, halo, ring, progress arc, palette, and time-dependent motion on the GPU.

| Property | AIGpu behavior |
| --- | --- |
| Rendering | WebGPU + WGSL with explicit resources and frame submission |
| TypeScript layer | Typed `Gpu` context, typed uniforms, typed patches, no `any` |
| Agent state | Plain serializable `AgentEvent` / `AgentAnimationPatch` envelopes |
| UI integration | HTML/JS first; React, Vue, Svelte are optional adapters |
| Runtime targets | Browser, headless Node, deterministic mock, workers |
| AI ownership | Your app owns models, queues, tools, transports, orchestration |
| Distribution | MIT-licensed, open-source, offline-first, zero hosted control planes |

## Contents

- [Quick start](#quick-start)
- [AI agent integration](#ai-agent-integration)
- [The TypeScript GPU layer](#the-typescript-gpu-layer)
- [Agent animations](#agent-animations)
- [Framework adapters](#framework-adapters)
- [Multi-agent state and replay](#multi-agent-state-and-replay)
- [Visual gallery](#visual-gallery)
- [CLI and tooling](#cli-and-tooling)
- [Architecture](#architecture)
- [Workspace packages](#workspace-packages)
- [Performance checklist](#performance-checklist)
- [Development](#development)
- [License](#license)

## Quick start

### Install

```sh
npm install aigpu
npm install --save-dev @webgpu/types
```

### Browser (3 imports)

```ts
import { init, surface, effect, frameLoop } from "aigpu";

const gpu = await init();
const canvasSurface = surface(gpu, document.querySelector("canvas")!, { dpr: [1, 2] });
const gradient = effect(gpu, `
  @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
    return vec4f(uv, 0.8, 1.0);
  }
`);
frameLoop(gpu, (frame) => frame.pass(canvasSurface, gradient));
```

### Node (headless)

```sh
npm install aigpu @aigpu/adapter-node
```

```ts
import { init, effect, target } from "aigpu/node";

const gpu = await init();
const output = target(gpu, { size: [256, 256] });
effect(gpu, `@fragment fn main() -> @location(0) vec4f { return vec4f(0.25, 0.5, 0.75, 1.0); }`).draw(output);
const pixels = await output.read(); // RGBA bytes
gpu.dispose();
```

### Validate your environment

```sh
npx aigpu doctor   # JSON verdict: healthy | unhealthy — each problem with its exact fix
```

## AI agent integration

AIGpu is designed so coding agents (Claude Code, OpenCode, Codex, Cursor, Copilot, Cline, Gemini CLI) can **read the docs, generate valid code, and validate it** without human guidance. Three layers make this work:

### 1. Portable Agent Skills

A skill teaches an agent the AIGpu API, integration patterns, and project conventions. Install once, use everywhere:

```sh
# Install for specific agents
npx -y skills add hautlys/AIGpu \
  --skill aigpu-agent-toolkit \
  -a claude-code -a opencode -a codex -y

# Install for every compatible agent
npx -y skills add hautlys/AIGpu --skill aigpu-agent-toolkit --agent '*' -y
```

The skill covers:

- Choosing the smallest AIGpu entrypoint (`agentAnimation` vs `mountAgentCanvas` vs `effect`)
- Serializable event contracts and state patches
- Accessible status cards, reduced-motion, SSR, hydration, cleanup
- WGSL authoring, reflection, diagnostics, performance budgets
- Local CLI, offline docs, examples, and MCP stdio
- Deterministic tests and CI validation

Install from this checkout:

```sh
node scripts/install-agent-skills.mjs
node scripts/validate-agent-integrations.mjs
```

### 2. MCP (Model Context Protocol)

Connect coding agents directly to AIGpu documentation and verified examples through MCP. No auth, no account, no network dependency for local stdio.

**Hosted HTTP** (read-only, zero setup):

```sh
npx -y add-mcp https://github.com/hautlys/AIGpu/api/mcp -g
```

**Local stdio** (offline-capable, with optional file downloads):

```json
{
  "mcpServers": {
    "aigpu": {
      "command": "npx",
      "args": ["-y", "aigpu", "mcp"]
    }
  }
}
```

MCP tools let agents:

| Tool | What it does |
| --- | --- |
| `docs search` | Find guides by concept |
| `docs resolve` | Resolve a symbol to its package and doc path |
| `docs read` | Read a full guide or API reference |
| `examples search` | Find verified examples by topic |
| `examples show` | Inspect an example manifest and file list |
| `examples read` | Read one source file from a verified example |
| `examples download` | Scaffold a verified example into the active project |

```sh
npx aigpu mcp                  # start local stdio server
npx aigpu docs find agent      # search docs from CLI
npx aigpu docs cat agentAnimation  # print one doc
npx aigpu examples search "visual" # search examples
```

### 3. LLMs.txt compatibility

AIGpu generates structured documentation that LLMs can consume directly. The `aigpu docs` CLI outputs markdown with stable symbol paths, making it compatible with the [LLMs.txt](https://llmstxt.org/) convention for exposing documentation to language models.

```sh
npx aigpu docs find agent        # discover symbols
npx aigpu docs cat agentAnimation  # get a doc for context injection
npx aigpu docs grep -i replay    # search content
```

Agents can pipe these results into their context window for accurate code generation without hallucinated APIs.

### Recommended agent workflow

1. Agent inspects the package and loads only the needed reference docs.
2. Agent defines a serializable event contract before writing rendering code.
3. Agent implements the framework-free layer with deterministic tests.
4. Agent adds a thin adapter only when the lifecycle differs.
5. Agent runs `pnpm typecheck`, `pnpm test:fast`, and `pnpm bundle-check`.

## The TypeScript GPU layer

AIGpu is built on a typed `Gpu` context. Every resource flows from one `init()` call. No globals, no implicit state, no `any`.

### Core API

| Function | Purpose |
| --- | --- |
| `init()` | Request WebGPU adapter + device, return typed `Gpu` context |
| `surface(gpu, canvas)` | Create a canvas-backed render target (swapchain) |
| `target(gpu, opts)` | Create an offscreen texture target |
| `effect(gpu, wgsl)` | Full-screen fragment shader |
| `draw(gpu, opts)` | Geometry with custom vertex + fragment shaders |
| `frame(gpu, cb)` | One frame of GPU work |
| `frameLoop(gpu, cb)` | Continuous animation loop |
| `clock(gpu)` | Typed time source (`time`, `deltaTime`, `frameCount`) |

### Typed uniforms

Bindings are set by their WGSL names. The TypeScript layer infers structure from your `set()` calls:

```ts
const visual = effect(gpu, `
  struct Params { time: f32, color: vec3f }
  @group(0) @binding(0) var<uniform> params: Params;
  @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
    return vec4f(params.color, 1.0) * (sin(params.time) * 0.5 + 0.5);
  }
`);

visual.set({ params: { time: 0, color: [1.0, 0.4, 0.2] } });
// Only update time each frame — texel stays set from above
frameLoop(gpu, (frame) => {
  visual.set({ params: { time: clock(gpu).time } });
  frame.pass(canvasSurface, visual);
});
```

### WGSL modules

Import reusable shader functions across files without a bundler:

```ts
import { resolveShader } from "aigpu";
import shader from "./agent-orbit.wgsl"; // with Vite/webpack loader

const resolved = resolveShader(shader);
const visual = effect(gpu, resolved);
```

The `@aigpu/wgsl` package provides reflection, source maps, import resolution, minification, and Vite/webpack loaders.

### Node rendering

```ts
import { init, effect, target, frame } from "aigpu/node";

const gpu = await init();
const output = target(gpu, { size: [512, 512], format: "rgba8unorm" });
const shader = effect(gpu, WGSL_SOURCE);
frame(gpu, (f) => f.pass(output, shader));
const pixels = await output.read();
```

### Deterministic mock

```ts
import { createMockAdapter } from "aigpu/mock";

const adapter = createMockAdapter();
const gpu = await init({ adapter });
// Deterministic tests, no physical GPU required
```

## Agent animations

AIGpu provides a purpose-built abstraction for rendering agent state as GPU visuals.

### agentAnimation (lowest level)

```ts
import { agentAnimation, clock, frameLoop, init, surface } from "aigpu";

const gpu = await init();
const output = surface(gpu, canvas, { dpr: [1, 2] });
const agent = agentAnimation(gpu, {
  label: "planner-agent",
  initial: { status: "thinking", progress: 0.15, activity: 0.65 },
});
const time = clock(gpu);

frameLoop(gpu, (frame) => {
  agent.tick(time.time);
  frame.pass(output, agent.effect);
});

// Connect to your event source — WebSocket, queue, model, or human input
agent.set({ status: "working", progress: 0.62, activity: 0.9 });
```

Built-in state vocabulary: `idle`, `thinking`, `working`, `waiting`, `success`, `error`. Fields: `progress` `[0,1]`, `activity` `[0,1]`, `phase`, `speed`, RGB/RGBA color tuples.

### mountAgentCanvas (HTML lifecycle)

```ts
import { mountAgentCanvas } from "aigpu";

const controller = mountAgentCanvas(canvas, {
  initial: { status: "waiting", progress: 0.4, activity: 0.2 },
  visibility: { rootMargin: "200px" }, // IntersectionObserver gating
  autoResize: true,                     // ResizeObserver-based
  surface: { dpr: [1, 2] },
});

controller.set({ status: "working", progress: 0.75, activity: 0.9 });
await controller.ready;
controller.resize([1280, 720]);
controller.destroy(); // cleanup when canvas leaves the page
```

### Accessible status card

```html
<section class="agent-card" aria-labelledby="agent-title">
  <div class="agent-card__visual">
    <canvas id="agent" width="640" height="360" aria-label="Planner agent activity"></canvas>
  </div>
  <div class="agent-card__content">
    <h2 id="agent-title">Planner</h2>
    <p id="agent-status" role="status" aria-live="polite">Thinking</p>
    <progress id="agent-progress" max="1" value="0.15">15%</progress>
    <button id="approve" type="button">Approve next step</button>
  </div>
</section>
```

```ts
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const controller = mountAgentCanvasSelector("#agent", {
  initial: { status: "thinking", activity: reducedMotion ? 0.15 : 0.65, speed: reducedMotion ? 0 : 1 },
  surface: { dpr: [1, 2], autoResize: true },
});
```

## Framework adapters

AIGpu has one rendering contract. React, Vue, and Svelte adapters are optional lifecycle wrappers that call the same core API.

### React

```tsx
import { useAgentCanvas } from "@aigpu/react";

export function AgentView({ progress }: { progress: number }) {
  const { canvasRef, mounted, controller } = useAgentCanvas({
    label: "react-agent",
    initial: { status: "thinking", activity: 0.7 },
    patch: { status: "working", progress, activity: 0.9 },
  });

  return (
    <div role="status" aria-live="polite">
      <canvas ref={canvasRef} aria-label="React agent" />
      <span>{mounted ? `Working: ${Math.round(progress * 100)}%` : "Initializing"}</span>
      <button type="button" onClick={() => controller?.set({ status: "waiting" })}>Pause</button>
    </div>
  );
}
```

```sh
npm install aigpu @aigpu/react
```

### Vue 3

```vue
<script setup lang="ts">
import { ref, watch } from "vue";
import { useAgentCanvas } from "@aigpu/vue";

const status = ref<"thinking" | "working" | "success">("working");
const progress = ref(0.45);
const { canvas, controller, mounted } = useAgentCanvas({
  label: "vue-agent",
  initial: { status: "thinking", activity: 0.7 },
});

watch([status, progress], () => {
  controller.value?.set({ status: status.value, progress: progress.value });
});
</script>

<template>
  <div role="status" aria-live="polite">
    <canvas ref="canvas" aria-label="Vue agent" />
    <span>{{ mounted ? status : "Initializing" }}</span>
  </div>
</template>
```

```sh
npm install aigpu @aigpu/vue
```

### Svelte

```svelte
<script lang="ts">
  import { agentCanvas } from "@aigpu/svelte";

  let status = "thinking" as const;
  let progress = 0.25;
  $: options = {
    initial: { status: "thinking" as const, activity: 0.7 },
    patch: { status, progress, activity: status === "working" ? 0.9 : 0.2 },
  };
</script>

<div role="status" aria-live="polite">
  <canvas use:agentCanvas={options} aria-label="Svelte agent" />
  <span>{status}: {Math.round(progress * 100)}%</span>
</div>
```

```sh
npm install aigpu @aigpu/svelte
```

## Multi-agent state and replay

The `aigpu/tools` subpath provides UI-independent state infrastructure for multiple views, workers, or renderers consuming the same agent state.

### Store and registry

```ts
import { createAgentRegistry } from "aigpu/tools";

const registry = createAgentRegistry();
const planner = registry.ensure("planner", { status: "thinking" });
const researcher = registry.ensure("researcher", { status: "waiting" });

registry.subscribe((snapshot, event) => {
  console.log("changed", event.agentId, snapshot.revision);
});

planner.set({ status: "working", progress: 0.4, activity: 0.9 });
researcher.set({ status: "working", progress: 0.2 });
```

### Record and replay

```ts
import { recordAgentEvents, replayAgentEvents } from "aigpu/tools";

// Record
const recorder = recordAgentEvents((listener) =>
  registry.subscribe((_snapshot, event) => listener(event))
);
recorder.stop();
const session = recorder.toJSON(true); // non-sensitive visual events only

// Replay
const replay = replayAgentEvents(JSON.parse(session), (event) => {
  registry.ensure(event.agentId).dispatch(event);
});
replay.play();
// replay.pause(); replay.play(); replay.stop();
```

The same event feeds `controller.set()`, React hooks, Vue refs, Svelte actions, terminal views, WebSocket bridges, or test fixtures.

## Visual gallery

Eight GPU animation recipes — composable art direction, not fixed product branding:

| Recipe | Style |
| --- | --- |
| `anime-hologram` | Anime holographic glow |
| `enterprise-orbit` | Enterprise orbit rings |
| `psychedelic-neural` | Psychedelic neural pathways |
| `calm-ocean` | Calm ocean waves |
| `success-confetti` | Success celebration |
| `error-glitch` | Error glitch distortion |
| `minimal-focus` | Minimal focus pulse |
| `cosmic-constellation` | Cosmic constellation drift |

```sh
pnpm --filter @aigpu/example-visual-gallery test
```

More examples:

| Example | What it demonstrates |
| --- | --- |
| [Agent cockpit](./examples/agent-cockpit) | Framework-free agent canvas contract |
| [Framework integrations](./examples/framework-integrations) | HTML, React, Vue, Svelte mounting |
| [Operations dashboard](./examples/agent-ops-dashboard) | Multi-agent registry as stable cards |
| [Event replay](./examples/event-replay) | Serializable session recording and replay |
| [Transmission](./examples/transmission) | Reusable shader-oriented visual examples |

## CLI and tooling

```sh
npx aigpu docs find agent           # search doc symbols
npx aigpu docs cat agentAnimation   # print one doc
npx aigpu docs grep -i replay       # search content
npx aigpu examples search "visual"  # search examples
npx aigpu examples pull agent-cockpit --out ./tmp  # download an example
npx aigpu check ./shader.wgsl --require-validation # validate WGSL
npx aigpu doctor                    # diagnose GPU environment
npx aigpu mcp                       # start MCP stdio server
```

## Architecture

```text
Application model / local agent / worker / queue / WebSocket
                         |
                  AgentEvent / Patch
                         |
             aigpu/tools: store + registry
                         |
        HTML controller or optional framework adapter
                  aigpu/dom | React | Vue | Svelte
                         |
          agentAnimation / effect / draw / scene
                         |
              WebGPU device, targets, and WGSL
```

| Layer | Owns | Does not own |
| --- | --- | --- |
| Application | Models, prompts, tools, queues, persistence | GPU resource lifetime |
| `aigpu/tools` | Serializable state, registry, recording, replay | UI framework or transport |
| DOM/adapters | Mounting, lifecycle, cleanup, resize, accessibility | Agent orchestration |
| AIGpu runtime | GPU resources, effects, draws, frames, targets | Model invocation or hosted state |
| WGSL | Pixel evaluation and reusable shader functions | Application semantics |

## Workspace packages

| Package | Role |
| --- | --- |
| [`aigpu`](./packages/aigpu-api) | Browser, Node, mock, scene, DOM, agent-animation, and tools API |
| [`@aigpu/cli`](./packages/aigpu-cli) | Offline docs, WGSL checks, examples, diagnostics, MCP stdio |
| [`@aigpu/core`](./packages/core) | Device, buffer, texture, bind-group, uniform, render-bundle wrappers |
| [`@aigpu/wgsl`](./packages/wgsl) | WGSL reflection, import resolution, minification, loaders |
| [`@aigpu/wgsl-std`](./packages/wgsl-std) | Reusable color, hash, noise, sampling, fullscreen WGSL modules |
| [`@aigpu/adapter-node`](./packages/adapter-node) | Headless Node adapter (Dawn WebGPU) |
| [`@aigpu/adapter-mock`](./packages/adapter-mock) | Deterministic mock adapter for tests and CI |
| [`@aigpu/render`](./packages/render) | Inspection, editing, utility, and performance helpers |
| [`@aigpu/react`](./packages/aigpu-react) | Optional React lifecycle hook |
| [`@aigpu/vue`](./packages/aigpu-vue) | Optional Vue 3 composable |
| [`@aigpu/svelte`](./packages/aigpu-svelte) | Svelte action |

## Performance checklist

- Keep the core entrypoint small; import `aigpu/tools` only where state infrastructure is needed.
- Update compact uniforms rather than rebuilding effects or pipelines.
- Warm important pipelines before the first user-visible action.
- Use `frameLoop()` for animation; use an external ticker for simulation or replay.
- Cap device-pixel ratio for large dashboards.
- Test device loss, canvas resize, hidden tabs, reduced motion, SSR, and component unmount.
- Do not persist sensitive prompts or model output in visual event recordings.
- Run `pnpm bundle-check` and review budget changes.

## Development

Requirements: Node.js 22, pnpm 9, WebGPU-capable browser. No cloud account or vendor credential.

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test:fast
pnpm docs:generate
pnpm check:skill-drift
pnpm check:filenames
pnpm bundle-check
node scripts/validate-agent-integrations.mjs
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the repository workflow. For branch protection, release sequencing, and CI, read [PRODUCTION.md](./PRODUCTION.md).

## License

MIT. See [`LICENSE`](./LICENSE).

---

[1]: https://www.w3.org/TR/webgpu/ "WebGPU specification"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API "MDN WebGPU API"
