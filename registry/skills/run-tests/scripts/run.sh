#!/usr/bin/env bash
set -e
grep -q '"test"' package.json && (pnpm test 2>/dev/null || npm test) || (pnpm exec vitest run 2>/dev/null || npx vitest run 2>/dev/null || npx jest 2>/dev/null || echo "Add test script to package.json")
