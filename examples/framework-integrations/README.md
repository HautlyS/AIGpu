# AIGpu framework integrations

These examples show the same GPU animation mounted in four environments. The implementation lives in `aigpu/dom`; framework packages only wrap its lifecycle.

| Environment | Import | Lifecycle |
|---|---|---|
| HTML/JS | `aigpu/dom` | explicit `destroy()` |
| React | `@aigpu/react` | `useEffect` cleanup |
| Vue 3 | `@aigpu/vue` | `onBeforeUnmount` |
| Svelte 3/4/5 | `@aigpu/svelte` | action `destroy()` |

No framework is required by the core package. See [`docs/topics/framework-integrations.docs.md`](../../docs/topics/framework-integrations.docs.md) for complete snippets, SSR guidance, reduced-motion behavior, and event bridge patterns.
