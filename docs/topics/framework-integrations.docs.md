---
title: Framework-agnostic integrations
summary: Use the same AIGpu agent animation in plain HTML, React, Vue 3, Svelte 3/4/5, workers, SSR applications, and custom lifecycle systems.
keywords: framework agnostic, react, vue, svelte, html, javascript, canvas, lifecycle, SSR, hydration, accessibility, reduced motion, webgpu
---

# Framework-agnostic integrations

AIGpu has one core rendering contract and several optional lifecycle adapters. The core package has no React, Vue, Svelte, JSX, or component-runtime dependency. A browser application can use plain HTML and JavaScript; framework users install only the tiny adapter that matches their UI layer.

> The rendering engine owns GPU resources. Your framework owns component lifetime. The adapter connects those two responsibilities and makes cleanup explicit.

## Install the smallest surface

```sh
# Plain HTML/JS — core only
npm install aigpu

# React 18+
npm install aigpu @aigpu/react

# Vue 3+
npm install aigpu @aigpu/vue

# Svelte 3, 4, or 5
npm install aigpu @aigpu/svelte
```

The framework packages are optional peer integrations. Installing `aigpu` alone never installs React, Vue, Svelte, a router, a state manager, or a CSS framework.

## Plain HTML and JavaScript

The zero-framework entrypoint is `mountAgentCanvas()`. It accepts an `HTMLCanvasElement` or `OffscreenCanvas`, starts the frame loop, and returns a controller.

```html
<section class="agent-card">
  <canvas id="agent-canvas" width="640" height="360" aria-label="Agent status"></canvas>
  <output id="agent-label">Thinking</output>
</section>
<script type="module">
  import { mountAgentCanvasSelector } from "aigpu";

  const label = document.querySelector("#agent-label");
  const agent = mountAgentCanvasSelector("#agent-canvas", {
    label: "plain-html-agent",
    initial: { status: "thinking", activity: 0.65, progress: 0.1 },
    surface: { dpr: [1, 2], autoResize: true },
  });

  function applyEvent(event) {
    agent.set(event);
    label.textContent = event.status ?? "working";
  }

  const timer = setTimeout(() => applyEvent({ status: "working", progress: 0.45, activity: 0.9 }), 500);
  window.addEventListener("pagehide", () => {
    clearTimeout(timer);
    agent.destroy();
  }, { once: true });
</script>
```

`mountAgentCanvasSelector()` validates the selected element and fails early if it is not a canvas. Use `mountAgentCanvas()` directly when the canvas is already available or when the element comes from a custom renderer.

## React

`@aigpu/react` exports `useAgentCanvas()`. The hook creates the controller inside an effect, waits for `ready`, and destroys it in the effect cleanup. The core does not import React.

```tsx
import { useAgentCanvas } from "@aigpu/react";

export function AgentCanvas({ status, progress }: {
  status: "thinking" | "working" | "waiting" | "success" | "error";
  progress: number;
}) {
  const { canvasRef, mounted } = useAgentCanvas({
    label: "react-agent",
    initial: { status: "thinking", activity: 0.7 },
    patch: { status, progress, activity: status === "working" ? 0.9 : 0.25 },
    surface: { dpr: [1, 2] },
  });

  return (
    <div role="status" aria-live="polite">
      <canvas ref={canvasRef} aria-label={`Agent ${status}`} />
      <span>{mounted ? status : "initializing"}</span>
    </div>
  );
}
```

Keep the options object stable when possible. Use `restartKey` only when a new GPU surface is truly desired; state changes belong in `patch` and do not recreate the effect.

```tsx
function RetryableAgent({ runId }: { runId: string }) {
  const { canvasRef, controller } = useAgentCanvas({
    restartKey: runId,
    initial: { status: "waiting" },
  });
  return <canvas ref={canvasRef} onClick={() => controller?.set({ status: "working" })} />;
}
```

React Strict Mode may mount, clean up, and mount again in development. The adapter's cleanup is idempotent, so this does not leak a surface or frame loop.

## Vue 3

`@aigpu/vue` exports `useAgentCanvas()`. Its `canvas` ref is assigned to the template, setup happens in `onMounted`, and GPU resources are released in `onBeforeUnmount`.

```vue
<script setup lang="ts">
import { ref, watch } from "vue";
import { useAgentCanvas } from "@aigpu/vue";

const progress = ref(0.35);
const status = ref<"thinking" | "working" | "success">("working");
const { canvas, controller, mounted } = useAgentCanvas({
  label: "vue-agent",
  initial: { status: "thinking", activity: 0.7 },
});
</script>

<template>
  <div role="status" aria-live="polite">
    <canvas ref="canvas" :aria-label="`Agent ${status}`" />
    <span>{{ mounted ? status : 'initializing' }}</span>
  </div>
</template>
```

