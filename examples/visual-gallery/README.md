# AIGpu Visual Gallery

A practical gallery of **GPU-first animations for AI agents**. Every recipe is a real WGSL fragment shader using the same compact `AgentParams` contract, so a product can change its visual language without changing its orchestration events.

The gallery deliberately avoids frameworks, hosted services, model providers, API keys, telemetry, and proprietary assets. It runs from the local checkout and is useful for browser surfaces, headless snapshots, test fixtures, kiosks, and multi-agent dashboards.

## Start here

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @aigpu/example-visual-gallery test
node packages/aigpu-cli/bin/aigpu.js examples search "visual gallery"
node packages/aigpu-cli/bin/aigpu.js examples show visual-gallery
```

The last command prints the complete local manifest, including the SHA-256 digest for every shader and documentation file. The CLI never fetches an example from a remote server.

## The eight art directions

| Recipe | Mood | Ideal surface | Motion language |
|---|---|---|---|
| `anime-hologram` | anime | friendly copilot, onboarding, character assistant | eyes, aura, scanlines, cyan/magenta rim |
| `enterprise-orbit` | modern enterprise | mission control, SRE wall, workflow monitor | precise rings, progress arc, orbiting node |
| `psychedelic-neural` | psychedelic | creative research, ideation, generative art | warped petals, chromatic bloom, saturated pulse |
| `calm-ocean` | calm / ambient | human approval, rate limit, waiting room | slow waves, horizon, breathing orb |
| `success-confetti` | celebratory | completed plan, deploy, handoff | radial rays, spark core, deterministic confetti |
| `error-glitch` | diagnostic | retry, validation, incident response | segmented scanlines, jitter, error bars |
| `minimal-focus` | quiet productivity | dense table, accessibility mode, terminal | monochrome ring, precise arc, low noise |
| `cosmic-constellation` | research / multi-agent | agent graph, long-running investigation | stars, nebula, orbiting research node |

All recipes are in [`shaders/`](./shaders). The `agent-gallery.wgsl` file is the editable master; the eight named files are build-time style variants with `STYLE` set to `0..7`.

## One integration for every recipe

The GPU animation should be a projection of orchestration state, not the owner of the state. A model runner, queue, tool executor, or human approval service emits events. The renderer only translates those events into uniforms.

```ts
import { effect, frameLoop, init, surface, clock } from "aigpu";
import { loadRecipe, visualRecipes } from "./src/gallery.ts";

const gpu = await init();
const canvas = document.querySelector("canvas")!;
const output = surface(gpu, canvas);
const recipe = visualRecipes.find(({ id }) => id === "enterprise-orbit")!;
const shader = await loadRecipe(recipe);

const visual = effect(gpu, shader, {
  label: recipe.id,
  set: {
    params: {
      time: 0,
      progress: recipe.initial.progress ?? 0,
      activity: recipe.initial.activity ?? 0,
      status: 2,
      phase: recipe.initial.phase ?? 0,
      speed: recipe.initial.speed ?? 1,
      pad: [0, 0],
      accent: [0.35, 0.95, 1, 1],
      secondary: [0.06, 0.38, 0.65, 1],
      background: [0.005, 0.028, 0.06, 1],
    },
  },
});

const time = clock(gpu);
frameLoop(gpu, (frame) => {
  visual.set({ params: { time: time.time } });
  frame.pass(output, visual);
});
```

For production code, prefer [`agentAnimation()`](../../packages/aigpu-api/src/agent.ts) when you want AIGpu's built-in status palettes and defensive state handling. Use the gallery shaders when the product needs a stronger art direction or a custom compositor.

## 1. Anime Hologram

**File:** [`shaders/anime-hologram.wgsl`](./shaders/anime-hologram.wgsl)

Use this recipe for an assistant that should feel expressive without looking like a loading spinner. The face is abstract and non-gendered: a luminous head silhouette, two eye strokes, a hair/rim accent, and a restrained scanline. It works particularly well in a small square avatar, a voice-mode orb, or a large onboarding hero.

Recommended event sequence:

```ts
visual.set({ status: "thinking", activity: 0.72, progress: 0.34, speed: 1.35 });
visual.set({ status: "working", activity: 0.9, progress: 0.68 });
visual.set({ status: "success", activity: 0.2, progress: 1 });
```

Design notes:

- Keep `activity` high only while the assistant is actively reasoning or speaking.
- Use `progress` for a known plan, never as a fake estimate of model confidence.
- Pair the shader with text such as “Preparing answer” so the animation is not the only status channel.
- For reduced motion, set `speed: 0.12` and remove the scanline branch in the shader.

## 2. Enterprise Orbit

**File:** [`shaders/enterprise-orbit.wgsl`](./shaders/enterprise-orbit.wgsl)

This is the default choice for a serious operations surface. The geometry is intentional: a progress arc communicates completion, an orbiting node communicates liveness, and the grid texture gives the eye a stable reference. The palette is cool and high-contrast so it can sit beside logs, counters, and alert badges.

A workflow event adapter can remain provider-neutral:

```ts
type JobEvent =
  | { type: "queued" }
  | { type: "step-start"; progress: number }
  | { type: "step-complete"; progress: number }
  | { type: "awaiting-approval" }
  | { type: "failed"; retryable: boolean };

