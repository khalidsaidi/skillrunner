#!/usr/bin/env bash
set -e
grep -q '"lint"' package.json && (pnpm run lint 2>/dev/null || npm run lint) || echo "No lint script in package.json"
