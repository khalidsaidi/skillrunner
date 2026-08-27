---
name: testing-playbook
description: Testing strategy and practices
version: "1.0.0"
tags: [testing]
kind: knowledge
risk: low
---

# Testing Playbook

- **Unit**: Fast, isolated; mock external deps
- **Integration**: APIs, DB; real or in-memory
- **E2E**: Critical paths; keep suite small
- **TDD**: Red-green-refactor when it helps
- **Naming**: `should <expected> when <condition>`
