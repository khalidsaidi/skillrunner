---
name: node-doctor
description: Detect Node/pnpm/npm/yarn, package.json, git, lockfile; print recommended commands and report
version: "1.0.0"
tags: [node, tooling, diagnostics]
kind: automation
risk: low
capabilities:
  shell: true
  fs_read: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# node-doctor

## When to use

Use when you want to diagnose a Node.js project's environment and tooling setup.

## What it will do

- Detects node, pnpm, npm, yarn versions
- Checks for package.json, lockfile, git
- Writes a report to run artifacts only (no repo edits)

## Safety

- Read-only; never modifies the repo.
- Output goes to ~/.skillrunner/runs/<runId>/
