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
│   └── dist/             # Generated index (gitignored)
├── .github/workflows/    # Release, GitHub Pages
└── [config] package.json, tsconfig.base.json, eslint.config.js, etc.
```

**Gitignored:** `node_modules/`, `dist/`, `.ai/`, `.cursor/`, `.env*`, build outputs, caches.

## Adding a Skill

Skills in `registry/skills` are imported with `pnpm registry:sync-upstream`.

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- Run `pnpm lint`, `pnpm format`, and `pnpm format:check`
