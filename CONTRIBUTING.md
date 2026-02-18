# Contributing to SkillRunner

Thank you for your interest in contributing!

## Development Setup

```bash
pnpm install
pnpm build
```

## Project Structure

```
skillrunner/
├── packages/
│   ├── cli/              # CLI commands (skill)
│   ├── engine/           # Core runtime (registry, planning, execution)
│   ├── dashboard/        # Local web UI
│   ├── registry-tools/   # Build and validate registry index
│   └── adapters/         # Optional provider adapter stubs (Cursor, CLI)
├── registry/
│   ├── skills/           # Skill definitions (SKILL.md + scripts)
│   ├── packs/            # Curated skill bundles
│   └── dist/             # Generated index (gitignored, built in CI)
├── .github/workflows/    # CI, release, GitHub Pages
└── [config] package.json, tsconfig.base.json, eslint.config.js, etc.
```

**Gitignored:** `node_modules/`, `dist/`, `.ai/`, `.cursor/`, `.env*`, build outputs, caches.

## Adding a Skill

1. Create `registry/skills/<skill-name>/SKILL.md` with YAML frontmatter
2. For automation skills: add `scripts/check.sh` and `scripts/run.sh`
3. Run `pnpm registry:validate` and `pnpm registry:build`

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- Run `pnpm lint`, `pnpm format`, and `pnpm format:check` (CI runs format:check)
