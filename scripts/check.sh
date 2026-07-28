#!/bin/sh
# Everything CI runs, runnable locally. `npm run check` calls this, and
# .github/workflows/ci.yml calls the same script, so the two cannot drift.
#
# Order matters in one place: build/ is gitignored and both the MCP suite and
# check_md_layer.py read from it, so the build has to come before them. The
# static checks run first because they fail in seconds.
set -e
cd "$(dirname "$0")/.."

# Ruff and mypy are development-only and never installed on the deploy. Use them
# from PATH when they are there, otherwise fetch the pinned versions with uv.
if command -v ruff >/dev/null 2>&1; then RUFF="ruff"; else RUFF="uvx ruff@0.16.0"; fi
if command -v mypy >/dev/null 2>&1; then MYPY="mypy"; else MYPY="uvx mypy@2.3.0"; fi

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

step "eslint"
npx eslint .

step "prettier"
npx prettier --check .

step "tsc"
npx tsc --noEmit

step "generated types are current"
node scripts/generate_types.mjs --check

step "ruff"
$RUFF check .
$RUFF format --check .

step "mypy"
$MYPY

# The edge functions are Deno, not Node. --allow-import is required because they
# import the Netlify edge runtime over https; --rules-exclude drops the rule that
# forbids exactly that, which Netlify's own contract requires them to do.
step "deno (edge functions)"
deno check --allow-import=edge.netlify.com:443 netlify/edge-functions/markdown.ts
deno lint --rules-exclude=no-import-prefix netlify/edge-functions/

step "contrast"
node scripts/check_contrast.js

# Validates every record against its schema as step 0, then generates.
step "build"
./scripts/build.sh

step "tests"
npm test

step "markdown layer"
python3 scripts/check_md_layer.py

printf '\n\033[1;32mAll checks passed.\033[0m\n'
