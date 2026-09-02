export const docsHelp = `Usage: aigpu docs <command> [args] [flags]

Start here: aigpu docs cat getting-started.md   (the guide for using the latest API correctly)

Commands:
  ls [path]                  List packages or docs under a virtual path
  cat <path|symbol>          Print docs by virtual path or unique symbol
  grep [-i] [--package <pkg>] <pattern>
                             Search docs content; case-sensitive unless -i is used
  find <query>               Find docs by name, keyword, or phrase (all words must match)
  path <symbol|path>         Resolve a symbol or virtual path for shell usage
  symbols                    List indexed symbols
  help                       Show this help

Examples:
  aigpu docs cat getting-started.md
  aigpu docs ls /guides
  aigpu docs ls
  aigpu docs cat /@aigpu/core/Buffer.docs.md
  aigpu docs grep -i --package @aigpu/wgsl minify
  aigpu docs path Buffer`;
