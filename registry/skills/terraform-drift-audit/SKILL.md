---
name: terraform-drift-audit
description: terraform init + plan; summary report; no apply
version: "1.0.0"
tags: [terraform, drift, infra]
kind: automation
risk: low
capabilities:
  shell: true
  network: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# terraform-drift-audit

Runs terraform init and plan. Prints summary. Never applies.
