# Framework matrix

| Runtime | Integration | Required dependency | Lifecycle |
| --- | --- | --- | --- |
| HTML/JS | `mountAgentCanvas(canvas, options)` | `aigpu` | call `destroy()` on removal |
| React | `useAgentCanvas(options)` | `@aigpu/react` + React | hook cleanup |
| Vue 3 | `useAgentCanvas(options)` | `@aigpu/vue` + Vue | `onBeforeUnmount` |
| Svelte | `agentCanvas` action | `@aigpu/svelte` | action `destroy` |
| Worker/custom | `mountAgentCanvas` with `OffscreenCanvas` where supported | `aigpu/dom` | explicit ownership |
| SSR | create controller only after client mount | framework runtime | never access canvas during SSR |

Every canvas should have an accessible label or adjacent status text. Use `prefers-reduced-motion` to reduce activity/speed or replace motion with a static status indicator. Keep the GPU device ownership explicit and do not destroy an externally supplied device from an adapter.

All framework adapters are optional. The core package must not import framework runtimes.