function applyJobEvent(event: JobEvent) {
  if (event.type === "queued") visual.set({ status: "waiting", activity: 0.08 });
  if (event.type === "step-start") visual.set({ status: "working", progress: event.progress, activity: 0.8 });
  if (event.type === "step-complete") visual.set({ progress: event.progress, activity: 0.45 });
  if (event.type === "awaiting-approval") visual.set({ status: "waiting", activity: 0.15 });
  if (event.type === "failed") visual.set({ status: "error", activity: event.retryable ? 0.7 : 0.35 });
}
```

The recipe is deliberately compatible with queue systems, local workers, and enterprise orchestration. There is no assumption about where events originate.

## 3. Psychedelic Neural Bloom

**File:** [`shaders/psychedelic-neural.wgsl`](./shaders/psychedelic-neural.wgsl)

This shader is for creative tools, not compliance dashboards. It uses domain-like angular warping, seven petals, a chromatic color cycle, and an energetic center. It makes an AI ideation session feel alive while remaining deterministic for recordings and snapshots.

```ts
visual.set({
  status: "thinking",
  progress: 0.18,
  activity: 0.95,
  speed: 2.4,
  phase: 0.4,
});

// A new branch in a creative graph can shift phase without changing status.
visual.set({ status: "working", progress: 0.55, activity: 1, phase: 1.4 });
```

Do not use saturation alone to communicate danger or success. The recipe should be accompanied by a label, and the product should provide a quiet mode for users who find high-frequency color motion uncomfortable.

## 4. Calm Ocean

**File:** [`shaders/calm-ocean.wgsl`](./shaders/calm-ocean.wgsl)

The calm recipe is a waiting state with dignity. It is useful when a remote tool is rate-limited, a human must approve an action, or a long job is queued. The motion is intentionally slow; it should not pressure a person into clicking.

```ts
visual.set({ status: "waiting", activity: 0.18, speed: 0.35, progress: 0.42 });

// The approval arrives. Increase energy only after the state really changes.
visual.set({ status: "working", activity: 0.45 });
```

Accessibility recommendation: expose `prefers-reduced-motion` to the orchestration layer and use `speed: 0` for users who opt out. The status remains legible because the background, orb, and text label do not depend on motion.

## 5. Success Confetti

**File:** [`shaders/success-confetti.wgsl`](./shaders/success-confetti.wgsl)

Use this for a short-lived completion moment: a finished tool call, a generated report, a successful deploy, or a handoff to a human. It combines a spark core with radial rays and deterministic grid confetti, so the same input and timestamp produce the same frame.

```ts
visual.set({ status: "success", progress: 1, activity: 0.35, speed: 1.8 });
// After a short hold, lower energy rather than repeatedly flashing the screen.
visual.set({ activity: 0.12, speed: 0.6 });
```

A completion animation should never replace a durable success message, artifact link, or audit event. It is a confirmation accent, not a record.

## 6. Error Glitch

**File:** [`shaders/error-glitch.wgsl`](./shaders/error-glitch.wgsl)

The glitch recipe is useful when something needs attention but recovery is possible. It uses scanline bands, two diagnostic bars, and small time-based jitter. The state contract remains simple, which lets a retry transition back into `working` without reconstructing the effect.

```ts
visual.set({ status: "error", progress: 0.27, activity: 0.68, speed: 3.1 });

