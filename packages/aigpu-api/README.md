# aigpu

AIGpu is an MIT-licensed TypeScript runtime for **GPU animations for AI agents**. It provides a small WebGPU API, typed WGSL modules, a deterministic mock, and an explicit bridge from orchestration state to pixels. It does not call a model, require an API key, or depend on a hosted control plane.

## Install

```sh
pnpm add aigpu
pnpm add -D @webgpu/types
```

## Agent animation

```ts
import { agentAnimation, clock, frameLoop, init, surface } from "aigpu";

const gpu = await init();
const output = surface(gpu, document.querySelector("canvas")!);
const animation = agentAnimation(gpu, {
  label: "researcher",
  initial: { status: "thinking", progress: 0.1 },
});
const time = clock(gpu);

frameLoop(gpu, (frame) => {
  animation.tick(time.time);
  frame.pass(output, animation.effect);
});

// Connect this to your own local model, queue, WebSocket, or event bus.
animation.set({ status: "working", progress: 0.72, activity: 0.9 });
```

The built-in states are `idle`, `thinking`, `working`, `waiting`, `success`, and `error`. `progress` and `activity` are normalized to `[0, 1]`; colors are RGBA tuples. `animation.state` is a defensive snapshot, `reset()` restores the initial state, and `tick()` accepts an external clock for deterministic renders.

## Framework-agnostic mounting

Use `mountAgentCanvas()` or `mountAgentCanvasSelector()` for plain HTML/JavaScript. Optional lifecycle adapters are published separately as `@aigpu/react`, `@aigpu/vue`, and `@aigpu/svelte`; each delegates to the same `ready`/`set`/`resize`/`destroy` controller without adding a framework dependency to this package.

For multi-agent state, import `createAgentStore`, `createAgentRegistry`, `recordAgentEvents`, and `replayAgentEvents` from `aigpu/tools`. These utilities are UI-, GPU-, transport-, and provider-agnostic.

## Core runtime

```ts
import { draw, frame, init, target } from "aigpu/node";

const gpu = await init();
const output = target(gpu, { size: [256, 256], format: "rgba8unorm" });
const triangle = draw(gpu, { shader: triangleShader });
frame(gpu, (current) => current.pass(output, triangle));
const pixels = await output.read();
gpu.dispose();
```

The same API runs in the browser, headless Node through open Dawn bindings, and `aigpu/mock` for deterministic tests.

## WGSL and tooling

WGSL modules are plain text modules with typed imports and exports. Use `@aigpu/wgsl/loader-vite` or `@aigpu/wgsl/loader-webpack` with an open-source bundler, or use `@aigpu/wgsl/runtime` directly from Node. The bundled `@aigpu/cli` provides offline docs, shader checks, local example search/copy, diagnostics, and MCP stdio.

```sh
npx aigpu docs cat agentAnimation
npx aigpu examples search "webgpu"
npx aigpu examples pull agent-cockpit --out ./agent-cockpit
npx aigpu check ./agent.wgsl --require-validation
npx aigpu mcp
```

For the full reference, run `npx aigpu docs find <query>`. The catalog is read from the checkout's `examples/` directory or `AIGPU_EXAMPLES_DIR`; no network request is made.

## Development

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test:fast
pnpm check:skill-drift
```

See the repository [CONTRIBUTING.md](https://github.com/hautlys/AIGpu/blob/main/CONTRIBUTING.md) for the local workflow.

## License and provenance

AIGpu is distributed under the MIT license. The repository preserves the original upstream copyright notice for the portions inherited from `vgpu` and identifies the fork changes in `NOTICE.md`.
