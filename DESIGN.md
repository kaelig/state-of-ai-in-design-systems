---
name: State of AI in Design Systems
description: A field survey rendered as a quiet, hairline-built research report
colors:
  bg: 'light-dark(oklch(100% 0 0), oklch(17.8% 0 0))'
  bg-raise: 'light-dark(oklch(100% 0 0), oklch(21.3% 0 0))'
  bg-sunk: 'light-dark(oklch(97% 0 0), oklch(14.5% 0 0))'
  row-hover: 'light-dark(oklch(97.6% 0 0), oklch(21.8% 0 0))'
  cell-hover: 'light-dark(oklch(94.3% 0 0), oklch(25.6% 0 0))'
  ink: 'light-dark(oklch(17.8% 0 0), oklch(93.1% 0 0))'
  ink-2: 'light-dark(oklch(45% 0 0), oklch(72.5% 0 0))'
  ink-3: 'light-dark(oklch(53.8% 0 0), oklch(65.7% 0 0))'
  line: 'light-dark(oklch(90.7% 0 0), oklch(28.5% 0 0))'
  line-strong: 'light-dark(oklch(83.6% 0 0), oklch(36% 0 0))'
  control-line: 'light-dark(oklch(63.3% 0 0), oklch(52.8% 0 0))'
  accent: 'light-dark(oklch(54.6% 0.215 262.9), oklch(69.1% 0.163 259.4))'
  accent-ink: 'light-dark(oklch(48.8% 0.217 264.4), oklch(76.1% 0.123 257.8))'
  accent-wash: 'light-dark(oklch(96.7% 0.016 266.3), oklch(26% 0.052 264.3))'
  mat-0: 'light-dark(oklch(96.7% 0.001 286.4), oklch(23.6% 0.004 286.1))'
  mat-0-ink: 'light-dark(oklch(44.2% 0.015 285.8), oklch(71.2% 0.013 286.1))'
  mat-1: 'light-dark(oklch(93.3% 0.014 248), oklch(28.7% 0.03 248.9))'
  mat-1-ink: 'light-dark(oklch(46.3% 0.056 247.4), oklch(77.4% 0.044 245.1))'
  mat-2: 'light-dark(oklch(88.6% 0.028 244.7), oklch(33.8% 0.041 250.4))'
  mat-2-ink: 'light-dark(oklch(38.3% 0.055 245.9), oklch(85.3% 0.037 244.5))'
  mat-3: 'light-dark(oklch(83.1% 0.048 243.5), oklch(39.3% 0.047 249.1))'
  mat-3-ink: 'light-dark(oklch(28.4% 0.052 246.5), oklch(92.1% 0.025 246.2))'
  data-strong: 'light-dark(oklch(49.5% 0.085 253), oklch(75.6% 0.067 248.7))'
typography:
  display:
    fontFamily: 'Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif'
    fontSize: 'clamp(28px, calc(24px + 1.4vw), 40px)'
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: '-0.03em'
  headline:
    fontFamily: 'Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif'
    fontSize: '20px'
    fontWeight: 650
    letterSpacing: '-0.015em'
  title:
    fontFamily: 'Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: 650
    letterSpacing: '-0.015em'
  body:
    fontFamily: 'Source Sans 3, Source Sans Fallback, system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Hanken Grotesk, Hanken Grotesk Fallback, system-ui, sans-serif'
    fontSize: '11px'
    fontWeight: 550
    letterSpacing: '0.14em'
  mono:
    fontFamily: 'ui-monospace, SF Mono, SFMono-Regular, Menlo, Consolas, monospace'
    fontSize: '12px'
rounded:
  tight: '2px'
  control: '3px'
  pill: '999px'