async function retry() {
  visual.set({ status: "working", activity: 0.45, speed: 1.2 });
  // Run the tool outside the renderer; update only from real events.
}
```

For incident response, combine the visual with an error code, remediation action, and retry count. Avoid a red-only design for color-vision accessibility; use text and shape as the primary signal.

## 7. Minimal Focus

**File:** [`shaders/minimal-focus.wgsl`](./shaders/minimal-focus.wgsl)

Minimal Focus is the low-noise recipe for dense interfaces, terminals, and accessibility modes. It uses one ring and a precise progress arc. The low activity floor prevents the animation from disappearing entirely while avoiding attention capture.

```ts
visual.set({
  status: "working",
  progress: 0.5,
  activity: 0.5,
  speed: 0.5,
  colors: {
    accent: [0.92, 0.94, 1, 1],
    secondary: [0.22, 0.25, 0.32, 1],
    background: [0.015, 0.016, 0.02, 1],
  },
});
```

This recipe is also a good baseline for screenshot tests because it has fewer high-frequency features and a stable silhouette.

## 8. Cosmic Constellation

**File:** [`shaders/cosmic-constellation.wgsl`](./shaders/cosmic-constellation.wgsl)

Cosmic Constellation represents multi-agent research. Deterministic stars form a field, a nebula gives depth, and one orbiting node represents the active specialist. It is a strong background for a graph view, but it should be paired with a list of agent names and current responsibilities.

```ts
const agents = ["retriever", "critic", "planner", "writer"];
const active = agents.indexOf("critic");
visual.set({ status: "thinking", phase: active * 1.7, activity: 0.84, progress: 0.12 });
```

A phase offset is a visual identity hint, not a hidden identifier. Keep the actual agent ID in accessible text and telemetry that your own system controls.

## Building a status bridge

A robust bridge accepts serializable events and ignores unknown vendor-specific fields. This makes the same gallery usable with a local state machine, a worker thread, a WebSocket, or a file replay.

```ts
import type { AgentAnimationPatch } from "aigpu";

export function toAnimationPatch(event: Record<string, unknown>): AgentAnimationPatch {
  const status = event.type === "done" ? "success"
    : event.type === "failed" ? "error"
    : event.type === "waiting" ? "waiting"
    : event.type === "started" ? "working"
    : "thinking";

  const progress = typeof event.progress === "number" ? event.progress : undefined;
  const activity = typeof event.active === "boolean" ? (event.active ? 0.85 : 0.2) : undefined;
  return { status, progress, activity };
}
```

The `agentAnimation()` implementation clamps progress and activity to `[0, 1]`, validates finite numeric values, and returns defensive snapshots. Custom gallery effects should use the same discipline before writing uniforms.

## Timing, replay, and screenshots

Use the AIGpu clock in a live browser. Use a fixed timestep for deterministic tests, recordings, and server-side previews:

```ts
for (let frame = 0; frame < 120; frame += 1) {
  const timeSeconds = frame / 60;
  visual.set({ params: { time: timeSeconds } });
  // Submit the frame through your normal AIGpu target/frame path.
}
```

Never use `Date.now()` directly inside a shader uniform update when you need reproducible output. Record the event sequence separately from the frame time so a visual regression can answer both “what did the GPU render?” and “what agent state produced it?”.

## Performance checklist

1. Keep one fullscreen effect per surface whenever possible; compose multiple motifs inside WGSL instead of stacking DOM layers.
2. Update uniforms only when state or time changes. Do not recreate the effect for every agent event.
3. Prefer a lower-resolution offscreen target for a thumbnail or wall of many agents, then composite it once.
4. Use `activity` as an energy budget. A quiet state should do less visible work and draw less attention.
5. Cap a dashboard's active animations. Pause or reduce speed for agents outside the viewport.
6. Use the minimal recipe and reduced motion mode on battery-sensitive devices.
7. Keep shader inputs explicit and small; the gallery's uniform layout is intentionally stable.

## Adding a ninth recipe

Copy `shaders/minimal-focus.wgsl`, change the art direction inside the fragment function, and add one entry to `src/gallery.ts`. Keep the following contract:

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

Then run:

```sh
pnpm --filter @aigpu/example-visual-gallery test
pnpm typecheck
pnpm test:fast
pnpm docs:generate
pnpm check:skill-drift
```

A recipe is ready when it has a descriptive README section, compiles through `aigpu/wgsl`, responds to at least two agent states, and remains understandable without color or motion.
