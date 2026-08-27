#!/usr/bin/env bash
set -e
if [[ ! -f package.json ]]; then
  echo "package.json not found; run-tests will bootstrap Node context."
fi
