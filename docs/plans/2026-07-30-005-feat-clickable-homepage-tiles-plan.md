---
title: 'feat: Make the homepage stat tiles link to their receipts'
date: 2026-07-30
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
depth: lightweight
---

# feat: Make the homepage stat tiles link to their receipts

## Summary

The five stat tiles at the top of the overview state a number and then dead-end.
Each one is a claim the report can substantiate somewhere else, so each becomes a
link to the page that holds the evidence: the systems list, the affordance matrix,
or the technique catalog.

Two files: `dashboard/template.html` for the markup and the styles, and
`scripts/prerender.mjs` for a build gate so a future tile can't ship unlinked or
pointing at a route that doesn't exist. No data, schema, or markdown-layer change
— the markdown twin of the overview renders a prose stat sentence, not tiles.

The clickable-card mechanics are already solved in this codebase by `.sysrow` on
`/systems`: one real anchor whose text is the accessible name, a stretched
`::after` that makes the whole card the target, and a focus ring traced on the
container rather than the four words inside it. This copies that, it doesn't
invent a second pattern.

---

## Problem Frame

The overview opens with the report's headline numbers. A reader who wants to know
*which* systems ship an official MCP server has to notice the left rail, guess
that "the affordance matrix" is the page that answers it, and navigate there by
hand. The tile already promises the answer exists. It just doesn't hand it over.

The maturity spectrum immediately below the tiles already does this correctly —
its lede says "Click through for the receipts" and every system name in a band is
a link. The tiles are the inconsistency.

---

## Requirements

- **R1.** Each of the five overview stat tiles links to the page that substantiates
  its number.
- **R2.** The whole tile is the click target, not only the words inside it.
- **R3.** Each tile link has a meaningful accessible name and a visible keyboard
  focus indicator.
- **R4.** Links resolve in both routing variants: the path-routed site and the
  hash-routed single-file artifact.
- **R5.** Tiles keep their current visual weight. The numeral does not turn blue,
  and no underline appears under the label at rest.
- **R6.** A tile that ships without a link, or with a link to a path that isn't a
  route, fails the build.

### Destination mapping

| # | Tile | Destination | Why that page |
| - | ---- | ----------- | ------------- |
| 1 | `{systems}` design systems studied | `/systems` | The list of the systems being counted |
| 2 | `{official_mcp}` ship an official MCP server | `/matrix` | The MCP server column names which ones |
| 3 | `{official_skills}` ship official agent skills | `/matrix` | The Agent skill column |
| 4 | `{llms_txt}` publish llms.txt | `/matrix` | The llms.txt column |
| 5 | `{techniques}` coercion techniques cataloged | `/techniques` | The catalog itself |

---

## Key Technical Decisions

**KTD1. Every href is built through `href()`, never written as a literal path.**
`dashboard/template.html` ships twice: `build_dashboard.py` renders it once with
`__ROUTING__` as `path` for the site and once as `hash` for the single-file
artifact. `href('systems')` yields `/systems` in one and `#/systems` in the other.
A literal `/systems` would be a dead link in the artifact, and the path router's
delegated click handler at the bottom of the script only claims hrefs starting
with `/`, so the failure would be silent in exactly one of the two builds.

**KTD2. No fragment deep-links into matrix columns.** Sending tile 2 to
`/matrix#mcp` reads better than `/matrix`, but it can't survive KTD1: in hash mode
the fragment is already carrying the route, and a URL can't hold two. `barRow()`
hit this same wall and resolved it the same way, gating its anchor behind
`ROUTING === 'path'`. Rather than ship a link that's precise on one surface and
vague on the other, all three affordance tiles land on `/matrix`, where the column
is visible on arrival.

**KTD3. One anchor wrapping the numeral and the label, stretched over the tile
with `::after`.** This is the `.sysrow` pattern at
`dashboard/template.html:425-428`. The alternative — wrapping the entire `<li>`
contents in an anchor — would pull the `npx skills add …` code chip inside the
link text and inflate the accessible name with the detail line.

