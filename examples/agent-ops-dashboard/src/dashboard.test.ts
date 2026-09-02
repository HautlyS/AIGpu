import { expect, test } from "vitest";
import { createAgentOpsDashboard } from "./dashboard.ts";

test("dashboard projects registry state into stable cards", () => {
  const dashboard = createAgentOpsDashboard(["planner"]);
  dashboard.dispatch({ agentId: "planner", type: "progress", patch: { status: "working", progress: 0.6, activity: 0.9 } });
  expect(dashboard.cards()).toEqual([{ id: "planner", label: "planner", status: "working", progress: 0.6, activity: 0.9 }]);
});
