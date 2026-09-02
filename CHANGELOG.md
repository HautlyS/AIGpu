# Changelog

## Unreleased — AIGpu

AIGpu is an independent, offline-first fork focused on GPU animations for AI agents. The fork adds `agentAnimation()`, a stable status/progress uniform contract, built-in palettes, a reusable WGSL shader, and a framework-neutral example.

The repository removes the hosted documentation application, HTTP example catalog, cloud deployment workflows, and framework-specific integrations. Documentation and examples are generated or read locally; MCP is available over stdio; the runtime remains based on WebGPU, WGSL, TypeScript, Vite/Webpack loaders, open Dawn bindings, Vitest, and the Model Context Protocol.
