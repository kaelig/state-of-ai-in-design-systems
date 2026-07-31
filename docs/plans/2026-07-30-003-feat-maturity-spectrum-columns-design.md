---
title: 'feat: Give the maturity spectrum rungs and columns'
date: 2026-07-30
status: design
supersedes: none
---

# feat: Give the maturity spectrum rungs and columns

## Summary

The overview's maturity spectrum gets two changes. Each band header gains a rung
glyph that says how far up the four-point scale the level sits. On viewports wide
enough to hold them, the bands lay out as three bottom-aligned columns running
emerging to ai-native, so the section's silhouette is the distribution it
describes.

Nothing outside the spectrum moves. `MAT_ORDER` is untouched, so `/matrix`,
`/systems`, the maturity filter and the markdown mirror all keep listing
ai-native first.

## Problem

The spectrum is the overview's one piece of data visualisation, and it currently
carries its numbers twice in the same channel: a numeral in each band header, and
band height, which grows as the chip list wraps. The CSS says as much — "band
length is the chart, so the geometry says what the counts say."

That encoding is weaker than the comment claims. A band's height depends on how
many chips wrap, and chips wrap according to how long the system names are, not
how many there are. Five systems with long names and eight with short ones
occupy the same two rows. The geometry tracks name length as much as count.

Stacked full width, the three bands also read as a list rather than a scale.
Nothing in the layout says ai-native is further along than emerging; the reader
gets that from the words and from the `--mat-0..3` colour ramp, and has to hold
the ordering in their head. For a section titled "The maturity spectrum", the
spectrum itself is the one thing not drawn.

## Approach

Make the two encodings the section already gestures at do real work: put the
ordinal position in a glyph, and put the count in a dimension that only the count
can change.

Two alternatives were weighed and rejected in the brainstorm.

Distinct metaphor glyphs per level — a seedling, a gear, a chip — were the first
instinct, and they match the nav, where every icon is its own Feather object. But
nothing about a gear says "more than a seedling". The ordering would live only in
the column order and the colour, so the glyph would sit outside the encoding
instead of reinforcing it, and "invested" has no obvious object anyway.

Sizing each column proportionally to its count was the other. It fails on the
data: emerging holds one of twenty systems, so its column would be a twentieth of
the width and could not fit the words "U.S. Web Design System (USWDS)". Width
also has to stay constant for height to be readable as the variable.

## Architecture

### The glyph

A `matRungs(k)` helper beside `MAT`, `MAT_ORDER` and `MAT_DEF`, returning inline
SVG in the same 24-unit stroked idiom as the rail nav icons, so the two icon
systems on the page are one system.

Four bars, ascending in height, left to right. The first N are drawn solid and
the remainder at reduced opacity, where N is the level's position on the
ascending scale:

| Level     | Rungs solid |
| --------- | ----------- |
| none      | 1 of 4      |
| emerging  | 2 of 4      |
| invested  | 3 of 4      |
| ai-native | 4 of 4      |

Drawing all four rather than only the filled ones does two things. Every glyph
gets the same width, so the three band headers align down the page. And the
reader sees the denominator: emerging reads as "two of four", not "two bars". The
dimmed first rung also keeps the `none` level legible without rendering an empty
band for it — `none` holds zero systems today and the spectrum only renders levels
that have systems.

The bars stroke in `currentColor`, so each glyph inherits its band's
`--mat-N-ink` and there is no icon colour to keep in sync with the ramp.

Two values are deliberately left to implementation and set by looking at the
result at 16px against an 11px uppercase label, the way the nav icons were: the
bar geometry (x positions, heights, baseline) and the opacity of the unfilled
rungs. The unfilled rungs have to stay visible enough to read as a denominator
and faint enough not to be miscounted as filled, and that is a judgement about
rendered pixels in both themes, not a number worth fixing in a spec.

### The header

`.bhead` is a flex row with `justify-content: space-between` and two children
today, which is what pushes the count to the right edge. The glyph becomes a
third child, first in source:

```html
<h3 class="bhead mat-ai-native"><svg …/><span class="bl">AI-native</span><span class="bn">14</span></h3>
```

`space-between` across three children would strand the label in the middle, so
the count takes `margin-left: auto` and the glyph sits against its label. The
`<svg>` is `aria-hidden`: the label beside it already names the level, and an
announced glyph would make every band read its name twice.

### The columns

One new block:

```css
@media screen and (min-width: 1100px) {
  .spectrum { flex-direction: row-reverse; align-items: flex-end; gap: 14px; }
  .spec-band { flex: 1 1 0; }
  .spec-band ul { flex-direction: column; }
}
```

