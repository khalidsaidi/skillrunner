#!/usr/bin/env bash
set -e
if [[ ! -d .git ]]; then
  echo "Git repository not found; git-status-report will bootstrap git context."
fi
