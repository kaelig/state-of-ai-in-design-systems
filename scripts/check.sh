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
deno check --allow-import=edge.netlify.com:443 \
  netlify/edge-functions/markdown.ts \
  netlify/edge-functions/trailing-punctuation.ts
deno lint --rules-exclude=no-import-prefix netlify/edge-functions/
# The one edge function with a test. It is Deno rather than node --test because
# the file under test is TypeScript importing the edge runtime, and it sits in
# tests/ because Netlify would deploy anything under netlify/edge-functions/.
deno test --allow-import=edge.netlify.com:443 tests/trailing-punctuation.test.ts

# Full-repo, not `fallow audit`. The adoption guide's PR gate scopes analysis to
# files changed against the default branch, which assumes a pull request to diff.
# This repo ships straight to main, so there is usually no diff to scope to, and
# at this size the whole graph is analyzed in well under a second. A gate that
# only ever looked at changed files would also never notice the day an entry
# point in .fallowrc.jsonc stops matching the script build.sh actually runs.
#
# dead-code only. `fallow dupes` and `fallow health` both report against this
# repo today (one clone group and one cognitive-complexity target, both inside
# netlify/functions/mcp.mjs), so gating on them would mean shipping a red check
# or a baseline file to suppress it. Neither is honest. They stay on-demand
# until the findings are dealt with on their own terms.
step "dead code"
npx fallow dead-code

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
