---
title: Framework-agnostic canvas mounting
summary: Mount AIGpu agent animations from plain HTML, React, Vue, Svelte, or any lifecycle system through one DOM controller.
keywords: mountAgentCanvas, mountAgentCanvasSelector, framework agnostic, html javascript, react, vue, svelte, lifecycle, canvas, dispose
---

# Framework-agnostic canvas mounting

`mountAgentCanvas()` is the zero-framework integration. It creates an AIGpu browser context, connects one canvas surface, starts a frame loop, and returns a controller with `ready`, `set`, `resize`, and `destroy`. React, Vue, and Svelte adapters are intentionally thin wrappers around this contract.

```ts
import { mountAgentCanvas } from "aigpu";

const controller = mountAgentCanvas(document.querySelector("canvas")!, {
  initial: { status: "thinking", activity: 0.7 },
  surface: { dpr: [1, 2], autoResize: true },
});

controller.set({ status: "working", progress: 0.45 });
await controller.ready;
controller.destroy();
```

The controller owns the GPU only when it creates it. Pass `gpu` to share an existing context; in that mode `destroy()` releases the surface and loop but does not dispose the shared GPU.

## Browser lifecycle

Call `destroy()` when the canvas leaves the document. It is idempotent. Calling `set()` after destroy is a no-op, and patches sent before asynchronous setup are queued and applied once the animation is ready. `ready` remains observable for code that needs to report initialization failures.

## HTML and JavaScript

```html
<canvas id="agent" aria-label="Agent status"></canvas>
<script type="module">
  import { mountAgentCanvasSelector } from "aigpu";
  const agent = mountAgentCanvasSelector("#agent", {
    label: "html-agent",
    initial: { status: "thinking" },
    surface: { dpr: [1, 2] },
  });
  window.addEventListener("agent:event", (event) => agent.set(event.detail));
  window.addEventListener("pagehide", () => agent.destroy(), { once: true });
</script>
```

## Adapter packages

Install only the adapter for the framework in your application:

```sh
npm install aigpu @aigpu/react react
npm install aigpu @aigpu/vue vue
npm install aigpu @aigpu/svelte
```

`@aigpu/react` and `@aigpu/vue` declare their framework as optional peer dependencies. `@aigpu/svelte` imports no Svelte runtime and uses the standard action shape, so it works with Svelte 3, 4, and 5.

The complete examples are in [`examples/framework-integrations`](../../examples/framework-integrations/README.md), with package-specific READMEs in `packages/aigpu-react`, `packages/aigpu-vue`, and `packages/aigpu-svelte`.
