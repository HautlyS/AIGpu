# Contributing to AIGpu

AIGpu is an independent open-source WebGPU runtime and agent-animation toolkit. Contributions should keep the public API explicit, deterministic where possible, and usable without a hosted service.

## Prerequisites

Use Node.js 22 and pnpm 9.15 or newer. The repository contains no required API keys, cloud credentials, or proprietary SDKs.

## Local workflow

```sh
pnpm install
pnpm docs:generate
pnpm build
pnpm typecheck
pnpm test:fast
pnpm check:skill-drift
```

Run the focused tests while iterating:

```sh
pnpm exec vitest run packages/aigpu-api/tests/agent-animation.test.ts packages/aigpu-cli/tests/examples/core.test.ts
```

For a real adapter, use the open Dawn/Node path or the software-renderer Docker image described by `infra/test-docker`. Tests that require a GPU are marked or gated so the default mock suite remains portable.

## API design

Prefer small functions that take a `Gpu` as their first argument. Avoid hidden globals, network calls, telemetry, framework-specific entrypoints, and provider-specific AI abstractions. New visual state should be represented by serializable uniforms and should expose an external clock when deterministic output matters.

`agentAnimation()` is intentionally an integration boundary, not an agent runtime. Applications own model calls, queues, authentication, and event transport; AIGpu turns the resulting state into a GPU effect.

## Documentation and examples

Public API docs live next to their TypeScript source as `*.docs.md`. Conceptual guides live in `docs/topics`. Run `pnpm docs:generate` after changing either tree; it regenerates the offline CLI manifest and `skills/aigpu`. Examples belong in `examples/` and must run without a hosted catalog.

## Pull requests

Include tests for behavior changes, keep package exports and generated docs synchronized, and run the full local validation commands before opening a pull request. Do not commit build output outside the tracked `dist` fixtures expected by the existing tests. Keep new dependencies MIT/BSD/Apache or otherwise clearly open-source and document their license role.

## Releases

Release builds run from a tagged GitHub release through `.github/workflows/release.yml`. The workflow installs the frozen lockfile, builds, typechecks, runs tests, checks bundle budgets, and publishes public packages to npm through OIDC. The CLI package is private and is copied into the public `aigpu` package during build; it is not published separately.
