---
title: CLI
summary: aigpu CLI commands, arguments, flags, and exit codes.
websitePath: /cli
relatedSymbols:
---
# CLI

The aigpu CLI provides command-line tooling for working with aigpu. Use it to validate WGSL shaders, query the aigpu documentation, inspect canonical example source, serve those same docs and examples over MCP, diagnose your local GPU environment, and set up the native runtime for Node.js workflows.

## Installation and usage

The CLI ships with the `aigpu` package, so no separate installation is required. Run any command with `npx aigpu`:

```terminal
npx aigpu <command> [args] [flags]
npx aigpu --help
npx aigpu --version
```

The `examples` commands never execute fetched code.

## Command inventory

| Command | Dispatcher description |
| --- | --- |
| `check` | Validate and reflect a WGSL file as JSON |
| `docs` | Explore bundled AIGPU documentation |
| `examples` | Inspect canonical gallery source (never executes code) |
| `mcp` | Serve documentation and examples as MCP tools over stdio |
| `snapshot` | Compare the representative GPU pixel snapshot |
| `install-dawn` | Download and verify the portable Node Dawn prebuild |
| `install-software-renderer` | Download and verify the portable CPU renderer |
| `doctor` | Verify this machine can render headless (JSON verdict + fixes) |

## check

The `aigpu check` command validates a WGSL file without running it. On success it prints the shader's reflection data as JSON; on failure it reports the validation errors and exits non-zero. Use it to catch shader problems early, in your editor, pre-commit hooks, or CI.

```text
Usage: aigpu check <file.wgsl> [--require-validation]
```

| Flag | Argument |
| --- | --- |
| `--require-validation` | none |

Device-backed WGSL validation runs in `resolveShader`'s default `"auto"` mode: when this machine has a WebGPU device, invalid WGSL fails the command; when it does not, `check` warns once on stderr and still reports reflection. Pass `--require-validation` (or set `AIGPU_VALIDATE=require`) to fail instead of degrading — useful in CI, where a missing device would otherwise silently reduce `check` to a parse-and-reflect pass. The JSON payload includes a `validation` object (`{ mode, attempted, ok, skipped? }`) describing exactly what ran, and error payloads carry `fix`/`where` when the underlying error provides them.

A failing device check never costs you the rest of the document: when validation rejects the shader (or, under `--require-validation`, when no device could be acquired), `check` still prints the full payload — `diagnostics`, `reflection` and `wgsl` — and reports the failure as `validation.error` (`{ code, message, fix?, where?, ... }`) with `ok: false`, exiting 1. So the JSON contract is the same whether or not the machine running `check` has a WebGPU device; only `validation` differs. Resolution failures (a missing import, a module that declares bindings, an invalid `AIGPU_VALIDATE`) remain hard errors: they print a single error object on stderr with no payload.

```terminal
npx aigpu check ./shaders/main.wgsl
npx aigpu check ./shaders/main.wgsl --require-validation
AIGPU_VALIDATE=require npx aigpu check ./shaders/main.wgsl
```

## docs

The `aigpu docs` commands let you explore the aigpu documentation from the terminal. The full corpus — API reference and guides — ships inside the package, so every query runs locally and works offline. Use `ls` to browse the documentation tree, `cat` to print a page or symbol, `grep` to search across content, and `find` to look up the page to read next by name, keyword, or phrase.

```text
Usage: aigpu docs <command> [args] [flags]

Start here: aigpu docs cat getting-started.md   (the guide for using the latest API correctly)

Commands:
  ls [path]                  List packages or docs under a virtual path
  cat <path|symbol>          Print docs by virtual path or unique symbol
  grep [-i] [--package <pkg>] <pattern>
                             Search docs content; case-sensitive unless -i is used
  find <query>               Find symbols and docs paths by substring
  path <symbol|path>         Resolve a symbol or virtual path for shell usage
  symbols                    List indexed symbols
  help                       Show this help

Examples:
  aigpu docs cat getting-started.md
  aigpu docs ls /guides
  aigpu docs ls
  aigpu docs cat /@aigpu/core/Buffer.docs.md
  aigpu docs grep -i --package @aigpu/wgsl minify
  aigpu docs path Buffer
```

### docs cat

```terminal
npx aigpu docs cat <path|symbol>
npx aigpu docs cat /@aigpu/core/Buffer.docs.md
```

### docs find

```terminal
npx aigpu docs find <query>
npx aigpu docs find buffer
npx aigpu docs find "wgsl loader"
```

Every whitespace-separated word in the query must match, so multi-word phrases
narrow the result instead of returning nothing. `find` looks at symbol names,
doc paths, page titles, and the search keywords a page declares; only when that
finds nothing does it fall back to searching page bodies, which is what makes
prose (`"typescript wgsl import"`) and error codes
(`AIGPU-WGSL-PKG-NOTFOUND`) resolve to a page. Use `grep` when you want every
content match with its line, and `find` when you want the page to read next.
Results are ranked best-match-first and capped at 20; a truncated response ends
with a line telling you how many matches were hidden so you can add a word.

### docs grep

