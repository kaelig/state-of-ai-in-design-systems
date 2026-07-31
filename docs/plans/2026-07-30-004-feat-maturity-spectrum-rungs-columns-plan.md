---
title: 'feat: Give the maturity spectrum rungs and columns'
date: 2026-07-30
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: legacy-requirements
execution: code
origin: docs/plans/2026-07-30-003-feat-maturity-spectrum-columns-design.md
depth: standard
---

# feat: Give the maturity spectrum rungs and columns

## Summary

The overview's maturity spectrum gets two encodings that do real work. Each band
header gains a four-rung glyph saying how far up the scale the level sits. Above a
derived breakpoint the bands become three equal-width, bottom-aligned columns
running emerging to ai-native, so the section's silhouette is the distribution it
describes. One prerender assertion closes the vocabulary gap the first change
opens.

Two files: `dashboard/template.html` and `scripts/prerender.mjs`. No data, schema,
or markdown-layer change.

Origin: `docs/plans/2026-07-30-003-feat-maturity-spectrum-columns-design.md`. That
document's design decisions are carried forward intact. Four of its factual claims
are corrected below (KTD4, KTD5, KTD7, and the base-tree note in Risks); none of
the corrections change a design decision.

---

## Problem Frame

The spectrum is the overview's one piece of data visualization, and it carries its
numbers twice in the same channel: a numeral in each band header, and band height,
which grows as the chip list wraps. The CSS at `dashboard/template.html:284` claims
as much — "band length is the chart, so the geometry says what the counts say."

The encoding is weaker than the comment claims. A band's height depends on how many
chips wrap, and chips wrap by name length, not count. Five systems with long names
and eight with short ones occupy the same two rows.

Stacked full width, the three bands also read as a list rather than a scale.
Nothing in the layout says ai-native is further along than emerging; the reader
gets that from the words and the `--mat-0..3` ramp. For a section titled "The
maturity spectrum", the spectrum itself is the one thing not drawn.

---

## Requirements

| ID  | Requirement |
| --- | ----------- |
| R1  | Each spectrum band header carries a glyph showing that level's position on the four-point maturity scale. |
| R2  | The glyph is inline SVG in the same 24-unit stroked idiom as the rail nav icons, stroked in `currentColor` so it inherits the band's `--mat-N-ink`. |
| R3  | All four rungs always draw. The first N are solid and the remainder dimmed, where N is the level's ascending position (none 1, emerging 2, invested 3, ai-native 4). |
| R4  | The glyph is `aria-hidden`; the adjacent label already names the level. |
| R5  | Above a derived breakpoint, the bands lay out as three equal-width, bottom-aligned columns running emerging → ai-native left to right. |
| R6  | In the wide layout each band's list is one system per row, so a column's height is its count and nothing else. |
| R7  | The wide-layout rule applies to `screen` only and never affects print. |
| R8  | Below the breakpoint the spectrum renders exactly as it does today: stacked full-width bands, descending, chips wrapping. |
| R9  | `MAT_ORDER` is unchanged. `/matrix`, `/systems`, the maturity filter and the markdown mirror keep listing ai-native first. |
| R10 | The build fails if `schema/design-system.schema.json`'s `ai_maturity` enum contains a value absent from `MAT_ORDER`. |

---

## Key Technical Decisions

**KTD1 — Ordinal rungs, not metaphor glyphs.** Distinct objects per level (seedling,
gear, chip) match the rail nav, where every icon is its own Feather object. But
nothing about a gear says "more than a seedling": the ordering would live only in
column order and color, putting the glyph outside the encoding instead of
reinforcing it. "Invested" has no obvious object anyway. *(carried from origin)*

**KTD2 — Equal column widths; height alone carries count.** Sizing columns
proportionally fails on the data — emerging holds one of twenty systems, so its
column would be a twentieth of the width and could not fit "U.S. Web Design System
(USWDS)". Width also has to stay constant for height to be readable as the
variable. `flex: 1 1 0` is load-bearing, not cosmetic. *(carried from origin)*

**KTD3 — `row-reverse` over per-band `order`, accepting the focus-order cost.**
One declaration rather than an `order` value on every band, and the narrow stacked
layout keeps the DOM order it ships today. The cost is that on wide screens
keyboard focus traverses columns right to left against reading order. The tradeoff
is forced: given wide-ascending and narrow-descending, one source order cannot
match both. *(carried from origin; see Risks)*

