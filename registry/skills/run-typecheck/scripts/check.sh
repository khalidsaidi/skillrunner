#!/usr/bin/env bash
set -e
[[ -f package.json ]] || { echo "No package.json"; exit 1; }
[[ -f tsconfig.json ]] || [[ -f tsconfig.base.json ]] || { echo "No tsconfig"; exit 1; }
