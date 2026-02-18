#!/usr/bin/env bash
set -e
[[ -f package.json ]] || { echo "No package.json"; exit 1; }
grep -q '"react"' package.json || { echo "React not in dependencies"; exit 1; }