components:
  nav-item:
    textColor: '{colors.ink-2}'
    backgroundColor: 'transparent'
    typography: '{typography.label}'
    height: '44px'
    padding: '0 12px 0 20px'
  nav-item-current:
    textColor: '{colors.accent-ink}'
    backgroundColor: '{colors.accent-wash}'
  chip:
    textColor: '{colors.ink-3}'
    backgroundColor: 'transparent'
    rounded: '{rounded.pill}'
    padding: '2.5px 8px'
  tile:
    backgroundColor: '{colors.bg-raise}'
    rounded: '{rounded.control}'
    padding: '14px 16px'
  button-copy:
    textColor: '{colors.ink}'
    backgroundColor: 'transparent'
    rounded: '{rounded.control}'
    padding: '5px 9px'
  button-copy-hover:
    textColor: '{colors.accent-ink}'
  correct-cta:
    textColor: '{colors.accent-ink}'
    backgroundColor: 'transparent'
    rounded: '{rounded.control}'
    padding: '10px 14px'
  correct-cta-hover:
    textColor: '{colors.bg}'
    backgroundColor: '{colors.accent}'
---

# Design System: State of AI in Design Systems

## Overview

**Creative North Star: "The Field Notebook"**

The site is a researcher's instrument: rules, labels, tabular numerals, and
every mark earning its place. Structure is drawn with 1px hairlines and air,
never with fills or shadows; where the old matrix once stacked zebra stripes,
header slabs, and cohort bands, one hairline per row now does the whole job.
The voice is instrumental and exact — optical corrections on nav glyphs,
hit areas measured against a 40px floor, a breakpoint (1080px) measured
against the longest system name in the data rather than chosen from habit.

Color is doctrine, not decoration. Blue means "you can act on this" and
appears nowhere else; data wears a desaturated steel ramp where intensity, not
hue, carries importance. Both themes ship through `light-dark()` on a single
token set, and the theme flip is deliberately instant — no transition — so
every hairline and wash flips together.

**Key Characteristics:**

- Hairlines and alignment draw structure; fills and shadows never do
- Blue is for interaction only; data is steel, quiet by design
- Tabular, lining numerals wherever a count sits beside text
- Two prose measures (62ch ledes, 74ch body); tabular blocks run full width
- Every color pair holds AA 4.5:1, machine-checked in CI
- Print, forced-colors, and reduced-motion are designed states, not fallbacks

## Colors

A near-monochrome page where the one saturated voice, Working Blue, is spent
only on interaction, and data speaks in desaturated Steel.

### Primary

- **Working Blue** ({colors.accent}): links' underline-on-hover, focus rings,
  the current nav item's rule, hover borders — plus a small set of deliberate
  editorial accents: the rule under a page title, the eyebrow, the finding
  numerals. `accent-ink` is the readable text cut; `accent-wash` is the
  current-page ground.

### Secondary

- **Steel** ({colors.data-strong}): the single data ink. Matrix dots and
  rings, bar fills, system attributions in technique rows. Deliberately
  desaturated so a chart never reads as a call to action.
- **Steel Wash 0–3** ({colors.mat-0} through {colors.mat-3}): the ordinal
  maturity ramp, each with its own paired ink mixed to sit on that wash.
  Intensity carries the scale; hue stays constant.

### Neutral

- **Page and layers** ({colors.bg}, {colors.bg-raise}, {colors.bg-sunk}):
  three grounds. Raise for cards, sunk for code and hover washes. Row and
  cell hover ({colors.row-hover}, {colors.cell-hover}) are solid, not alpha,
  because sticky cells paint them over scrolled content.
- **Ink, three steps** ({colors.ink}, {colors.ink-2}, {colors.ink-3}):
  content, supporting text and labels, then metadata and counts.
- **Rules** ({colors.line}, {colors.line-strong}): hairline and seam. A
  cohort seam outranks row hairlines by weight, not by color.
- **Control line** ({colors.control-line}): control edges only — it clears
  3:1 on all three grounds so a low-vision reader can find the input.
  Decorative hairlines stay on `line`.

### Named Rules

