#!/usr/bin/env bash
set -e
grep -q '"build"' package.json && (pnpm run build 2>/dev/null || npm run build) || echo "No build script in package.json"
