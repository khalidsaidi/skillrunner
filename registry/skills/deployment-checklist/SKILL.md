---
name: deployment-checklist
description: Checklist for safe deployments and releases
version: "1.0.0"
tags: [deployment, release, ops]
kind: knowledge
risk: low
---

# Deployment Checklist

- [ ] Version bumped (package.json, CHANGELOG, or equivalent)
- [ ] Tests passing locally and in CI
- [ ] Migration scripts tested (if applicable)
- [ ] Rollback plan documented
- [ ] Feature flags or gradual rollout considered
- [ ] Monitoring and alerts configured
- [ ] Secrets and env vars validated for target environment
