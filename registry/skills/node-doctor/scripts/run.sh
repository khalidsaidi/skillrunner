#!/usr/bin/env bash
set -e
echo "=== Node Doctor ==="
echo "Node: $(node -v 2>/dev/null || echo 'not found')"
echo "pnpm: $(pnpm -v 2>/dev/null || echo 'not found')"
echo "npm: $(npm -v 2>/dev/null || echo 'not found')"
echo "yarn: $(yarn -v 2>/dev/null || echo 'not found')"
echo "Git: $(git --version 2>/dev/null || echo 'not found')"
echo "Lockfile: $([ -f pnpm-lock.yaml ] && echo 'pnpm-lock.yaml' || [ -f package-lock.json ] && echo 'package-lock.json' || [ -f yarn.lock ] && echo 'yarn.lock' || echo 'none')"
echo "Recommendations:"
command -v node >/dev/null || echo "  - Install Node.js"
[[ -f pnpm-lock.yaml ]] || [[ -f package-lock.json ]] || [[ -f yarn.lock ]] || echo "  - Run package manager install to create lockfile"
