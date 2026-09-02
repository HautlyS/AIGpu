# Agent operations dashboard

A framework-free view model for multi-agent operations. It uses `createAgentRegistry()` and exposes stable cards that can be rendered by HTML, React, Vue, Svelte, a terminal UI, or a native host.

```sh
pnpm --filter @aigpu/example-agent-ops-dashboard test
```

The dashboard model owns no canvas and no UI state. Pair each card with `mountAgentCanvas()` or with any framework adapter when a GPU visual is desired.
