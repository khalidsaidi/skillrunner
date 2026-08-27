#!/usr/bin/env bash
set -e
if [[ ! -f package.json ]]; then
  echo "No package.json detected; bootstrap will initialize one."
fi
if [[ ! -d .git ]]; then
  echo "No git repository detected; bootstrap will initialize git."
fi
