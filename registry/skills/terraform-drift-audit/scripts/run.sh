#!/usr/bin/env bash
set -e
terraform init 2>/dev/null
terraform plan -no-color 2>&1 | head -100
