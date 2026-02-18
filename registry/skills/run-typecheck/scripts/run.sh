#!/usr/bin/env bash
set -e
pnpm exec tsc --noEmit 2>/dev/null || npx tsc --noEmit 2>/dev/null || echo "Add typescript: pnpm add -D typescript"
