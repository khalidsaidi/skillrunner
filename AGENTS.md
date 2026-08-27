# SkillRunner monorepo — agent context

**Single source of truth for AI agents working in this repo.**

## Overview

SkillRunner is a skills ecosystem: CLI (`skill`) + local dashboard + skill registry. Skills are directories with SKILL.md (YAML frontmatter + markdown) and optional scripts. The CLI installs skills to ~/.skillrunner/skills, runs them in the user's cwd, and writes artifacts to ~/.skillrunner/runs/<runId>/.

## Structure

| Package                      | Purpose                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| **packages/engine**          | Core runtime (parsers, registry client, guard, planner, runner, artifacts)               |
| **packages/cli**             | Published as @khalidsaidi/skillrunner, bin name: skill                                   |
| **packages/dashboard**       | Vite + React UI, API server on **5174**, Vite dev server on **5173** (proxy /api → 5174) |
| **packages/registry-tools**  | build-registry-index and validate-registry (builds registry/dist/index.json)             |
| **packages/adapters**        | Optional provider adapter stubs (Cursor, CLI) for agent platform integration             |
| **registry/skills/**         | 25 skills                                                                                |
| **registry/packs/**          | starter.json, react.json, terraform.json                                                 |
| **registry/dist/index.json** | Generated index, published via GitHub Pages                                              |
| **.ai/**                     | Entire directory gitignored — NEVER read, edit, or reference .ai/* (contains secrets)   |

## Paths

- **~/.skillrunner/skills** — installed skills (e.g. node-doctor@1.0.0)
- **~/.skillrunner/runs** — run artifacts
- **~/.skillrunner/registry-cache** — git clone for remote install (ensureRegistryCache)
- **findRegistryRoot(startCwd)** — walks cwd upward for registry/skills; used to load local index when developing

## Data formats

### SKILL.md (gray-matter)

- **Required:** name (string), description (string)
- **Optional:** version, tags[], kind (automation|knowledge), risk (low|moderate|high), capabilities.{shell,network,fs_read,fs_write}, scripts.{check,run}, inputs, docs.{homepage,source}
- Unknown keys ignored (forward compatible)

### Registry index.json

`{ registry_version, generated_at, source.{repo,ref,base_url}, skills[], packs[] }`

Each skill: name, description, version, tags, kind, risk, capabilities, scripts, inputs, paths.{dir,skill_md,raw_skill_md}

### Run artifacts (~/.skillrunner/runs/<runId>/)

meta.json, plan.json, guard.json, stdout.log, stderr.log, summary.json

## Engine (packages/engine)

| File             | Purpose                                                                                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **types.ts**     | SkillMeta, Plan, PlanStep, RegistryIndex, RegistrySkill, RegistryPack                                                                                                                                             |
| **parser.ts**    | parseSkillMd() — gray-matter, requires name+description                                                                                                                                                           |
| **registry.ts**  | fetchRemoteRegistry(url), loadLocalRegistry(repoRoot), searchRegistry(), getSkillFromIndex(), SKILLS_DIR, RUNS_DIR, REGISTRY_CACHE_DIR                                                                            |
| **guard.ts**     | scanScriptForBannedPatterns(scriptPath). Banned: sudo, su , rm -rf, curl\|sh\|bash, ~/.ssh ~/.aws, /etc /usr/bin /bin, chmod 777, chown -R. Comments (lines starting with #) are skipped so shebangs are allowed. |
| **planner.ts**   | buildPlan(skillDir, meta) → Plan with steps (check.sh then run.sh)                                                                                                                                                |
| **runner.ts**    | runScript(cwd, scriptPath) spawns bash; executePlan(cwd, skillDir, plan) runs steps, cwd = user repo                                                                                                              |
| **artifacts.ts** | writeRunArtifacts()                                                                                                                                                                                               |
| **paths.ts**     | findRegistryRoot(startCwd)                                                                                                                                                                                        |

## CLI commands

| Command               | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| doctor                | Check env, providers, registry                                       |
| list                  | List installed skills                                                |
| search <q>            | Search registry                                                      |
| info <name>           | Show skill info                                                      |
| install <name>        | Install skill                                                        |
| uninstall <name>      | Uninstall skill                                                      |
| plan <name>           | Show plan only (option: --inputs <pairs...>)                         |
| run <name>            | Run skill. Options: --yes, --cwd, --allow-dirty, --no-branch         |
| logs                  | Show run logs. Options: --last, --id <runId>                         |
| open                  | Open dashboard                                                       |
| cursor install <name> | Copy skill to Cursor. Options: --scope project\|global               |
| cursor list           | List Cursor-installed skills. Options: --scope project\|global\|both |

All support --json. Commander; subcommands receive (args, opts, cmd). cmd.opts().json for JSON output.

## Install flow

1. Get index: findRegistryRoot() → loadLocalRegistry, else fetchRemoteRegistry (DEFAULT_REGISTRY_URL = raw.githubusercontent.com/.../registry/dist/index.json)
2. getSkillFromIndex(index, name)
3. Source: if repoRoot then registry/skills/<name>; else ensureRegistryCache() → clone/pull khalidsaidi/skillrunner → registry/skills/<name>
4. cpSync(sourceDir, ~/.skillrunner/skills/<name>@<version>)

## Run flow

1. findSkillDir(name) — match by name or name@\*
2. parseSkillMd, buildPlan, scanScriptForBannedPatterns on check.sh and run.sh
3. If guard fails → exit
4. If !--yes && !json → prompts confirm
5. writeRunArtifacts (initial), executePlan(cwd, skillDir, plan), writeRunArtifacts (with result)
6. Scripts run with cwd = user's project; script path = full path to skill's scripts/

## Dashboard

- **server.mjs:** Node HTTP server on 5174. Routes: GET /api/skills/installed, GET /api/runs, GET /api/runs/:id. Reads ~/.skillrunner/skills and ~/.skillrunner/runs.
- **Vite proxy:** /api → http://localhost:5174
- **App.tsx:** Skills tab (installed), Runs tab (recent). Fetches /api/skills/installed, /api/runs.
- **skill open:** runs `pnpm --filter dashboard dev` (node server.mjs & vite)

## Registry tools

- **build.ts:** reads registry/skills/_/SKILL.md frontmatter via gray-matter, writes registry/dist/index.json; loads packs from registry/packs/_.json
- **validate.ts:** each skill has SKILL.md; if scripts/ exists, check.sh and run.sh must be executable

## Skills (25)

**Automation (14):** node-doctor, repo-bootstrap, run-lint, run-format, run-tests, run-build, run-typecheck, dependency-audit-report, dependency-security-fix, react-maintenance-upgrade, terraform-fmt-validate, terraform-drift-audit, git-status-report, changelog-from-commits

**Knowledge (11):** code-review-checklist, debugging-playbook, react-patterns, testing-playbook, security-hygiene, terraform-structure, docs-styleguide, git-commit-style, pr-description-style, release-notes-style, deployment-checklist

## Build / scripts

- `pnpm install` — install deps
- `pnpm format:check` — verify formatting (CI)
- `pnpm build` — pnpm -r build (all packages)
- `pnpm registry:validate` — validate registry
- `pnpm registry:build` — build registry-tools then node packages/registry-tools/dist/build.js

Compiled output in packages/_/dist/; packages/_/src/_.js and _.d.ts are gitignored.

## Constraints

- **Never touch .ai/** — entire directory is gitignored; contains secrets; do not read, edit, or reference
- **Plan before run** — skill plan shows steps and risk
- **No auto-push** — skills never push to remotes
- **Guard blocks dangerous patterns** — sudo, rm -rf, curl|sh, etc.
- Never run destructive commands; show plan and ask confirmation unless --yes
