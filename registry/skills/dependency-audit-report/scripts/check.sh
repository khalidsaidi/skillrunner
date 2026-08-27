#!/usr/bin/env bash
set -e
if [[ ! -f package.json ]]; then
  echo "package.json not found; dependency-audit-report will bootstrap Node context."
fi
