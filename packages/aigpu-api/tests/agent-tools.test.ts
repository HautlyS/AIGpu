import { expect, test } from "vitest";
import { createAgentRegistry, createAgentStore, recordAgentEvents, replayAgentEvents } from "../src/agent-tools.ts";

test("agent store publishes defensive snapshots and serializes state", () => {
  const store = createAgentStore({ status: "idle", colors: { accent: [1, 0, 0, 1] } });
  const events: string[] = [];
  store.subscribe(({ state, revision }, event) => events.push(`${revision}:${event.type}:${state.status}`));
  store.set({ status: "working", progress: 0.5 });
  const snapshot = store.snapshot;
  expect(snapshot.state.status).toBe("working");
  expect(Object.isFrozen(snapshot.state)).toBe(true);
  expect(events).toEqual(["1:state:working"]);
  expect(JSON.parse(store.toJSON()).state.progress).toBe(0.5);
});

test("registry tags events with agent IDs and removes agents explicitly", () => {
  const registry = createAgentRegistry();
  const events: string[] = [];
  registry.subscribe((_snapshot, event) => events.push(`${event.agentId}:${event.type}`));
  const planner = registry.ensure("planner", { status: "thinking" });
  registry.ensure("researcher", { status: "waiting" });
  planner.set({ status: "working" });
  expect(registry.ids).toEqual(["planner", "researcher"]);
  expect(events).toContain("planner:state");
  expect(registry.remove("researcher")).toBe(true);
  expect(events).toContain("researcher:reset");
});

test("records and replays timestamped events with an injected scheduler", () => {
  const store = createAgentStore();
  const recorder = recordAgentEvents((listener) => store.subscribe((_snapshot, event) => listener(event)), { now: () => 100 });
  store.set({ status: "working" });
  recorder.stop();
  expect(recorder.events).toHaveLength(1);
  const delivered: string[] = [];
  const queue: Array<() => void> = [];
  const replay = replayAgentEvents([
    { type: "status", at: 100, patch: { status: "thinking" } },
    { type: "progress", at: 200, patch: { progress: 1 } },
  ], (event) => delivered.push(event.type), { setTimeout: (callback) => { queue.push(callback); return callback; } });
  replay.play();
  expect(delivered).toEqual(["status"]);
  queue.shift()?.();
  expect(delivered).toEqual(["status", "progress"]);
  replay.stop();
});
