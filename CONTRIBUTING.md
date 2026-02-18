# Contributing to SkillRunner

Thank you for your interest in contributing!

## Development Setup

```bash
pnpm install
pnpm build
```

## Project Structure

- `packages/cli` — CLI commands (`skill`)
- `packages/engine` — Core runtime (registry, planning, execution)
- `packages/dashboard` — Local web UI
- `packages/registry-tools` — Build and validate registry index
- `packages/adapters` — Optional provider adapter stubs (Cursor, CLI)
- `registry/skills/` — Skill definitions
- `registry/packs/` — Curated skill bundles

## Adding a Skill

1. Create `registry/skills/<skill-name>/SKILL.md` with YAML frontmatter
2. For automation skills: add `scripts/check.sh` and `scripts/run.sh`
3. Run `pnpm registry:validate` and `pnpm registry:build`

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- Run `pnpm lint`, `pnpm format`, and `pnpm format:check` (CI runs format:check)
