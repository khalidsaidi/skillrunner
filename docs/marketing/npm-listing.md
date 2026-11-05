# SkillRunner npm listing copy

This file contains reusable, conversion-oriented copy for the npm package page of `@khalidsaidi/skillrunner`.

## Current catalog facts (source of truth)

- Registry skills: **48** (imported from OpenAI and Anthropic)
- First-party skills: **25**, in [khalidsaidi/skills](https://github.com/khalidsaidi/skills)
- Source mix:
  - Native SkillRunner: **25**
  - OpenAI upstream imports: **32**
  - Anthropic upstream imports: **16**
- Update cadence:
  - CI on every push and PR
  - Registry publish on `main` pushes that change `registry/**`
  - Nightly matrix at **06:00 UTC** across `node`, `react`, `python`, and `empty`

## Short description options (A/B)

Use one in `package.json.description` (recommended: A).

- A (Recommended): `Local-first CLI to discover, install, plan, and safely run reusable engineering skills.`
- B: `Production-ready skills CLI with preflight checks, guardrails, and curated automation workflows.`
- C: `Turn repeatable engineering work into safe, reusable CLI skills with a curated registry.`

## Long description options (A/B)

These blocks are for npm page copy, release notes, and announcements.

### A (Recommended)

SkillRunner is a local-first CLI for teams that want repeatable engineering workflows without giving up safety or control.  
Install curated skills, inspect the exact plan before execution, and run with built-in preflight validation and guardrails.

Today SkillRunner supports **73 skills**, 48 in its registry and 25 first-party in `khalidsaidi/skills`, across code review, debugging, testing, linting, formatting, build/typecheck, dependency audits, release workflows, React maintenance, Terraform operations, and major upstream agent-skill catalogs.  
Across both sources there are **14 automation skills** and **59 knowledge skills**.

The registry publishes whenever registry changes reach `main`.

### B

SkillRunner gives engineering teams a practical path from ad-hoc prompts to reliable, repeatable execution.  
It ships as an npm CLI and combines a curated skill registry with run planning, safety checks, and execution artifacts.

With **73 skills** and explicit `default` / `advanced` lanes, teams can adopt quickly and scale safely.

## Keyword sets (A/B)

Use 10-12 tags; avoid noisy generic tags.

- A (Recommended): `cli`, `skills-cli`, `automation`, `developer-tools`, `engineering-workflows`, `devops-automation`, `local-first`, `agent-workflows`, `skill-registry`, `code-review`, `testing`, `terraform`
- B (Alt, app-focused): `cli`, `skills`, `software-engineering`, `workflow-automation`, `developer-productivity`, `project-bootstrap`, `lint`, `build-tools`, `typecheck`, `react`, `nodejs`, `devops`

## Release blurb template

`SkillRunner v{{version}} is live: {{total}} curated skills ({{automation}} automation, {{knowledge}} knowledge), with daily matrix validation and registry updates on every mainline catalog change.`

## Refresh stats command

Run this before release notes:

```bash
jq '{skills:(.skills|length), automation:(.skills|map(select(.kind=="automation"))|length), knowledge:(.skills|map(select(.kind=="knowledge"))|length), default_enabled:(.skills|map(select(.availability=="default"))|length), packs:(.packs|length), generated_at:.generated_at}' registry/dist/index.json
```
