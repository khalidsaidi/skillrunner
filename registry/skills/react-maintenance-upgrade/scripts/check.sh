#!/usr/bin/env bash
set -e
if [[ ! -f package.json ]]; then
  echo "package.json not found; react-maintenance-upgrade will bootstrap Node context."
fi
if [[ -f package.json ]] && ! grep -q '"react"' package.json; then
  echo "React not detected; react-maintenance-upgrade will install React baseline."
fi
