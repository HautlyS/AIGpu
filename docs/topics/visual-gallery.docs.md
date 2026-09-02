---
title: AIGpu Visual Gallery
audience: Designers, frontend engineers, GPU engineers, and AI product teams
summary: Eight working WGSL recipes for anime, enterprise, psychedelic, calm, celebratory, diagnostic, minimal, and multi-agent interfaces.
keywords: visual gallery, agent animation examples, anime hologram, enterprise orbit, psychedelic neural, calm ocean, success confetti, error glitch, minimal focus, cosmic constellation, WGSL, WebGPU
---

# AIGpu Visual Gallery

The Visual Gallery is a set of eight working GPU animation recipes for agent interfaces. Each recipe is a plain WGSL fragment shader with the same `AgentParams` uniform contract. The complete source, package test, and extended usage notes live in [`examples/visual-gallery`](../../examples/visual-gallery/README.md).

## Recipe map

| Recipe | Best for | Signature |
|---|---|---|
| `anime-hologram` | Friendly copilots and character UIs | abstract face, eyes, aura, scanlines |
| `enterprise-orbit` | Mission control and workflow operations | progress arc, orbiting node, grid |
| `psychedelic-neural` | Creative research and generative tools | warped petals and chromatic bloom |
| `calm-ocean` | Queues, approvals, rate limits | slow waves and breathing orb |
| `success-confetti` | Finished plans, tools, and deployments | spark core, rays, deterministic confetti |
| `error-glitch` | Retryable failures and incidents | scanline bands, jitter, diagnostic bars |
| `minimal-focus` | Dense productivity and accessibility | quiet ring and precise progress arc |
| `cosmic-constellation` | Multi-agent graphs and research | stars, nebula, orbiting specialist |

## Shared runtime pattern

Load a recipe once, create one effect, update uniforms from real agent events, and keep time deterministic when testing:

```ts
import { effect, frameLoop, init, surface, clock } from "aigpu";
import { loadRecipe, visualRecipes } from "../../examples/visual-gallery/src/gallery.ts";

const gpu = await init();
const output = surface(gpu, document.querySelector("canvas")!);
const recipe = visualRecipes.find((item) => item.id === "enterprise-orbit")!;
const shader = await loadRecipe(recipe);
const visual = effect(gpu, shader, {
  label: recipe.id,
  set: { params: {
    time: 0, progress: 0.4, activity: 0.8, status: 2,
    phase: 0, speed: 0.7, pad: [0, 0],
    accent: [0.35, 0.95, 1, 1],
    secondary: [0.06, 0.38, 0.65, 1],
    background: [0.005, 0.028, 0.06, 1],
  } },
});
const time = clock(gpu);
frameLoop(gpu, (frame) => {
  visual.set({ params: { time: time.time } });
  frame.pass(output, visual);
});
```

## Art direction notes

**Anime Hologram** communicates personality through a small number of recognizable shapes. It is a good avatar treatment for `thinking` and `working`, but the interface must still provide a text status and a reduced-motion option.

**Enterprise Orbit** uses geometry that can be read at a glance beside logs and metrics. Its arc is appropriate for known workflow progress. Do not map model confidence to progress unless the product can define that value honestly.

**Psychedelic Neural Bloom** makes creative exploration feel active through seven petals and a time-varying color field. It is intentionally high-energy; provide a quiet alternative and never use saturation as the only error or success signal.

**Calm Ocean** is designed for waiting. The slow wave and horizon communicate that the process is alive without pressuring a person who is waiting for a tool or approval. It is the preferred recipe for rate limits and human-in-the-loop pauses.

**Success Confetti** is a short completion accent. Pair it with a durable result, artifact link, or audit event. A visual celebration is not a substitute for a success message.

**Error Glitch** is for diagnosable failure, especially a retryable one. It should appear with an error code and recovery action. The status must also be available through text and shape, not red alone.

**Minimal Focus** is the low-noise baseline for dense screens, terminal layouts, and reduced-motion mode. It has fewer high-frequency features and makes a useful screenshot-test reference.

**Cosmic Constellation** represents a long-running investigation or a network of specialists. Keep agent names, responsibilities, and current work accessible in text; the stars are context, not an identifier.

## Event mapping

A provider-neutral bridge can translate any serializable event stream into the common vocabulary:

```ts
function toPatch(event: { type: string; progress?: number; active?: boolean }) {
  const status = event.type === "done" ? "success"
    : event.type === "failed" ? "error"
    : event.type === "waiting" ? "waiting"
    : event.type === "started" ? "working"
    : "thinking";
  return {
    status,
    progress: event.progress,
    activity: typeof event.active === "boolean" ? (event.active ? 0.85 : 0.2) : undefined,
  } as const;
}
```

Use `agentAnimation()` when the built-in palettes and state safety are sufficient. Use a gallery effect when the product needs a custom look. In both cases, update an existing effect instead of recreating GPU resources for each event.

## Verification

The gallery test compiles all eight shaders through `aigpu/wgsl` and checks that each recipe exposes at least two state transitions:

```sh
pnpm --filter @aigpu/example-visual-gallery test
pnpm typecheck
pnpm docs:generate
pnpm check:skill-drift
```

The gallery is local-only. `aigpu examples show visual-gallery` reports the files and their integrity hashes; normal development does not require a network connection, model provider, account, API key, or vendor SDK.

## Shared WGSL contract

A custom recipe can start from any gallery file, but it should preserve this layout so state bridges remain portable:

```wgsl
struct AgentParams {
  time: f32,
  progress: f32,
  activity: f32,
  status: f32,
  phase: f32,
  speed: f32,
  pad: vec2f,
  accent: vec4f,
  secondary: vec4f,
  background: vec4f,
}
```

Keep animation motion bounded, prefer deterministic noise, and treat `prefers-reduced-motion` as a first-class product requirement. The GPU should render a useful projection of agent state, never invent state that the orchestrator did not report.
