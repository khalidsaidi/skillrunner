#!/usr/bin/env bash
set -e
pnpm exec prettier --write . 2>/dev/null || npx prettier --write . 2>/dev/null || echo "Install: pnpm add -D prettier"
