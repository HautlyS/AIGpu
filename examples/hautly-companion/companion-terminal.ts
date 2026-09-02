/**
 * Hautly Companion — coding agent companion example.
 *
 * Demonstrates how Hautly connects as a living orb companion to
 * Opencode, Claude Code, or Codex, reacting to agent events in real time.
 *
 * Usage:
 *   # Terminal mode (any platform):
 *   npx tsx examples/hautly-companion/companion-terminal.ts
 *
 *   # With a specific agent:
 *   npx tsx examples/hautly-companion/companion-terminal.ts --agent=claude-code
 *   npx tsx examples/hautly-companion/companion-terminal.ts --agent=codex
 *   npx tsx examples/hautly-companion/companion-terminal.ts --agent=opencode
 */

import {
  createHautly,
  createTerminalHautly,
  createAgentAdapter,
  createOpencodeAdapter,
  createClaudeCodeAdapter,
  createCodexAdapter,
  createOpencodeSkillAdapter,
  createClaudeCodeSkillAdapter,
  createCodexSkillAdapter,
  createAgentAIAdapter,
  type AgentEvent,
  type SupportedAgent,
} from "../../packages/hautly-entity/src/index.ts";

// ─── Parse CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const agentArg = args.find(a => a.startsWith("--agent="))?.split("=")[1] as SupportedAgent | undefined;
const agent: SupportedAgent = agentArg ?? "auto";

// ─── Create Hautly entity ────────────────────────────────────────────────────

const h = createTerminalHautly({
  label: "hautly-companion",
  form: "orb",
  initial: { mood: "idle", energy: 0.5 },
  fps: 15,
});

// ─── Create agent adapter ────────────────────────────────────────────────────

const adapter = createAgentAdapter({
  agent,
  engine: h.engine,
  autoSpeak: true,
  maxSpeechLength: 50,
  onEvent: (event: AgentEvent) => {
    // Log events for debugging
    const ts = new Date().toISOString().slice(11, 19);
    console.error(`[${ts}] ${event.type}: ${event.message ?? event.tool ?? ""}`);
  },
});

// ─── Start everything ────────────────────────────────────────────────────────

async function main() {
  console.error(`\n  Hautly Companion — ${agent} mode\n`);
  console.error(`  Watching for agent events... Press Ctrl+C to exit.\n`);

  // Start the ASCII animation
  const stopRender = h.start();

  // Connect to the agent
  await adapter.connect();

  // Set up cleanup
  const cleanup = () => {
    h.clear();
    h.stop();
    adapter.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // If in skill mode, simulate some events to show Hautly reacting
  if (agent === "auto" || !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    await simulateEvents(adapter);
  }
}

// ─── Event Simulation (for demo without a real agent) ────────────────────────

async function simulateEvents(adapter: ReturnType<typeof createAgentAdapter>) {
  const events: AgentEvent[] = [
    { agentId: "demo", type: "thinking", message: "Analyzing code..." },
    { agentId: "demo", type: "tool:call", tool: "read_file", message: "Reading package.json" },
    { agentId: "demo", type: "tool:result", message: "Found 3 dependencies" },
    { agentId: "demo", type: "working", message: "Generating refactoring plan" },
    { agentId: "demo", type: "tool:call", tool: "edit_file", message: "Editing src/index.ts" },
    { agentId: "demo", type: "message:assistant", message: "I've refactored the module to use the new pattern." },
    { agentId: "demo", type: "idle", message: "Ready for next task" },
  ];

  for (const event of events) {
    await sleep(2000);
    adapter.emit(event);
  }

  // Loop the demo
  await sleep(4000);
  await simulateEvents(adapter);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
