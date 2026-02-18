#!/usr/bin/env bash
set -e
echo "=== Git Status ==="
git status -sb
echo ""
echo "Changed files:"
git diff --name-only
echo ""
echo "Suggested branch: skill/$(date +%Y-%m-%d)/$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-')"
