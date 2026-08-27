#!/usr/bin/env bash
set -e
if [[ ! -f package.json ]]; then
  echo "package.json not found; node-doctor will include bootstrap guidance."
fi