**KTD4. The accessible name is the numeral plus the label**, e.g. "20 design
systems studied", with no screen-reader-only destination suffix. The label alone
("ship an official MCP server") reads as an instruction rather than a claim. This
matches `.sysrow`, where the link name is the system name and the destination is
understood from context.

**KTD5. Three tiles pointing at `/matrix` with three different accessible names is
accepted.** Accessibility guidance prefers hyperlinks that share an href to share
a name, and forbids the reverse (one name across different hrefs, which this
avoids). The preference exists to stop identical destinations reading as different
ones. Here each name states a distinct claim and the shared destination is the one
page that answers all three, so collapsing the names would lose more than it saves.

**KTD6. The regression gate lives in `prerender.mjs`, not a new test file.** That
script already carries a family of post-write structural assertions over the
generated HTML — sysrow counts, cohort strips, matrix row counts, the overview h1
at line 437. The repo has no DOM test harness, and adding one for five anchors
would be more infrastructure than the change is worth.

---

## Implementation Units

### U1. Route each stat tile to its receipts page

**Goal:** The five tiles in `VIEWS.overview` render as links to `/systems`,
`/matrix` and `/techniques` per the destination mapping.

**Requirements:** R1, R4

**Dependencies:** none

**Files:**

- `dashboard/template.html` — the `.tiles` block in `VIEWS.overview`
  (around line 1198)

**Approach:**

1. Give each `<li class="tile">` an anchor wrapping its `.n` and `.l` divs, with
   the href built by `href('systems')`, `href('matrix')` or `href('techniques')`.
2. Leave `.d` outside the anchor. The stretched overlay from U2 covers it, so it
   stays clickable without joining the link's accessible name.
3. Carry a short comment on the block saying why the href goes through `href()`
   (KTD1) and why the three affordance tiles share `/matrix` (KTD2). The
   surrounding code comments its non-obvious choices; this is one.

**Patterns to follow:** the spectrum band list two blocks down in the same view
function already writes `<a href="${href('systems', s.id)}">`. The `.sysrow`
markup in `renderSyslist` is the reference for anchor placement inside a card.

**Test scenarios:**

- Clicking tile 1 on the built site navigates to `/systems` without a full page
  load, and the systems list renders.
- Clicking tiles 2, 3 and 4 each navigates to `/matrix`.
- Clicking tile 5 navigates to `/techniques`.
- In the hash-routed artifact, every tile href starts with `#/` and clicking it
  changes the view.
- Cmd-click and middle-click open the destination in a new tab rather than
  navigating in place. The delegated handler already bails on modifier keys, so
  this is confirming the anchors are real anchors and not click handlers.
- Each tile's accessible name in the browser accessibility inspector is the
  numeral followed by the label, with the detail line excluded.

**Verification:** `./scripts/build.sh` succeeds, and `dashboard/index.html`
contains five tile anchors with the mapped hrefs.

### U2. Give the tile the affordance of a link

**Goal:** The whole tile reads and behaves as one target: pointer over the full
card, a hover state, a focus ring around the tile, and no change to the resting
appearance.

**Requirements:** R2, R3, R5

**Dependencies:** U1

**Files:**

- `dashboard/template.html` — the `.tile` rules (around lines 257-268)

**Approach:**

1. `.tile` gains `position: relative` so the overlay has a containing block.
   Note that U1 also changes what the tile's flex children are: `.n`, `.l` and
   `.d` were three items, and after the anchor wraps the first two they become
   two. Nothing moves, because `.n` and `.l` carry no flex-specific properties
   and `.d` keeps its `margin-top: auto`. The anchor blockifies as a flex item
   and stretches full width, which is what the overlay wants anyway.
2. The tile anchor resets the base link styling. The global `a` rule at line 117
   sets `color: var(--accent-ink)` and a transparent underline that becomes
   visible on hover, which would turn all five numerals blue and underline them
   on hover. `color: inherit; text-decoration: none` fixes both, as `.sysrow
   a.nm` already does.
