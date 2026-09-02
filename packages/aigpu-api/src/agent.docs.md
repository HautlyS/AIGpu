---
title: Agent animation
summary: GPU-native status and progress visualization for AI agents without a hosted service.
keywords: agent, animation, status, progress, AI, GPU, shader
---

# Agent animation

`agentAnimation(gpu, options)` creates a fullscreen `Effect` whose compact uniform block represents an agent. The function is deliberately transport-agnostic: connect it to a local model, a WebSocket, a queue, or an application event emitter by calling `set()` with plain data. AIGpu does not invoke an AI provider.

## `agentAnimation`

```ts
import { agentAnimation, clock, frameLoop, init, surface } from "aigpu";

const gpu = await init();
const output = surface(gpu, canvas, { dpr: [1, 2] });
const agent = agentAnimation(gpu, {
  label: "researcher",
  initial: { status: "thinking", progress: 0.15 },
});
const time = clock(gpu);

frameLoop(gpu, (frame) => {
  agent.tick(time.time);
  frame.pass(output, agent.effect);
});

agent.set({ status: "working", progress: 0.7, activity: 0.9 });
```

The built-in statuses are `idle`, `thinking`, `working`, `waiting`, `success`, and `error`. `progress` and `activity` are clamped to `[0, 1]`. `phase` and `speed` control the pulse without changing the agent status.

### Methods

- `agent.effect` is the fullscreen `Effect` to pass to `frame.pass()`.
- `agent.state` returns a defensive snapshot for UI labels or telemetry.
- `agent.set(patch)` updates only the supplied agent fields and returns the same animation object.
- `agent.tick(seconds)` updates shader time. Use `clock(gpu).time`, a fixed timestep, or an external ticker.
- `agent.reset()` restores the initial state and sets time to zero.

### Custom palettes

Colors are RGBA tuples with finite values in `[0, 1]`:

```ts
agent.set({
  colors: {
    accent: [0.25, 1, 0.55, 1],
    secondary: [0.05, 0.55, 0.35, 1],
  },
});
```

`AGENT_ANIMATION_SHADER` is exported for applications that need to compose the visual into a larger custom shader. The shader consumes a `params` uniform block with `time`, `progress`, `activity`, `status`, `phase`, `speed`, `accent`, `secondary`, and `background` fields.
