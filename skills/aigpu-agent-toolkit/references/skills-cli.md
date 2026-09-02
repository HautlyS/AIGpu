# Agent Skills CLI

The open Agent Skills CLI installs a repository skill into compatible coding-agent directories.

```sh
npx -y skills add hautlys/AIGpu --skill aigpu-agent-toolkit -a claude-code -a opencode -a codex -y
npx -y skills add hautlys/AIGpu --skill aigpu-agent-toolkit --agent '*' -y
npx -y skills add ./ --skill aigpu-agent-toolkit --copy -a claude-code -a opencode -a codex -y
```

Options used by this project:

- `--skill <name>` selects one skill.
- `-a, --agent <agent>` targets one or more agents.
- `--agent '*'` targets all detected supported agents.
- `-g, --global` installs into the user directory instead of the current project.
- `--copy` copies instead of symlinking.
- `-y, --yes` skips prompts.

The canonical source is `skills/aigpu-agent-toolkit/SKILL.md`. Keep its name stable so `--skill aigpu-agent-toolkit` remains predictable.
