import { createAgentStore, recordAgentEvents, replayAgentEvents, type AgentEvent } from "aigpu/tools";

export function createReplayDemo() {
  const store = createAgentStore({ status: "thinking" });
  const recorder = recordAgentEvents((listener) => store.subscribe((_snapshot, event) => listener(event)), { now: () => 0 });
  store.set({ status: "working", progress: 0.4 });
  store.set({ status: "success", progress: 1 });
  recorder.stop();

  const replayed: AgentEvent[] = [];
  const replay = replayAgentEvents(recorder.events, (event) => replayed.push(event), { speed: 4 });
  return { events: recorder.events, replay, replayed };
}