`row-reverse` produces emerging → ai-native left to right without touching the
DOM, so the narrow stacked layout keeps the order it ships today and the change
is one declaration rather than an `order` value on every band.

`align-items: flex-end` bottom-aligns the three columns, which is what turns the
count difference into a climb instead of three ragged tops.

`flex: 1 1 0` holds the widths equal. This is load-bearing: if width varied it
would become a second encoding competing with height, and the reader would have
no way to know which one to read.

`ul { flex-direction: column }` puts one system per row, so a column's height is
its count and nothing else. The `<a>` inside each `<li>` stays `inline-block`, so
rows are content-width and ragged — a list, not a table.

The query is scoped to `screen` deliberately. Every existing breakpoint in the
file is `max-width` and is overridden by the `@media print` block that follows
them; an unscoped `min-width` would apply on paper as well and silently
three-column the print layout.

### The breakpoint

1100px is derived rather than chosen. The longest chip in the corpus is
"Salesforce Lightning Design System", roughly 233px at 13px including padding and
border. Three of those plus two 14px gaps plus column padding needs about 800px
of content. Content width is the viewport less the 224px rail and the 80px
`.main` padding, which puts the threshold near 1104.

That arithmetic sets the starting value only. Implementation measures where the
longest chip actually stops wrapping and moves the number there.

## Guards

`scripts/prerender.mjs` gets one assertion: every value in the schema's
`ai_maturity` enum appears in `MAT_ORDER`.

The failure this catches is specific. `matRungs()` derives how many rungs to fill
from the level's position in `MAT_ORDER`, so a fifth level added to
`schema/design-system.schema.json` without a matching entry resolves to an index
of `-1` and draws a glyph with nothing filled — a band that silently claims the
bottom of the scale. The band still renders, the route is not empty, the
placeholder scan does not trip, and the build exits 0.

Counting glyphs against bands was the first instinct here and is the wrong check.
The nav guard already learned this and says so in its own comment: a missing key
still emits an `<svg>`, so counting tags reports the right number of icons for
the wrong number of glyphs. Check the vocabulary, not the markup.

The assertion is cheap because both halves are already in reach —
`prerender.mjs` reads the payload, and `MAT_ORDER` only needs exposing from the
sandbox the way `NAV` and `NAV_ICON_PATHS` already are. It also closes a gap that
predates this work: nothing currently notices if the schema's vocabulary and the
template's ordering drift apart, and four call sites read `MAT_ORDER`.

## File changes

| Path                       | Change                                                             |
| -------------------------- | ------------------------------------------------------------------ |
| `dashboard/template.html`  | `matRungs()` helper; glyph in `.bhead`; `.bn { margin-left: auto }`; new `@media screen and (min-width: 1100px)` block. |
| `scripts/prerender.mjs`    | Expose `MAT_ORDER` from the sandbox; assert it covers the schema's `ai_maturity` enum. |

No data, schema, or markdown-layer changes. `data/*.json` is not touched.

## Out of scope

`matChip()`, which renders the maturity pill on `/systems` rows, the system
detail pages and the `/matrix` cohort headers, keeps its current appearance.
Giving every chip a rung is a much larger visual change across three routes and
is not what this asks for.

`MAT_ORDER` stays descending. Reversing it would reach `/matrix` tbody groups,
the `/systems` cohort strips and the maturity filter, and those are reference
lists where a reader is usually hunting the leaders — burying fourteen ai-native
systems beneath one emerging one costs every visitor a scroll. `build_md.py`
holds its own hardcoded `("ai-native", "invested", "emerging", "none")` tuple, so
a site-wide reversal would also be a second edit in a second language that can
drift from the first.

## Risks

**Focus order runs against reading order on wide screens.** `row-reverse` leaves
the DOM at ai-native → invested → emerging while the eye reads the reverse, so
keyboard focus traverses the columns right to left. This was raised in the
brainstorm with the alternative — ascending at every width, DOM and visual order
agreeing — and the reversal-on-wide-only behaviour was chosen with the cost
stated. The tradeoff is forced: given wide ascending and narrow descending, one
source order cannot match both.

The severity is mild, and worth being precise about. Each band is a sibling
section carrying its own heading, count and definition, so a screen reader still
receives "Emerging, 1, llms.txt or an AI docs page, little more" intact, followed
by that level's systems. What is out of order is the climb from one band to the
next, not the content of any band. A comment at the `row-reverse` rule records
this so it is not rediscovered as a bug.

**The section gets taller.** One system per row makes the ai-native column
fourteen rows deep, where today the whole spectrum is three wrapped bands. The
findings below it move down accordingly. This is the cost of height being the
chart, and it is the point rather than a side effect, but it is a real change to
the overview's length and should be looked at before shipping rather than
discovered after.
