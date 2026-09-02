import { realpathSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createDocsService } from "../docs/service.js";
import { LocalExamplesSource } from "../examples/local-source.js";
import { createExamplesService } from "../examples/service.js";
import { pullExample } from "../examples/pull.js";
import { createAIGpuMcpServer } from "./server.js";

export const mcpHelp = `Usage: aigpu mcp [--output-dir <absolute-directory> | --project-from-cwd]

Serve AIGPU documentation and local examples over MCP stdio. No network connection
is opened. AIGPU_EXAMPLES_DIR selects the local examples directory.
`;

export function runMcpStdio(args, { version = "0.0.0", cwd = process.cwd(), env = process.env, platform = process.platform, reportError = (error) => process.stderr.write(`aigpu mcp: ${error.message}\n`) } = {}) {
  if (args.length === 1 && ["--help", "-h", "help"].includes(args[0])) return { code: 0, stdout: mcpHelp };
  const usesOutputDirectory = args.length === 2 && args[0] === "--output-dir" && !!args[1];
  const usesProjectCwd = args.length === 1 && args[0] === "--project-from-cwd";
  if (args.length !== 0 && !usesOutputDirectory && !usesProjectCwd) return { code: 2, stderr: mcpHelp };
  const configuredOutputDirectory = usesOutputDirectory ? args[1] : usesProjectCwd ? undefined : env.AIGPU_MCP_OUTPUT_DIR;
  if (configuredOutputDirectory && !isAbsolute(configuredOutputDirectory)) return { code: 2, stderr: `MCP output directory must be absolute: ${configuredOutputDirectory}\n` };
  let downloadRoot = usesProjectCwd ? cwd : configuredOutputDirectory;
  if (downloadRoot) {
    try { downloadRoot = realpathSync(downloadRoot); if (!statSync(downloadRoot).isDirectory()) throw new Error("not a directory"); }
    catch { return { code: 2, stderr: `MCP output directory is not a directory: ${downloadRoot}\n` }; }
  }
  const source = new LocalExamplesSource({ root: env.AIGPU_EXAMPLES_DIR ?? resolve(cwd, "examples") });
  const docs = createDocsService();
  const allowDownload = !!downloadRoot && (platform === "linux" || platform === "darwin");
  const examples = createExamplesService({ source, downloadRoot, downloadExample: allowDownload ? pullExample : undefined, platform });
  serveStdio(() => createAIGpuMcpServer({ version, docs, examples, allowDownload, examplesOpenWorld: false }), { onerror: reportError });
  return { code: 0 };
}
