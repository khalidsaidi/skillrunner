#!/usr/bin/env bash
set -e
command -v terraform >/dev/null || { echo "terraform not installed"; exit 1; }
