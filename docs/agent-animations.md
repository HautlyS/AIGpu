---
title: AIGpu agent animations
summary: Connect serializable agent state to GPU-native visuals with accessible, deterministic, framework-agnostic integrations.
keywords: agentAnimation, animation, status, progress, activity, GPU, UX, accessibility, replay, tools
---

# AIGpu agent animations

AIGpu converts explainable agent state into GPU-rendered pixels without owning the agent runtime. The application decides how to call a model, execute tools, receive events, request approval, or persist a workflow. AIGpu consumes only a small visual contract: status, progress, activity, colors, phase, speed, and time.

## Minimal integration

```ts
import { agentAnimation, clock, frameLoop, init, surface } from "aigpu";

const gpu = await init();
const output = surface(gpu, document.querySelector("canvas")!, { dpr: [1, 2] });
const visual = agentAnimation(gpu, {
  label: "planner",
  initial: { status: "thinking", progress: 0.1, activity: 0.65 },
});
const time = clock(gpu);

frameLoop(gpu, (frame) => {
  visual.tick(time.time);
  frame.pass(output, visual.effect);
});

function onAgentEvent(event: { status: "working" | "success" | "error"; progress?: number; activity?: number }) {
  visual.set(event);
}
```

## State contract

| Field | Values | Visual role |
| --- | --- | --- |
| `status` | `idle`, `thinking`, `working`, `waiting`, `success`, `error` | Selects the semantic palette and status behavior. |
| `progress` | Number normalized to `[0, 1]` | Drives the progress arc. |
| `activity` | Number normalized to `[0, 1]` | Controls pulse and halo energy. |
| `phase` | Finite number | Adds a deterministic phase offset. |
| `speed` | Non-negative finite number | Controls pulse speed and supports reduced motion. |
| `colors` | RGB/RGBA tuples in `[0, 1]` | Overrides the selected status palette. |

`set()` applies a partial update and returns the same animation object. `state` is a defensive snapshot. `tick()` accepts seconds from `clock(gpu)`, an XR loop, a simulation clock, or a replay scheduler. `reset()` restores the initial state.

## UI/UX contract

A visual status must not be the only status channel. Pair the canvas with an accessible name, readable text, or a live region. Use a native `progress` element or an equivalent semantic value for completion. Use shape, text, and motion in addition to color so that `error`, `success`, and `waiting` remain understandable without color perception.

```ts
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const visual = agentAnimation(gpu, {
  initial: {
    status: "working",
    activity: reducedMotion ? 0.15 : 0.85,
    speed: reducedMotion ? 0 : 1,
  },
});
```

When a status changes, update the accessible text at the same application boundary that updates the visual patch. Do not infer private model reasoning from pixels. Communicate only states the product can explain and audit.

## Framework-free controller

For ordinary HTML, custom runtimes, and worker-compatible lifecycles, use `mountAgentCanvas()`:

```ts
import { mountAgentCanvas } from "aigpu";

const controller = mountAgentCanvas(canvas, {
  label: "review-agent",
  initial: { status: "waiting", progress: 0.5, activity: 0.2 },
  surface: { dpr: [1, 2], autoResize: true },
});

controller.set({ status: "working", activity: 0.9 });
await controller.ready;
controller.resize([1280, 720]);
controller.destroy();
```

The controller owns the surface and frame loop it creates. If an external `gpu` is passed, the controller leaves that device alive and cleans up only the resources it owns. This rule is important when an agent visual overlays an existing scene.

## Multi-agent state

Keep state independent from rendering when several views consume it:

```ts
import { createAgentRegistry } from "aigpu/tools";

const registry = createAgentRegistry();
const planner = registry.ensure("planner", { status: "thinking" });
const reviewer = registry.ensure("reviewer", { status: "waiting" });

registry.subscribe((snapshot, event) => {
  // Project into HTML, React, Vue, Svelte, a worker, or a terminal UI.
  console.log(snapshot.revision, event.agentId);
});

planner.set({ status: "working", progress: 0.4 });
reviewer.set({ status: "working", activity: 0.8 });
```

Use `createAgentStore()` for one state owner. Use `recordAgentEvents()` for session capture and `replayAgentEvents()` for deterministic demos, debugging, and visual regression fixtures. Keep event metadata JSON-safe and exclude secrets, prompts, tokens, and private model output.

## Design constraints

The animation is a fullscreen `Effect` driven by a compact uniform block. JavaScript updates state; the GPU evaluates the pulse, ring, progress arc, halo, and grain. There is no DOM animation loop, vendor SDK, model invocation, account, or telemetry requirement.

The exported `AGENT_ANIMATION_SHADER` can be used as a starting point for a custom compositor. Custom shaders should retain the same status vocabulary and normalized fields when interoperability with AIGpu tools matters.

## Visual directions

The Visual Gallery contains eight working recipes: anime hologram, enterprise orbit, psychedelic neural bloom, calm ocean, success confetti, error glitch, minimal focus, and cosmic constellation. Use the minimal recipe as a reduced-motion baseline and use the enterprise or cosmic recipes for multi-agent surfaces where the visual hierarchy must remain quiet.

## Testing and diagnostics

Use `aigpu/mock` for deterministic tests that do not require an adapter. Test state transitions independently from GPU rendering, then validate WGSL separately:

```sh
pnpm typecheck
pnpm test:fast
npx aigpu check ./agent.wgsl --require-validation
pnpm bundle-check
```

For complete integration guidance, read the [framework integration guide](./topics/framework-integrations.docs.md), the [agent state tools guide](../packages/aigpu-api/src/agent-tools.docs.md), and the [visual gallery](./topics/visual-gallery.docs.md).