**The Blue Is for Interaction Rule.** Working Blue marks what a reader can
act on, plus the few editorial accents listed above. Nothing else gets blue —
not charts, not emphasis, not decoration. Its rarity is what makes it legible.

**The Intensity, Not Hue Rule.** Data visualization varies lightness on one
steel hue. A second hue in a chart is a bug.

**The Machine-Checked Contrast Rule.** Every fore/back pair is verified to
AA 4.5:1 by `scripts/check_contrast.js`; a new pair joins the check or
doesn't ship.

## Typography

**Display Font:** Hanken Grotesk (with size-adjusted Arial fallback)
**Body Font:** Source Sans 3 (with size-adjusted system-ui fallback)
**Label/Mono Font:** ui-monospace stack (SF Mono, Menlo, Consolas)

**Character:** A grotesque doing precise labeling work over a warm,
unremarkable reading face. Headings tighten (-0.015 to -0.03em) as they grow;
labels track wide (0.14em) in uppercase at 11px. The pairing reads like a
well-set survey instrument, not a magazine.

### Hierarchy

- **Display** (650, clamp(28–40px), 1.1): the page h1 only, balanced
  wrapping.
- **Headline** (650, 20px): section h2s, 38px above and 6px below.
- **Title** (650, 16px): h3s, finding titles, card names.
- **Title, small** (650, 13px): the row titles in the page menu and the label
  on its Copy page button. The one display-face step below Title, for a title
  inside a control rather than on the page — a 16px row would make a
  seven-row menu shout, and the label voice at 11px is for eyebrows, not for
  something you click.
- **Body** (400, 16px, 1.5): prose. 24px leading sits on the 4px grid.
  Ledes run 18px `ink-2`; dense UI prose steps to 14px, notes to 13px.
- **Label** (550, 11px, 0.14em, uppercase): eyebrows, table headers, column
  keys, the rail brand — one shared voice for every label on the site.
- **Mono** (12px): URLs, snippets, download affordances, the backlink.

### Named Rules

**The One Count Treatment Rule.** Everywhere a number sits beside a heading
or label: body sans, tabular lining numerals, `ink-3`. Counts are quieter
than the data they introduce.

**The Fallback Metrics Rule.** Both webfonts have size-adjusted local
fallbacks, and `font-display: block` is a deliberate choice over `swap` —
it prevents 309px of prose reflow. Don't "optimize" it back.

## Layout

A 224px sticky rail beside a content column capped at 1120px with 40px
inline padding (18px top — measured so the eyebrow lands on the rail brand's
baseline across the rule). Below 860px the rail flattens into a top bar with
one horizontally scrolling nav row and edge-fade. The base line-height puts
type on a 4px grid.

Prose is capped at two measures — 62ch for ledes, 74ch for body — and
tabular blocks (matrix, metagrid) are not prose, so they run full width.
Spacing has no token scale; recurring rhythm is 6/10/12px gaps in dense UI,
14–20px card padding, 38px before an h2, 56px before the footer.

