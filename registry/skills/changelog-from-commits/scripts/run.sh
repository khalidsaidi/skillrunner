#!/usr/bin/env bash
set -e
TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
FROM=${TAG:-HEAD}
echo "## Changes since $FROM"
git log "$FROM"..HEAD --oneline 2>/dev/null | head -30
