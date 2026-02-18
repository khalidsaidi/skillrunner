---
name: dependency-audit-report
description: Run npm/pnpm audit and write human report to artifacts (no repo edits)
version: "1.0.0"
tags: [security, audit, dependencies]
kind: automation
risk: low
capabilities:
  shell: true
  network: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# dependency-audit-report

Runs npm audit or pnpm audit and writes a human-readable report to run artifacts. No changes to repo.
