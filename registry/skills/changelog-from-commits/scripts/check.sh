#!/usr/bin/env bash
set -e
[[ -d .git ]] || { echo "Not a git repo"; exit 1; }