```terminal
npx aigpu docs grep [-i] [--package <pkg>] <pattern>
npx aigpu docs grep -i --package @aigpu/wgsl minify
```

| Flag | Argument |
| --- | --- |
| `-i` | none |
| `--package` | `<pkg>` |

### docs help

```terminal
npx aigpu docs help
npx aigpu docs --help
```

### docs ls

```terminal
npx aigpu docs ls [path]
npx aigpu docs ls /guides
```

### docs path

```terminal
npx aigpu docs path <symbol|path>
npx aigpu docs path Buffer
```

### docs symbols

```terminal
npx aigpu docs symbols
```

## doctor

The `aigpu doctor` command verifies that the current machine can render headless with aigpu. It runs its checks end to end — including a real render unless you pass `--no-render` — and prints a JSON verdict with suggested fixes. The command exits `0` when the environment is healthy and non-zero when it is not.

```text
Usage: aigpu doctor [--no-render] [--pretty]

Diagnose whether this machine can render headless with aigpu/node. JSON is written by default.
```

| Flag | Argument |
| --- | --- |
| `--no-render` | none |
| `--pretty` | none |

```terminal
npx aigpu doctor
npx aigpu doctor --no-render
npx aigpu doctor --pretty
```

## examples

The `aigpu examples` commands let you search and inspect the source code of the aigpu example gallery without cloning the repository. Use `search` to find examples, `show` to list an example's files and metadata, `cat` to print a single file, and `pull` to copy an example's complete source into a local directory.

```text
aigpu examples — inspect canonical gallery source (never executes code)

Official origin: https://github.com/hautlys/AIGpu

Usage:
  aigpu examples search <query> [--any] [--limit <n>] [--revision <sha256>] [--offline] [--pretty]
  aigpu examples show <id> [--revision <sha256>] [--offline] [--pretty]
  aigpu examples cat <id> <path> [--revision <sha256>] [--offline] [--json]
  aigpu examples pull <id> --out <directory> [--revision <sha256>] [--offline] [--force] [--pretty]
  aigpu examples cache path
  aigpu examples cache clear

Canonical agent invocation: npx aigpu examples ...
```

### examples search

```terminal
npx aigpu examples search <query>
npx aigpu examples search "raymarching hdr" --any --limit 10 --pretty
```

| Flag | Argument or range |
| --- | --- |
| `--any` | none |
| `--limit` | integer `<n>` from `1` to `100`; default `20` |
| `--revision` | lowercase `<sha256>` |
| `--offline` | none |
| `--pretty` | none |

### examples show

```terminal
npx aigpu examples show <id>
npx aigpu examples show raymarched-fractal --pretty
```

| Flag | Argument |
| --- | --- |
| `--revision` | lowercase `<sha256>` |
| `--offline` | none |
| `--pretty` | none |

### examples cat

```terminal
npx aigpu examples cat <id> <path>
npx aigpu examples cat raymarched-fractal renderer.ts
npx aigpu examples cat raymarched-fractal renderer.ts --json
```

| Flag | Argument |
| --- | --- |
| `--revision` | lowercase `<sha256>` |
| `--offline` | none |
| `--json` | none |

### examples pull

```terminal
npx aigpu examples pull <id> --out <directory>
npx aigpu examples pull raymarched-fractal --out ./fractal --pretty
```

| Flag | Argument |
| --- | --- |
| `--out` | required `<directory>` |
| `--revision` | lowercase `<sha256>` |
| `--offline` | none |
| `--force` | none |
| `--pretty` | none |

### examples cache

```terminal
npx aigpu examples cache path
npx aigpu examples cache clear
```

### Revision and offline fields

| Input or output | Value |
| --- | --- |
| `--revision` | Immutable lowercase SHA-256 revision |
| `--offline` | No network requests; requires previously verified cached data |
| `lastVerifiedAt` | Included in applicable structured offline results |

### Exit codes

| Code | Error class |
| --- | --- |
| `0` | success |
| `2` | `AIGPU-EXAMPLES-USAGE` |
| `3` | `AIGPU-EXAMPLES-NOT-FOUND` |
| `4` | `AIGPU-EXAMPLES-NETWORK` |
| `5` | `AIGPU-EXAMPLES-INTEGRITY` and incompatible API errors |
| `6` | `AIGPU-EXAMPLES-DESTINATION-EXISTS` |
| `7` | `AIGPU-EXAMPLES-FILESYSTEM` |

## mcp

AIGPU exposes the existing docs and examples behavior as two typed MCP tools:

- `docs` supports `search`, `read`, `resolve`, `list`, `grep`, and `symbols` operations against the documentation bundled with the package.
- `examples` supports `search`, `show`, and `read`. On Linux and macOS, the local stdio transport also supports `download`.

Both `read` operations are paginated for transport-safe responses. They accept an optional UTF-16 `offset` and `limit`; `limit` defaults to and cannot exceed 65,536 code units. When more content remains, structured output includes `truncated: true` and the `nextOffset` to request.

Use the public, read-only Streamable HTTP endpoint when an agent only needs to inspect content:

