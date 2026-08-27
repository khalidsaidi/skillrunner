---
name: run-lint
description: Run package manager lint script if present
version: "1.0.0"
tags: [lint, quality]
kind: automation
risk: low
capabilities:
  shell: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# run-lint

Runs the project's lint script (e.g. `pnpm lint`, `npm run lint`).
