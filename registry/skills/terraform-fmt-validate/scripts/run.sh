#!/usr/bin/env bash
set -e
terraform fmt -recursive
terraform init -backend=false 2>/dev/null || terraform init 2>/dev/null
terraform validate
