---
name: terraform-structure
description: Recommended Terraform project layout
version: "1.0.0"
tags: [terraform, structure]
kind: knowledge
risk: low
---

# Terraform Structure

- **modules/**: Reusable modules
- **environments/**: dev, staging, prod
- **backend**: Remote state (S3, GCS)
- **variables.tf / outputs.tf**: Clear inputs/outputs
- **workspaces** or **directories** for multi-env
