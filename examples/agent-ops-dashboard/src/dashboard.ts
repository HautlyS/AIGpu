import { createAgentRegistry, type AgentEvent, type AgentRegistry, type AgentStatus } from "aigpu/tools";

export interface AgentCard {
  readonly id: string;
  readonly label: string;
  readonly status: AgentStatus;
  readonly progress: number;
  readonly activity: number;
}

export function createAgentOpsDashboard(ids: readonly string[] = ["planner", "researcher", "reviewer"]): {
  readonly registry: AgentRegistry;
  readonly cards(): readonly AgentCard[];
  readonly dispatch(event: AgentEvent): void;
} {
  const registry = createAgentRegistry();
  for (const id of ids) registry.ensure(id, { status: "idle", progress: 0, activity: 0 });
  return {
    registry,
    cards() { return registry.ids.map((id) => { const state = registry.get(id)!.snapshot.state; return { id, label: id.replace(/[-_]/gu, " "), status: state.status ?? "idle", progress: state.progress ?? 0, activity: state.activity ?? 0 }; }); },
    dispatch(event) { if (!event.agentId) return; registry.ensure(event.agentId).dispatch(event); },
  };
}
