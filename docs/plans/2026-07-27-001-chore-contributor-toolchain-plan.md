---
artifact_contract: ce-unified-plan/v1
artifact_readiness: requirements-only
product_contract_source: ce-brainstorm
date: 2026-07-27
status: awaiting review
---

# Contributor Toolchain - Plan

## Goal capsule

**Objective.** Make this repository safe and pleasant to contribute to, for three
kinds of contributor at once: a person opening their first pull request, a coding
agent editing the data, and the maintainer iterating locally. Get there with
mainstream, current tooling across both runtimes, and remove the requirement to
build locally before deploying.

**Product authority.** The maintainer. Decisions recorded below were settled in
the 27 July 2026 brainstorm.

**Open blockers.** None. Two forks were resolved during the brainstorm and are
recorded under Key decisions.

**Not in scope.** Extracting the inline script from `dashboard/template.html`
into typed modules. It would extend type checking to the view functions, but it
touches the file that is the entire site, and the rest of this work does not
depend on it. See Known gaps.

## Why now

The repository has no linter, no formatter, no type checking, no version pins and
no CI. `.github/` carries four issue templates and a pull request template, so the
contribution path is designed but unverified: nothing checks what arrives through
it. `AGENTS.md` asks contributors to run three commands before proposing a change,
enforced by nobody.

Two specific gaps do the most damage.

`schema/design-system.schema.json` is published and documented but never enforced.
`scripts/build_md.py` reads it only to copy it out and to generate
`/about/schema.md`. A record with a bad `ai_maturity` value or a missing
`source_url` would flow through the build into the HTML, the markdown mirrors, the
SQLite export and the MCP server. The other two data files, `platforms.json` and
`insights.json`, have no schema at all.

And 130 generated files are committed under `dashboard/`, 11MB of derivation that
Netlify regenerates on every deploy anyway. A one-line data correction arrives as
a 131-file diff, which is a poor thing to ask a first-time contributor to open and
an expensive thing to ask a reviewer to read.

## Key decisions

**Netlify builds every deploy; nothing generated is committed.**
`netlify.toml` already sets `command = "./scripts/build.sh"` and publishes the
freshly generated output, so the committed copy is redundant for deployment.
Untracking it makes a data correction a one-file diff.

**CI replaces the committed output as the safety net.** Dropping the committed
build removes the fallback that would have deployed if `build.sh` broke. A
workflow that runs the real build on every pull request restores it, and does so
earlier: a broken build turns the pull request red instead of turning up at deploy
time.

**TypeScript 7.0.2 now; typescript-eslint revisited when it supports TS 7.**
`session-settled:` TypeScript's latest stable is 7.0.2, the native compiler.
`typescript-eslint` 8.65.0 and its canary both declare `typescript: ">=4.8.4
<6.1.0"`, so type-aware ESLint rules are unavailable on TS 7, and the last
supported TypeScript is 6.0.3. Taking TS 7 costs lint rules over roughly 130 lines
of Deno edge-function code, which `deno lint` covers better than typescript-eslint
would. Revisit when the peer range moves.

**Data files get formatted.** `session-settled:` One noisy commit normalizing
`data/design-systems.json` and `data/platforms.json`, so that every correction
after it reads as the change it is.

**Ruff and mypy for Python, and Python stays a build-time dependency of nobody.**
Python is the majority of the source by bytes. Its tooling installs in CI only, so
`build.sh` stays standard-library-only and the Netlify deploy takes on no Python
packages.

**Data validation runs in Node, inside the build.** Keeping the guard on the
deploy path matters more than which runtime holds it, and Node is already there.
This is what makes an agent's edit to a 630KB JSON file safe.

## Requirements

### R1 - Version pins the deploy actually reads

Netlify resolves Node from `.nvmrc` or `.node-version` first, then `NODE_VERSION`,
then the UI, then the image default; Python from `runtime.txt`, then `Pipfile`,
then `PYTHON_VERSION`.

- `.nvmrc` pins Node to `24`, matching the local 24.18.0 and Netlify's default.
- `runtime.txt` pins Python to `3.12`. Nothing pins it today: 91KB of
  `build_md.py` currently runs on the deploy against whatever the build image
  supplies, while local development is on 3.14.6. CI must run the pinned version
  so the skew is tested rather than assumed.
- `.npmrc` sets `engine-strict=true` and `save-exact=true`.
- `package.json` raises `engines.node` from `>=20` to `>=24`.

If `build.sh` turns out to need syntax newer than 3.12, CI says so on the first
run and the pin moves up. That is the point of pinning.

### R2 - Generated output leaves the repository

- `.gitignore` ignores `dashboard/*` and re-includes `dashboard/template.html`,
  the only source file in that directory.
- `git rm -r --cached` untracks the other 130 files.
- `AGENTS.md:210` and `CONTRIBUTING.md:123` currently instruct contributors to
  commit the regenerated output. Both must say the opposite, and say why: the
  deploy builds from source, so a local build is a check, not a deliverable.
