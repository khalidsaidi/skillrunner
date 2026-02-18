---
name: dependency-security-fix
description: Fix high/critical vulns via safe bump; run tests; revert on failure
version: "1.0.0"
tags: [security, dependencies]
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

# dependency-security-fix

Attempts to fix high/critical vulnerabilities with npm audit fix (or pnpm). Runs tests; reverts on failure.
