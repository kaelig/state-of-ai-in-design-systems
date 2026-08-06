# AGENTS.md

This repository is a research report: a July 2026 field survey of how 20
open-source design systems and 6 platforms make themselves usable by AI agents,
published as a static site with a markdown mirror, a JSON and SQLite export, and
an MCP server. Facts live in `data/*.json`; everything published is generated
from them by `./scripts/build.sh`.

If you only want to read the report, skip to
[Reading it as data](#reading-it-as-data). If you want to correct it, skip to
[Sending feedback](#sending-feedback). You don’t need to build anything to do
either.

## Commands

```sh
npm install
npm run check                       # everything CI runs: lint, format, types, build, tests
./scripts/build.sh                  # regenerate every published surface
netlify serve                       # site + functions + edge functions locally
```

`npm run check` is the one to run before proposing a change. It calls
`scripts/check.sh`, and so does CI, so the two cannot drift. In order: eslint,
prettier, tsc, the generated types, ruff, mypy, deno over the edge functions, the
contrast check, the build, the dead-code gate, the tests, and the markdown-layer
self-check. The static checks come first because they fail in seconds; the build
has to precede the tests, the dead-code gate and the markdown-layer check,
because `build/` is generated and all three read from it.

The build is not quiet either. It validates every record against its schema
before generating anything, then fails if a route renders empty, if a placeholder
survives into the HTML, if the nav and the route table disagree, or if the WebMCP
tools and the `/ai` copy name different tools.

Requirements are Node 24 and Python 3.12, pinned in `.nvmrc` and `runtime.txt` —
the two files Netlify itself reads, so your local versions match the deploy. The
build still needs no Python packages; ruff and mypy are development-only and
`npm run check` fetches them with `uvx` if they are not already installed.

## Edit these

| Path                                             | What it is                                                     |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `data/design-systems.json`                       | The 20 system records. Facts go here, nowhere else.            |
| `data/platforms.json`                            | The 5 platform records.                                        |
| `data/insights.json`                             | Findings, essay, methodology, caveats — the written analysis.  |
| `data/reading.json`                              | The further-reading list. Other people's work, not ours.       |
| `schema/design-system.schema.json`               | System record schema and controlled vocabularies.              |
| `schema/platform.schema.json`                    | Platform record schema.                                        |
| `schema/insights.schema.json`                    | Shape of the written analysis.                                 |
| `schema/reading.schema.json`                     | Reading-list entry schema.                                     |
| `dashboard/template.html`                        | The entire site: markup, CSS, and one view function per route. |
| `scripts/build_dashboard.py`                     | Payload, HTML shells, route table, nav.                        |
| `scripts/build_md.py`                            | Markdown mirrors, JSON twins, llms.txt, sitemap, SQLite.       |
| `scripts/prerender.mjs`                          | One static HTML file per route.                                |
| `scripts/build_og.mjs`                           | The social card, drawn from the same counts as the prose.      |
| `scripts/build_favicon.mjs`                      | The `.ico` and touch icon, rasterized from `favicon.svg`.      |
| `netlify/functions/mcp.mjs`                      | The MCP server at `/mcp`.                                      |
| `netlify/edge-functions/markdown.ts`             | Content negotiation for `Accept: text/markdown`.               |
| `netlify/edge-functions/trailing-punctuation.ts` | URLs a link parser mangled, redirected to the real path.       |
| `tests/mcp.test.mjs`                             | The MCP suite.                                                 |
| `tests/highlight.test.mjs`                       | The syntax-highlighting suite.                                 |
| `scripts/validate_data.mjs`                      | Step 0 of the build: records against schemas.                  |
| `scripts/check.sh`                               | The check sequence CI and `npm run check` both run.            |

## Never edit these

`dashboard/` holds two source files — `template.html` and `favicon.svg` — and 138
generated ones: `index.html`, every `<route>/index.html`, every `.md`, every
`.json`, `data.js`, `llms*.txt`, `sitemap.xml`, `og-image-<hash>.png`,
`favicon.ico`, `apple-touch-icon.png`, and `data/state-of-ai.sqlite`. The
generated ones are gitignored, so an edit to one shows up nowhere and disappears
on the next build.

`favicon.ico` and `apple-touch-icon.png` are both drawn from `favicon.svg`,
which is why the `.svg` is source and the other two are not. Edit the `.svg`.

`netlify/edge-functions/lib/md-routes.ts` is generated too, by `build_md.py`, and
is the one generated file still tracked, because the edge function imports it.

`assets/fonts/` is vendored, not authored: three cuts of Hanken Grotesk that
`build_og.mjs` rasterizes the social card with, so the render does not depend on
Google Fonts answering. `assets/fonts/README.md` says where they came from and
how to make them again.

`assets/logos/` is vendored the same way: the three platform marks the
`simple-icons` package does not carry, isolated by hand from each platform's own
lockup. `assets/logos/README.md` says where each came from, what was changed,
and the exact shape a new one has to be in — the build rejects anything else.
The other three marks come out of `node_modules/simple-icons`, which is the one
thing in `node_modules` the Python build reads, so `build_dashboard.py` now
needs `npm install` to have run. Every platform record carries a required `logo`
naming one source or the other, and a logo that does not resolve fails the
build.

To change a page's words, find the source: prose about a system is in
`data/design-systems.json`, analysis is in `data/insights.json`, and page
scaffolding is in `dashboard/template.html`.

## Constraints that will fail review

**Every claim carries a `source_url`.** Not a citation: a page that loads and shows
the thing.
This is the basis on which the report is trustworthy. Before changing a fact,
fetch the existing `source_url` and read it. A correction from a model’s
recollection rather than from a fetched page is worse than no correction, and
reviewers can tell.

A record that documents an _absence_ is the one case with nothing to link, and
it is correct that way. `patternfly`'s “llms.txt / llms-full.txt” affordance
exists to record that both files return 404; there is no page to point at, and a
sweep that “fixes” the missing link by supplying a URL makes the report say the
opposite of what it found. If a record has no link, read its description before
adding one.

These carry `"present": false`, and there are 35 of them. The description is
where the evidence goes — the address that was read and what came back, so the
claim can be rechecked without trusting us — and the matrix draws them as a
crossed mark, distinct from a cell nothing was established about. Adding one
means the check has to be conclusive: a 404 at a conventional URL, or a
repository tree with no file of that shape in it as of the collection window.

Where a file of the right shape exists but is not the thing, say so in the
record rather than leaving the cell blank. `shadcn-ui`'s repo agent files entry
is the worked example: two `templates/*/AGENTS.md` do exist, so the description
opens with them, names the `BEGIN:nextjs-agent-rules` fence that says Next.js
injected them, and points out that neither mentions shadcn. A reader who greps
the repo finds what the record already told them. What that costs is a longer
description, and it buys a cell that stops being ambiguous — leaving it blank
would have hidden a real finding behind a shrug.

An absence is never counted or listed as an affordance. `compute_counts()`,
`shipped()` in `build_md.py`, `shipped()` in `mcp.mjs`, the `present` column in
the SQLite export and the matrix predicate all filter on the same flag, and
`absence_faults()` in `check_hand_counts.py` fails the build if the counter
forgets. The records stay in the payload and in `get_system`, because an agent
asking whether a system ships an llms.txt deserves the answer either way.

The schemas enforce as much of this as a schema can. `scripts/validate_data.mjs`
runs as step 0 of the build and fails it on a missing `source_url`, an
out-of-vocabulary value, or a property the schema does not know about. It cannot
tell you whether the URL you supplied says what you claim it says. That part is
still on you, and it is the part reviewers check.

**Counts are computed, never typed.** 20, 5, 179, 157, and every other number
on the site is derived from the records at build time. A hand-typed count is a
count that goes stale silently.

The mechanism for prose is a placeholder in `data/insights.json`, filled by
`resolve_counts()` in `scripts/build_dashboard.py` before anything renders, so
the page, its markdown twin and the JSON passthrough always quote the same
figure. `{systems}` gives 20, `{systems:word}` twenty, and `{systems:Word}`
Twenty for a count that opens a sentence; past twenty the word forms fall back
to digits. The keys come from `compute_counts()`: `systems`, `platforms`,
`official_mcp`, `official_skills`, `llms_txt`, `affordances`, `techniques`,
`technique_categories`, `ai_native`. An unknown key fails the build, and so does
a placeholder that survives resolution.

The social card reads the same counts. `scripts/build_og.mjs` draws it, names it
after the hash of its own bytes, and `build_dashboard.py --final` puts that
filename in the `og:image` tag; `prerender.mjs` fails the build if the tag names
a file that is not on disk. The card used to be a screenshot, and it went four
counts stale without anything noticing, because no check here can read a PNG.

**Data strings reach the DOM through `esc()` or `fmt()`.** Both are defined near
the top of the script block in `dashboard/template.html`: `esc()` escapes HTML,
`fmt()` handles the light inline markup the descriptions use. A record string
interpolated raw into a template is a page that breaks on the first `<` in
somebody’s docs.

**Publish the report, not the making of it.** Generated surfaces carry the claim
and its source URL. They do not carry research-process narration, per-claim
verification bookkeeping, or internal review status. `scripts/check_md_layer.py`
enforces this with a grep gate over every generated file, and it will fail the
build if such fields reappear.

**Write like a person.** The report is read by designers and engineers who can
smell a generated paragraph. No em-dash chains, no “not just X, but Y”, no
three-item flourishes, no “robust” / “seamless” / “comprehensive”, no bolding for
emphasis mid-sentence, no emoji headers. Contractions are fine. Say the specific
thing.

**US spelling in our own words.** color, behavior, labeled, judgment, catalog,
license, organization, analyze. This covers everything we write: record prose,
ledes, findings, schema descriptions, MCP tool text, code comments and these
docs. It stops at anything we did not write. A `snippet.content`, a quoted
phrase inside a description, a source title, a URL and a product name keep the
spelling the source used, even where that is British — zeroheight's article is
“Optimising your styleguide”, and correcting it would misquote it.

## Design tokens

The palette is defined once in `:root` in `dashboard/template.html` and every
color comes from a token. Use `light-dark()`; both themes ship.

Colors are written in `oklch()`. Lightness is the first number, so a ramp reads
as a ramp in the source: the maturity backgrounds step 23.6 → 28.7 → 33.8 →
39.3 in dark mode, and a step that goes the wrong way is visible before the
contrast check runs. `scripts/build_og.mjs` is the one exception and says why in
a comment — resvg cannot parse `oklch()` and silently rasterizes it black, and
no check here can read a PNG.

Surfaces are `--bg`, `--bg-raise`, `--bg-sunk`. Text is `--ink`, `--ink-2`,
`--ink-3`. Rules are `--line`, `--line-strong`.

**Blue is for interaction.** `--accent` and `--accent-ink` mark links, focus
rings, hover states and the current nav item, plus a small set of deliberate
editorial accents (the rule under a page title, the eyebrow, the finding
numerals). Nothing else gets blue. Data visualization uses `--mat-0` through
`--mat-3` and `--data-strong`, which are deliberately desaturated so a chart
never reads as a call to action; intensity carries importance, not hue. Every
pair is checked to AA 4.5:1 by `scripts/check_contrast.js`.

Type is `--font-display` (Hanken Grotesk) for headings, `--font-body` (Source
Sans 3) for prose, `--mono` for code. Prose is capped at `--measure-lede` (62ch)
or `--measure-body` (74ch); tabular blocks are not prose and stay full width.

**Snippets get four colors, and only some languages get any.** The ink ramp
carries most of it — `--ink-3` for comments, `--ink-2` for punctuation, `--ink`
for everything else — and two tokens carry the one distinction it cannot,
`--syn-str` for values and `--syn-key` for names. Green and plum, not the usual
ochre and green, which red-green color blindness flattens into a single yellow.
Both clear AA 4.5:1 on `--bg-sunk` in both themes, and `check_contrast.js` holds
them there. The `hl-` classes carry color and font-style only; give one a padding
or a background and the page will move under a reader mid-sentence, because
highlighting runs after render.

`highlightCode()` in `dashboard/template.html` models seven grammars — `json`,
`yaml`, `shell`, `ts`, `html`, `css`, `markdown` — reached through an alias map
that reconciles the labels the corpus uses, including the `typescript` / `ts`
and `bash` / `shell` disagreement between the two datasets. `html` and `css`
have no records yet and are there for when they do. Anything the map does not
resolve renders plain, which is the right answer for `http` and for any language
nothing here can honestly parse. Do not normalize the labels in `data/` to make
this tidier: that moves markdown fences, the SQLite export and `md-map.json`
with it.

`text` and `plaintext` read as markdown. A docs page reaches for that label when
it never labeled the fence, not to promise the block has no structure, and about
a third of the corpus's `text` snippets turn out to be instruction files with
headings, bullets, code spans and links in them. The markdown grammar marks
structure and leaves prose alone, so the ones that really are a paragraph come
out identical to the plain rendering they had before. `HL_FLOOR` in
`prerender.mjs` counts the marked ones and fails the build if the alias is
dropped again.

Adding a grammar means a rule list and an alias in `template.html`, a probe in
`scripts/prerender.mjs` naming the classes it must produce, an entry in that
file's `HL_MUST_RESOLVE`, and tests. Adding a _label_ — the direction the corpus
actually grows — needs only the alias, and the build says so: an unrecognized
label in the data fails `prerender.mjs` rather than silently rendering plain.

Every string rule is bounded to a single line. Without that an apostrophe in
somebody's prose opens a string that closes paragraphs later, and twelve
snippets shipped exactly that way once. Two guards exist because of it: no value
token may cross a newline, and each grammar must still produce every class it is
supposed to. Neither the round-trip check nor a count of highlighted snippets
can see that failure — the bytes survive and the spans exist, they are just
wrong.

## Reading it as data

Read the data, don’t scrape the HTML. Every route has a markdown twin and every
record has a JSON twin.

- `https://state-of-ai-in-design-systems.netlify.app/llms.txt` — the index. Every
  file with its measured size, so you can budget context before fetching.
- `/llms-full.txt`, and `/llms-{systems,techniques,platforms,insights}.txt` —
  concatenated sets sliced by concern.
- `/systems/<id>.md` and `/systems/<id>.json` — one record, prose or typed.
- `/data/design-systems.json`, `/data/platforms.json`, `/data/insights.json`,
  `/data/state-of-ai.sqlite` — the whole dataset.
- `/about/schema.md` — the schema in prose, including the controlled vocabularies.
- Sending `Accept: text/markdown` to any HTML route returns the markdown twin.

The MCP server at `/mcp` is public, read-only and unauthenticated. Nine tools:
`get_stats`, `list_systems`, `get_system`, `get_platform`, `list_affordances`,
`list_techniques`, `search`, `get_snippet`, `get_report`. Start with `get_stats`
to learn the filter vocabulary. Snippet bodies are opt-in through `get_snippet`
so responses stay small.

```sh
claude mcp add --transport http --scope user ds-state-of-ai https://state-of-ai-in-design-systems.netlify.app/mcp
```

It also ships five prompts. `build-my-roadmap` leads, because it is the one
most people connect for: it turns what a system is missing into sequenced
work, carrying the record behind each item. The other four are `start-here`
for orientation, `audit-my-design-system`, `adopt-an-affordance` and
`find-technique-for`. They carry the controlled vocabulary in their bodies,
generated from the payload at registration time, so an agent has the filter
values before its first call. Claude Code exposes them as
`/mcp__ds-state-of-ai__<name>`; other clients use a prompt picker. The names are
listed in `MCP_PROMPTS` in `scripts/build_md.py`, published on `/ai`, and
asserted against `prompts/list` by `tests/mcp.test.mjs` — registering a prompt
without publishing it fails the suite, and so does the reverse.

The site also registers four WebMCP tools in-page via `registerReportTools()` in
`template.html`, behind a feature check: `list_systems`, `get_system`, `search`,
`get_stats`.

`/reading` is the exception to all of it. It lists other people's writing, talks
and courses on AI and design systems, it is kept current rather than fixed at the
collection window, and its markdown twin carries an `updated` field in place of
the `data_collected` every other page stamps. Quote that date when you cite it.
It is computed from the newest entry, so adding a work moves it.

Two things to carry into any answer you build from this: cite the `source_url` on
each record rather than the report, and say that the data is a snapshot of 26–28
July 2026 — with the one exception above, where anything drawn from `/reading`
takes that page's own date instead. It goes stale, and the systems it describes
ship weekly.

## Sending feedback

Corrections are the most useful contribution. Four templates, all fillable by a
person or an agent:

| Template                 | For                                                        |
| ------------------------ | ---------------------------------------------------------- |
| `data-correction.yml`    | A fact is wrong, stale, or missing. Requires a source URL. |
| `new-system.yml`         | A system that should be in the study.                      |
| `site-bug.yml`           | A page, link, file, or endpoint that doesn’t work.         |
| `reading-suggestion.yml` | Work the further-reading list is missing.                  |
| `feedback.yml`           | Anything else, including disagreement with the findings.   |

From a shell:

```sh
gh issue create --repo kaelig/state-of-ai-in-design-systems \
  --title "[data] Primer — MCP server package renamed" \
  --label data \
  --body "**Record:** systems/primer-github, affordance \"Primer MCP server\"

**Report says:** the package is \`@primer/mcp\`.

**Should say:** the package is \`@primer/mcp-server\`.

**Source:** https://github.com/primer/react/blob/v37.0.0/packages/mcp/package.json

**Found via:** MCP server"
```

Or build a prefilled form URL for a human to review and submit. Text fields
prefill from their `id`:

```
https://github.com/kaelig/state-of-ai-in-design-systems/issues/new
  ?template=data-correction.yml
  &labels=data
  &title=[data]+Primer
  &claim=...
  &correction=...
  &source=https://...
```

Field ids are in `.github/ISSUE_TEMPLATE/data-correction.yml`. The `title` and
the three textareas (`claim`, `correction`, `source`) prefill. The `subject`
dropdown does not: GitHub’s issue-form UI renders it as a custom component and
ignores the parameter, whether you pass the option text or its index. Name the
record in `claim` instead and leave the dropdown for the person submitting. The
“Suggest a correction” link on each system page does exactly this.

Include a source URL you actually fetched. A correction without one gets a reply
asking for the link, which costs everybody a round trip.

## Conventions

Commits are imperative and explain the change, not the process. Branch off
`main`. For pull requests, `.github/PULL_REQUEST_TEMPLATE.md` asks for the source
URLs behind any data change; CI answers for the checks, so there is nothing to
confirm by hand.

Do not commit the regenerated `dashboard/` output; it is gitignored. Netlify runs
`./scripts/build.sh` on every deploy and publishes what that writes, so building
locally is how you check your change, not something you hand in. A data
correction should be a one-file diff.

Two files under `dashboard/` are source and stay tracked: `template.html` and
`favicon.svg`. The build does not recreate those.

[`docs/architecture.md`](docs/architecture.md) explains why the site is built
this way: no framework, prerendered routes, the compiled markdown layer, the MCP
transport constraints. Read it before proposing a structural change.
[`docs/design-audit.md`](docs/design-audit.md) is the open design worklist, with
a status column at the top.

Code is MIT ([LICENSE](LICENSE)); data and report text are CC BY 4.0
([LICENSE-DATA](LICENSE-DATA)). [CONTRIBUTING.md](CONTRIBUTING.md) covers the
same ground for human contributors.
