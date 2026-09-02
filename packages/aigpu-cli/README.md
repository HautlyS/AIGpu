# @aigpu/cli

Independent AIGpu CLI package. It installs the `aigpu` command-line binary for offline docs,
WGSL utilities, local examples, GPU diagnostics, and MCP over stdio.

## Install / run

```sh
pnpm add -D @aigpu/cli
pnpm exec aigpu --help
pnpm exec aigpu docs ls
pnpm exec aigpu docs cat /@aigpu/core/Buffer.docs.md
pnpm exec aigpu docs grep -i --package @aigpu/wgsl minify
pnpm exec aigpu mcp
pnpm exec aigpu mcp --project-from-cwd # enable safe local example downloads
pnpm add -D @aigpu/wgsl # required only for `aigpu check`
pnpm exec aigpu check ./shader.wgsl
```

You can also run the binary directly through a package runner:

```sh
pnpm dlx aigpu --help
npx -y aigpu --help
```

## Package and binary names

- Package name: `@aigpu/cli`
- Binary name: `aigpu`

The bare package name `aigpu` is reserved for the public runtime API package.
This package only owns the CLI binary.

## Commands

- `aigpu docs ls [path]` lists packages or docs below a bundled virtual docs path.
- `aigpu docs cat <path|symbol>` prints docs by canonical path or unique symbol.
- `aigpu docs grep [-i] [--package <pkg>] <pattern>` searches bundled docs content. Matching is case-sensitive by default; use `-i` for case-insensitive search.
- `aigpu docs find <query>` searches docs paths and symbols, not full content.
- `aigpu docs path <symbol|path>` resolves a symbol/path for shell usage.
- `aigpu mcp [--output-dir <absolute-directory> | --project-from-cwd]` serves the `docs` and local `examples` MCP tools over stdio. No network connection is opened. On Linux and macOS, an explicit output scope enables `examples.download`, whose `destination` is a relative new directory beneath that scope; the operation is omitted from the Windows schema. `AIGPU_MCP_OUTPUT_DIR` and `AIGPU_EXAMPLES_DIR` are the environment-variable alternatives.
- `aigpu check <file.wgsl>` resolves imports, validates through `@aigpu/wgsl`, and prints reflection JSON with bindings/layouts for agent tooling. Because `@aigpu/wgsl` is an optional peer of `@aigpu/cli`, install it next to the CLI before using `check` (for example, `pnpm add -D @aigpu/wgsl`). Reflection errors surface the Phase-1 fix-it text verbatim.

`aigpu examples` reads `./examples` by default, supports `--root`, and uses an atomic symlink-safe
copy for `pull`. `aigpu doctor` and `aigpu wgsl` are reserved and currently print coming-soon
messages.
