---
name: repo-bootstrap
description: Add ESLint, Prettier, Husky, lint-staged, basic config, and GitHub Actions CI; commits on new branch
version: "1.0.0"
tags: [tooling, ci, quality]
kind: automation
risk: moderate
capabilities:
  shell: true
  fs_read: true
  fs_write: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# repo-bootstrap

## When to use
Use when you want to standardize a new or existing repo with lint, format, and CI.

## What it will do
- Adds ESLint, Prettier, Husky, lint-staged
- Adds basic configs
- Adds minimal GitHub Actions CI
- Creates branch `skill/repo-bootstrap/<date>` and commits (no push)

## Safety
- Never pushes to remotes.
- Creates a new branch; does not modify main directly.