3. The anchor's `::after` takes `content: ""; position: absolute; inset: 0`.
4. Hover strengthens the border to `--line-strong` and tints the label with
   `--accent-ink`. Tiles already sit on `--bg-raise`, so `.sysrow`'s
   background-shift-on-hover has nowhere to go; the border and the label carry it
   instead. The numeral stays `--ink` — blue is for interaction, and the numeral
   is data.
5. Focus is a `2px solid var(--accent)` outline at `-2px` offset on the tile via
   `:has(a:focus-visible)`, with `outline: none` on the anchor itself. Without the
   override, the global `:focus-visible` rule at line 126 rings the anchor at
   `+3px` offset, which draws a box around the numeral and label that spills over
   the tile's own border.

**Patterns to follow:** `dashboard/template.html:425-432`, the `.sysrow` block.
Mirror its ordering and its comment style.

**Technical design (directional):** the layering, not the final CSS.

```
.tile                     position: relative        <- containing block
  a                       color: inherit, no underline
    .n .l                 the accessible name
    a::after              inset: 0                  <- the target
  .d                      under the overlay, outside the name
.tile:hover               border-color: --line-strong
.tile:hover .l            color: --accent-ink
.tile:has(a:focus-visible) outline: 2px --accent, offset -2px
```

**Test scenarios:**

- At rest in both light and dark themes, tiles look as they do today: numeral in
  `--ink`, no underline, border at `--line`.
- The pointer cursor appears anywhere over the tile, including over the detail
  line and the padding.
- Hovering anywhere on the tile strengthens the border and tints the label.
- Tabbing through the overview reaches each tile once, in reading order, and the
  focus ring traces the tile's edge rather than the text inside it.
- The ring is visible on keyboard focus and absent on mouse click, which is what
  `:focus-visible` buys over `:focus`.
- `npm run check` passes. Note that `scripts/check_contrast.js` will not speak to
  the pair this introduces: it checks the maturity token pairs and the
  control-line pairs, not arbitrary text-on-surface pairs. The hover pair is
  `--accent-ink` on `--bg-raise`, which is already checked by hand below and
  needs no new automation.
- At the narrow breakpoint where `.tiles` collapses to two columns (line 830),
  the ring and hover still trace each tile correctly.
- Printing the overview shows no stray link decoration. Internal hrefs don't
  match the `a[href^="http"]::after` print rule, so no URL should be appended.

**Verification:** `npm run check` passes, and a manual pass over the built
overview in both themes confirms the resting appearance is unchanged.

### U3. Gate the tile links in the build

**Goal:** A tile that ships without a link, or with a link to a path that isn't a
route, fails the build.

**Requirements:** R6

**Dependencies:** U1

**Files:**

- `scripts/prerender.mjs` — the structural gate block (around lines 400-437)

**Approach:**

1. Next to the existing `rootHtml` overview-h1 check, slice out the `.tiles` list
   from the rendered root `index.html`.
2. Assert the number of `class="tile"` occurrences equals the number of anchors
   inside that slice, so an unlinked tile dies with a count mismatch.
3. Assert every href found in the slice is a path in the route table
   `prerender.mjs` already loads, so a typo or a renamed route dies here rather
   than shipping as a 404. Note the paths are the path-routed form; the artifact
   variant isn't prerendered.
4. Word the `die()` messages the way the neighbors are worded: what was found,
   what was expected.

**Patterns to follow:** the `/systems.html` sysrow-count gate at
`scripts/prerender.mjs:407-416` for slicing and counting, and the `routes` /
`viewRoutes` handling just below line 437 for reading the route table.

**Test scenarios:**

- The gate passes on the real build with all five tiles linked.
- Removing the anchor from one tile in `template.html` and rebuilding fails with a
  count mismatch naming both numbers.
- Pointing a tile at a path that isn't in the route table and rebuilding fails
  naming the bad path.
- The gate reads the root `index.html` only, so it doesn't false-positive on the
  `.tile` occurrences in the print `break-inside` CSS rule, which lives in the
  style block rather than the tiles list.

**Verification:** `./scripts/build.sh` succeeds unmodified, and both sabotage
cases above fail with a readable message before proceeding.

---

## Assumptions

Recorded because this plan was written headless, without a scoping confirmation.

