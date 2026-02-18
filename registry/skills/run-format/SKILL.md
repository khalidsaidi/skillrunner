---
name: run-format
description: Run Prettier write if configured; otherwise print instructions
version: "1.0.0"
tags: [format, prettier]
kind: automation
risk: low
capabilities:
  shell: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# run-format

Runs Prettier format on the project. If not configured, prints setup instructions.
