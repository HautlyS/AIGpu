import type { AgentAnimationPatch, AgentAnimationState, AgentStatus } from "./agent.ts";

export type AgentEventType = "state" | "reset" | "progress" | "status";

export interface AgentEvent {
  readonly agentId?: string;
  readonly type: AgentEventType;
  readonly patch?: AgentAnimationPatch;
  readonly at?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AgentStoreSnapshot {
  readonly revision: number;
  readonly state: AgentAnimationPatch;
}

export type AgentStoreListener = (snapshot: AgentStoreSnapshot, event: AgentEvent) => void;

export interface AgentStore {
  readonly snapshot: AgentStoreSnapshot;
  set(patch: AgentAnimationPatch, metadata?: Readonly<Record<string, unknown>>): this;
  dispatch(event: AgentEvent): this;
  reset(metadata?: Readonly<Record<string, unknown>>): this;
  subscribe(listener: AgentStoreListener): () => void;
  toJSON(): string;
}

/** Pure state bridge for any UI, transport, store, worker, or agent orchestrator. */
export function createAgentStore(initial: AgentAnimationPatch = {}): AgentStore {
  let state = freezePatch(initial);
  let revision = 0;
  const listeners = new Set<AgentStoreListener>();
  const notify = (event: AgentEvent) => {
    const snapshot = { revision, state: freezePatch(state) };
    for (const listener of [...listeners]) listener(snapshot, event);
  };
  const apply = (patch: AgentAnimationPatch, event: AgentEvent) => {
    state = freezePatch({ ...state, ...patch, colors: patch.colors ? { ...(state.colors ?? {}), ...patch.colors } : state.colors });
    revision += 1;
    notify(event);
  };
  return {
    get snapshot() { return { revision, state: freezePatch(state) }; },
    set(patch, metadata) { apply(patch, { type: "state", patch, metadata }); return this; },
    dispatch(event) {
      if (event.type === "reset") { state = freezePatch(initial); revision += 1; notify(event); }
      else if (event.patch) apply(event.patch, event);
      return this;
    },
    reset(metadata) { return this.dispatch({ type: "reset", metadata }); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    toJSON() { return JSON.stringify({ revision, state }); },
  };
}

export interface AgentRegistrySnapshot {
  readonly revision: number;
  readonly agents: Readonly<Record<string, AgentStoreSnapshot>>;
}

export interface AgentRegistry {
  readonly snapshot: AgentRegistrySnapshot;
  readonly ids: readonly string[];
  ensure(id: string, initial?: AgentAnimationPatch): AgentStore;
  get(id: string): AgentStore | undefined;
  remove(id: string): boolean;
  subscribe(listener: (snapshot: AgentRegistrySnapshot, event: AgentEvent) => void): () => void;
}

/** Multi-agent state registry with stable IDs and one subscription for dashboards. */
export function createAgentRegistry(): AgentRegistry {
  const stores = new Map<string, AgentStore>();
  const listeners = new Set<(snapshot: AgentRegistrySnapshot, event: AgentEvent) => void>();
  let revision = 0;
  const snapshot = (): AgentRegistrySnapshot => ({ revision, agents: Object.fromEntries([...stores].map(([id, store]) => [id, store.snapshot])) });
  const emit = (event: AgentEvent) => { revision += 1; for (const listener of [...listeners]) listener(snapshot(), event); };
  return {
    get snapshot() { return snapshot(); },
    get ids() { return [...stores.keys()]; },
    ensure(id, initial = {}) {
      if (!validId(id)) throw new TypeError("Agent IDs must be non-empty strings without control characters");
      const existing = stores.get(id);
      if (existing) return existing;
      const store = createAgentStore(initial);
      store.subscribe((_next, event) => emit({ ...event, agentId: id }));
      stores.set(id, store);
      emit({ type: "state", agentId: id, patch: initial });
      return store;
    },
    get: (id) => stores.get(id),
    remove(id) { const removed = stores.delete(id); if (removed) emit({ type: "reset", agentId: id }); return removed; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

export interface AgentEventRecorder {
  readonly events: readonly AgentEvent[];
  stop(): void;
  clear(): void;
  toJSON(pretty?: boolean): string;
}

/** Records a source of serializable agent events; works with any subscribe/unsubscribe contract. */
export function recordAgentEvents(subscribe: (listener: (event: AgentEvent) => void) => () => void, options: { readonly now?: () => number } = {}): AgentEventRecorder {
  const events: AgentEvent[] = [];
  const now = options.now ?? (() => Date.now());
  const unsubscribe = subscribe((event) => { events.push({ ...event, at: event.at ?? now() }); });
  return { events, stop() { unsubscribe(); }, clear() { events.length = 0; }, toJSON(pretty = false) { return JSON.stringify(events, null, pretty ? 2 : 0); } };
}

export interface AgentReplay {
  play(): void;
  pause(): void;
  stop(): void;
}

/** Replays events using an injected scheduler, making timelines testable and UI-independent. */
export function replayAgentEvents(events: readonly AgentEvent[], deliver: (event: AgentEvent) => void, options: { readonly speed?: number; readonly setTimeout?: (cb: () => void, delay: number) => unknown; readonly clearTimeout?: (handle: unknown) => void } = {}): AgentReplay {
  const speed = options.speed ?? 1;
  if (!(speed > 0) || !Number.isFinite(speed)) throw new TypeError("replay speed must be a finite number greater than zero");
  const schedule = options.setTimeout ?? ((cb, delay) => globalThis.setTimeout(cb, delay));
  const cancel = options.clearTimeout ?? ((handle) => globalThis.clearTimeout(handle as number));
  let index = 0;
  let handle: unknown;
  let playing = false;
  const next = () => {
    if (!playing || index >= events.length) { playing = false; return; }
    const event = events[index++];
    deliver(event);
    const current = event.at ?? 0;
    const following = events[index]?.at ?? current;
    handle = schedule(next, Math.max(0, (following - current) / speed));
  };
  return {
    play() { if (!playing) { playing = true; next(); } },
    pause() { playing = false; if (handle !== undefined) cancel(handle); handle = undefined; },
    stop() { playing = false; if (handle !== undefined) cancel(handle); handle = undefined; index = 0; },
  };
}

function validId(id: string): boolean { return typeof id === "string" && id.trim().length > 0 && !/[\u0000-\u001F\u007F]/u.test(id); }
function freezePatch(patch: AgentAnimationPatch): AgentAnimationPatch {
  const colors = patch.colors ? Object.freeze({ ...patch.colors }) : patch.colors;
  return Object.freeze({ ...patch, ...(colors ? { colors } : {}) });
}

export type { AgentAnimationState, AgentStatus };
