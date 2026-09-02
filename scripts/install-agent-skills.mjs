#!/usr/bin/env node
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const globalInstall = args.includes("--global") ? ["-g"] : [];
const all = args.includes("--all") || args.includes("--agent-all");
const agents = args.filter((value) => value.startsWith("--agent=")).map((value) => value.slice("--agent=".length)).filter(Boolean);
const targetArgs = all ? ["--agent", "*"] : agents.length ? agents.flatMap((agent) => ["-a", agent]) : ["-a", "claude-code", "-a", "opencode", "-a", "codex"];
const cliArgs = ["-y", "skills", "add", "./", "--skill", "aigpu-agent-toolkit", ...targetArgs, ...globalInstall, "--copy", "-y"];

console.log(`Installing aigpu-agent-toolkit for ${all ? "all detected agents" : targetArgs.filter((value) => value !== "-a").join(", ")}...`);
const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", cliArgs, { stdio: "inherit", shell: false });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code, signal) => { if (signal) process.exitCode = 1; else process.exitCode = code ?? 1; });
