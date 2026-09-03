# aigpu

> GPU-accelerated TypeScript layer for AI agent animations. Framework-free, offline-first, agent-native.

AIGpu is a typed WebGPU/WGSL runtime that turns serializable agent state into GPU-rendered visuals. It provides an explicit `Gpu` context, typed uniforms, agent animation primitives, multi-agent state tools, event replay, and optional React/Vue/Svelte adapters. No hosted dashboard. No proprietary SDK. No API key.

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

## Install

```sh
npm install aigpu
npm install --save-dev @webgpu/types
```

## What's inside

| Import path | What you get |
| --- | --- |
| `aigpu` | Browser API: `init`, `surface`, `effect`, `draw`, `frame`, `frameLoop`, `agentAnimation`, `mountAgentCanvas`, `clock` |
| `aigpu/tools` | Multi-agent state: `createAgentStore`, `createAgentRegistry`, `recordAgentEvents`, `replayAgentEvents` |
| `aigpu/node` | Headless Node rendering via Dawn WebGPU |
| `aigpu/mock` | Deterministic mock adapter for tests and CI |
| `aigpu/scene` | Geometry, camera, lighting, and material helpers |
| `aigpu/dom` | `mountAgentCanvas` with IntersectionObserver visibility gating and auto-resize |

## The TypeScript GPU layer

Everything starts from one typed context:

```ts
import { init, surface, effect, frameLoop, clock } from "aigpu";

const gpu = await init();                          // typed Gpu context
const canvasSurface = surface(gpu, canvas);        // canvas swapchain
const gradient = effect(gpu, `
  struct Params { time: f32, color: vec3f }
  @group(0) @binding(0) var<uniform> params: Params;
  @fragment fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
    return vec4f(params.color, 1.0) * (sin(params.time) * 0.5 + 0.5);
  }
`);
const time = clock(gpu);

gradient.set({ params: { time: 0, color: [1.0, 0.4, 0.2] } });
frameLoop(gpu, (frame) => {
  gradient.set({ params: { time: time.time } });
  frame.pass(canvasSurface, gradient);
});
```

Bindings are set by their WGSL names. `set()` writes immediately; the render loop only updates what changes. No global uniforms, no implicit state, no `any`.

## Agent animations

`agentAnimation()` renders agent state as GPU visuals. The built-in vocabulary is `idle`, `thinking`, `working`, `waiting`, `success`, `error`. Fields: `progress` `[0,1]`, `activity` `[0,1]`, `phase`, `speed`, RGB/RGBA color tuples.

```ts
const agent = agentAnimation(gpu, {
  label: "planner-agent",
  initial: { status: "thinking", progress: 0.15, activity: 0.65 },
});

// Connect to your event source — WebSocket, queue, model, or human input
agent.set({ status: "working", progress: 0.62, activity: 0.9 });
agent.tick(time.time);
```

`mountAgentCanvas()` adds HTML lifecycle management with IntersectionObserver visibility gating and ResizeObserver auto-resize:

```ts
import { mountAgentCanvas } from "aigpu";

const controller = mountAgentCanvas(canvas, {
  initial: { status: "waiting", progress: 0.4 },
  visibility: { rootMargin: "200px" },
  autoResize: true,
});

controller.set({ status: "working", progress: 0.75 });
await controller.ready;
controller.destroy(); // cleanup when canvas leaves the page
```

## Framework adapters

React, Vue, and Svelte adapters are optional peer packages. They call the same core API — just lifecycle wrappers.

```sh
npm install aigpu @aigpu/react    # React
npm install aigpu @aigpu/vue      # Vue 3
npm install aigpu @aigpu/svelte   # Svelte
```

## Multi-agent state and replay

```ts
import { createAgentRegistry, recordAgentEvents, replayAgentEvents } from "aigpu/tools";

const registry = createAgentRegistry();
const planner = registry.ensure("planner", { status: "thinking" });
const researcher = registry.ensure("researcher", { status: "waiting" });

// Record a session (non-sensitive visual events only)
const recorder = recordAgentEvents((listener) =>
  registry.subscribe((_snap, event) => listener(event))
);
recorder.stop();
const session = recorder.toJSON(true);

// Replay into any renderer
replayAgentEvents(JSON.parse(session), (event) => {
  registry.ensure(event.agentId).dispatch(event);
});
```

## Headless Node

```ts
import { init, effect, target, frame } from "aigpu/node";

const gpu = await init();
const output = target(gpu, { size: [256, 256], format: "rgba8unorm" });
effect(gpu, `@fragment fn main() -> @location(0) vec4f { return vec4f(0.25, 0.5, 0.75, 1.0); }`).draw(output);
const pixels = await output.read(); // RGBA bytes
gpu.dispose();
```

## Deterministic mock

```ts
import { createMockAdapter } from "aigpu/mock";

const adapter = createMockAdapter();
const gpu = await init({ adapter });
// Deterministic tests, no physical GPU required
```

## CLI and MCP

```sh
npx aigpu docs find agent           # search doc symbols
npx aigpu docs cat agentAnimation   # read one doc
npx aigpu check ./shader.wgsl       # validate WGSL
npx aigpu doctor                    # diagnose GPU environment
npx aigpu mcp                       # start MCP stdio server
npx aigpu examples search "visual"  # search examples
```

Connect coding agents to AIGpu docs via MCP (Model Context Protocol):

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

## Agent skills

Teach coding agents (Claude Code, OpenCode, Codex, Cursor, Copilot, Cline, Gemini CLI) the AIGpu API:

```sh
npx -y skills add hautlys/AIGpu --skill aigpu-agent-toolkit --agent '*' -y
```

## WGSL modules

`@aigpu/wgsl` provides reflection, source maps, import resolution, minification, and Vite/webpack loaders. `@aigpu/wgsl-std` provides reusable hash, noise, color, and fullscreen modules.

```ts
import shader from "./agent-orbit.wgsl";
import { effect, init } from "aigpu";

const gpu = await init();
const visual = effect(gpu, shader);
```

## Links

- GitHub: https://github.com/hautlys/AIGpu
- Docs: https://hautlys.github.io/AIGpu/
- Issues: https://github.com/hautlys/AIGpu/issues

## License

MIT. See [`LICENSE`](./LICENSE).