- Nothing in the repository reads a committed `dashboard/` file as input.
  `scripts/check_md_layer.py` inspects generated files, but runs after the build
  produces them.

### R3 - JavaScript and TypeScript checking

- TypeScript 7.0.2. `tsconfig.json` with `allowJs`, `checkJs`, `noEmit` and
  `strict`, covering `scripts/prerender.mjs`, `netlify/functions/mcp.mjs` and
  `tests/mcp.test.mjs`. Types arrive through JSDoc; no file is renamed.
- ESLint 10.8.0, flat config, `@eslint/js` plus `globals`, over `.mjs` and `.js`.
- Prettier 3.9.6, with `eslint-config-prettier` to drop conflicting rules.
- `netlify/edge-functions/**` is excluded from `tsconfig.json` and checked by
  `deno check` and `deno lint` instead. Those files import `netlify:edge` and run
  on Deno; `tsc` cannot resolve the specifier and typescript-eslint cannot parse
  them under TS 7. Deno is already installed locally and available in CI.
- `.prettierignore` excludes `dashboard/template.html`, whose 1,531 lines of
  markup and CSS are hand-tuned, and includes `data/*.json` per the decision
  above.

### R4 - Python checking

- Ruff 0.16.0 for both `ruff check` and `ruff format`, in place of the
  black/isort/flake8 trio.
- mypy 2.3.0 over `scripts/`, starting non-strict and tightening over time rather
  than annotating 127KB in one pass.
- Both configured in `pyproject.toml`. Installed in CI only.

### R5 - Schema-first type safety, end to end

- Add `schema/platform.schema.json` and `schema/insights.schema.json`. Today only
  system records have a schema, leaving 96KB of data unschematized.
- `json-schema-to-typescript` generates a committed `types/data.d.ts`. CI fails if
  it has drifted from the schemas.
- `ajv` 8.20.0 validates all four data files as step 0 of `scripts/build.sh`, so a
  bad enum value or a missing `source_url` fails the build instead of reaching the
  site, the SQLite export and the MCP server.

Validation belongs on the deploy path rather than in CI alone, because the deploy
is now the only build that has to succeed.

### R6 - One command, run two places

`npm run check` runs the full sequence locally, and `.github/workflows/ci.yml`
runs the same sequence on every pull request and on `main`:

lint, format check, typecheck, `deno check`, `ruff check`, `ruff format --check`,
`mypy`, `npm test`, `./scripts/build.sh`, `python3 scripts/check_md_layer.py`.

`build.sh` does not currently run `check_md_layer.py`; the workflow runs it as a
separate step, as `AGENTS.md` already describes for humans.

### R7 - Contributor documentation matches reality

`AGENTS.md`, `CONTRIBUTING.md` and `.github/PULL_REQUEST_TEMPLATE.md` describe a
three-command manual routine and a requirement to commit build output. After this
work, the routine is `npm run check` and the build output is not committed. All
three need updating, and the pull request template should stop asking for
confirmation that checks were run by hand, because CI answers that.

## Success criteria

1. A data correction is a one-file diff.
2. A fresh clone with no local build can deploy, because Netlify builds from
   source and the runtimes are pinned.
3. A record that violates its schema fails the build rather than reaching the
   published surfaces.
4. Every pull request runs the same checks the maintainer runs, without anyone
   remembering to.
5. The Netlify deploy takes on no new dependencies. Development tooling is
   development-only.

## Known gaps

**`dashboard/template.html` gets no automated checking.** Its inline script holds
the view functions, and neither ESLint nor Prettier reaches JavaScript inside an
HTML file without a plugin, so the file is excluded from both. Extracting the
script into typed modules that the build inlines back would close this, and would
also be the moment a bundler earns its place here. Out of scope for now.

**mypy starts loose.** A non-strict first pass over 127KB of untyped Python finds
less than a strict one. The alternative is annotating everything before anything
is checked, which is how this kind of work stalls.

**One-time formatting noise.** Normalizing the data files and first-pass
formatting produce large diffs. They should land as their own commits, separate
from any behavior change, so that `git log` stays readable.

## Approach notes

Vite+ was considered and set aside. It never enters the deploy path: `build.sh` is
four steps of `python3` and one `node`, with no bundle, no dev server and no task
graph, and the only bundling Netlify does here is esbuild for the function and its
own Deno toolchain for the edge function. Its runtime pinning does not propagate
to Netlify, which reads `.nvmrc` and `runtime.txt` and nothing else, so it would
have added a second source of truth for the Node version rather than removing the
first. It also reached beta on 4 June 2026, and `docs/architecture.md` declines
Astro and Eleventy by name to avoid a dependency treadmill. Worth revisiting at
1.0, or if the template extraction above ever creates a real bundling step.
