# AIGpu

> **GPU animations for AI agents — framework-free, offline-first, and built for real products.**

AIGpu turns serializable agent state into GPU-rendered visuals. It provides an explicit WebGPU/WGSL runtime, a small agent-animation layer, a DOM lifecycle controller, optional React/Vue/Svelte adapters, multi-agent state tools, deterministic event replay, offline documentation, and portable skills for coding agents.

AIGpu is designed for teams that want expressive agent interfaces without adopting a hosted dashboard, a proprietary AI SDK, a vendor-specific UI runtime, or a remote example catalog.

> **Disclaimer and provenance:** AIGpu is a community-maintained, MIT-licensed fork and independent evolution of [Vercel Labs' original `vgpu` project](https://github.com/vercel-labs/vgpu). It is **not an official Vercel product**, is not sponsored or endorsed by Vercel, and does not require Vercel services. The fork removes the original repository's Vercel-specific application, hosted documentation, analytics, blob, and deployment ties, while preserving applicable upstream notices in [`LICENSE`](./LICENSE) and documenting fork provenance in [`NOTICE.md`](./NOTICE.md). Review the repository history and each dependency license before redistributing a derivative.

The community goal is broader than a rename: AIGpu keeps the useful low-level WebGPU/WGSL foundation, then adds an agent-animation API, framework-neutral lifecycle control, optional adapters, serializable state tools, deterministic replay, local tooling, open examples, and a static showcase. “Model agnostic” means that AIGpu does not select, call, authenticate, or depend on an AI model provider; it renders the plain events and patches supplied by your application.

| Property | AIGpu behavior |
| --- | --- |
| Rendering | WebGPU and WGSL with explicit resources and frame submission |
| Agent state | Plain serializable patches and event envelopes |
| UI integration | HTML/JavaScript first; React, Vue, and Svelte are optional adapters |
| Runtime targets | Browser, headless Node, deterministic mock, workers, and custom lifecycles |
| AI ownership | Your application owns models, queues, tools, transports, and orchestration |
| Distribution | MIT-licensed, open-source, offline-first, and free of hosted control planes |
| Agent tooling | Local CLI, stdio MCP, portable Agent Skills, plugin manifest, and validation scripts |

## Contents

- [Why AIGpu](#why-aigpu)
- [Technical highlights versus original `vgpu`](#technical-highlights-versus-original-vgpu)
- [Install](#install)
- [First visual in the browser](#first-visual-in-the-browser)
- [Modern UI/UX patterns](#modern-uiux-patterns)
- [Framework integrations](#framework-integrations)
- [Multi-agent state and replay](#multi-agent-state-and-replay)
- [More working examples](#more-working-examples)
- [Core rendering and WGSL](#core-rendering-and-wgsl)
- [Node, mock, and testing](#node-mock-and-testing)
- [CLI, MCP, skills, and plugins](#cli-mcp-skills-and-plugins)
- [GitHub Pages showcase](#github-pages-showcase)
- [Architecture](#architecture)
- [Performance and production checklist](#performance-and-production-checklist)
- [Workspace packages](#workspace-packages)
- [Roadmap and next implementations](#roadmap-and-next-implementations)
- [Development](#development)
- [Project status](#project-status)
- [License and provenance](#license-and-provenance)

## Why AIGpu

Most agent interfaces begin with text, badges, or DOM transitions. AIGpu treats an agent's visual state as a compact GPU signal. JavaScript updates only the data that changed; the shader evaluates the pulse, halo, ring, progress arc, palette, and time-dependent motion.

This separation is intentional. AIGpu does not know whether the state came from a local model, a queue, a WebSocket, a worker, a database, or a human approval step. The application owns that boundary. AIGpu owns rendering, lifecycle, validation, and deterministic visual behavior.

> **Core principle:** transport state as plain data, render it through the smallest suitable entrypoint, and keep framework adapters thin.

## Technical highlights versus original `vgpu`

The comparison below describes the direction of this fork, not a claim that every upstream implementation detail has disappeared from inherited low-level code. The source of truth is the current AIGpu repository and its tests.

| Area | Original `vgpu` direction | AIGpu direction and differential |
| --- | --- | --- |
| Product boundary | Vercel Labs-originated WebGPU library and repository tooling | Independent community fork with no runtime requirement for Vercel, Next.js, Vercel Blob, Vercel Analytics, or a Vercel account |
| Agent semantics | General GPU primitives | `agentAnimation()` with statuses, progress, activity, phases, deterministic palettes, and agent-oriented WGSL effects |
| Frameworks | Core WebGPU API | Framework-neutral DOM/canvas controller plus optional React, Vue 3, and Svelte actions; framework packages remain separate and do not leak into the core |
| AI/model coupling | Rendering library context | Model/provider agnostic: local models, hosted APIs, queues, WebSockets, workers, MCP tools, or human workflows can emit the same serializable patches |
| State and orchestration | Application-specific | `AgentStore`, `AgentRegistry`, event envelopes, recording, and deterministic replay in `aigpu/tools`, without owning transport, prompts, permissions, or model calls |
| Examples | Library-oriented examples | An offline visual gallery covering anime, enterprise, aesthetic, psychedelic, minimal-focus, fullscreen, geometry, multi-agent, replay, and framework usage |
| Tooling | Repository-specific development flow | Local CLI, WGSL validation, mock adapter, Node/Dawn validation, stdio MCP, portable Agent Skills, plugin metadata, and CI checks |
| Showcase | Hosted/docs-oriented presentation | Dependency-free GitHub Pages site with live state controls, Canvas2D fallback, copyable HTML/React/Vue/Svelte snippets, source links, and model-agnostic event examples |
| Operations | Vendor deployment may be present in the upstream repository | GitHub Actions for CI, Pages, security, release verification, SBOM/checksums, and npm OIDC Trusted Publishing; local build/test remains usable offline |

### What “fully agnostic” is—and is not

The agnostic contract is functional at three boundaries. **Framework agnostic** means the rendering contract is implemented first in `packages/aigpu-api/src/dom.ts`; React and Vue wrap it with lifecycle hooks, while Svelte exposes a standard action and imports no Svelte runtime. **Model agnostic** means the runtime accepts plain `AgentAnimationPatch` and event data and never imports an LLM SDK or contacts a model provider. **Deployment agnostic** means the core can be built and tested locally and the showcase is static; GitHub Pages and npm are release options, not runtime dependencies.

This does not mean that every environment supports every rendering capability. WebGPU still requires a compatible browser or adapter; SSR must defer canvas creation until the client; and a framework adapter requires that framework in the host application. Browsers without WebGPU can view the showcase's Canvas2D fallback, but that fallback is a showcase presentation path—not a replacement for the WebGPU renderer. These distinctions are tested and documented rather than hidden behind automatic provider detection.

## Install

### Browser application

```sh
npm install aigpu
npm install --save-dev @webgpu/types
```

### React

```sh
npm install aigpu @aigpu/react react
```

### Vue 3

```sh
npm install aigpu @aigpu/vue vue
```

### Svelte 3, 4, or 5

```sh
npm install aigpu @aigpu/svelte
```

### Local development

```sh
pnpm install
pnpm build
```

AIGpu does not install React, Vue, Svelte, a router, a CSS framework, a model SDK, or an analytics service as part of the core runtime.

## First visual in the browser

The smallest complete browser integration uses `init()`, `surface()`, `agentAnimation()`, and `frameLoop()`:

```ts
import { agentAnimation, clock, frameLoop, init, surface } from "aigpu";

const canvas = document.querySelector<HTMLCanvasElement>("#agent")!;
const gpu = await init();
const output = surface(gpu, canvas, { dpr: [1, 2] });
const agent = agentAnimation(gpu, {
  label: "planner-agent",
  initial: {
    status: "thinking",
    progress: 0.15,
    activity: 0.65,
  },
});
const time = clock(gpu);

frameLoop(gpu, (frame) => {
  agent.tick(time.time);
  frame.pass(output, agent.effect);
});

// Connect this to your own event source.
agent.set({
  status: "working",
  progress: 0.62,
  activity: 0.9,
});

window.addEventListener("pagehide", () => gpu.dispose(), { once: true });
```

The built-in state vocabulary is `idle`, `thinking`, `working`, `waiting`, `success`, and `error`. `progress` and `activity` are normalized to `[0, 1]`; `phase` and `speed` remain finite and deterministic; colors use RGB/RGBA tuples in `[0, 1]`.

## Modern UI/UX patterns

A GPU animation is an enhancement, not the only status channel. A production agent surface should combine visual state with readable text, accessible semantics, keyboard-safe controls, and a reduced-motion path.

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
import { mountAgentCanvasSelector } from "aigpu";

const status = document.querySelector<HTMLElement>("#agent-status")!;
const progress = document.querySelector<HTMLProgressElement>("#agent-progress")!;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const controller = mountAgentCanvasSelector("#agent", {
  label: "planner-agent",
  initial: { status: "thinking", activity: reducedMotion ? 0.15 : 0.65, speed: reducedMotion ? 0 : 1 },
  surface: { dpr: [1, 2], autoResize: true },
});

function renderStatus(patch: { status?: string; progress?: number }) {
  controller.set(patch);
  if (patch.status) status.textContent = patch.status;
  if (patch.progress !== undefined) progress.value = patch.progress;
}

document.querySelector("#approve")?.addEventListener("click", () => {
  renderStatus({ status: "working", progress: 0.5 });
});

window.addEventListener("pagehide", () => controller.destroy(), { once: true });
```

### UX rules that scale

| Concern | Recommended behavior |
| --- | --- |
| Meaning | Pair every animation with a text state or semantic label. |
| Color | Do not communicate `error`, `success`, or `waiting` by color alone. |
| Motion | Read `prefers-reduced-motion`; reduce `speed` and `activity` or use a static state. |
| Progress | Use a native `progress` element or an equivalent accessible value. |
| Trust | Show explainable states such as `waiting for approval`, not inferred private model reasoning. |
| Failure | Preserve the last useful state and expose retry/recovery controls. |
| Loading | Render a stable placeholder before `controller.ready` resolves. |
| Cleanup | Call `destroy()` when a canvas leaves the page or component tree. |
| Resize | Let the controller observe the surface or call `resize()` from a custom lifecycle. |
| Performance | Keep text and interaction in the UI layer; keep continuous pixels on the GPU. |

## Framework integrations

AIGpu has one rendering contract and several optional lifecycle adapters. The core package does not import a framework.

### Plain HTML/JavaScript

```ts
import { mountAgentCanvas } from "aigpu";

const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
const agent = mountAgentCanvas(canvas, {
  initial: { status: "waiting", progress: 0.4, activity: 0.2 },
});

agent.set({ status: "working", progress: 0.75, activity: 0.9 });
await agent.ready;
agent.resize([1280, 720]);
agent.destroy();
```

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
      <button type="button" onClick={() => controller?.set({ status: "waiting" })}>
        Pause
      </button>
    </div>
  );
}
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

For the complete SSR, hydration, accessibility, reduced-motion, and shared-device guidance, read the [framework integration guide](./docs/topics/framework-integrations.docs.md).

## Multi-agent state and replay

The `aigpu/tools` subpath provides UI-independent state infrastructure. It is useful when several views, workers, transports, or renderers consume the same agent state.

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

### Record a session

```ts
import { recordAgentEvents } from "aigpu/tools";

const recorder = recordAgentEvents((listener) =>
  registry.subscribe((_snapshot, event) => listener(event))
);

// Run the workflow, then persist only approved, non-sensitive visual events.
recorder.stop();
const session = recorder.toJSON(true);
```

### Replay into any renderer

```ts
import { replayAgentEvents } from "aigpu/tools";

const replay = replayAgentEvents(JSON.parse(session), (event) => {
  if (!event.agentId) return;
  registry.ensure(event.agentId).dispatch(event);
});

replay.play();
// replay.pause(); replay.play(); replay.stop();
```

The same event can feed `controller.set()`, a React hook, a Vue ref, a Svelte action, a terminal view, a WebSocket bridge, or a test fixture. Read the [agent state tools guide](./packages/aigpu-api/src/agent-tools.docs.md) for event contracts and retention guidance.

## More working examples

| Example | What it demonstrates | Run it |
| --- | --- | --- |
| [Agent cockpit](./examples/agent-cockpit) | Framework-free agent canvas contract | Read the README |
| [Visual Gallery](./examples/visual-gallery) | Eight anime, enterprise, psychedelic, calm, glitch, minimal, celebration, and cosmic recipes | `pnpm --filter @aigpu/example-visual-gallery test` |
| [Framework integrations](./examples/framework-integrations) | HTML, React, Vue, and Svelte mounting | Use the source examples |
| [Operations dashboard](./examples/agent-ops-dashboard) | Multi-agent registry projected into stable cards | `pnpm --filter @aigpu/example-agent-ops-dashboard test` |
| [Event replay](./examples/event-replay) | Serializable session recording and replay | `pnpm --filter @aigpu/example-event-replay test` |
| [Fullscreen example](./examples/by-example-s02-fullscreen) | Minimal low-level fullscreen effect | Run its package test |
| [Transmission](./examples/transmission) | Reusable shader-oriented visual examples | Inspect the WGSL sources |

The visual gallery includes `anime-hologram`, `enterprise-orbit`, `psychedelic-neural`, `calm-ocean`, `success-confetti`, `error-glitch`, `minimal-focus`, and `cosmic-constellation`. Treat recipes as composable art direction, not as fixed product branding.

## Core rendering and WGSL

AIGpu is explicit at the lower level. Use `effect()` for a fullscreen fragment shader, `draw()` for geometry, `frame()` or `frameLoop()` for submission, and `surface()` or `target()` for outputs.

```ts
import { clock, effect, frameLoop, init, surface } from "aigpu";

const gpu = await init();
const output = surface(gpu, canvas, { dpr: [1, 2] });
const visual = effect(gpu, /* wgsl */ `
  @fragment
  fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
    return vec4f(uv.x, uv.y, 0.8, 1.0);
  }
`, { label: "gradient" });
const time = clock(gpu);

frameLoop(gpu, (frame) => {
  visual.set({ params: { time: time.time } });
  frame.pass(output, visual);
});
```

Use WGSL modules when a shader is shared across products:

```ts
import shader from "./agent-orbit.wgsl";
import { effect, init, surface } from "aigpu";

const gpu = await init();
const visual = effect(gpu, shader);
```

The `@aigpu/wgsl` package provides reflection, source maps, import resolution, minification, runtime resolution, and Vite/Webpack loaders. The [WGSL workflow guide](./docs/topics/shader-workflow.docs.md) describes the recommended authoring and validation sequence.

## Node, mock, and testing

For headless rendering, use the Node entrypoint and an explicit target:

```ts
import { draw, frame, init, target } from "aigpu/node";

const gpu = await init();
const output = target(gpu, { size: [256, 256], format: "rgba8unorm" });
const triangle = draw(gpu, { shader: TRIANGLE_WGSL });

frame(gpu, (current) => current.pass(output, triangle));
const pixels = await output.read();
gpu.dispose();
```

For tests that must not require a physical adapter:

```ts
import { createMockAdapter } from "aigpu/mock";

const adapter = createMockAdapter();
// Use it with init({ adapter }) in deterministic unit tests.
```

Validate a shader through the local CLI:

```sh
npx aigpu check ./agent-orbit.wgsl --require-validation
```

## CLI, MCP, skills, and plugins

AIGpu includes an offline-first CLI for documentation, examples, WGSL checks, diagnostics, and local MCP stdio:

```sh
npx aigpu docs find agent
npx aigpu docs cat agentAnimation
npx aigpu docs grep -i replay
npx aigpu examples search "visual"
npx aigpu examples pull agent-cockpit --out ./tmp/agent-cockpit
npx aigpu check ./shader.wgsl --require-validation
npx aigpu mcp
```

The local example catalog reads the checkout's `examples/` directory or `AIGPU_EXAMPLES_DIR`. Normal documentation and example commands do not require a network connection.

### Install the portable coding-agent skill

```sh
npx -y skills add hautlys/AIGpu \
  --skill aigpu-agent-toolkit \
  -a claude-code \
  -a opencode \
  -a codex \
  -y
```

Install to every agent supported by the installed CLI:

```sh
npx -y skills add hautlys/AIGpu --skill aigpu-agent-toolkit --agent '*' -y
```

From this checkout:

```sh
node scripts/install-agent-skills.mjs
node scripts/validate-agent-integrations.mjs
```

Read the [Agent Skills and plugins guide](./docs/topics/agent-skills.docs.md) for project/global scope, copy mode, plugin metadata, and CI usage.

## GitHub Pages showcase

The repository includes a dependency-free static showcase in [`website/`](./website). It presents the live agent-state playground, copyable HTML/React/Vue/Svelte snippets, visual gallery recipes, multi-agent registry examples, replay patterns, source links, and the framework-agnostic architecture. The showcase uses a Canvas2D preview fallback so it remains viewable on browsers without WebGPU; the real WebGPU/WGSL source examples remain linked from the repository.

Run it locally with:

```sh
python3 -m http.server 4173 --directory website
```

The [`pages.yml`](./.github/workflows/pages.yml) workflow publishes `website/` through GitHub Actions. Enable GitHub Pages with **Source: GitHub Actions** in repository settings. Pushes to `main` that change the showcase deploy automatically at `https://hautlys.github.io/AIGpu/`.

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

The ownership boundaries are explicit:

| Layer | Owns | Does not own |
| --- | --- | --- |
| Application | Models, prompts, tools, queues, persistence, permissions | GPU resource lifetime |
| `aigpu/tools` | Serializable state, registry, recording, replay | UI framework or transport |
| DOM/adapters | Mounting, lifecycle, cleanup, resize, accessibility hooks | Agent orchestration |
| AIGpu runtime | GPU resources, effects, draws, frames, targets | Model invocation or hosted state |
| WGSL | Pixel evaluation and reusable shader functions | Application semantics |

## Performance and production checklist

Before shipping a visual agent surface:

- Keep the core entrypoint small. Import `aigpu/tools` only where state infrastructure is needed.
- Keep framework adapters optional and avoid recreating a controller for every patch.
- Update compact uniforms rather than rebuilding effects or pipelines.
- Warm important pipelines before the first user-visible action when startup latency matters.
- Use `frameLoop()` for normal rendering and an external ticker for simulation, XR, or replay control.
- Prefer stable identities, render bundles, and explicit targets when a scene has repeated geometry.
- Cap device-pixel ratio for large dashboards and wall displays.
- Measure CPU encoding, pipeline warm-up, bind-group churn, target memory, and shader cost separately.
- Use `@aigpu/render/perf` for frame-time and pixel-diff measurements where appropriate.
- Test device loss, canvas resize, hidden tabs, reduced motion, SSR, and component unmount.
- Do not persist sensitive prompts or model output in visual event recordings.
- Run `pnpm bundle-check` and review budget changes instead of silently increasing ceilings.

Relevant guides include [performance model](./docs/topics/performance-model.docs.md), [measuring](./docs/topics/measuring.docs.md), [browser testing](./docs/topics/browser-testing.docs.md), and [shader debugging](./docs/topics/shader-debugging.docs.md).

## Workspace packages

| Package | Role |
| --- | --- |
| [`aigpu`](./packages/aigpu-api) | Public browser, Node, mock, scene, DOM, agent-animation, and tools API. |
| [`@aigpu/cli`](./packages/aigpu-cli) | Offline docs, WGSL checks, examples, diagnostics, snapshots, and MCP stdio. |
| [`@aigpu/core`](./packages/core) | Low-level device, buffer, texture, bind-group, uniform, and render-bundle wrappers. |
| [`@aigpu/wgsl`](./packages/wgsl) | WGSL reflection, import resolution, minification, runtime resolution, and loaders. |
| [`@aigpu/wgsl-std`](./packages/wgsl-std) | Reusable color, hash, noise, sampling, and fullscreen WGSL modules. |
| [`@aigpu/adapter-node`](./packages/adapter-node) | Headless Node adapter using open Dawn WebGPU bindings. |
| [`@aigpu/adapter-mock`](./packages/adapter-mock) | Deterministic mock adapter for tests and CI. |
| [`@aigpu/render`](./packages/render) | Optional inspection, editing, utility, and performance helpers. |
| [`@aigpu/react`](./packages/aigpu-react) | Optional React lifecycle hook. |
| [`@aigpu/vue`](./packages/aigpu-vue) | Optional Vue 3 composable. |
| [`@aigpu/svelte`](./packages/aigpu-svelte) | Svelte action without a runtime dependency in the adapter. |

## Roadmap and next implementations

The following roadmap is intentionally implementation-oriented. It distinguishes stable capabilities from proposed work and avoids promising a hosted service or a framework dependency.

For the contribution contract, staged acceptance criteria, and explicit non-goals, read the dedicated [roadmap document](./docs/topics/roadmap.docs.md).

### Near term

| Initiative | Outcome | Acceptance signal |
| --- | --- | --- |
| Timeline editor primitives | Scrubbable, serializable agent-event timelines for demos and debugging | A framework-free timeline model with virtual-clock tests |
| More visual recipes | Additional accessible styles for finance, education, robotics, health dashboards, and low-power devices | Each recipe has WGSL validation, reduced-motion behavior, and a documented event sequence |
| Agent graph overlays | GPU-friendly relationships between agents, tools, queues, and approvals | Stable graph data contract with scene and fullscreen examples |
| Better diagnostics | Human-readable validation for invalid patches, missing canvas capabilities, and device loss | CLI diagnostics with actionable fix-its and tests |
| Visual regression fixtures | Deterministic screenshots or pixel diffs for core recipes | CI-safe mock or headless fixtures with controlled thresholds |

### Medium term

| Initiative | Outcome | Design constraint |
| --- | --- | --- |
| First-class timeline/replay package | Import/export versioned sessions without coupling to a database | JSON-compatible schema, migration hooks, no provider-specific payloads |
| Shared-device overlay API | Compose agent overlays with existing 2D/3D scenes | Explicit device ownership and target compatibility |
| Worker and OffscreenCanvas examples | Move rendering away from the main thread where supported | Graceful fallback to main-thread HTML canvas |
| Plugin command recipes | Let coding agents scaffold animations, adapters, tests, and docs consistently | Generated code remains local, inspectable, and license-compatible |
| Theme tokens | Define semantic palette and motion tokens across recipes | Tokens map to uniforms without hiding shader cost |

### Long term

| Initiative | Outcome | Risk to manage |
| --- | --- | --- |
| WebGPU capability profiles | Select visual quality by adapter/device capability | Avoid silently enabling unsupported features |
| Shader hot reload | Faster authoring for local galleries and docs | Preserve deterministic cleanup and pipeline invalidation |
| Multi-canvas composition | Coordinate many agents efficiently on dashboards | Bound memory, command encoding, and accessibility complexity |
| Portable session format | Exchange visual event sessions across tools | Versioning, privacy, retention, and sensitive metadata controls |
| Community recipe registry | Share open visual recipes without a hosted runtime dependency | Reproducible packages, provenance, validation, and licensing |

To contribute a roadmap item, begin with a framework-free contract, add a focused example, document the lifecycle, write deterministic tests, and run the full validation gates.

## Development

Requirements:

- Node.js 22.
- pnpm 9.
- A WebGPU-capable browser for interactive previews.
- No cloud account or vendor credential for the core workflow.

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

The full local Agent Skills package can be inspected with:

```sh
npx -y skills add ./ --list
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the repository workflow and [NOTICE.md](./NOTICE.md) for fork provenance.

For branch protection, release sequencing, SBOM/checksum artifacts, npm trusted publishing, and the GitHub Actions matrix, read [`PRODUCTION.md`](./PRODUCTION.md).

## Project status

AIGpu is an actively evolving open-source fork. The current workspace includes the core runtime, WGSL tooling, agent animations, DOM controller, React/Vue/Svelte adapters, multi-agent tools, event replay, visual gallery, offline CLI, local MCP, portable Agent Skills, and plugin metadata.

The API is suitable for experimentation and internal products. Treat minor-version changes as a reason to review bundle budgets, lifecycle behavior, and generated documentation before upgrading.

## License and provenance

AIGpu is distributed under the MIT license. The repository preserves the original upstream copyright notice for inherited portions in [`LICENSE`](./LICENSE) and identifies fork changes in [`NOTICE.md`](./NOTICE.md).

The project does not require Vercel services, a hosted catalog, proprietary AI SDKs, remote telemetry, or a vendor account to build and test the library locally.

## References

[1]: https://www.w3.org/TR/webgpu/ "WebGPU specification"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API "MDN WebGPU API"
[3]: https://github.com/vercel-labs/skills "Open Agent Skills CLI and ecosystem"
