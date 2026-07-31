# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two co-primary audiences, confirmed equal in priority; conflicts between them
are resolved case by case, not by rule.

- **Human readers:** designers and engineers working on or evaluating design
  systems, deciding which AI affordances (MCP servers, agent skills, llms.txt,
  editor rules) to ship or adopt. They read the report, compare the 20 systems,
  and follow source links before citing.
- **AI agents:** coding assistants and research agents consuming the study as
  data — via `/llms.txt`, per-record markdown/JSON twins, the SQLite export,
  content negotiation (`Accept: text/markdown`), the public MCP server at
  `/mcp`, and in-page WebMCP tools.

Contributors (human or agent) are a third audience: they file corrections and
new-system suggestions through the issue templates.

## Product Purpose

A field survey of how 20 actively maintained open-source design systems make
themselves legible to machines, plus the 6 platforms around them. For each
system: what it ships so coding agents can build with it, and the techniques
that keep a model using real components and tokens instead of inventing its
own. Covers both directions: AI for consumption (agents building UIs with the
system) and AI for building (teams using AI to maintain the system itself).

Success (confirmed): the report becomes a community resource — teams cite it
when deciding what to ship, and the community adds new systems and keeps
existing records current through corrections.

## Positioning

Every claim links to a source page that loads and shows the thing — the report
is trustworthy because each fact is verifiable, not because the author says so.
And the report is itself an artifact of its subject: a study of machine
legibility that is maximally machine-legible (markdown mirror, JSON twins,
llms.txt with measured sizes, SQLite, MCP with prompts, WebMCP). A neighboring
survey could not truthfully copy either without doing the work.

## Operating Context

- Data was collected 26–28 July 2026 and every page stamps `data_collected`.
  The one exception is `/reading`, which is kept current and stamps `updated`
  from its newest entry.
- Confirmed direction: the corpus is expected to grow. The community will
  likely add new design systems and update existing records, so the pipeline,
  schemas, and correction workflow are load-bearing product surfaces, not
  build tooling.
- Readers arrive from the design-systems community; agents arrive via MCP
  registration or llms.txt. Corrections flow through GitHub issue templates
  (`data-correction.yml`, `new-system.yml`, etc.), fillable by a person or an
  agent, including prefilled-URL flows.
- Facts live in `data/*.json`; every published surface is generated from them
  by `./scripts/build.sh`. Counts are computed, never typed. See AGENTS.md for
  the full editing contract.

## Capabilities and Constraints

- Static site, no framework, prerendered routes; markdown mirror compiled at
  build time; Netlify functions for MCP, edge function for content
  negotiation. `docs/architecture.md` explains why — read it before proposing
  structural change.
- Every claim carries a `source_url`; records documenting an absence
  deliberately have none. Corrections require a fetched source.
- Published surfaces carry the report, never the making of it: no process
  narration, verification bookkeeping, or review status (enforced by
  `scripts/check_md_layer.py`). This covers the site, the public repo, the MCP
  responses, and the mirrors.
- Terminology: "systems" (20), "platforms" (5), "affordances" (179),
  "techniques" (157, "coercion techniques"), "findings", "maturity spectrum".
  Counts here are illustrative; the build computes the real ones.
- Licensing: code MIT, data and report text CC BY 4.0.

## Brand Commitments

- Name: "State of AI in Design Systems — July 2026". The collection window is
  part of the report's identity even as the corpus grows.
- Voice: written like a person, for readers who can smell a generated
  paragraph. No em-dash chains, no "not just X, but Y", no three-item
  flourishes, no "robust"/"seamless"/"comprehensive", no mid-sentence bolding,
  no emoji headers. Contractions fine. Say the specific thing.
- US spelling in our own words; quoted sources keep their original spelling.
- Type: Hanken Grotesk (display), Source Sans 3 (body). Fonts are vendored;
  `font-display: block` is deliberate (prevents 309px of prose reflow).
- Color system: tokens in `:root` of `dashboard/template.html`, `light-dark()`
  both themes. Blue is for interaction only; data visualization uses
  desaturated `--mat-*` tokens so charts never read as calls to action.

## Evidence on Hand

- The dataset itself: 20 system records, 5 platform records, findings and
  essay in `data/insights.json`, further-reading list in `data/reading.json`,
  every snippet linked to its source.
- Live site: https://state-of-ai-in-design-systems.netlify.app with public
  MCP endpoint at `/mcp`.
- No testimonials, case studies, or adoption metrics exist; future work must
  not fabricate any.

## Product Principles

1. **Verifiability over authority.** A claim is only as good as the source
   page it links to. Never publish a fact that can't be checked in one click.
2. **The report practices what it studies.** Any new surface should be at
   least as machine-legible as the systems it evaluates.
3. **Computed, not asserted.** Counts, dates, and cross-references derive from
   the records at build time; hand-maintained duplicates go stale silently.
4. **Corrections are the product growing.** The path from "this is wrong" or
   "this system is missing" to a merged one-file diff should stay short, for
   humans and agents alike.
5. **Snapshot honesty.** Data is stamped with its collection date and the
   subjects ship weekly; the report says so rather than pretending currency.

## Accessibility & Inclusion

All color pairs are checked to WCAG AA 4.5:1 by `scripts/check_contrast.js`,
which runs in `npm run check` and CI. Both light and dark themes ship. Prose
measure is capped (62–74ch) for readability.