For a reactive options object, pass a `patch` ref through a wrapper or call `controller.value?.set(patch)` from a watcher. The composable itself never owns your store or calls an AI provider.

```ts
watch([status, progress], () => {
  controller.value?.set({ status: status.value, progress: progress.value });
});
```

## Svelte 3, 4, and 5

`@aigpu/svelte` exports a standard action and imports no Svelte runtime. Use it on a canvas node. The initial parameter can contain `initial` and `surface`; a later `patch` field is applied by the action's `update` lifecycle.

```svelte
<script lang="ts">
  import { agentCanvas } from "@aigpu/svelte";

  let status = "thinking" as const;
  let progress = 0.2;
  $: options = {
    initial: { status: "thinking", activity: 0.7 },
    patch: { status, progress, activity: status === "working" ? 0.9 : 0.25 },
    surface: { dpr: [1, 2] as const },
  };
</script>

<div role="status" aria-live="polite">
  <canvas use:agentCanvas={options} aria-label={`Agent ${status}`} />
  <span>{status}</span>
</div>
```

Svelte calls `destroy()` when the node is removed. This works with legacy actions and Svelte 5's current action behavior because the adapter uses only `update` and `destroy`.

## Sharing an existing GPU context

A controller can reuse a GPU created by the application. This is useful when a page renders a scene and an agent overlay in the same context.

```ts
const gpu = await init();
const agent = mountAgentCanvas(canvas, { gpu, initial: { status: "working" } });
// agent.destroy() disposes its surface and loop, but deliberately leaves gpu alive.
// Dispose gpu only after all shared surfaces and effects are finished.
```

Without `gpu`, the controller owns the context it creates and disposes it when destroyed. This ownership rule prevents a framework component from accidentally tearing down a context belonging to the rest of the application.

## SSR and hydration

WebGPU and canvas contexts are browser resources. Do not create a controller during server rendering. Create it from `useEffect`, `onMounted`, or a client-only action. The adapters already follow this rule.

```ts
// Safe in an SSR module: import types or the adapter.
// Unsafe during SSR: mountAgentCanvas(document.querySelector("canvas")!).
```

Render an accessible placeholder on the server, then let the client add the canvas rendering after hydration. Do not make a server response depend on `ready`; it is a client-side resource promise.

## Reduced motion and accessibility

A GPU animation is not a status announcement. Always provide an accessible label, text state, or live region. Respect the user's reduced-motion preference:

```ts
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const agent = mountAgentCanvas(canvas, {
  initial: { status: "working", speed: reducedMotion ? 0 : 1 },
});
```

Use shape, text, and state semantics in addition to color. `error` should not be communicated by red alone, and `success` should not be communicated by a flash alone. The `minimal-focus` gallery recipe is a good reduced-motion visual baseline.

## Event bridges

Adapters intentionally accept plain `AgentAnimationPatch` objects. This makes them compatible with stores, workers, WebSockets, event emitters, and local replay files:

```ts
function onAgentEvent(event: { type: string; progress?: number; active?: boolean }) {
  controller.set({
    status: event.type === "done" ? "success"
      : event.type === "failed" ? "error"
      : event.type === "waiting" ? "waiting"
      : event.type === "started" ? "working"
      : "thinking",
    progress: event.progress,
    activity: event.active === undefined ? undefined : event.active ? 0.9 : 0.15,
  });
}
```

The renderer should not infer hidden model state. Update it from events your application can explain and audit.

## Testing without a browser

The core mock adapter remains the right tool for deterministic GPU behavior tests. Framework adapters are lifecycle wrappers and can be tested with the framework's normal test renderer; they do not require an API key or a hosted service.

```sh
pnpm typecheck
pnpm test:fast
pnpm check:skill-drift
```

For real GPU validation, run the existing AIGpu Node/Dawn or container test commands. The integration packages do not add a new rendering backend.

## Compatibility matrix

| Integration | Package | Required runtime | Core dependency added |
|---|---|---|---|
| Plain HTML/JS | `aigpu` | browser DOM and WebGPU | none |
| React | `@aigpu/react` | React 18+ | optional React peer |
| Vue | `@aigpu/vue` | Vue 3.3+ | optional Vue peer |
| Svelte | `@aigpu/svelte` | Svelte 3/4/5 | none at runtime |
| Custom system | `aigpu/dom` | any lifecycle that can call `destroy()` | none |

The source of truth for all adapters is `packages/aigpu-api/src/dom.ts`. If a framework integration needs a new feature, add it to the framework-neutral controller first, then keep the adapter thin.
