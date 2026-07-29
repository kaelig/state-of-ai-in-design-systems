---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-brainstorm
title: 'chore: Rewrite every page lede for the reader'
date: 2026-07-28
depth: standard
---

# chore: Rewrite every page lede for the reader

## Product Contract

### Summary

Replace the eight page ledes with copy that says, in plain language, what is on
the page. Leave `/ai` alone. Two small repairs come with it, both surfaced by the
new copy: a schema description that no longer described its field, and a missing
key in the build's smart-quote pass.

### Problem Frame

A lede is the one paragraph a reader sees under the page title, and on this site
several of them describe the machinery instead of the page. The clearest case is
`/methodology`: "Every number on this site is computed from the records, not
typed in." That is true, it matters to whoever maintains the build, and no
reader arriving at a methodology page wants it. `/reading` closes on "Everything
here was opened and read before it was listed," which is the contributor bar and
is already stated in `CONTRIBUTING.md`, in the reading-suggestion issue
template, and in the reading page's own closing paragraph.

`AGENTS.md` already has the rule this violates — "Publish the report, not the
making of it" — and `scripts/check_md_layer.py` enforces it with a grep gate over
every generated file. The gate catches research-process _fields_. It cannot
catch a process-flavoured _sentence_, which is how these got through.

The rest fail differently. `/platforms` opens with four ranked editorial claims
about Figma, Storybook and the three MCP vendors, which is the essay's job, not a
lede's, and which `system:audit-prose` has to re-verify every time a platform
record moves. `/techniques` runs to 64 words before saying what is on the page.
`/` packs the whole study into two dense sentences and a parenthetical list.

The reader these are written for is someone who runs a design system and is
deciding what to ship next. They want to know what the page holds so they can
decide whether to read it.

### Requirements

- **R1.** Each of the eight ledes describes what is on its page, in plain
  language, in no more than three sentences.
- **R2.** No lede describes how the site is built, how the data was gathered, or
  how a contribution is judged.
- **R3.** Every number in a lede comes from a placeholder resolved at build time,
  never a typed digit.
- **R4.** The prose obeys `AGENTS.md` "Write like a person": no em-dash chains,
  no "not just X, but Y", no three-item flourishes, none of
  robust/seamless/comprehensive, no mid-sentence bolding.
- **R5.** `/ai` is unchanged.
- **R6.** `npm run check` passes.

### Non-goals

Moving the two hardcoded ledes into `data/insights.json`. It would centralise
page copy, and it would cost a change to `schema/insights.schema.json` (which
sets `additionalProperties: false` and lists every key as required) plus the key
list in `resolve_counts()`, for nothing a reader can see. Recorded here because
page copy living in two files is a real cost, just not one this change pays.

### Key decisions

- **Describe the page, do not lead with a finding.** An earlier draft opened each
  lede with the sharpest claim that page proves. Rejected: it puts a claim with a
  maintenance cost in front of a reader who is still deciding whether to read on,
  and it made eight pages sound like eight arguments.
- **Keep the two hardcoded ledes in the template.** See non-goals.
- **Leave `/ai` alone.** It already opens on what the reader gets, in a voice a
  person would use.

## Implementation

### U1 — The six ledes in `data/insights.json`

Replace the six string values. Placeholder syntax is resolved by
`resolve_counts()` in `scripts/build_dashboard.py`; the valid keys are `systems`,
`platforms`, `official_mcp`, `official_skills`, `llms_txt`, `affordances`,
`techniques`, `technique_categories`, `ai_native`, each with `:word` and `:Word`
variants. An unknown key fails the build.

`lede`

> What {systems} open-source design systems ship so AI agents can build with
> them, plus the {platforms:word} platforms most of them sit on. This page has
> the headline counts, where every system landed, and the findings.

`techniques_lede`

> Models invent components that don't exist. This page collects the {techniques}
> things teams do to stop that, grouped into {technique_categories} kinds, quoted
> from the files where they wrote them down.

`platforms_lede`

> Figma, Storybook, Supernova, Knapsack and zeroheight: the {platforms:word}
> tools design systems get built and published on. For each one, what it gives an
> AI agent and how much evidence there is that anyone uses it.

`insights_lede`

> An essay on what the {systems} records add up to, then the patterns almost
> every team has landed on, then the places they've bet differently.

`methodology_lede`

> How the {systems} systems were picked, and what had to be on a page before it
> counted as an affordance or a technique. The caveats are at the bottom, and
> there are a few.

`reading_lede`

> Other people's writing, talks and courses on design systems and AI agents.
> Unlike the rest of the report, this list keeps moving.

Note that `reading_lede` carries a schema description calling it "the bar the
further-reading list is held to" and "the standard a suggestion is judged
against". That description no longer matches the string, so update it in
`schema/insights.schema.json` to describe a page lede. The bar itself is not
lost: it stays in `CONTRIBUTING.md`, in `.github/ISSUE_TEMPLATE/
reading-suggestion.yml`, and in the reading page's own closing paragraph.

### U2 — The two hardcoded ledes in `dashboard/template.html`

These are template literals inside view functions, so `{systems}` does not
resolve. Use `${DATA.meta.counts.systems}`, which reads the same computed dict.

`matrix()`, currently line 1017

> Every system against every kind of AI affordance, in one table. A filled cell
> links to the thing itself, usually a docs page or a repo. Under the table, how
> many of the ${DATA.meta.counts.systems} systems ship each one.

`systems()`, currently line 1038

> All ${DATA.meta.counts.systems} systems, most AI-invested first. Open one to
> see what it ships for agents and how it keeps models on-system, with quotes
> from the files. Search or filter to narrow the list.

### U3 — `reading_lede` is missing from `PROSE_KEYS`

`smarten_tree()` in `scripts/build_dashboard.py` curls quotes only for keys
listed in `PROSE_KEYS`, and `reading_lede` was never added. The other five ledes
are in the set. This went unnoticed because the old `reading_lede` contained no
apostrophe; the new one opens "Other people's", which rendered as a straight
quote on the one page where every neighbouring string is curled.

Add `"reading_lede"` to `PROSE_KEYS`, between `platforms_lede` and `essay`.

The reading entries themselves are already walked, and their `quote` field is
correctly absent from `PROSE_KEYS`: those are verbatim quotations from other
people's pages and must keep whatever characters the source used.

### U4 — Rebuild and check

`./scripts/build.sh` regenerates all 137 files under `dashboard/`, the markdown
twins included, so the HTML route and its `.md` twin cannot disagree. Then
`npm run check`.

The build carries a timestamp, so a rebuild dirties the generated tree whether or
not the copy changed. The generated files are gitignored, so the commit is
`data/insights.json`, `dashboard/template.html`, `schema/insights.schema.json`,
`scripts/build_dashboard.py`, and this plan.

## Verification

1. Every step of `scripts/check.sh` passes.
2. `grep -rn "computed from the records\|opened and read before it was listed" data/ dashboard/template.html schema/` returns nothing.
3. All eight rendered ledes read as written, with counts resolved to 20 and
   five, and every apostrophe curled.
4. `/ai` is unchanged apart from the build timestamp.

### Known failure outside this change

`npx prettier --check .` fails on
`docs/plans/2026-07-28-003-feat-generated-og-image-design.md`, which is committed
at `85839c8` in that state. `npm run check` has therefore been red since that
commit, independently of this work. Every other step of `check.sh` passes.
Formatting that file is a one-command fix and belongs to whoever wants to own it.
