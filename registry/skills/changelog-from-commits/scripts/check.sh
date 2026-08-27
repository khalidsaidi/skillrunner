#!/usr/bin/env bash
set -e
if [[ ! -d .git ]]; then
  echo "Git repository not found; changelog skill will bootstrap git context."
fi
