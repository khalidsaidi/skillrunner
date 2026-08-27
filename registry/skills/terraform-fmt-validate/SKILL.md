---
name: terraform-fmt-validate
description: Run terraform fmt -recursive and terraform validate; no apply
version: "1.0.0"
tags: [terraform, infra]
kind: automation
risk: low
capabilities:
  shell: true
scripts:
  check: scripts/check.sh
  run: scripts/run.sh
---

# terraform-fmt-validate

Runs terraform fmt and validate. Never applies changes.
