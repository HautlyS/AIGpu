# AIGpu agent contracts

`AgentAnimationPatch` is the visual patch: `status`, normalized `progress` and `activity`, finite `phase` and `speed`, and optional RGBA colors.

`AgentEvent` is the transport-neutral envelope:

```ts
{
  agentId?: string;
  type: "state" | "reset" | "progress" | "status";
  patch?: AgentAnimationPatch;
  at?: number;
  metadata?: Record<string, unknown>;
}
```

Use `createAgentStore(initial)` for one state owner. Use `createAgentRegistry()` for stable multi-agent IDs. Stores expose `snapshot`, `set`, `dispatch`, `reset`, `subscribe`, and `toJSON`.

Use `recordAgentEvents(subscribe, { now })` to capture serializable events. Use `replayAgentEvents(events, deliver, { speed, setTimeout, clearTimeout })` for testable playback. Inject a virtual scheduler when tests must not wait on wall-clock time.

Never record secrets, prompts, tokens, private model output, or credentials in metadata.