**KTD4 — The guard checks the vocabulary, not the markup.** `matRungs()` derives
fill count from the level's index in `MAT_ORDER`. JavaScript's `indexOf` returns
`-1` on a miss rather than throwing, so a level added to the schema without a
matching `MAT_ORDER` entry renders a wrong glyph silently — with the route
non-empty, the placeholder scan clean, and the build exiting 0.

Worth being exact about *which* wrong glyph, because the origin document has this
backwards. It says the unknown level "draws a glyph with nothing filled — a band
that silently claims the bottom of the scale." Under the natural formula
(`MAT_ORDER.length - MAT_ORDER.indexOf(k)`, which maps ai-native→4 … none→1), a
miss yields `4 - (-1) = 5`: with only four bars drawn, the band claims a **full**
scale — the top, not the bottom. A new level would almost certainly be appended as
a *higher* tier than ai-native, so the wrong answer is at least directionally
plausible, which makes it likelier to survive review. Do not lean on either
direction being safe; the guard is what makes the case loud. The nav guard at
`scripts/prerender.mjs:447-455` already learned
this and says so in its own comment: a missing key still emits an `<svg>`, so
counting tags reports the right number of icons for the wrong number of glyphs.

**KTD5 — Scope the new query to `screen`, for a corrected reason.** The origin
states "Every existing breakpoint in the file is `max-width`." That is not true:
`dashboard/template.html:349` (`min-width: 861px`) and `:383` (`min-width: 1060px`)
are both `min-width`, both unscoped, and the `@media print` block at `:815` does
not override either. The conclusion survives and is stronger than the origin knew —
unscoped `min-width` already leaks into print here — but the comment justifying the
new rule must not repeat the false claim. Retrofitting `screen` onto the two
existing queries is a real adjacent fix and is deferred, not done here.

**KTD6 — `prerender.mjs` gains a schema file read.** The script currently reads
`dashboard/index.html`, `build/payload.json` and `build/routes.json` only. R10
needs `schema/design-system.schema.json`, a new dependency for the prerender step.
Accepted: the file is committed, always present, and read via the existing `ROOT`
constant at `scripts/prerender.mjs:17`. The alternative — carrying the enum into
`build/payload.json` so prerender stays build-only — adds a producer in
`scripts/build_dashboard.py` to avoid one `readFileSync`, and puts a copy of the
vocabulary between the schema and its check.

**KTD7 — Breakpoint starts at 1120px and is measured down, not 1100.** The origin
derives ~1104 and then sets 1100, which is below its own derivation. Recomputed:
the longest chip ("Salesforce Lightning Design System") is ~233px at 13px including
padding and border; each column adds 24px of `ul` padding and 2px of band border,
so three columns plus two 14px gaps need ~805px of content; `.main` adds 80px of
padding (`:223`) and `.app` a 224px rail (`:165`), landing near 1109. Start at 1120
and measure down. The origin also missed a ceiling that works in the change's
favour: `.main` carries `max-width: 1120px`, so content caps at 1040px however wide
the viewport goes — columns never exceed ~337px, comfortably above the longest chip.

---

## High-Level Technical Design

The glyph is four bars ascending left to right in a 24-unit box, with the first N
solid and the remainder at reduced opacity. Drawing all four gives every glyph the
same width — so the three band headers align down the page — and shows the reader
the denominator: emerging reads "two of four", not "two bars".

```text
level        glyph (▮ solid, ▯ dimmed)   solid / total
none         ▮ ▯ ▯ ▯                     1 of 4
emerging     ▮ ▮ ▯ ▯                     2 of 4
invested     ▮ ▮ ▮ ▯                     3 of 4
ai-native    ▮ ▮ ▮ ▮                     4 of 4
                ↑ heights ascend left to right
```

The dimmed first rung keeps `none` legible without rendering an empty band for it —
`none` holds zero systems today and the spectrum only renders levels that have
systems (`dashboard/template.html:1099`).

The wide layout's silhouette is the deliverable. Bottom alignment is what turns the
count difference into a climb rather than three ragged tops:

```text
                                              ┌──────────┐
                                              │ AI-NATIVE│ ▮▮▮▮  14
                                              ├──────────┤
                              ┌──────────┐    │ · · · ·  │
                              │ INVESTED │    │ (14 rows)│
                              ├──────────┤    │ · · · ·  │
             ┌──────────┐     │ (5 rows) │    │ · · · ·  │
             │ EMERGING │     │ · · · ·  │    │ · · · ·  │
             ├──────────┤     │ · · · ·  │    │ · · · ·  │
             │ (1 row)  │     │ · · · ·  │    │ · · · ·  │
             └──────────┘     └──────────┘    └──────────┘
             └────────── equal widths, flex: 1 1 0 ───────┘
                    reading order: emerging → ai-native
                    DOM order:     ai-native → emerging   (see KTD3)
```

