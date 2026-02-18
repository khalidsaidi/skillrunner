---
name: react-maintenance-upgrade
description: Patch/minor upgrades for react/react-dom and tooling; build/test; stop if risky
version: "1.0.0"
tags: [react, upgrade]
kind: automation
risk: moderate
capabilities:
  shell: true
  network: true
  fs_write: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# react-maintenance-upgrade

Upgrades React, React-DOM, and tooling to latest patch/minor. Runs build and tests; stops if failures.
