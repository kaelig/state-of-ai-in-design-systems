# Architecture decisions

Why this site is built the way it is. The goal is narrow: the report should ship
the affordances it catalogues, so that an agent, or a person driving one, can
read, query and cite the study without scraping a single-page app.

## No framework

The view functions in `dashboard/template.html` are pure `JSON → string`
builders with no DOM references, so a small `node:vm` shim renders every route
headless in about 10ms. Rebuilding on Astro or Eleventy would re-host a working
renderer inside a dependency treadmill and put finished CSS at risk, for a
dataset that is frozen. The build stays four scripts and no framework.

## Prerendered HTML, one file per route

`scripts/prerender.mjs` runs the same view functions under Node and writes
`dashboard/<route>/index.html` with content baked into `#view-root`, `#nav` and
`#foot`, plus per-route `<head>` meta.

No major AI crawler runs JavaScript: GPTBot, ClaudeBot, OAI-SearchBot,
ChatGPT-User and PerplexityBot all take the served HTML as final. A client-side
router alone hands every one of them an empty shell.

Per-route meta is baked at prerender time rather than computed by an edge
function, which is why there is no `meta.ts`. There is no SPA fallback either:
every route is a real file and anything else gets a static 404. A catch-all
`200` would answer a typo’d mirror URL with the wrong page instead of an honest
miss.

## The payload is external

`dashboard/data.js` sets `window.DATA`, so 27 prerendered pages share one copy
of the records instead of inlining roughly 700KB each. `artifact.html` keeps the
payload inline, because being a single file is the point of that variant.

## Markdown twins, compiled

Everything under the markdown layer is generated from `data/*.json` by
`scripts/build_md.py`. Nothing is maintained by hand, so no mirror can drift
from the page it mirrors.

The layer is a 1:1 shadow of the routes (`/systems/ant-design` →
`/systems/ant-design.md`): 19 system records and 5 platform records in both
markdown and JSON, 11 technique-category files plus a roll-up, the seven view
files, 15 `questions/*.md`, and `about/schema.md` so agents don’t invent labels.
Aggregates ship as `llms-full.txt` and four slices, each carrying measured byte
counts so a model can route on budget.

Category is the retrieval unit for techniques, not the individual technique.
148 single-technique files would be 148 fetches to answer one question.

`llms.txt` (mirrored at `/.well-known/llms.txt`) is a router, not a dump: a
staleness preamble, the retrieval contract, a Questions section, a Vocabulary
section mapping loose phrasing onto the taxonomy, and a Documentation-sets
section with real sizes. `scripts/check_md_layer.py` fails the build if it
reaches 16KB, because an index nobody can afford to read is not an index.

Every `.md` carries YAML frontmatter: title, description, canonical, type, id,
counts, collection date, author, license, citation.

Published surfaces carry the claim and the `source_url` it came from. That URL
is the provenance: open it and check the claim yourself.

## Content negotiation at the edge

`netlify/edge-functions/markdown.ts` serves the markdown twin when a client
sends `Accept: text/markdown`, with `Vary: Accept` and a canonical `Link`
header. Claude Code, Cursor and OpenCode send that header today, and the
measured payoff on sites that answer it is around 99% fewer tokens per fetch.

## MCP as a serverless function

`/mcp` is a Netlify serverless Function, not an edge function: the 50ms CPU cap
on edge kills it.

The SDK is `@modelcontextprotocol/server`, pinned at `2.0.0-beta.5` in
`package.json`: the 2026-07-28 spec line, taken with its beta churn in exchange
for being current.

Transport constraints that hold regardless of SDK version:

- POST and OPTIONS only, with an explicit 405 on GET and DELETE. A GET SSE
  stream would hang until the Lambda timeout.
- A fresh server per request, unless the SDK documents reuse as safe.
- JSON responses rather than SSE frames, so curl and CI can read them.
- esbuild for bundling; the dataset is imported at cold start with a small
  in-memory search index.

Nine tools, compact by default, because one full system record is roughly 11k
tokens: `list_systems`, `get_system`, `search`, `list_affordances`,
`list_techniques`, `get_snippet`, `get_stats`, `get_report`, `get_platform`.
Snippet bodies are opt-in through `include:["snippets"]`, and `get_stats`
carries an `enums` block so agents stop guessing filter values.

Resources are a thin mirror only (`dsai://system/{id}`, `dsai://report/{section}`).
Tools are the mainstream surface; Context7 and MS Learn ship tools alone. Two
prompts round it out: `audit-my-design-system` and `find-technique-for`.

Tests drive the exported handler with plain `Request` objects under
`node:test`, so there are no ports and no flake.

## WebMCP, shipped early on purpose

A feature-detected module registers four read-only tools on
`document.modelContext`, since the API moved off `navigator`. Chrome is the only
implementation, behind an origin trial, and no mainstream agent calls it yet. It
ships with no polyfill and no origin-trial token: the code checks once and stops.

Every tool sets `readOnlyHint` and `untrustedContentHint`, because the dataset
quotes text from other people’s repositories and an assistant should treat that
as quotation, not as instructions addressed to it.

A report on how design systems talk to machines should try the parts that are
too early and say how they went. The honest writeup on `/ai` is part of the
value.
