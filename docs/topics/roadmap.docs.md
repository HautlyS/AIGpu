---
title: AIGpu roadmap and future implementations
summary: A staged, framework-agnostic roadmap for timelines, agent graphs, diagnostics, workers, themes, capability profiles, and community recipes.
keywords: roadmap, future, timeline, replay, agent graph, workers, OffscreenCanvas, diagnostics, themes, capability profiles
---

# AIGpu roadmap and future implementations

AIGpu prioritizes portable contracts over vendor-specific features. Each roadmap item must begin with a framework-free data model, a deterministic test, a working example, and documentation that states ownership and failure behavior.

## Current foundation

The current workspace already provides the WebGPU/WGSL runtime, agent animation state, DOM controller, React/Vue/Svelte adapters, multi-agent store and registry tools, event recording, deterministic replay, visual recipes, offline CLI, local MCP, portable Agent Skills, and bundle-budget gates.

## Near-term implementations

| Initiative | First deliverable | Acceptance criteria |
| --- | --- | --- |
| Timeline model | A serializable sequence with cursor, seek, pause, and virtual time | JSON round-trip, deterministic scheduler tests, no UI dependency |
| Agent graph overlay | Stable nodes, edges, status, and activity contracts | HTML and scene examples, bounded node count, accessible text fallback |
| Visual diagnostics | CLI fix-its for invalid patches, missing canvas support, and device loss | Actionable error messages and regression fixtures |
| More recipes | Education, robotics, finance, health, and low-power visual directions | WGSL validation, reduced motion, documented event sequence |
| Visual regression | Controlled pixel-diff fixtures for core recipes | Stable thresholds and a software/headless path |

## Medium-term implementations

| Initiative | Product value | Constraint |
| --- | --- | --- |
| Timeline/replay package | Scrubbable sessions for demos and debugging | Versioned JSON schema and privacy-aware metadata |
| Worker examples | Main-thread relief for dense dashboards | OffscreenCanvas path plus graceful fallback |
| Shared-device overlays | Compose agent visuals with an existing 2D/3D scene | Explicit device and target ownership |
| Semantic theme tokens | Consistent status palettes and motion policies | Tokens map transparently to uniforms |
| Agent plugin generators | Scaffold an animation, adapter, tests, docs, and skill | Generated code remains local and inspectable |

## Long-term implementations

| Initiative | Intended outcome | Main risk |
| --- | --- | --- |
| WebGPU capability profiles | Select quality by device limits and features | Avoid silently enabling unsupported paths |
| Shader hot reload | Faster local visual authoring | Pipeline invalidation and resource cleanup |
| Multi-canvas composition | Efficient large agent walls | Memory, encoding, and accessibility complexity |
| Portable session format | Exchange visual event sessions across tools | Versioning, retention, and sensitive metadata |
| Community recipe registry | Share reproducible open visual recipes | Provenance, licensing, validation, and supply-chain safety |

## Contribution shape

A roadmap contribution should include a small contract, a framework-free implementation, one or more examples, deterministic tests, a documentation page, and a bundle-impact review. A new visual feature should not require a hosted service or a proprietary provider. A new adapter should delegate to the existing DOM/core contract rather than fork the rendering lifecycle.

## Explicit non-goals

AIGpu is not planning to become a model provider, prompt orchestration service, hosted observability dashboard, private telemetry system, application router, or framework-specific component library. Integrations may connect those systems to AIGpu through plain events, but the core should remain independent.
