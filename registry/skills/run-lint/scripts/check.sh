#!/usr/bin/env bash
set -e
[[ -f package.json ]] || { echo "No package.json"; exit 1; }
