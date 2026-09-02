# Event replay example

This example records plain `AgentEvent` objects and replays them into any target: an AIGpu animation, a React hook, a Vue ref, a Svelte action, a worker, or a log viewer.

```sh
pnpm --filter @aigpu/example-event-replay test
```

It is intentionally UI-free and does not contact an AI service.
