# SkillRunner CLI

State-of-the-art npm CLI for discoverable, safe, reusable engineering skills.

Install:

```bash
npm i -g @khalidsaidi/skillrunner
```

Quickstart:

```bash
skill doctor
skill search lint
skill install run-lint
skill plan run-lint
skill run run-lint
skill logs --last
```

## Why use it

- Curated catalog with `default`, `advanced`, and `conditional` skill lanes
- Safety controls: plan preview, preflight checks, and script guardrails
- Local-first execution with run artifacts and logs
- Continuous quality checks via CI and nightly template matrix runs

## Current catalog snapshot

- 73 total skills
- 14 automation skills
- 59 knowledge skills
- 25 default-enabled skills
- 48 advanced skills
- 3 packs
- Source mix: 25 native SkillRunner + 32 OpenAI upstream + 16 Anthropic upstream

## Core commands

- `skill doctor`
- `skill search <query>`
- `skill info <name>`
- `skill install <name>`
- `skill uninstall <name>`
- `skill plan <name>`
- `skill run <name>`
- `skill logs --last`
- `skill list`

Full docs and maintainer notes: <https://github.com/khalidsaidi/skillrunner>
