---
name: run-build
description: Run build script
version: "1.0.0"
tags: [build]
kind: automation
risk: low
capabilities:
  shell: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# run-build

Runs the project's build script.
