# SkillRunner

**Audit, safely run, and export [SKILL.md](https://agentskills.io) skills across Claude Code, Codex, Cursor, and opencode.**

The SKILL.md open standard made agent skills portable — and turned every skills folder into a supply chain. Skills are markdown plus scripts that your agent executes with your permissions: a malicious `scripts/run.sh` that pipes a download into `bash` or posts `$GITHUB_TOKEN` somewhere looks exactly like a helpful one until you read it. Public skill hubs have already had to pull skills for exactly this. SkillRunner is the trust layer in front of that: a static audit before anything lands, guarded execution with an artifact trail, and spec-pure export into whichever agent you actually use.

```bash
npm i -g @khalidsaidi/skillrunner
```

## The three things it does

### 1. Audit — before you trust a skill

Point it at any skills directory — including the ones your agents already load:

```bash
skill audit ~/.claude/skills          # everything Claude Code loads
skill audit ./candidate-skill         # one directory you're reviewing
skill audit --json                    # machine-readable, CI-friendly
```

Flags the patterns that show up in real supply-chain incidents: pipe-to-shell (`curl ... | sh`), base64/eval obfuscation, `/dev/tcp` and netcat exfiltration, credential files or env vars in network commands, plus mismatches between what a skill _declares_ (`capabilities`) and what its scripts _do_. Exit code 2 when anything is hard-blocked.

Honest positioning: this is a **seatbelt and an audit trail, not a sandbox**. Static analysis can be evaded by a determined attacker — it catches the careless and the common, and gives you a reviewable record. Run untrusted skills in isolated environments.

### 2. Install — from the whole ecosystem, through the trust pipeline

Install any SKILL.md skill straight from GitHub or a URL — not just this repo's registry:

```bash
skill install anthropics/skills/skills/pdf        # owner/repo/path
skill install https://github.com/anthropics/skills/tree/main/skills/internal-comms
skill install https://example.com/my-skill/SKILL.md
skill install run-lint                            # curated registry, same pipeline
```

Every remote skill is staged, its contract parsed, its plan computed, and **every script statically audited before it lands**. Blocked skills never reach your skills directory; warnings are shown before you confirm.

### 3. Export — spec-pure skills into any agent

```bash
skill export claude anthropic-pdf         # → ~/.claude/skills
skill export codex changelog-from-commits # → ~/.agents/skills
skill export cursor code-review-checklist # → ~/.cursor/skills
skill export opencode debugging-playbook  # → ~/.config/opencode/skills
skill export claude my-skill --scope project   # → ./.claude/skills
```

Exports are pure [agentskills.io](https://agentskills.io/specification) SKILL.md directories: imported skills ship their pristine upstream copy verbatim; SkillRunner-native skills get spec-normalized frontmatter (name charset enforced, import-rename suffixes stripped, custom fields like `kind`/`risk`/`capabilities`/`scripts` moved under `metadata`). What lands in your agent's folder is exactly what the spec says a skill is.

## Running skills

Automation skills (the ones with scripts) run locally with layered checks:

```bash
skill plan run-lint                # step + risk preview, no execution
skill run run-lint                 # preflight → guard → confirm → execute
skill run my-skill --inputs env=staging   # exposed to scripts as $INPUT_ENV
skill logs --last                  # persisted run artifacts
```

1. **Plan before run** — explicit step/risk view
2. **Preflight** — missing tools/files/env/deps block execution early
3. **Guard** — banned script patterns (sudo, `rm -rf`, pipe-to-shell, ~/.ssh, ...) hard-block the run
4. **Artifacts** — plan, guard verdict, stdout/stderr persisted under `~/.skillrunner/runs/<runId>`

Knowledge skills (instructions, no scripts) have nothing to execute — `skill run` says so and points you at `skill export` instead of pretending.

## Command reference

- `skill audit [dir|name]` — static audit; `--json` for CI
- `skill install <name | owner/repo[/path] | url>` — registry or ecosystem install, audited
- `skill export <target> <names...>` — targets: `claude`, `codex` (alias `agents`), `cursor`, `opencode`; `--scope project`, `--out <dir>`, `--force`
- `skill search <query>` / `skill info <name>` / `skill list` / `skill uninstall <name>`
- `skill plan <name>` / `skill run <name> [--inputs k=v ...]` / `skill logs --last`
- `skill doctor` — environment + registry health
- `skill open` — local dashboard (repo checkout; not bundled in the npm package)

## Curated registry

A starter catalog of **73 skills** (14 automation + 59 knowledge; 25 native, 48 imported from the OpenAI and Anthropic skill repos with pristine `upstream/` copies) is versioned in `registry/` and served from GitHub Pages (`https://khalidsaidi.github.io/skillrunner/index.json`). The registry is a convenience, not the point — `skill install` and `skill audit` work against the whole SKILL.md ecosystem.

## Skill contracts

Skills are directories with a supported contract file plus optional scripts:

- `SKILL.md` (the open standard) — also `skill.yaml`/`skill.json`, `AGENT.md`/`AGENTS.md`/`CLAUDE.md`, `README.md` fallback
- SkillRunner extensions read from frontmatter (and written back under `metadata` on export): `kind` (`automation`/`knowledge`), `risk`, `availability`, `capabilities` (`shell`/`network`/`fs_read`/`fs_write`), `scripts.check`/`scripts.run`, `prerequisites` (tools/files/env/packageJsonDeps), `inputs`

## Development (maintainers)

```bash
CI=true pnpm install
pnpm build
pnpm test
pnpm registry:validate && pnpm registry:build
```

Monorepo: `packages/cli` (the `skill` CLI), `packages/engine` (parser/guard/audit/export/runner), `packages/adapters`, `packages/dashboard` (local run/skill viewer), `packages/registry-tools`, `registry/` (catalog source of truth).
