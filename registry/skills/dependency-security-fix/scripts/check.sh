#!/usr/bin/env bash
set -e
if [[ ! -f package.json ]]; then
  echo "package.json not found; dependency-security-fix will bootstrap Node context."
fi
if [[ ! -d .git ]]; then
  echo "Git repository not found; dependency-security-fix will bootstrap git context."
fi
