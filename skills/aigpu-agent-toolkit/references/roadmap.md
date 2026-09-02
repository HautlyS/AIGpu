# AIGpu roadmap reference

Implement future features as portable contracts before adding framework syntax.

## Near term

- Timeline model with cursor, seek, pause, and virtual time.
- Agent graph nodes and edges with accessible text fallback.
- CLI diagnostics and fix-its for patches, canvas capabilities, and device loss.
- More visual recipes with validation and reduced-motion behavior.
- Deterministic visual regression fixtures.

## Medium term

- Versioned timeline/replay package with privacy-aware metadata.
- Worker and OffscreenCanvas examples with main-thread fallback.
- Shared-device scene overlays with explicit ownership.
- Semantic theme tokens that map transparently to uniforms.
- Agent plugin generators that create code, tests, docs, and skills locally.

## Long term

- WebGPU capability profiles.
- Safe shader hot reload with pipeline invalidation.
- Efficient multi-canvas composition.
- Portable visual-session format.
- Reproducible community recipe registry.

Every contribution should include a framework-free contract, deterministic tests, an example, lifecycle documentation, and a bundle-impact review. Do not turn the core into a model provider, hosted dashboard, telemetry service, or framework-specific component library.
