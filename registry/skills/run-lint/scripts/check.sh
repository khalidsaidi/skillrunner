#!/usr/bin/env bash
set -e
if [[ ! -f package.json ]]; then
  echo "package.json not found; run-lint will bootstrap Node context."
fi
