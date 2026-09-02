export const examplesHelp = `aigpu examples — inspect local example source (never executes code)

The catalog is read from ./examples or AIGPU_EXAMPLES_DIR. No network request is made.
Canonical local invocation: npx aigpu examples ...

Usage:
  aigpu examples search <query> [--any] [--limit <n>] [--revision <sha256>] [--root <dir>] [--pretty]
  aigpu examples show <id> [--revision <sha256>] [--root <dir>] [--pretty]
  aigpu examples cat <id> <path> [--revision <sha256>] [--root <dir>] [--json]
  aigpu examples pull <id> --out <directory> [--revision <sha256>] [--root <dir>] [--force] [--pretty]

The pull operation uses an atomic, symlink-safe local copy. MCP also exposes this local catalog over stdio.
`;
