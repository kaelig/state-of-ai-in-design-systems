# AGENTS.md

This repository is a research report: a July 2026 field survey of how 19
open-source design systems and 5 platforms make themselves usable by AI agents,
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
./scripts/build.sh                  # regenerate every published surface
python3 scripts/check_md_layer.py   # markdown layer self-check
npm test                            # MCP server suite (node --test, no ports)
netlify serve                       # site + functions + edge functions locally
```

Run all three checks before proposing a change. `build.sh` is not quiet: it fails
if a route renders empty, if a placeholder survives into the HTML, if the nav and
the route table disagree, or if the WebMCP tools and the `/ai` copy name
different tools. Requirements are Python 3 with no packages and Node 20+.

## Edit these

| Path | What it is |
|---|---|
| `data/design-systems.json` | The 19 system records. Facts go here, nowhere else. |
| `data/platforms.json` | The 5 platform records. |
| `data/insights.json` | Findings, essay, methodology, caveats — the written analysis. |
| `schema/design-system.schema.json` | Record schema and controlled vocabularies. |
| `dashboard/template.html` | The entire site: markup, CSS, and one view function per route. |
| `scripts/build_dashboard.py` | Payload, HTML shells, route table, nav. |
| `scripts/build_md.py` | Markdown mirrors, JSON twins, llms.txt, sitemap, SQLite. |
| `scripts/prerender.mjs` | One static HTML file per route. |
| `netlify/functions/mcp.mjs` | The MCP server at `/mcp`. |
| `netlify/edge-functions/markdown.ts` | Content negotiation for `Accept: text/markdown`. |
| `tests/mcp.test.mjs` | The MCP suite. |

## Never edit these

Everything in `dashboard/` **except `template.html`** is generated. That is 130+
files: `index.html`, every `<route>/index.html`, every `.md`, every `.json`,
`data.js`, `llms*.txt`, `sitemap.xml`, and `data/state-of-ai.sqlite`.

Editing a generated file is the most common way to waste a change here. It
survives until the next build and then disappears, and until then the HTML page
and its markdown twin disagree about what the report says. `build/` is
intermediate and not committed.

To change a page’s words, find the source: prose about a system is in
`data/design-systems.json`, analysis is in `data/insights.json`, and page
scaffolding is in `dashboard/template.html`.

## Constraints that will fail review

**Every claim carries a `source_url`.** Not a citation: a page that loads and shows
the thing.
This is the basis on which the report is trustworthy. Before changing a fact,
fetch the existing `source_url` and read it. A correction from a model’s
recollection rather than from a fetched page is worse than no correction, and
reviewers can tell.

A record that documents an *absence* is the one case with nothing to link, and
it is correct that way. `patternfly`'s “llms.txt / llms-full.txt” affordance
exists to record that both files return 404; there is no page to point at, and a
sweep that “fixes” the missing link by supplying a URL makes the report say the
opposite of what it found. If a record has no link, read its description before
adding one.

**Counts are computed, never typed.** 19, 5, 168, 148, and every other number
on the site is derived from the records at build time. A hand-typed count is a
count that goes stale silently.

The mechanism for prose is a placeholder in `data/insights.json`, filled by
`resolve_counts()` in `scripts/build_dashboard.py` before anything renders, so
the page, its markdown twin and the JSON passthrough always quote the same
figure. `{systems}` gives 19, `{systems:word}` nineteen, and `{systems:Word}`
Nineteen for a count that opens a sentence; past twenty the word forms fall back
to digits. The keys come from `compute_counts()`: `systems`, `platforms`,
`official_mcp`, `official_skills`, `llms_txt`, `affordances`, `techniques`,
`technique_categories`, `ai_native`. An unknown key fails the build, and so does
a placeholder that survives resolution.

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

## Design tokens

The palette is defined once in `:root` in `dashboard/template.html` and every
colour comes from a token. Use `light-dark()`; both themes ship.

Surfaces are `--bg`, `--bg-raise`, `--bg-sunk`. Text is `--ink`, `--ink-2`,
`--ink-3`. Rules are `--line`, `--line-strong`.

**Blue is for interaction.** `--accent` and `--accent-ink` mark links, focus
rings, hover states and the current nav item, plus a small set of deliberate
editorial accents (the rule under a page title, the eyebrow, the finding
numerals). Nothing else gets blue. Data visualisation uses `--mat-0` through
`--mat-3` and `--data-strong`, which are deliberately desaturated so a chart
never reads as a call to action; intensity carries importance, not hue. Every
pair is checked to AA 4.5:1 by `scripts/check_contrast.js`.

Type is `--font-display` (Hanken Grotesk) for headings, `--font-body` (Source
Sans 3) for prose, `--mono` for code. Prose is capped at `--measure-lede` (62ch)
or `--measure-body` (74ch); tabular blocks are not prose and stay full width.

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
claude mcp add --transport http --scope user state-of-ai https://state-of-ai-in-design-systems.netlify.app/mcp
```

The site also registers four WebMCP tools in-page via `registerReportTools()` in
`template.html`, behind a feature check: `list_systems`, `get_system`, `search`,
`get_stats`.

Two things to carry into any answer you build from this: cite the `source_url` on
each record rather than the report, and say that the data is a snapshot of 26–27
July 2026. It goes stale, and the systems it describes ship weekly.

## Sending feedback

Corrections are the most useful contribution. Four templates, all fillable by a
person or an agent:

| Template | For |
|---|---|
| `data-correction.yml` | A fact is wrong, stale, or missing. Requires a source URL. |
| `new-system.yml` | A system that should be in the study. |
| `site-bug.yml` | A page, link, file, or endpoint that doesn’t work. |
| `feedback.yml` | Anything else, including disagreement with the findings. |

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
`main`. For pull requests, `.github/PULL_REQUEST_TEMPLATE.md` asks for the
source URLs behind any data change and confirmation that the three checks pass.

Commit the regenerated `dashboard/` output alongside a source change. The site
deploys from those files, so a data change without them reaches nobody. The diff
will be large; that is the pipeline fanning one record out across the HTML, the
mirrors, the twins, the SQLite export and `llms.txt`.

[`docs/architecture.md`](docs/architecture.md) explains why the site is built
this way: no framework, prerendered routes, the compiled markdown layer, the MCP
transport constraints. Read it before proposing a structural change.
[`docs/design-audit.md`](docs/design-audit.md) is the open design worklist, with
a status column at the top.

Code is MIT ([LICENSE](LICENSE)); data and report text are CC BY 4.0
([LICENSE-DATA](LICENSE-DATA)). [CONTRIBUTING.md](CONTRIBUTING.md) covers the
same ground for human contributors.
