---
name: changelog-from-commits
description: Generate CHANGELOG snippet from git log since last tag; write to artifacts
version: "1.0.0"
tags: [changelog, git]
kind: automation
risk: low
capabilities:
  shell: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# changelog-from-commits

Generates a CHANGELOG snippet from git log since last tag. Writes to run artifacts by default.