Directional only — bar geometry, opacity, and the exact breakpoint are set by
looking at the rendered result (see Open Questions).

---

## Implementation Units

### U1. The rung glyph and the band header

**Goal:** Every band header carries its rung glyph, and the count stays pinned to
the right edge.

**Requirements:** R1, R2, R3, R4

**Dependencies:** none

**Files:**
- `dashboard/template.html` — `matRungs()` beside `MAT` / `MAT_ORDER` / `MAT_DEF`
  (around `:884-890`); the band template at `:1102`; `.bhead` CSS at `:288-298`.

**Approach:**

1. Add `matRungs(k)` beside the other `MAT*` constants, returning inline SVG in the
   same shape as `navIcon` at `:1515` — `viewBox="0 0 24 24"`, `fill="none"`,
   `stroke="currentColor"`, `stroke-width="2"`, round caps and joins, `aria-hidden`.
   Fill count is the level's ascending position, derived from `MAT_ORDER` (which is
   descending, so the ascending index is `MAT_ORDER.length - MAT_ORDER.indexOf(k)`).
   Clamp the result into 0–4 rather than trusting it: an unknown level yields 5 and
   would otherwise index past the bar list. U3 is what makes that case loud; the
   clamp is what keeps it from being a runtime error in the meantime.
2. Insert the glyph as the first child of `.bhead` in the band template at `:1102`,
   before `<span class="bl">`.
3. `.bhead` is `justify-content: space-between` with two children today, which is
   what pushes the count right. A third child would strand the label in the middle,
   so give `.bn` `margin-left: auto` and let the glyph sit against its label.
4. Size the glyph to 16px square with `flex: none`, mirroring `.rail nav a svg` at
   `:198`.

**Patterns to follow:** `navIcon` and `NAV_ICON_PATHS` (`:1502-1515`) for the SVG
idiom and the `aria-hidden` rationale; `.rail nav a svg` (`:198`) for sizing and
the `currentColor` comment.

**Watch for:** `.bhead` is `align-items: baseline` (`:289`). A replaced element's
baseline is its bottom margin edge, so the glyph will hang its bottom on the
label's baseline rather than centering on the cap height. Expect to need an
explicit alignment or a small transform on the `<svg>` — decide by looking, the way
the nav icons' optical corrections at `:200-210` were decided.

**Execution note:** This is visual work with no test harness behind it. Build, load
the overview in Chrome, and tune against an 11px uppercase label in both themes
before moving on.

**Test scenarios:**
- Build succeeds and `dashboard/index.html` contains three `<svg` inside
  `.bhead` elements — one per rendered band. (The prerender step already fails an
  empty or short body at `scripts/prerender.mjs:330`; this confirms the glyph
  reached the markup rather than just the source.)
- Rendered at 16px against the 11px uppercase label, each glyph's solid-rung count
  matches its level: emerging 2, invested 3, ai-native 4.
- In both light and dark themes, the dimmed rungs are visible enough to read as a
  denominator and faint enough not to be miscounted as filled.
- The count (`.bn`) still sits flush against the header's right edge, unmoved from
  where it is today.
- Each glyph takes its band's ink color with no separate icon color declared.
- Narrow viewport (≤540px): headers still render on one line, glyph included.

### U2. The wide-screen column layout

**Goal:** Above the breakpoint the spectrum reads as a climb from emerging to
ai-native, with height carrying count.

**Requirements:** R5, R6, R7, R8

**Dependencies:** U1 (headers must align across columns before column alignment can
be judged)

**Files:**
- `dashboard/template.html` — one new media block, placed with the other
  breakpoints near `:808` and above the `@media print` block at `:815`.

**Approach:**

1. Add `@media screen and (min-width: 1120px)` setting `.spectrum` to
   `flex-direction: row-reverse`, `align-items: flex-end`, `gap: 14px`;
   `.spec-band` to `flex: 1 1 0`; and `.spec-band ul` to `flex-direction: column`.
2. Comment the `screen` scope with the corrected reason from KTD5 — that unscoped
   `min-width` queries in this file already reach print — not the origin's claim
   that every existing breakpoint is `max-width`.
3. Comment the `row-reverse` rule with the focus-order cost from KTD3, so it is not
   rediscovered as a bug.
