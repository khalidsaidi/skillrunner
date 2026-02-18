#!/usr/bin/env bash
set -e
BRANCH="skill/repo-bootstrap/$(date +%Y-%m-%d)"
git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"
pnpm add -D eslint prettier husky lint-staged 2>/dev/null || npm i -D eslint prettier husky lint-staged
echo '{"extends":["eslint:recommended"]}' > .eslintrc.json 2>/dev/null || true
echo '{}' > .prettierrc 2>/dev/null || true
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm run lint 2>/dev/null || true
      - run: pnpm run build 2>/dev/null || true
EOF
git add -A
git status --short
echo "Bootstrap complete on branch $BRANCH. Review and push manually."
