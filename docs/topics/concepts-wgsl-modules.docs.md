---
title: WGSL modules
summary: Split shaders into reusable WGSL files with import and export; aigpu resolves the graph, preserves entry-point and binding names, removes unused declarations, and can minify the emitted WGSL.
keywords: wgsl modules, wgsl import, wgsl export, shader modules, shader imports, reusable shaders, module graph, pure modules, tree shaking, dead code elimination
relatedSymbols:
  - resolveShader
  - ShaderSource
  - wgslVitePlugin
prevNext:
  prev:
    title: Context
    href: /concepts/context
  next:
    title: Draws
    href: /concepts/draws
order: 15
---

# WGSL modules

## Split a shader into modules

With the wgsl loader, you can create reusable shader modules:

```wgsl
// color.wgsl
export fn gradient(uv: vec2f) -> vec3f {
  return vec3f(uv, 0.4);
}
```

Then, import it by name from other wgsl files:

```wgsl
// shader.wgsl
import { gradient } from "./color.wgsl";

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  return vec4f(gradient(uv), 1.0);
}
```

Import the entry shader from TypeScript:

```ts
import { effect, init, surface } from "aigpu";
import shader from "./shader.wgsl";

const gpu = await init();
const canvas = document.querySelector("canvas");
if (!canvas) throw new Error("Missing canvas");

const output = surface(gpu, canvas);
effect(gpu, shader).draw(output);
```

## Keep resources in the entry module

Imported modules are pure: they cannot declare `@group` or `@binding` resources. A shared module does not own the bind-group layout of every shader that consumes it.

This module is invalid:

```wgsl
// noise.wgsl
struct NoiseConfig {
  seed: f32,
}

// Error: AIGPU-RESOLVE-MODULE-BINDING
@group(0) @binding(0) var<uniform> noise_config: NoiseConfig;
```

Export the data shape and behavior instead:

```wgsl
// noise.wgsl
export struct NoiseConfig {
  seed: f32,
}

export fn sample_noise(config: NoiseConfig, uv: vec2f) -> f32 {
  return fract(sin(dot(uv, vec2f(12.9898, 78.233)) + config.seed) * 43758.5453);
}
```

Then declare the resource in the entry shader:

```wgsl
// shader.wgsl
import { NoiseConfig, sample_noise } from "./noise.wgsl";

@group(0) @binding(0) var<uniform> noise_config: NoiseConfig;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let value = sample_noise(noise_config, uv);
  return vec4f(vec3f(value), 1.0);
}
```

If an imported module declares a resource, resolution fails with `AIGPU-RESOLVE-MODULE-BINDING` and points to the declaration that must move.

## Import local and packaged modules

| Import | Use |
| --- | --- |
| `./color.wgsl` or `../shared/color.wgsl` | A module relative to the importing file. |
| `@aigpu/wgsl-std/hash` | A WGSL module exposed by an installed package. |
| `@acme/shaders/noise` | A third-party or workspace package whose exports map points to `.wgsl`. |
| `@/shaders/color.wgsl` | A root-relative module when `resolveShader()` is given `rootDir`. |

Package imports resolve through `node_modules` and package `exports` maps. `@aigpu/wgsl-std` ships with aigpu, so its modules can be imported without copying their source:

```wgsl
import { pcg2d, unitFloat } from "@aigpu/wgsl-std/hash";
```

See [Publishing WGSL module packages](publishing-wgsl-packages.docs.md) when the reusable module should live in its own npm or workspace package.

## What aigpu does with the graph

For an entry shader, aigpu:

1. resolves every transitive import;
2. checks module syntax and the pure-module rule;
3. gives imported declarations collision-safe private names;
4. keeps entry points, resources, and overrides addressable by their authored names;
5. removes declarations that no entry point can reach;
6. emits one ordinary WGSL program.

This means two modules can export a helper with the same name without colliding, and importing one function from a large library does not ship every unused declaration. Entry-point names such as `fs_main` remain unchanged for pipeline creation.

Module resolution happens during build or setup, never inside the render loop. Bundler integrations return a `ShaderSource`; direct `resolveShader()` calls return a `ResolvedShader` whose `.wgsl` field is the finished string.

## Configure module resolution

WGSL itself has no standard module system. aigpu adds `import` and `export` while you author a shader, resolves the complete module graph during build or setup, and emits ordinary WGSL before WebGPU sees it.

With the webpack, other bundlers, or Vite integration configured, import only the entry file from TypeScript. The loader follows its WGSL imports and returns one `ShaderSource` object for aigpu.

| Environment | Use | Read next |
| --- | --- | --- |
| Vite, other bundlers, or webpack | `@aigpu/wgsl/loader-webpack` | [Using aigpu with Vite and other bundlers](bundlers.docs.md) |
| Vite or Rollup | `@aigpu/wgsl/loader-vite` | [Using aigpu with Vite and other bundlers](bundlers.docs.md) |
| three.js TSL node materials | `@aigpu/wgsl/loader-vite` plus the example reference helper | [Using aigpu WGSL modules with three.js](/guides/threejs) |
| Node.js, scripts, tests, or custom tooling | `resolveShader()` from `@aigpu/wgsl/runtime` | [Using aigpu without a bundler](no-bundler.docs.md) |

The loaders register transitive imports with the bundler, so edits to a shared `.wgsl` file participate in watch mode and HMR. Use `resolveShader()` when there is no bundler to read and flatten the files for you.

## Validate the complete shader

Validate the entry file, not each module in isolation:

```sh
npx aigpu check --require-validation ./shader.wgsl
```

`aigpu check` resolves the same graph and reports errors against the authored modules. `--require-validation` also requires a WebGPU device to accept the emitted WGSL.

Bundler loaders resolve imports, enforce module purity, mangle collisions, and remove unused declarations, but they do not perform device-backed WGSL validation. Run `aigpu check --require-validation` in CI or a pre-commit hook when validation must be a gate.

## Common errors

| Error | Cause | Fix |
| --- | --- | --- |
| `AIGPU-WGSL-IMP-ORDER` | An import appears after a declaration. | Move every import to the top of the entry or module. |
| `AIGPU-WGSL-SYM-NOEXPORT` | The target module does not export the imported name. | Add `export` to the declaration or correct the import. |
| `AIGPU-WGSL-IMP-SELF` | The import graph contains a cycle. | Move shared declarations into a lower-level module and break the cycle. |
| `AIGPU-RESOLVE-MODULE-BINDING` | An imported module declares a binding. | Export its struct or helper and declare the resource in the entry. |
| `AIGPU-WGSL-PKG-NOTFOUND` | A package or exported subpath cannot be resolved. | Install the package and check its name and `exports` map. |

The [`resolveShader` reference](/@aigpu/wgsl/runtime/resolve-shader.docs.md) lists the complete syntax, options, return shape, and diagnostics.

## Next steps

- [Using aigpu with Vite and other bundlers](bundlers.docs.md) — configure `.wgsl` imports and TypeScript types.
- [Using aigpu WGSL modules with three.js](/guides/threejs) — adapt the example helper to call pure resolved WGSL functions from TSL node materials.
- [Using aigpu without a bundler](no-bundler.docs.md) — resolve an entry graph from Node.js, scripts, or tests.
- [Publishing WGSL module packages](publishing-wgsl-packages.docs.md) — expose reusable `.wgsl` modules through an npm package.
- [The default shader workflow](shader-workflow.docs.md) — validate, render, inspect, and test shader changes.
