---
title: Agent state tools
summary: Framework-free stores, multi-agent registries, serializable events, recording, and deterministic replay for AIGpu.
keywords: createAgentStore, createAgentRegistry, recordAgentEvents, replayAgentEvents, state, events, replay, multi-agent, websocket, worker
---

# Agent state tools

The `aigpu/tools` entrypoint contains pure TypeScript tools that do not know about WebGPU, the DOM, React, Vue, Svelte, AI providers, or network transports. They are designed to sit between any agent orchestrator and any visual adapter.

## Store

```ts
import { createAgentStore } from "aigpu/tools";

const store = createAgentStore({ status: "thinking", progress: 0 });
const unsubscribe = store.subscribe(({ state, revision }, event) => {
  console.log(revision, event.type, state);
});

store.set({ status: "working", progress: 0.4 });
store.dispatch({ type: "progress", patch: { progress: 0.8 }, metadata: { tool: "search" } });
const serialized = store.toJSON();
unsubscribe();
```

Snapshots are defensive and colors are shallow-cloned. The store does not clamp or interpret values; use `agentAnimation()` when normalized visual state is required, or validate at your orchestration boundary when storing domain-specific values.

## Multi-agent registry

```ts
import { createAgentRegistry } from "aigpu/tools";

const registry = createAgentRegistry();
const planner = registry.ensure("planner", { status: "thinking" });
const researcher = registry.ensure("researcher", { status: "waiting" });
registry.subscribe((snapshot, event) => {
  // Feed a dashboard, a worker, a WebSocket, or a framework store.
  console.log(snapshot.ids, event.agentId);
});
planner.set({ status: "working", progress: 0.5 });
researcher.set({ status: "working", activity: 0.9 });
```

IDs are stable, explicit, and validated against control characters. `remove()` emits a reset event so dashboards can remove a card without guessing.

## Recording and replay

Recording accepts any subscribe function, so it works with the registry, a message bus, a worker bridge, or a custom store:

```ts
const recorder = recordAgentEvents((listener) => registry.subscribe((_snapshot, event) => listener(event)));
// ... run the agent ...
recorder.stop();
const json = recorder.toJSON(true);
```

Replay uses event timestamps and an injected scheduler. The default uses `setTimeout`, while tests and timelines can provide a virtual scheduler:

```ts
const replay = replayAgentEvents(JSON.parse(json), (event) => {
  if (event.agentId) registry.ensure(event.agentId).dispatch(event);
});
replay.play();
// replay.pause(), replay.play(), or replay.stop()
```

The replay tool never creates a GPU and never assumes a framework. Connect its delivery callback to `store.set()`, `controller.set()`, a React state bridge, a Vue ref, a Svelte store, or a plain canvas controller.

## Event envelope

`AgentEvent` is intentionally JSON-safe: `type`, optional `agentId`, optional `patch`, optional millisecond `at`, and optional metadata. Keep metadata small and non-sensitive when recording production sessions. Do not place prompts, secrets, tokens, or private model output in a visual event log unless your retention policy allows it.
