#!/usr/bin/env bash
set -e
if [[ ! -f package.json ]]; then
  echo "Bootstrapping package.json for dependency audit."
  npm init -y >/dev/null 2>&1 || true
fi

npm install --package-lock-only --ignore-scripts >/dev/null 2>&1 || true
pnpm audit 2>/dev/null || npm audit 2>/dev/null || echo "Audit not available"
