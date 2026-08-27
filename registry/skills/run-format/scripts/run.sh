#!/usr/bin/env bash
set -e
if [[ ! -f package.json ]]; then
  echo "Bootstrapping package.json for formatting."
  npm init -y >/dev/null 2>&1 || true
fi

pnpm exec prettier --write . 2>/dev/null || npx prettier --write . 2>/dev/null || (npm i -D prettier >/dev/null 2>&1 && npx prettier --write . 2>/dev/null) || echo "Prettier execution unavailable"
