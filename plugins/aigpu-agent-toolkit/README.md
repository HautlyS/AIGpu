# AIGpu Agent Toolkit plugin

This plugin packages the portable `aigpu-agent-toolkit` skill for coding agents.

## Install with the open Agent Skills CLI

```sh
npx -y skills add hautlys/AIGpu --skill aigpu-agent-toolkit -a claude-code -a opencode -a codex -y
npx -y skills add hautlys/AIGpu --skill aigpu-agent-toolkit --agent '*' -y
```

From a local checkout:

```sh
node scripts/install-agent-skills.mjs
node scripts/install-agent-skills.mjs --all --global
```

The plugin has no hosted service, API key, telemetry, or framework runtime dependency. It installs the skill instructions and references; the AIGpu packages remain the source of runtime code.

Run `node scripts/validate-agent-integrations.mjs` before publishing or updating the plugin.
