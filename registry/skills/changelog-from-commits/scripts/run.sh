#!/usr/bin/env bash
set -e
if [[ ! -d .git ]]; then
  echo "Bootstrapping git repository for changelog generation."
  git init >/dev/null 2>&1 || true
fi

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  if ! git config user.email >/dev/null 2>&1; then
    git config user.email "skillrunner@local" >/dev/null 2>&1 || true
  fi
  if ! git config user.name >/dev/null 2>&1; then
    git config user.name "SkillRunner" >/dev/null 2>&1 || true
  fi
  git commit --allow-empty -m "chore: bootstrap changelog baseline" >/dev/null 2>&1 || true
fi

TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -n "$TAG" ]]; then
  echo "## Changes since $TAG"
  git log "$TAG"..HEAD --oneline 2>/dev/null | head -30 || true
else
  echo "## Recent changes"
  git log --oneline 2>/dev/null | head -30 || true
fi
