# SkillRunner CLI

**Audit, safely run, and export [SKILL.md](https://agentskills.io) skills across Claude Code, Codex, Cursor, and opencode.**

Skills are markdown plus scripts that your agent executes with your permissions — which makes every skills folder a supply chain. SkillRunner is the trust layer in front of it: a static audit before anything lands, guarded execution with an artifact trail, and spec-pure export into whichever agent you actually use.

## Install

```bash
npm i -g @khalidsaidi/skillrunner
```

## Quickstart

```bash
skill doctor                 # check your environment
skill search lint            # find a skill in the curated registry
skill install run-lint       # install it (remote sources are audited first)
skill plan run-lint          # preview steps + risk, nothing executes
skill run run-lint           # preflight → guard → confirm → execute
skill logs --last            # persisted run artifacts
```

Audit the skills your agents already load:

```bash
skill audit ~/.claude/skills     # everything Claude Code loads
skill audit ./candidate-skill    # one directory you're reviewing
skill audit --json               # machine-readable, CI-friendly
```

Install from the whole SKILL.md ecosystem, not just the registry:

```bash
skill install anthropics/skills/skills/pdf     # owner/repo/path on GitHub
skill install https://example.com/my-skill/SKILL.md
```

Export spec-pure skills into your agent:

```bash
skill export claude run-lint      # → ~/.claude/skills
skill export codex my-skill       # → ~/.agents/skills
skill export cursor my-skill      # → ~/.cursor/skills
skill export opencode my-skill    # → ~/.config/opencode/skills
```

## What it does

- **Audit** — flags the patterns that show up in real supply-chain incidents: pipe-to-shell (`curl ... | sh`), base64/eval obfuscation, `/dev/tcp` and netcat exfiltration, credentials in network commands, plus mismatches between what a skill _declares_ (`capabilities`) and what its scripts _do_. Exit code 2 when anything is hard-blocked.
- **Run** — automation skills execute locally behind layered checks: plan preview, preflight (missing tools/files/env block early), a guard that hard-blocks banned patterns, and run artifacts persisted under `~/.skillrunner/runs/<runId>`.
- **Export** — what lands in your agent's folder is exactly what the [agentskills.io spec](https://agentskills.io/specification) says a skill is: imported skills ship their pristine upstream copy verbatim; native skills get spec-normalized frontmatter.

Honest positioning: this is a **seatbelt and an audit trail, not a sandbox**. Static analysis can be evaded by a determined attacker — it catches the careless and the common, and gives you a reviewable record. Run untrusted skills in isolated environments.

## Command reference

- `skill audit [dir|name]` — static audit; `--json` for CI
- `skill install <name | owner/repo[/path] | url>` — registry or ecosystem install, audited
- `skill export <target> <names...>` — targets: `claude`, `codex` (alias `agents`), `cursor`, `opencode`
- `skill search <query>` / `skill info <name>` / `skill list` / `skill uninstall <name>`
- `skill plan <name>` / `skill run <name> [--inputs k=v ...]` / `skill logs --last`
- `skill doctor` — environment + registry health (including a real remote-registry reachability probe)

Every subcommand supports `--help` (with an example) and `--json`.

## Curated registry

A starter catalog of skills (automation + knowledge, including imports from the OpenAI and Anthropic skill repos with pristine `upstream/` copies) ships bundled with the CLI, so search/install work offline. The registry is a convenience, not the point — `skill install` and `skill audit` work against the whole SKILL.md ecosystem.

Full docs and maintainer notes: <https://github.com/khalidsaidi/skillrunner>
