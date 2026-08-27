#!/usr/bin/env bash
set -e
if [[ ! -f package.json ]]; then
  echo "package.json not found; run-typecheck will bootstrap Node context."
fi
if [[ ! -f tsconfig.json ]] && [[ ! -f tsconfig.base.json ]]; then
  echo "TypeScript config not found; run-typecheck will scaffold tsconfig.json."
fi
