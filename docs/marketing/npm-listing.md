# SkillRunner npm listing copy

This file contains reusable, conversion-oriented copy for the npm package page of `@khalidsaidi/skillrunner`.

## Current catalog facts (source of truth)

- Total skills: **73**
- Automation skills: **14**
- Knowledge skills: **59**
- Default-enabled skills: **25**
- Advanced skills: **48**
- Packs: **3**
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

Today SkillRunner supports **73 skills** across code review, debugging, testing, linting, formatting, build/typecheck, dependency audits, release workflows, React maintenance, Terraform operations, and major upstream agent-skill catalogs.  
The catalog currently includes **14 automation skills** and **59 knowledge skills**, with **25 default-enabled** for fast onboarding.

Updates are continuous: CI runs on every push/PR, registry publishes on `main` registry changes, and a nightly matrix validates behavior across Node, React, Python, and empty project templates.

### B

SkillRunner gives engineering teams a practical path from ad-hoc prompts to reliable, repeatable execution.  
It ships as an npm CLI and combines a curated skill registry with run planning, safety checks, and execution artifacts.

With **73 production-oriented skills** and explicit `default` / `advanced` lanes, teams can adopt quickly and scale safely.  
The platform is continuously validated via CI and nightly multi-template matrix tests, so catalog quality and behavior stay current.

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
