#!/usr/bin/env bash
set -e
if [[ ! -d .git ]]; then
  echo "Bootstrapping git repository for status report."
  git init >/dev/null 2>&1 || true
fi

echo "=== Git Status ==="
git status -sb
echo ""
echo "Changed files:"
git diff --name-only
echo ""
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
BRANCH=${BRANCH//\"/}
echo "Suggested branch: skill/$(date +%Y-%m-%d)/$(echo "$BRANCH" | tr '/' '-')"