4. Measure where the longest chip actually stops wrapping and move 1120 to that
   number. `.spec-band li a` stays `inline-block` (`:307`), so rows are
   content-width and ragged — a list, not a table.

**Patterns to follow:** the existing breakpoint blocks at `:717` and `:808` for
placement and comment density; `@media print` at `:815-834` for what the print
layout already suppresses.

**Test scenarios:**
- At 1400px: three columns, emerging leftmost and ai-native rightmost, bottoms
  aligned on one line, widths visibly equal.
- At the breakpoint minus 1px: the stacked layout is byte-identical in behaviour to
  what ships today — descending order, chips wrapping, full width.
- At the breakpoint exactly: the longest chip ("Salesforce Lightning Design System")
  sits on one line in its column and does not wrap. If it wraps, the breakpoint is
  too low.
- Print preview (Chrome, both Letter and A4): the spectrum prints stacked, not
  three-column.
- At 2000px: `.main`'s `max-width: 1120px` caps content, so columns stay ~337px and
  the layout does not stretch.
- Each column's row count equals its band's `.bn` number — 1, 5 and 14 against
  today's data.
- Overview at 1400px in both themes: the full page length with the findings pushed
  down is acceptable. **This is a gate, not an observation** — see Risks.

**Verification:** The spectrum reads as a climb at wide widths and is unchanged at
narrow ones, and nothing outside `.spectrum` moved.

### U3. Guard the maturity vocabulary

**Goal:** A level added to the schema without a matching `MAT_ORDER` entry fails the
build instead of drawing a silently wrong glyph.

**Requirements:** R10

**Dependencies:** none (independent of U1 and U2; ordered last only because U1
creates the failure mode it guards)

**Files:**
- `scripts/prerender.mjs` — expose `MAT_ORDER` from the sandbox (`:118-121`); read
  the schema near the other top-level reads (`:30-32`); assert near the nav guards
  (`:447-458`).

**Approach:**

1. Append `globalThis.__MAT_ORDER = MAT_ORDER;` to the `runInContext` string at
   `:118-121`, the way `__NAV` and `__NAV_ICON_PATHS` already are, and `die()` if it
   comes back undefined — matching the `VIEWS` / `footHTML` exposure checks at
   `:132-143`.
2. Read `schema/design-system.schema.json` via `join(ROOT, ...)`.
3. Assert every value in `properties.ai_maturity.enum` appears in `MAT_ORDER`, and
   `die()` naming the missing values.
4. Comment it with the KTD4 reasoning: this checks the vocabulary because counting
   glyphs against bands cannot catch the failure.

**Patterns to follow:** the nav icon guard at `:447-458` — the closest existing
analogue, including its comment explaining why it checks the map and not the
markup.

**Deliberately not included:** a glyph-count-against-bands check. The nav guard
carries one because nine rows come from one template and a missing key shortens a
row quietly. The spectrum renders every band from the same template string at
`:1102`, so a count check can only fail when that string is broken — which the
short-body check at `:330` already catches. Adding it would be ceremony.

**Execution note:** Prove the guard fires before trusting it. Temporarily add a
fifth value to the schema enum, confirm the build dies with a useful message, then
revert.

**Test scenarios:**
- `npm run check` passes unchanged against the current schema and `MAT_ORDER`.
- Adding `"experimental"` to the enum without touching `MAT_ORDER` makes the build
  exit non-zero, naming `experimental` in the message.
- Removing `MAT_ORDER` from the sandbox exposure line makes the build die with an
  exposure error rather than a `TypeError` on undefined.
- The assertion is one-directional by design: a value in `MAT_ORDER` with no schema
  entry does not fail. `MAT_ORDER` is the template's render order and may legitimately
  carry a level the data has retired; the failure mode being guarded is the reverse.

**Verification:** `npm run check` exits 0; the temporary fifth-enum-value experiment
fails the build and names the culprit.

---

## Scope Boundaries

### Out of scope

- `matChip()` (`dashboard/template.html:1054`), which renders the maturity pill on
  `/systems` rows, system detail pages and `/matrix` cohort headers, keeps its
  current appearance. Giving every chip a rung is a much larger visual change
  across three routes. *(carried from origin)*
- `MAT_ORDER` stays descending. Reversing it would reach `/matrix` tbody groups,
  the `/systems` cohort strips and the maturity filter — reference lists where a
  reader is usually hunting the leaders. `scripts/build_md.py` also holds its own
  hardcoded `("ai-native", "invested", "emerging", "none")` tuple, so a site-wide
  reversal is a second edit in a second language that can drift from the first.
  *(carried from origin)*
