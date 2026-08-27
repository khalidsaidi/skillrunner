---
name: git-status-report
description: Print repo status, changed files, suggested branch name
version: "1.0.0"
tags: [git]
kind: automation
risk: low
capabilities:
  shell: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# git-status-report

Prints git status, changed files, and a suggested branch name. Read-only.
