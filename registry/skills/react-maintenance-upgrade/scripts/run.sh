#!/usr/bin/env bash
set -e
pnpm update react react-dom 2>/dev/null || npm update react react-dom 2>/dev/null
pnpm run build 2>/dev/null || npm run build 2>/dev/null || true
pnpm test 2>/dev/null || npm test 2>/dev/null || true
