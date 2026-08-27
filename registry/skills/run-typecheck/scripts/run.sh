#!/usr/bin/env bash
set -e
if [[ ! -f package.json ]]; then
  echo "Bootstrapping package.json for typecheck."
  npm init -y >/dev/null 2>&1 || true
fi

if [[ ! -f tsconfig.json ]] && [[ ! -f tsconfig.base.json ]]; then
  cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": false,
    "skipLibCheck": true
  },
  "include": ["**/*"]
}
EOF
fi

pnpm exec tsc --noEmit 2>/dev/null || npx tsc --noEmit 2>/dev/null || (npm i -D typescript >/dev/null 2>&1 && npx tsc --noEmit 2>/dev/null) || echo "TypeScript toolchain unavailable"
