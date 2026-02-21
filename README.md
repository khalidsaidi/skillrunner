# SkillRunner

State-of-the-art npm CLI for discoverable, safe, reusable engineering skills.

```bash
npm i -g @khalidsaidi/skillrunner
```

- Build with a curated catalog: **25 skills** (**14 automation**, **11 knowledge**)
- Run with guardrails: **plan preview**, **preflight checks**, and **script safety blocks**
- Ship with confidence: CI on every push/PR, registry publish on `main` catalog changes, and nightly matrix validation at **06:00 UTC**

## What ships

1. `@khalidsaidi/skillrunner` npm package (the `skill` CLI)
2. Curated registry index (`registry/dist/index.json`)
3. Versioned skill catalog (`registry/skills/*`) and packs (`registry/packs/*`)

The dashboard and registry admin server are internal/optional tooling for maintainers, not the primary product surface.

## Why SkillRunner

- **CLI-first UX**: fast, scriptable, and friendly for terminal-native teams
- **Safety by design**: plan preview, preflight checks, and script guardrails
- **Curated catalog**: default-enabled skills plus advanced/conditional skills
- **Local-first execution**: skills run in your repo with clear artifacts/logs
- **Operational confidence**: nightly matrix testing across multiple templates

## Quickstart

```bash
skill doctor
skill search lint
skill install run-lint
skill plan run-lint
skill run run-lint
skill logs --last
```

## Catalog snapshot

Current curated snapshot:

- **25 total skills**
- **14 automation skills**
- **11 knowledge skills**
- **10 default-enabled skills**
- **3 advanced skills**
- **12 conditional skills**
- **4 packs**
- **Freshness marker:** `registry/dist/index.json` includes `generated_at`

## Supported skills

Automation skills (14):

- `node-doctor`
- `repo-bootstrap`
- `run-lint`
- `run-format`
- `run-tests`
- `run-build`
- `run-typecheck`
- `dependency-audit-report`
- `dependency-security-fix`
- `react-maintenance-upgrade`
- `terraform-fmt-validate`
- `terraform-drift-audit`
- `git-status-report`
- `changelog-from-commits`

Knowledge skills (11):

- `code-review-checklist`
- `debugging-playbook`
- `deployment-checklist`
- `docs-styleguide`
- `git-commit-style`
- `pr-description-style`
- `react-patterns`
- `release-notes-style`
- `security-hygiene`
- `terraform-structure`
- `testing-playbook`

## Core commands

- `skill doctor` — validate local environment and registry
- `skill search <query>` — search catalog
- `skill info <name>` — inspect one skill
- `skill install <name>` / `skill uninstall <name>`
- `skill plan <name>` — preview steps and risk
- `skill run <name>` — execute with safety checks
- `skill logs --last` / `skill logs --id <runId>`
- `skill list` — show installed skills

## Safety model

Every run is protected by layered checks:

1. **Plan before run**: explicit step/risk view via `skill plan`
2. **Preflight enforcement**: missing prerequisites block execution early
3. **Guardrails**: banned script patterns are blocked
4. **No auto-push**: skills do not push to remotes
5. **Artifacts**: run metadata and output are persisted for auditability

Run artifacts are stored in:

- `~/.skillrunner/skills`
- `~/.skillrunner/runs/<runId>`

## Skill metadata

Skills are directories with `SKILL.md` (frontmatter + markdown) and optional scripts.

Important metadata fields:

- `availability`: `default` | `advanced` | `conditional`
- `prerequisites.tools[]`
- `prerequisites.files[]`
- `prerequisites.env[]`
- `prerequisites.packageJsonDeps[]`

## Registry and updates

- Registry source of truth is versioned in this repository
- Registry index is generated from skill metadata
- Discovery/curation can sync in external skills before publish
- Default-enabled pack is maintained explicitly for high-signal onboarding

## Update cadence

- CI quality gates run on every push and pull request
- Registry index is rebuilt/published on every `main` push that changes `registry/**`
- Nightly matrix runs every day at `06:00 UTC` across Node/React/Python/empty templates
- npm releases are cut on version tags (`v*`) or manual release dispatch

## Quality and release confidence

SkillRunner uses automated quality gates:

- formatting and type-safe builds
- registry validation/build checks
- nightly matrix runs across:
  - Node template
  - React template
  - Python template
  - Empty repo template

## Cursor integration

```bash
skill cursor install code-review-checklist --scope project
skill cursor install code-review-checklist --scope global
skill cursor list --scope both
```

## Development (maintainers)

```bash
pnpm install
pnpm build
pnpm test
pnpm registry:validate
pnpm registry:build
```

## Maintainer marketing pack

For npm listing A/B copy (short/long description + keywords), see `docs/marketing/npm-listing.md`.
