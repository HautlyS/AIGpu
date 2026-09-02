#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "skills/aigpu-agent-toolkit/SKILL.md",
  "skills/aigpu-agent-toolkit/references/agent-contracts.md",
  "skills/aigpu-agent-toolkit/references/framework-matrix.md",
  "skills/aigpu-agent-toolkit/references/skills-cli.md",
  "plugins/aigpu-agent-toolkit/plugin.json",
  "scripts/install-agent-skills.mjs",
];

for (const relative of files) await access(resolve(root, relative));
const skill = await readFile(resolve(root, "skills/aigpu-agent-toolkit/SKILL.md"), "utf8");
if (!/^---\nname: aigpu-agent-toolkit\n/m.test(skill)) throw new Error("skill frontmatter is invalid");
if (skill.length > 30_000) throw new Error("skill is too large; move details to references");
const plugin = JSON.parse(await readFile(resolve(root, "plugins/aigpu-agent-toolkit/plugin.json"), "utf8"));
if (plugin.name !== "aigpu-agent-toolkit") throw new Error("plugin name does not match skill name");
if (!plugin.skill.endsWith("skills/aigpu-agent-toolkit/SKILL.md")) throw new Error("plugin must point at the canonical skill");
const installer = await readFile(resolve(root, "scripts/install-agent-skills.mjs"), "utf8");
for (const token of ["skills", "add", "claude-code", "opencode", "codex", "--skill"]) {
  if (!installer.includes(token)) throw new Error(`installer is missing ${token}`);
}
console.log(`Agent integration package is valid: ${files.length} required files, ${plugin.agents.length} target agents.`);