Breakpoints are earned, not standard: 540px (tiles to two columns), 860px
(rail flattens; tap targets get real padding), 1060px (matrix stops
scrolling), 1080px (spectrum becomes three equal columns — measured against
the longest system name), 1344px (the point where viewport slack covers the
theme toggle's clearance).

## Elevation & Depth

Flat, absolutely. There is not one box-shadow in the stylesheet; the single
mention argues against using one. Depth is tonal and linear: `bg-raise`
lifts cards, `bg-sunk` recesses code and hover washes, hairlines do the rest.
Sticky elements assert their layer by painting an opaque ground, not by
casting a shadow.

### Named Rules

**The Hairline Rule.** If structure needs drawing, 1px of `line` draws it.
Seams that must outrank rows step up to `line-strong` — weight, never fill,
never shadow.

**The Opaque Sticky Rule.** Anything that rides over scrolled content (table
headers, the frozen column, the theme toggle) paints a solid ground.
Translucency under a sticky element shows the rows beneath and is a bug.

## Shapes

Rectangles with a 3px radius — barely rounded, an instrument's chamfer
rather than a friendly curve. Inline code tightens to 2px. Pills (999px) are
reserved for chips: rounded reads as metadata, square stays for buttons and
inputs. The theme toggle is the one circle on the site. Borders are 1px
hairlines; the correction callout carries a 3px accent left edge, the
current nav item a 2px accent right edge — edge rules, not fills, say
"this one."

## Components

Instrumental and exact: controls assert nothing at rest, answer hover and
focus in Working Blue, and take taps across measured, finger-sized areas
(44px nav rows and toggle; overlay-extended hit areas elsewhere, measured
against a 40px floor).

### Buttons

- **Shape:** square with the control chamfer (3px); mono type.
- **Copy button (snippet bar):** transparent, 1px `control-line` border,
  11px mono ink; hover recolors text and border to accent. An `::after`
  overlay extends taps to ~43px, vertical-only so the source link beside it
  never loses a tap.
- **Correction CTA:** 1px accent border, `accent-ink` text; hover inverts to
  filled accent with `bg` text. Two instances ship, and they are the only two
  calls to action on the site: the correction prompt a record page carries, and
  the agentic-layer callout that closes the overview. Both are `.correct` —
  `aside`, `bg-raise`, hairline border, 3px accent left edge — so a third
  instance means asking whether it earns the pattern, not restyling it.
- **Focus:** the global 2px accent ring at 3px offset, everywhere.

### Chips

- **Style:** pill (999px), 10px uppercase display type at 600, transparent
  with a `line` border, `ink-3` text.
- **Maturity variants:** `mat-N` wash with its paired ink, border dropped —
  the wash is the border.

### Cards / Containers

- **Corner Style:** 3px; **Background:** `bg-raise`; **Border:** 1px `line`;
  **Shadow:** none, ever.
- **Tiles:** hover moves the border to `line-strong` and the label to
  accent — the numeral keeps `ink` because it is data, not interaction. A
  stretched anchor makes the whole card the target; the focus ring traces
  the tile (inset), not the anchor.
- **Card-with-rows pattern** (`tech-cat`, `plat`): vertical padding on the
  card, each child owning its inline inset via `--card-pad`, so row hovers
  and hairlines run edge to edge.

### Inputs / Fields

No form inputs exist on the site. Control edges, when one arrives, take
`control-line` (the 3:1-on-all-grounds border) — that's what it exists for.

### Navigation

- **Rail:** 224px sticky column; brand block on top, label-voice links with
  16px stroked-in-currentColor glyphs (optically corrected per glyph),
  44px min-height rows. Hover: `ink` on `bg-sunk`. Current: `accent-ink` on
  `accent-wash` with a 2px accent right rule.
- **Narrow:** one scrolling row bleeding to the screen edges, gradient
  edge-fade, scrollbar hidden, focus-ring clearance padded in.

### The Matrix (signature)

The systems table is the site's thesis in miniature: no frame, no fills —
hairlines, alignment, and one data ink. Sticky header and frozen first
column paint opaque grounds; separate borders travel with their cells.
Cell states are three marks in Steel: 10px dot (official), 10px ring
(community), 4px disc (none found — isotropic on purpose, so a sparse
column makes texture instead of snapping into a dotted line). Row hover
washes the row; the cell that is actually a link darkens one step further —
"where am I" and "what would I click" stay two signals. Cohort breaks are a
`line-strong` seam, air, and a sticky label with counted-not-colored
maturity rungs. Forced-colors mode restates every mark in system colors.

### Tabs

One strip, on `/ai`, where the MCP install configs collapse to the client the
reader actually uses. It is the site's first form-adjacent control, so it is
the case the Inputs note anticipates: the edges take `control-line`, not `line`.

- **Shape:** square with the control chamfer (3px), 13px display type at 600,
  `ink-2` on `bg`, 1px `control-line` border. Never the pill — that stays for
  metadata chips.
- **Selected:** `accent-ink` text and a 2px `accent` rule along the bottom
  edge, drawn as an `::after`. An edge rule, like the current nav item's right
  rule and the correction callout's left one; never a fill.
- **Size:** 44px min-height outright, which is what leaves `::after` free to
  draw the marker instead of extending a tap area.
- **Narrow (≤860px):** one non-wrapping scrolling row on the flattened rail's
  terms — bleeds to the gutters, scrollbar hidden, gradient edge-fade on the
  wrapper, focus-ring clearance padded in. It never wraps, so nothing below it
  can lose a tap.
- **Behavior:** automatic activation (arrow moves focus and swaps the panel in
  one step), Home/End to the ends, roving tab stop. Right because the panels are
  prerendered text with nothing to load.
- **Progressive enhancement:** the strip ships empty and `:empty`-hidden, and
  the panels ship stacked, each under its own `h3`. The script fills the strip
  after render and sets `data-tabs="on"`, which is what hides those headings —
  so print, forced-colors and a no-JS reader all still get six labeled configs.

### Disclosures

`details` rows with a mono +/– marker, background-only hover (`bg-sunk`),
inset focus ring. A run of them is a list and announces as one.

### The page menu

Every content route opens with a split control: a `Copy page` half and a
chevron half, both of them `popovertarget` for the same menu. The menu is a
native `popover`, so Escape and outside-click dismissal and the top layer come
from the platform rather than from script — which is what lets the whole thing
work with JavaScript off, on a site whose readers include crawlers that run
none. Script only upgrades the left half from "open the menu" into "copy the
page", so the no-JS failure mode is a working menu, never a dead button.

Rows are a 16px `currentColor` glyph, an `ink` title and an `ink-2` line
saying what happens, each with real vertical padding rather than an `::after`
overlay, because stacked rows would have their overlays reach into each other.

**Named rule — the seam belongs to whoever is lit.** In a split control both
halves draw a full border and the right one pulls back 1px over the seam, so it
reads as one hairline. Hover, focus, or the menu being open lifts that half a
layer. Dropping one half's border instead looks identical at rest and fails on
hover: a button with no left edge has nothing to turn accent.

The open state keys off `:has([popover]:popover-open)`, never
`[aria-expanded="true"]`. The browser derives that attribute from
`popovertarget` without writing it to the DOM, and an attribute selector only
matches an attribute that is really there.

## Do's and Don'ts

### Do:

- **Do** draw structure with 1px hairlines, alignment, and air; step up to
  `line-strong` only when a seam must outrank rows.
- **Do** use tabular lining numerals for any number beside text, in body
  sans at `ink-3` (The One Count Treatment Rule).
- **Do** keep every tap target at 44px or extend it with a measured,
  vertical-only `::after` overlay when the drawn control must stay small.
- **Do** run new color pairs through `scripts/check_contrast.js` — AA 4.5:1
  is machine-enforced, and control edges clear 3:1 on all three grounds.
- **Do** design print, forced-colors, and reduced-motion states; the site
  treats each as a first-class rendering.
- **Do** comment the why in CSS: measured values (a 1080px breakpoint, a
  13.61px line-height) carry their derivation so the next person can retune.

### Don't:

- **Don't** put blue on anything a reader cannot act on (the title rule,
  eyebrow, and finding numerals are the confirmed exceptions).
- **Don't** add a shadow, a second data hue, or a fill where a hairline
  already draws the structure.
- **Don't** animate the theme flip; instant everywhere is the only version
  that cannot look half-done.
- **Don't** put translucent grounds under sticky elements — they ride over
  scrolled content and must be opaque.
- **Don't** exceed the prose measures or let tabular blocks shrink to them;
  62ch/74ch is for prose only.
- **Don't** swap `font-display: block` for `swap`; the fallback metrics and
  block are tuned together against reflow.
