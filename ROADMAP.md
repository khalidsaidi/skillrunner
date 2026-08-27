# ROADMAP — khalidsaidi/skillrunner

**Purpose:** User-friendly Skills Ecosystem core repo: npm CLI (`skill`), engine/runtime, local dashboard, GitHub-backed registry + generated index.json, starter packs, CI/CD.

**Status:** M0–M5, M7–M8 done. M6 partial — workflow ready; npm publish + Pages deploy pending.

**Non-negotiables:**

- `.ai/` — entire directory gitignored. Never commit, read, or reference `.ai/*` (secrets, logs).
- UX first: plan-before-run, safe defaults, pretty output, minimal setup, `--json` for tooling.
- Platforms: Cursor + npm + GitHub.

---

## M0 — Repo Bootstrap + Conventions

- Monorepo (pnpm), strict TS, lint/test, `.ai/` policy, CI on PRs

## M1 — Skill Format + Registry Index

- SKILL.md spec, index schema, registry-tools (build + validate), packs

## M2 — Engine Runtime

- Install, plan, guard, run, artifacts; `~/.skillrunner/runs/<runId>/`

## M3 — CLI (`skill`) UX

- All commands, `--json`, pretty output, safe defaults

## M4 — Local Dashboard

- Vite+React, API endpoints, runs + skills screens

## M5 — Starter Skills Explosion

- > = 25 skills (automation + knowledge), packs

## M6 — GitHub Pages + Releases

- index.json on Pages, npm publish

## M7 — Cursor Integration

- `skill cursor install/list`, docs

## M8 — Optional Agent Platform

- Adapter stubs (provider adapters optional)
