---
name: hautly-entity
description: >-
  Build, integrate, and extend the Hautly alive ASCII orb-spirit entity engine.
  Cross-platform companion with 5 forms, 8 moods, breathing animations, eye tracking,
  particle auras, speech bubbles, mesh distortion effects, and native adapters for
  Opencode, Claude Code, Codex, React, Vue, Svelte, terminal, and WebGPU.
license: MIT
---

# Hautly Entity

Use this skill when building or modifying the Hautly alive ASCII companion entity — the orb-spirit that lives alongside coding agents, renders in terminals, browsers, and WebGPU canvases.

## Architecture

Hautly is a layered engine:

```
hautly-core.ts          → Pure state machine (mood, breath, eye, particles, speech)
hautly-renderers.ts     → 5 ASCII form renderers (orb, crystal, jelly, phoenix, nebula)
hautly-speech.ts        → Speech bubble system with AI adapters
hautly-terminal.ts      → ANSI terminal renderer
hautly-web.ts           → HTML/Canvas2D renderer with mesh effects
hautly-webgpu.ts        → WebGPU bridge (GPU glow + ASCII overlay)
hautly-react.tsx        → React hook + component
hautly-vue.ts           → Vue 3 composable + component
hautly-svelte.ts        → Svelte action + component
hautly-agents.ts        → Agent adapters (Opencode, Claude Code, Codex)
```

## Core Concepts

- **Engine** — `createHautly(options)` returns a `HautlyEngine` with `tick(dt)`, `set(patch)`, `speak(text)`, `blink()`, `reset()`, `frame(w, h)`.
- **Mood** — 8 states: `idle`, `listening`, `thinking`, `speaking`, `excited`, `sleepy`, `error`, `healing`. Each maps to a color palette.
- **Form** — 5 visual forms: `orb`, `crystal`, `jelly`, `phoenix`, `nebula`. Custom renderers via `createCustomRenderer()`.
- **Renderer** — Pure function `(state, w, h) → { cells, colors, width, height }`. ANSI color codes for terminal, CSS for canvas.
- **Speech** — `createSpeechController(engine)` manages typing animation, word-wrapping, auto-dismiss, and AI adapter streaming.
- **Agent Adapter** — `createOpencodeAdapter()`, `createClaudeCodeAdapter()`, `createCodexAdapter()` map agent events to Hautly moods and speech.

## Operating Rules

- Keep `hautly-core.ts` rendering-agnostic — never import DOM, terminal, or GPU code from core.
- Renderers consume `HautlyState` and produce `RenderedFrame` — no side effects.
- Web adapter handles DPR, ResizeObserver, IntersectionObserver, and mesh effects internally.
- Terminal adapter uses ANSI escape codes directly — no blessed or external terminal libraries.
- Agent adapters map `AgentEventType` → `HautlyMood` via a configurable mood map.
- Speech controller manages typing animation state independently of the rendering loop.
- Never hardcode canvas dimensions — always read from `getBoundingClientRect()` or container.
- Use grid-based rendering (cellSize) not pixel-by-pixel for canvas performance.

## Standard Workflow

1. Understand which platform you're targeting (terminal, canvas, WebGPU, framework).
2. Import the smallest adapter needed — don't pull in all renderers.
3. Create engine with `createHautly()`, attach speech controller if needed.
4. For canvas: use `createWebHautly()` or `hautlyWeb()` which handle all responsiveness.
5. For terminal: use `createTerminalHautly()` or `hautlyTerminal()` with ANSI output.
6. For frameworks: use `useHautly()` hook (React/Vue) or `hautly()` action (Svelte).
7. For agent integration: use `createOpencodeAdapter()` and emit events via `adapter.emit()`.
8. Always call `destroy()` on cleanup to disconnect observers and cancel animation frames.

## Platform Entry Points

| Need | Import |
| --- | --- |
| Core engine only | `@hautly/entity` → `createHautly` |
| Canvas rendering | `@hautly/entity/web` → `createWebHautly`, `hautlyWeb` |
| Terminal rendering | `@hautly/entity/terminal` → `createTerminalHautly`, `hautlyTerminal` |
| WebGPU rendering | `@hautly/entity/webgpu` → `createWebGPUHautly`, `hautlyGPU` |
| React component | `@hautly/entity/react` → `useHautly`, `HautlyEntity` |
| Vue component | `@hautly/entity/vue` → `useHautlyVue`, `HautlyEntityVue` |
| Svelte action | `@hautly/entity/svelte` → `hautlyAction` |
| Agent adapters | `@hautly/entity/agents` → `createOpencodeAdapter`, etc. |
| Speech system | `@hautly/entity` → `createSpeechController` |

## Mesh Effects (Canvas)

The web adapter supports interactive mesh distortion:
- **Hover ripple** — gentle sine wave offset near cursor, with brightening.
- **Click shockwave** — expanding ring that pushes cells outward.
- Effects decay over time and are filtered each frame.
- Mouse position tracked relative to canvas for eye-tracking.

## Performance Notes

- Canvas rendering uses grid-based cells (~4500x fewer ops than pixel-by-pixel).
- IntersectionObserver pauses animation when canvas is off-screen (200px rootMargin).
- ResizeObserver recalculates frame dimensions on container resize.
- DPR-aware sizing — canvas buffer matches device pixel ratio.
- Terminal rendering uses `setInterval` with configurable FPS (default 20).
- WebGPU bridge dynamically imports `aigpu` — keeps the package optional.

## Validation

From the AIGpu repository:

```sh
node -c packages/hautly-entity/src/hautly-core.ts
node -c packages/hautly-entity/src/hautly-renderers.ts
node -c packages/hautly-entity/src/hautly-web.ts
node -c packages/hautly-entity/src/hautly-terminal.ts
node -c packages/hautly-entity/src/hautly-webgpu.ts
node -c packages/hautly-entity/src/hautly-agents.ts
node -c packages/hautly-entity/src/hautly-speech.ts
```

## References

- `references/hautly-core.md`: Engine types, mood palettes, frame generation, particle system.
- `references/hautly-renderers.md`: Orb, crystal, jelly, phoenix, nebula renderer internals.
- `references/hautly-web.md`: Canvas/DOM adapter, mesh effects, responsiveness, lifecycle.
- `references/hautly-agents.md`: Agent adapter protocol, mood mapping, event types.
