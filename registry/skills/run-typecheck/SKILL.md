---
name: run-typecheck
description: Run tsc --noEmit if tsconfig present
version: "1.0.0"
tags: [typescript, typecheck]
kind: automation
risk: low
capabilities:
  shell: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# run-typecheck

Runs TypeScript type check (tsc --noEmit) if tsconfig present.