- No `data/`, schema, or markdown-layer change.

### Deferred to follow-up work

- `screen`-scoping the two pre-existing unscoped `min-width` queries at
  `dashboard/template.html:349` and `:383`. A real fix surfaced by KTD5's
  investigation, but not this change's job.
- Revisiting spectrum height if the wide layout proves too tall in practice. Only
  reachable after U2's gate has been looked at.

---

## Risks

**The section gets taller, and that is the gate.** One system per row makes the
ai-native column fourteen rows deep where today the whole spectrum is three wrapped
bands. The findings below it move down accordingly. This is the cost of height
being the chart and is the point rather than a side effect — but U2's final test
scenario is a stop-and-reconsider checkpoint with authority to halt the change, not
a box to tick. Look at the overview's full length at ≥1120px in both themes before
shipping.

**Focus order runs against reading order on wide screens.** `row-reverse` leaves the
DOM at ai-native → invested → emerging while the eye reads the reverse, so keyboard
focus traverses columns right to left. Chosen with the cost stated (KTD3). Severity
is mild and worth being precise about: each band is a sibling section carrying its
own heading, count and definition, so a screen reader still receives "Emerging, 1,
llms.txt or an AI docs page, little more" intact, followed by that level's systems.
What is out of order is the climb from one band to the next, not the content of any
band. The comment required by U2 step 3 records this.

**The base tree is not clean.** `dashboard/template.html` and `scripts/prerender.mjs`
— both files this plan touches — already carry uncommitted changes (an en-US
spelling sweep, a `.metagrid` outline fix, and one prerender edit), alongside the
usual build-timestamp churn across generated files. Establish what is already
in-flight before starting, and keep these commits separable from it.

---

## Open Questions

Deliberately deferred to implementation, resolved by looking at rendered pixels
rather than by specifying a number:

- **Bar geometry** — x positions, heights, and baseline within the 24-unit box.
- **Unfilled-rung opacity** — has to stay visible enough to read as a denominator
  and faint enough not to be miscounted as filled, in both themes.
- **The exact breakpoint** — 1120px is a derived starting value (KTD7). Measure
  where the longest chip stops wrapping and move it there.

---

## Verification Contract

1. `npm run check` exits 0. This runs eslint, prettier, tsc, ruff, mypy, deno, the
   contrast check, the full build including the prerender guards, the tests, and the
   markdown-layer self-check.
2. The U3 guard is proven by the temporary fifth-enum-value experiment, then
   reverted.
3. The overview is loaded in Chrome (not Playwright) at ≥1400px, at the breakpoint,
   at the breakpoint minus 1px, and at ≤540px, in both light and dark themes.
4. Chrome print preview shows the spectrum stacked.
5. `/matrix`, `/systems` and the maturity filter are spot-checked as unchanged (R9).

## Definition of Done

- R1–R10 all hold.
- `npm run check` exits 0 with the schema restored.
- The wide layout reads as a climb; the narrow layout is indistinguishable from what
  ships today.
- The `row-reverse` comment records the focus-order cost, and the `screen`-scope
  comment carries the corrected rationale.
- The overview's total length at wide widths has been looked at and accepted.
- Three commits, one per unit, on a branch fast-forwarded into `main` per repo
  convention.

---

## Sources & Research

- `docs/plans/2026-07-30-003-feat-maturity-spectrum-columns-design.md` — origin
  design document; all KTDs except KTD5, KTD6 and KTD7 carried from it.
- `dashboard/template.html` — spectrum CSS `:284-308`, `.bhead` `:288-298`, band
  render `:1099-1105`, `MAT*` constants `:884-890`, nav icons `:1502-1515`,
  breakpoints `:349`, `:383`, `:717`, `:808`, print `:815-834`, layout `:165`, `:223`.
- `scripts/prerender.mjs` — sandbox exposure `:115-124`, guard idiom `:432-458`,
  short-body check `:330`, path constants `:17-19`.
- `schema/design-system.schema.json:44-47` — the `ai_maturity` enum.
- `scripts/check.sh` — the check sequence; confirms there is no DOM or CSS test
  harness, which is why U1 and U2 carry browser-verified scenarios rather than unit
  tests.

No external research was run. The repository supplies a direct local pattern for
every piece of this change — a stroked 24-unit icon helper, a vocabulary-not-markup
build guard, and an established breakpoint and comment convention — so external
sources had nothing to add.
