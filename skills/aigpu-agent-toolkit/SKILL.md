---
name: aigpu-agent-toolkit
description: >-
  Build, integrate, test, and debug framework-agnostic AIGpu agent animations,
  stores, multi-agent registries, event recording, replay, WebGPU controllers,
  and adapters for HTML, React, Vue, Svelte, Claude Code, OpenCode, Codex,
  Cursor, and other Agent Skills-compatible coding agents.
license: MIT
---

# AIGpu Agent Toolkit

Use this skill when an agent needs to create or modify GPU animations for AI agents, connect AIGpu to a UI framework, model multi-agent state, record/replay events, or validate a portable integration.

## Operating rules

- Keep the AIGpu core independent of UI frameworks, AI vendors, hosted control planes, and network transports.
- Treat `aigpu/tools` as the state boundary and `mountAgentCanvas()` as the rendering/lifecycle boundary.
- Keep React, Vue, and Svelte adapters optional peer integrations; never import them from the core.
- Pass plain serializable patches and events across workers, queues, WebSockets, stores, or model orchestrators.
- Validate finite numeric values and normalized visual fields before writing uniforms.
- Prefer deterministic clocks and replay schedulers in tests.
- Respect reduced motion, accessible labels, cleanup, resize, device loss, and SSR boundaries.
- Do not put prompts, tokens, secrets, or private model output into recorded visual events.
- Pair every visual status with readable text or an equivalent semantic channel; never rely on color alone.
- Keep the browser entrypoint small; import `aigpu/tools` only where state infrastructure is needed.
- Treat timeline, graph, worker, theme, and capability-profile work as framework-free contracts first.

## Choose the smallest integration

| Need | Use |
| --- | --- |
| GPU animation only | `agentAnimation(gpu, options)` |
| Plain HTML or custom runtime | `mountAgentCanvas(canvas, options)` from `aigpu` or `aigpu/dom` |
| Multi-agent state | `createAgentStore()` and `createAgentRegistry()` from `aigpu/tools` |
| Session capture | `recordAgentEvents()` |
| Deterministic timeline | `replayAgentEvents()` with an injected scheduler |
| React lifecycle | `@aigpu/react` and `useAgentCanvas()` |
| Vue lifecycle | `@aigpu/vue` and `useAgentCanvas()` |
| Svelte lifecycle | `@aigpu/svelte` and `agentCanvas` action |

## Standard workflow

1. Inspect the existing package exports, examples, and bundle budgets.
2. Choose the smallest AIGpu entrypoint and keep optional adapters separate.
3. Define a serializable event contract before connecting model or transport code.
4. Implement state updates through `AgentStore` or `AgentRegistry` when more than one view consumes the state.
5. Mount rendering with explicit lifecycle cleanup and an accessible canvas label.
6. Add a framework-free test first; add adapter tests only where lifecycle behavior differs.
7. Use a deterministic clock or replay scheduler for timing-sensitive behavior.
8. Run the local validation script, typecheck, tests, docs generation, and bundle check.

## Product UX checklist

- Provide an accessible canvas label and a live or adjacent text status.
- Respect `prefers-reduced-motion` by reducing activity/speed or selecting a static recipe.
- Keep approval, retry, cancel, and recovery controls outside the canvas shader.
- Show explainable states such as `waiting for approval` rather than inferred private reasoning.
- Test resize, hidden tabs, device loss, SSR hydration, and unmount cleanup.

## Future implementation shape

For timeline editors, agent graphs, worker rendering, theme tokens, diagnostics, and capability profiles, implement in this order: serializable contract, framework-free test, minimal runtime API, one HTML example, optional adapters, documentation, and bundle review. Read `references/roadmap.md` when planning a larger feature.

## Portable installation

Install this skill from a repository containing `skills/aigpu-agent-toolkit/SKILL.md`:

```sh
npx -y skills add hautlys/AIGpu --skill aigpu-agent-toolkit -a claude-code -a opencode -a codex -y
```

Install to every detected compatible agent:

```sh
npx -y skills add hautlys/AIGpu --skill aigpu-agent-toolkit --agent '*' -y
```

Install from a local checkout while developing:

```sh
npx -y skills add ./ --skill aigpu-agent-toolkit -a claude-code -a opencode -a codex --copy -y
```

The CLI supports project scope by default and global scope with `-g`. Use `--copy` where symlinks are unavailable.

## Validation commands

From the AIGpu repository:

```sh
node scripts/validate-agent-integrations.mjs
pnpm build
pnpm typecheck
pnpm test:fast
pnpm docs:generate
pnpm check:skill-drift
pnpm bundle-check
```

Read the bundled references only when needed:

- `references/agent-contracts.md`: event, store, registry, and replay contracts.
- `references/framework-matrix.md`: HTML, React, Vue, Svelte, SSR, accessibility, and cleanup.
- `references/skills-cli.md`: `npx skills add` usage and supported-agent targeting.
- `references/roadmap.md`: staged future implementations and contribution acceptance criteria.