- **A1.** The three affordance tiles go to `/matrix` rather than a filtered
  `/systems` view. `/systems` filters by name and maturity only — it has no
  per-affordance filter and reads no URL parameters, so there's no filtered view
  to link to without building one.
- **A2.** Tile 1 goes to `/systems` rather than `/methodology`. The tile's number
  is the count of systems, and the reader following it wants the systems. How they
  were chosen is a different question, already linked from the rail.
- **A3.** No new test file. U3's build gate is the regression protection, per KTD6.

---

## Scope Boundaries

**In scope:** the five overview stat tiles, their styles, and the build gate.

### Not doing

- Making the maturity spectrum bands or the finding numerals clickable. The band
  system names are already links.
- Adding URL-parameter filter support to `/systems`.
- Adding column anchors to the matrix table.
- Touching the markdown twin of the overview. It renders a prose stat sentence
  rather than tiles, so there's nothing there to link.

### Deferred to follow-up work

- Per-affordance deep links into the matrix, which need either a filterable
  `/systems` or a fragment scheme that survives the hash-routed artifact.
- Reconciling the official-only tile counts with the official-plus-community
  matrix bars, either by wording the tiles or by splitting the bars. See the
  first entry under Risks.

---

## Risks

**Two tiles land on a page that states a different number for the same
affordance.** The tiles count officially-shipped affordances; the matrix
prevalence bars count official and community together, which its own subhead
says. Measured against today's data: tile 2 says 17 ship an official MCP server
and the matrix MCP bar reads 19; tile 3 says 17 ship official agent skills and
the Agent skill bar reads 18. Tile 4 is clean at 15 and 15.

Nothing here is wrong — the matrix distinguishes official from community with
filled dots and rings, which is exactly the distinction the tile is counting —
but a reader who clicks 17 and immediately reads 19 has to work out why, on a
report that trades on its numbers being computed rather than typed. `/matrix` is
still the right destination, so this doesn't change the mapping. Implement the
plan as written and leave the copy alone; if it grates in review, the cheap fix
is a clause on the tile rather than a different link.

**Text selection inside the tile is lost.** The stretched `::after` sits over the
text, so a reader can't select the numeral. This is already true of every row on
`/systems` and is the accepted cost of the pattern. Flagged rather than solved.

**The code chip in tile 3 becomes a navigation target.** `npx skills add …` sits
under the overlay, so clicking it goes to `/matrix`. It isn't a copy button and
carries no other behavior, so nothing is being shadowed.

**The hover pair isn't covered by the contrast check.** `scripts/check_contrast.js`
checks the `--mat-*` data pairs and the control-line pairs, so `--accent-ink` on
`--bg-raise` passes through it unexamined. Checked by hand instead: in light mode
`--bg` and `--bg-raise` are both `#FFFFFF`, making this the same pair every link
on the site already uses. In dark mode `#7FB3FF` on `#191919` is 8.2:1, well over
AA. No new automation needed, but don't read a green check as having confirmed it.

**The base link styles fight the tile.** Both the `a` rule at line 117 and the
global `:focus-visible` at line 126 apply here and both need overriding. U2 step 2
and step 5 name them. Skipping either produces five blue underlined numerals or a
focus box in the wrong place, both of which are visible immediately.

---

## Verification Contract

- `npm run check` passes. That's eslint, prettier, tsc, generated types, ruff,
  mypy, deno, the contrast check, the build, the tests, and the markdown-layer
  self-check.
- `./scripts/build.sh` passes, including U3's new gate.
- A manual pass over the built overview: click each of the five tiles, tab through
  them, and confirm the resting appearance in light and dark.
- `dashboard/artifact.html`, the hash-routed single-file variant, opens and its
  tile links change the view.

## Definition of Done

- All five overview tiles are links, mapped as in the destination table.
- The whole tile is the target, with a hover state and a focus ring on the tile.
- The resting appearance is unchanged in both themes.
- Both routing variants work.
- `npm run check` passes and the build gate fails on an unlinked or misrouted tile.
- No data, schema, or markdown-layer file is modified.
