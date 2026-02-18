#!/usr/bin/env bash
set -e
pnpm audit fix 2>/dev/null || npm audit fix 2>/dev/null || echo "Audit fix not available"
pnpm test 2>/dev/null || npm test 2>/dev/null || true
