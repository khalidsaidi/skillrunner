#!/usr/bin/env bash
set -e
[[ -f package.json ]] || { echo "No package.json"; exit 1; }
[[ -d .git ]] || { echo "Not a git repo"; exit 1; }
