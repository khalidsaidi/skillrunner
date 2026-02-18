#!/usr/bin/env bash
set -e
pnpm audit 2>/dev/null || npm audit 2>/dev/null || echo "Audit not available"