```text
https://github.com/hautlys/AIGpu/api/mcp
```

The hosted endpoint is stateless and implements the modern MCP 2026-07-28 transport. Configure clients for automatic or modern protocol negotiation; legacy session-based HTTP is intentionally rejected because a request may be served by any deployment instance. The endpoint is also advertised at `https://github.com/hautlys/AIGpu/.well-known/mcp.json`.

Start the stdio server without filesystem writes when an agent is running locally:

```terminal
npx aigpu mcp
```

Bare stdio exposes the same read-only operations as HTTP. To enable `download` on Linux or macOS, explicitly select its output boundary in one of three ways:

```terminal
# Project-scoped clients that launch the server from the project directory
npx aigpu mcp --project-from-cwd

# A fixed project directory
npx aigpu mcp --output-dir /absolute/path/to/project

# A host-managed environment
AIGPU_MCP_OUTPUT_DIR=/absolute/path/to/project npx aigpu mcp
```

`--output-dir` and `AIGPU_MCP_OUTPUT_DIR` must name an existing absolute directory; AIGPU canonicalizes it before serving. An explicit CLI selector overrides the environment variable, and `--output-dir` cannot be combined with `--project-from-cwd`. Without one of these configurations, `download` is omitted from the tool schema.

The agent supplies a normalized relative destination beneath that boundary:

```json
{
  "operation": "download",
  "id": "gradient",
  "destination": "examples/gradient"
}
```

Absolute destinations, dot segments, encoded paths, backslashes, control characters, the boundary directory itself, and existing destinations are rejected. Successful structured output reports the canonical absolute `destination`. AIGPU coordinates concurrent AIGPU writers with a lock and never exposes the human-operated `aigpu examples pull --force` behavior through MCP. Node does not expose a portable atomic no-replace rename for directories, so another process with write access to the output directory must not concurrently claim the same destination during final publication.

Use project-scoped Claude Code (`.mcp.json`) or Cursor (`.cursor/mcp.json`) configuration with `--project-from-cwd` only when that client launches the command from the project directory:

```json
{
  "mcpServers": {
    "aigpu": {
      "command": "npx",
      "args": ["-y", "aigpu", "mcp", "--project-from-cwd"]
    }
  }
}
```

Codex can use the same project-scoped pattern in `.codex/config.toml` when Codex launches the MCP process from the active workspace; omitting `cwd` preserves that inherited working directory:

```toml
[mcp_servers.aigpu]
command = "npx"
args = ["-y", "aigpu", "mcp", "--project-from-cwd"]
```

For global MCP configuration, use a fixed `--output-dir` or set `AIGPU_MCP_OUTPUT_DIR` in the server environment. Claude Code and Codex MCP configurations load inside Conductor. Cursor reads `.cursor/mcp.json` only after you open the Conductor workspace in Cursor. Conductor does not define a separate MCP format. There is no cross-editor MCP convention that safely grants a local server write access to whichever workspace is currently active, so AIGPU does not infer one. On Windows, the stdio server remains read-only even when an output boundary is configured because the CLI cannot provide the same safe publication guarantees there.

## install-dawn

The `aigpu install-dawn` command downloads and verifies the portable Dawn prebuild, the native WebGPU implementation aigpu uses to render in Node.js. Run it when `aigpu doctor` reports a missing Dawn runtime.

```text
Usage: aigpu install-dawn

Download and verify the portable Dawn binary for this platform.
Honors GH_TOKEN/GITHUB_TOKEN and AIGPU_CACHE_DIR.
```

```terminal
npx aigpu install-dawn
```

## install-software-renderer

The `aigpu install-software-renderer` command downloads and verifies a portable CPU renderer. Use it on machines without a usable GPU — such as CI runners or headless servers — so aigpu can still render.

```text
Usage: aigpu install-software-renderer

Download and sha256-verify the portable CPU software renderer for this platform.
Honors AIGPU_CACHE_DIR.
```

```terminal
npx aigpu install-software-renderer
```

## snapshot

The `aigpu snapshot` command is an internal self-test used by aigpu's own CI: it renders a scene built into the CLI inside the Docker GPU harness (`AIGPU_DOCKER_TEST=1`) and compares the pixels against a committed baseline to catch toolchain regressions. To verify that your machine is set up correctly, use `aigpu doctor` instead.

```text
Usage: aigpu snapshot [--ci] [--update] [--baseline <path>]
```

`AIGPU_DOCKER_TEST=1` is required.

| Flag | Argument |
| --- | --- |
| `--ci` | none |
| `--update` | none |
| `--baseline` | `<path>` |

```terminal
AIGPU_DOCKER_TEST=1 npx aigpu snapshot --ci
AIGPU_DOCKER_TEST=1 npx aigpu snapshot --update
AIGPU_DOCKER_TEST=1 npx aigpu snapshot --baseline <path>
```

## Global options

| Flag | Shorthand | Output |
| --- | --- | --- |
| `--help` | `-h` | CLI help |
| `--version` | `-v` | installed CLI version |

```terminal
npx aigpu --help
npx aigpu --version
```
