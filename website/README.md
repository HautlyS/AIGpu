# AIGpu GitHub Pages showcase

This directory is the dependency-free public showcase for [hautlys/AIGpu](https://github.com/hautlys/AIGpu). It is intentionally static: the demo uses Canvas2D as a universal preview fallback, while the repository examples show the real WebGPU, WGSL, HTML, React, Vue, and Svelte integrations.

## Local preview

```sh
python3 -m http.server 4173 --directory website
```

Open <http://localhost:4173> and use the live playground, status controls, filters, copy buttons, and source links.

## Production deployment

`.github/workflows/pages.yml` publishes this directory with the official GitHub Pages Actions. Enable GitHub Pages in repository settings with **Source: GitHub Actions**. Pushes to `main` that change `website/**` deploy automatically. The workflow also validates required files and the canonical `hautlys/AIGpu` source link.

The showcase is model agnostic. It does not call a model provider, persist prompts, or require an API key. Replace the simulated event driver with your own plain event stream when embedding the same concepts in an application.
