# Semantic audit

Fourteen directives against the rendered site, taken from four passes over the
same snapshot — document structure, grouping, interactive semantics, and
presentation (contrast and hierarchy) — reconciled into one execution order.
Every directive below changes something a reader, a screen reader, or a machine
consumer can observe. Findings that only satisfied a rule book are in the
appendix with the reason they were dropped, so they do not come back.

## Status

Derived 2026-07-27 against a snapshot of `dashboard/` (prerendered routes `/`,
`/insights/`, `/matrix/`, `/systems/`, `/systems/shadcn-ui/`,
`/systems/primer-github/`, `/techniques/`, `/platforms/`, `/ai/`,
`/methodology/`) plus a computed text-and-non-text contrast sweep of all ten
routes in both themes. Anchors are selectors and exact strings, never line
numbers: `dashboard/template.html` moves under other work.

Since then (2026-07-31) the two system indexes merged: the matrix moved from
`/matrix/` to `/systems/`, retitled “The systems”, and the list view that used
to live at `/systems/` — filter, `#syscount` and all — was deleted. `/matrix/`
now 404s; anything below said about the matrix describes today’s `/systems/`
page.

Nothing here is shipped yet. The shipped a11y baseline — matrix caption,
`scope` row/col/rowgroup headers, sr-only cell text, `aria-current` nav,
landmarks including `contentinfo`, focus rings, reduced-motion gating, skip
link, the `#copy-status` status region — is an invariant, not a
target.

**One number frames the whole presentation half of this document:** across the
sampled routes, `--ink-2` carries roughly 156,000 characters of text and `--ink`
roughly 163,000. Half the site’s prose renders as secondary. No text on any
route in either theme falls below 4.5:1, so every promotion below is a
hierarchy decision, not a contrast repair. That is why several muted components
are explicitly left alone.

## Binding constraints for executors

- Edit only `dashboard/template.html`, `scripts/*`, `data/*.json` (data fixes),
  `netlify.toml`. Never edit build outputs (`index.html`, `artifact.html`,
  prerendered route files, `og-image-<hash>.png`). Rebuild with
  `./scripts/build.sh`, then `python3 scripts/check_md_layer.py` and `npm test`.
- All data-derived strings flow through `esc()` / `fmt()`. No research-process
  meta in anything audience-facing. Copy you author: no AI-writing tells,
  counts computed and never hand-typed.
- Preserve the shipped a11y invariants listed under Status. A directive that
  breaks one is wrong even if it satisfies its own WHAT.
- Both themes at every change (tokens only, never literal colors in
  components); verify 375px; chips stay non-interactive metadata.
- View functions are prerendered in `node:vm` behind a DOM shim where
  `querySelectorAll()` returns `[]` and `querySelector()` returns a stub. View
  code may not depend on layout. Post-render DOM passes are safe: they no-op at
  build time.
- `prerender.mjs` splices by exact match. These strings are load-bearing:
  `<nav id="nav" aria-label="Sections"></nav>`,
  `<div id="view-root"></div>`,
  `<footer class="foot" id="foot" role="contentinfo"></footer>`. Its guard
  rails slice `systems.html` at `<table class="mx">` and the overview at
  `<ul class="tiles">`, and count the literal substrings
  `<th scope="row" class="sys">`, `class="mx-group`, `scope="rowgroup"`,
  `<tbody>`, `class="tile"`, `<h1>How design systems talk to machines</h1>`
  and `Use this report with AI tools`. Change markup that contains any of them
  and update `prerender.mjs` in the same commit.
- The markdown mirrors in `scripts/build_md.py` are generated from the payload,
  not from the HTML. HTML heading changes cannot break them — but three
  directives below exist precisely because the mirror is already more
  structured than the page, and the page should catch up.
- `artifact.html` is the same template with the wrapper stripped and hash
  routing. Never hand-write a path: route links go through `href()`, which is
  hash-mode aware.

---

## P1 — content that is lying about what it is

### 1. The two `.twocol` card titles become real headings (owner directive)

**What:** `<div class="t">` becomes `<h2 class="t">`, keeping the label
treatment exactly as it looks now.

```html
<div class="twocol">
  <div class="col">
    <h2 class="t">For consumers — building with it</h2>
    <p>…</p>
  </div>
  <div class="col">
    <h2 class="t">For builders — maintaining it</h2>
    <p>…</p>
  </div>
</div>
```

CSS: `h2` sets `margin: 38px 0 6px` at element specificity and the `.t` rule
only sets `margin-bottom`, so the cards would gain a 38px gap above their own
titles. Add `margin: 0 0 6px` to `.twocol .col .t`. The shared label rule
(`.eyebrow, .label, .metagrid .k, .twocol .col .t, table.mx thead th`)
already matches by class, so the 11px/550/.14em/uppercase treatment survives
unchanged; so does the `.twocol .col .t { font-size: 10.5px }` override.

**Level ripple — resolved:** they become `h2`, and the existing `h2`s
(`Affordances · N`, `Coercion techniques · N`, `Platform integrations`,
`Gaps & open questions`, `Sources`) stay `h2`. The cards sit between
`.metagrid` and the first `h2`, so the outline reads h1 → h2 For consumers →
h2 For builders → h2 Affordances → … with no skipped level and no reordering.
The two rejected alternatives, for the record: `h3` alone skips from `h1`; a
new wrapper `h2` (“Building it vs. consuming it”, as `build_md.py` emits for
the markdown twin) invents on-page copy the design does not show — the mirror
needs that wrapper because markdown has no cards, the page does not.

**Do not** wrap the cards in `<section>`. Unnamed sections add nothing;
sections named by their heading become `region` landmarks, and directive 9
exists because this site already has too many of those.

**Where:** `VIEWS.system`, the `<div class="twocol">` block; CSS rules
`.twocol .col .t` and the shared label group.

**Why:** the two cards are the only place the report says what a system is like
to build with versus to maintain, and right now neither title exists in the
document outline or in any heading list.

**Risk:** low. No prerender guard counts headings. Both card titles are static
strings, so no `esc()` surface changes. Check 375px, where `.twocol` collapses
to one column and the two `h2`s stack — confirm the 38px reset did not collapse
the rhythm between the cards.

**Priority:** P1.

### 2. Muted primary content: `.twocol` paragraphs to `--ink`, plus a ruling for every sibling (owner directive)

**What:** `.twocol .col p { color: var(--ink-2) }` becomes `var(--ink)`. Then
apply the table below. Every component the presentation pass flagged as
“muted but primary” gets an explicit verdict here; nothing is left to the
executor’s taste, and `code`/`em`/`strong` inside a promoted paragraph inherit
the promotion for free.

| Component (selector)                                                                                          | Now                 | Ruling          | Reason                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------- | ------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.twocol .col p`                                                                                              | `--ink-2`           | **→ `--ink`**   | Owner directive; the card body is the finding, not a caption.                                                                                                                    |
| `.tech-ex .tb p`                                                                                              | `--ink-2`           | **→ `--ink`**   | ~78k characters across `/techniques/`, `/platforms/` and every system page — the single largest body of prose on the site, and the whole point of the technique catalog.       |
| `.plat .sum`                                                                                                  | `--ink-2`           | **→ `--ink`**   | The platform’s verdict paragraph, and the first prose under its `h2`.                                                                                                            |
| `.aff-body p.desc`                                                                                            | `--ink-2`           | **→ `--ink`**   | What the affordance _is_; the reader opened the disclosure to read exactly this.                                                                                                 |
| `.findings p`                                                                                                 | `--ink-2`           | **→ `--ink`**   | The nine findings are the report’s argument (see directive 3).                                                                                                                   |
| `.body-block`                                                                                                 | `--ink-2`           | **→ `--ink`**   | Its own code comment calls it “primary content that happens to sit under an h2, as opposed to a subtitle”, and its `.gaps` variant is already `--ink`. Align the base with both. |
| `.prose p` (and `.prose li`, which inherits)                                                                  | `--ink-2`           | **→ `--ink`**   | On `/methodology/` and `/ai/` this is the entire page body; a whole page of secondary text has no primary to be secondary to.                                                    |
| `.snip-bar button .btxt`                                                                                      | `--ink-2`           | **→ `--ink`**   | A control label. Muted control text reads as disabled.                                                                                                                           |
| `.snip-bar .lang`, `.snip-bar .snote`                                                                         | `--ink-3`           | **→ `--ink-2`** | 10px at 4.68:1 is the smallest, weakest text on the site, and `.snote` carries source receipts (“Path in tarball: …”).                                                           |
| `.plat .adopt`                                                                                                | `--ink-3`           | **→ `--ink-2`** | It is the platform’s adoption evidence — a receipt, quoted with a rule on the left. Receipts are not chrome.                                                                     |
| `p.lede`                                                                                                      | `--ink-2`           | **keep muted**  | Deck under an `h1` at 16.5px; size and measure carry it.                                                                                                                         |
| `.h2-sub`                                                                                                     | `--ink-2`           | **keep muted**  | Genuinely a subtitle for the heading above it — the distinction the `.body-block` comment draws.                                                                                 |
| `.tech-cat > .def`                                                                                            | `--ink-2`           | **keep muted**  | Same role as `.h2-sub`: it defines the category heading rather than making a claim.                                                                                              |
| `.aff-body .note`                                                                                             | `--ink-3`           | **keep muted**  | Qualifies `.desc`; the two must not read at the same level.                                                                                                                      |
| `.ai-links .note`                                                                                             | `--ink-2`           | **keep muted**  | Annotation on a link list.                                                                                                                                                       |
| `.metagrid .k`, `.chip` text, `.srclist .h`, rail nav idle items, `.rail-foot`, `footer.foot` | `--ink-2`/`--ink-3` | **keep muted**  | Labels, chrome and metadata. This is what the muted tokens are for, and keeping them muted is what makes the promotions above readable as hierarchy.                             |

**Where:** the CSS rules named in the table, all in `dashboard/template.html`.

**Why:** with half the site’s text set as secondary, “muted” stopped meaning
“secondary” and started meaning “text”.

**Risk:** CSS only, no markup, no prerender coupling. Both themes: `--ink` is
`#111` / `#E8E8E8`, so promoted blocks get heavier in dark mode where dense
prose is already loud — re-check `/techniques/` in dark at 1440 and 375, and
confirm the promoted `.tb p` does not now compete with the `summary` above it.
If it does, the answer is more space, not re-muting.

**Priority:** P1.

### 3. Finding titles are `<b>`, not headings

**What:** in the three `.findings` templates, `<li><b>${esc(x.title)}</b><p>…</p></li>`
becomes:

```html
<li>
  <h3>${esc(x.title)}</h3>
  <p>${fmt(x.body)}</p>
</li>
```

CSS: change the selector `.findings b` to `.findings h3` and add
`margin: 0 0 3px` (the global `h3` sets `22px 0 8px`); keep
`display:block; font-weight:650; font-size:15px; letter-spacing:-.01em`. The
`counter-increment` on `.findings li` and the `::before` numerals are
untouched.

**Where:** `VIEWS.overview` (`<ol class="findings">`), and both
`.findings` lists in `VIEWS.insights` (convergence and divergence); CSS rule
`.findings b`.

**Why:** the nine findings and the convergence/divergence items are the report’s
conclusions, and none of them appear in the outline a screen-reader user or a
summarizer navigates by — while the markdown twin already publishes them as
`### {n}. {title}`. Outline: `/` gives h1 → h2 Findings → h3 ×9;
`/insights/` gives h1 → h2 → h3 ×n. No skipped levels.

**Risk:** low. Three call sites, same shape; `esc()` unchanged. No prerender
guard counts headings or `<b>`. Print stylesheet has `.findings li` in its
`break-inside: avoid` list — unaffected.

**Priority:** P1.

### 4. `/systems/` rows: a 300-character link name, and 19 items that are not a list

**What it found:** each row’s accessible name was the entire row — name, org,
the full two-line-clamped summary, and both counts — because the whole row was
one `<a>`, and the 19 rows had no item boundaries or count at all.

**Resolution — overtaken by the 2026-07-31 merge.** The list view this
directive rewrote was deleted when the matrix became the `/systems/` page. The
matrix table already carries what the directive was after: each system’s
accessible name is the row-header link — the name alone — and the cohorts are
real `<tbody>` groups labeled by `scope="rowgroup"` strips. Nothing left to
do.

---

## P2 — structure the page does not have but its own markdown twin does

### 5. `.metagrid` is a label/value grid built from anonymous `div`s

**What:**

```html
<dl class="metagrid">
  <div>
    <dt class="k">Org</dt>
    <dd class="v">shadcn (Vercel)</dd>
  </div>
  <div class="wide">
    <dt class="k">Activity</dt>
    <dd class="v">…</dd>
  </div>
</dl>
```

`dl > div > dt + dd` is valid and keeps the existing grid: `.metagrid > div`
stays the cell rule, `.wide` stays the full-span cell, `.metagrid .k` and
`.metagrid .v` keep matching. Add `.metagrid dd { margin: 0 }` — the UA
stylesheet indents `dd` by 40px and will otherwise shift every value.

**Where:** `VIEWS.system`, the `<div class="metagrid">` block; CSS rules
`.metagrid`, `.metagrid > div`, `.metagrid .k`, `.metagrid .v`, and the 375px
`.metagrid .v a` tap-target override.

**Why:** on every system page the record’s six facts (org, repo, docs, license,
last release, activity) currently reach assistive tech and scrapers as one
undifferentiated run of text with no association between “License” and “MIT”.

**Risk:** low, but check both themes for the hairline seams (`outline` with
`-0.5px` offset on the cells) after the element change, and re-check the 5-cell
and 4-cell record widths at 1440/1100/900/375.

**Priority:** P2.

### 6. Platform integrations: the platform name is bold, not a heading

**What:** split the name out of the paragraph, matching what
`build_md.py` already emits (`## Platform integrations` → `### {label}`):

```html
<h3 class="pi">${esc(p.platform)}</h3>
<p class="body-block">${fmt(p.description)} ${extArrow(...)}</p>
```

Drop the `—` separator that currently joins name to prose, or the paragraph
opens on a dangling em dash. Style `.pi { font-size: 14px; margin: 14px 0 2px }`
so the section keeps its current rhythm rather than inheriting the 15.5px `h3`.

**Where:** `VIEWS.system`, the `s.platform_integrations.map(...)` template; new
CSS rule beside `.body-block`.

**Why:** each of these paragraphs is a per-platform verdict; as `<strong>` the
platform name is weight without structure, so `Platform integrations` has no
sub-outline on any system page.

**Risk:** low. The `extArrow()` `aria-label` (`"${p.platform} integration"`)
stays as-is, so the arrow link keeps its name. Watch the visual: three `h3`s
per page is a louder page — if the rhythm breaks, tune `.pi`, do not revert to
`<strong>`.

**Priority:** P2.

### 7. Overview stat tiles are five anonymous `div`s

**What:** `<div class="tiles">` → `<ul class="tiles">`, each
`<div class="tile">` → `<li class="tile">` (keep the inner `div.n`/`.l`/`.d`
untouched). Add `list-style: none; padding: 0` to `.tiles`.

**Where:** `VIEWS.overview`, the `<div class="tiles">` block; CSS `.tiles`
(plus the 375px two-column override) and the print `break-inside` list.

**Why:** without item boundaries the five headline numbers read as one sentence
(“19 design systems studied + 5 platforms · 168 affordances 16 ship an official MCP server of 19 systems …”) <!-- counts-ok: the tiles as they read on 2026-07-27 -->
— the numbers that carry the whole report are the least parseable text on the page.

**Risk:** low; CSS `.tile` selectors are class-based and unaffected.

**Priority:** P2.

### 8. Maturity band headers on the overview are `div`s over a list of links

**What:** `<div class="bhead mat-${k}">` → `<h3 class="bhead mat-${k}">`, with
`margin: 0` added to the `.spec-band .bhead` rule so the band’s colored strip
does not inherit the global `h3` margin.

**Where:** `VIEWS.overview`, the `<div class="spec-band">` template; CSS
`.spec-band .bhead` and its four `mat-*` variants.

**Why:** the four bands are the structure of “The maturity spectrum” `h2`, and
each one names the `ul` of systems beneath it — as `div`s, neither the band
names nor the grouping exist outside the visual.

**Risk:** low. Band label and count stay in `span.bl` / `span.bn`, so the
`--mat-*` washes and the `check_contrast.js` pairs are untouched. Outline
becomes h2 → h3 ×4, no skip.

**Priority:** P2.

### 9. 147 `region` landmarks on one page

**What:** snippet `<pre>`s ship `role=”region” aria-label=”… snippet”
tabindex=”0”`. `/techniques/` renders 147 of them; a system page renders 10.
Change `role="region"` to `role="group"` in the snippet template — naming still
works, the landmark list stops being noise. Keep `role="region"` on the matrix
`.scroller`: there is exactly one per page and it is a genuine landmark.

Optionally (same directive, do it in the same pass): stop handing out tab stops
to snippets that do not scroll. A post-render pass, next to
`setupMatrixFades()`:

```js
document.querySelectorAll('pre[id^="sn-"]').forEach((p) => {
  if (p.scrollWidth <= p.clientWidth) {
    p.removeAttribute('tabindex');
    p.removeAttribute('role');
  }
});
```

**Where:** the snippet template
(`<pre id="sn-${esc(id)}" tabindex="0" role="region" aria-label="${esc(lang)} snippet">`);
the matrix `.scroller` stays as it is. Any DOM pass goes next to the other
post-render setup functions.

**Why:** landmark navigation on `/techniques/` is unusable — 147 identically
shaped regions and 147 tab stops for content that mostly does not scroll —
and the same page has exactly one landmark a reader actually wants.

**Risk:** the DOM pass must be guarded like `setupMatrixFades()` is: in the
`node:vm` shim `querySelectorAll` returns `[]`, so it no-ops at prerender,
which is the intent (the shipped HTML keeps `tabindex`/`role` and the browser
prunes). Confirm keyboard scrolling still works on a snippet that does
overflow, and that `#copy-status` announcements are unaffected.

**Priority:** P2.

### 10. Control boundaries below 3:1

**What:** the search input, the maturity `select`, the snippet copy buttons and
the theme toggle draw their borders in `--line` / `--line-strong`, measured at
1.32–1.82:1 against their grounds in both themes. Add a control-only token and
use it on controls only:

```css
:root {
  --control-line: #8f8f8f;
} /* 3.2:1 on #FFF */
:root[data-theme='dark'] {
  --control-line: #6b6b6b;
} /* 3.5:1 on #111 */
```

Apply to `.searchbar input`, `.searchbar select`, `.snip-bar button`,
`.theme-toggle`. Leave `--line` and `--line-strong` alone everywhere else.

**Where:** the token blocks (light and dark), plus the four component rules.
`scripts/check_contrast.js` currently only checks the eight `--mat-*` pairs —
add a non-text block asserting `--control-line` ≥ 3:1 against `--bg`,
`--bg-raise` and `--bg-sunk` in both themes so this cannot silently regress.

**Why:** these are the only four controls on the site, and at 1.3–1.8:1 their
edges are invisible to a low-vision reader hunting for the filter box — the one
thing `/systems/` asks you to use.

**Risk:** dark mode gets visibly harder edges; check `/systems/` and
`/techniques/` in both themes at 1440 and 375. Do not “fix” the decorative
hairlines around `.tile`, `.chip`, `details` or table rows on the way past —
that is a rejected finding (appendix R11) and it is what the hairline art
direction is made of.

**Priority:** P2.

### 11. The matrix “none” glyph is a hardcoded literal at 1.66:1

**Superseded (2026-08-05).** The directive's premise — that an empty cell and a
“no” cell look identical — was right, and the fix it proposed was too small: the
two were identical because the data could not tell them apart either. There are
now three states rather than two. A cell whose absence was confirmed against the
system's own repository or docs draws a crossed mark in `var(--ink-3)`, the
contrast this item asked for; a cell nothing was established about stays blank
and says so in the key. The `::before` content rule and the `·` legend glyph the
directive names no longer exist. Nothing below is left to do.

**What:** `table.mx td .none { color: light-dark(#C9C9C9, #555555) }` becomes
`color: var(--ink-3)` (5.1:1 light, 5.6:1 dark). Apply the same to the legend’s
`·` glyph so cell and legend still match exactly.

**Where:** CSS `table.mx td .none` (and its `::before` content rule) plus the
`.mx-legend` glyph.

**Why:** “none found” is one of three states in a 19×11 grid, and it is the only
one a sighted low-vision reader cannot see — an empty cell and a “no” cell look
identical. The sr-only text covers assistive tech; nothing covers the eye. It
is also the only literal color left in a component rule.

**Risk:** none structurally. The glyph stays `aria-hidden` with the sr-only
cell text intact — do not touch either. Compare cell and legend side by side in
both themes at 100% and 125% zoom.

**Priority:** P2.

---

## P3 — polish, and one gated data change

### 12. Runs of `details` are not lists

**What:** wrap each run in a list so the count and boundaries exist:
`<ul class="afflist">` around the `details.aff` siblings on a system page, and
`<ul class="exlist">` around the `details.tech-ex` siblings inside each
`.tech-cat` / `.plat`, each `details` in an `<li>`. `list-style: none; padding: 0`,
and re-point any adjacent-sibling margin rules (`details + details`) at
`li + li`.

**Where:** `VIEWS.system` (affordances map, techniques map), `VIEWS.techniques`,
`VIEWS.platforms`; the `.aff` / `.tech-ex` margin rules.

**Why:** “item 3 of 10” while stepping through ten disclosures is a real
improvement; the `h2` count only tells you the total once.

**Risk:** low but broad — four call sites and the sibling-margin rules. Do it
after directives 1–9 have settled, in its own commit.

**Priority:** P3.

### 13. The `select` chevron is a literal `#888888` inside a data URI

**What:** replace the inline SVG `background-image` on `.searchbar select` with
one that inherits (`stroke="currentColor"` via a masked pseudo-element, or two
tokenized URIs switched per theme).

**Where:** the `.searchbar select` background-image declaration.

**Why:** it is the last hardcoded color in a control, it does not respond to
either theme, and in forced-colors mode the background image is dropped
entirely, leaving a control with no affordance.

**Risk:** cosmetic only; verify the chevron position and size are unchanged in
both themes and that Windows high-contrast still shows a chevron.

**Priority:** P3.

### 14. `Gaps & open questions` is a hand-numbered list inside one paragraph

**What:** the gaps prose reads “Not confirmed, or absent: (1) … (2) … (3) …”
inside a single `<p class="body-block gaps">`. Make it an `<ol>` — but only by
changing the shape of the data (`gaps` becomes an array of strings in
`data/design-systems.json`, passed through by `build_dashboard.py`), never by
regex-splitting prose in the view.

**Where:** `data/design-systems.json` (`gaps`), `scripts/build_dashboard.py`,
`VIEWS.system` (`.body-block.gaps`), `scripts/build_md.py` (`## Gaps`).

**Why:** these are the report’s own open questions, and a reader cannot count
or scan them; a machine consumer cannot enumerate them.

**Risk:** touches the payload, the md mirror and the JSON exports — the widest
blast radius of anything here for the smallest reader gain, hence P3 and hence
gated on the data change. If the data stays a string, do nothing: leave the
paragraph alone.

**Priority:** P3.

---

## Appendix — rejected, with reasons

These came out of the four passes and are deliberately not directives. Do not
re-open them without new evidence.

- **R1. Add a live region for the systems filter.** Was already shipped as
  `#syscount`; the filter, and the live region with it, went down with the
  list view in the 2026-07-31 merge. `#copy-status` still covers copy
  feedback.
- **R2. Turn `/systems/` into a `<table>`.** Settled by the 2026-07-31 merge
  rather than by either lens: the list view was deleted, and the matrix — a
  real `<table>` — is now the `/systems/` page.
- **R3. Put an `h3` inside each `<summary>`.** Legal, and it would mirror
  `build_md.py`'s `### {name}`, but AT announces “heading level 3, collapsed
  button” and the disclosure already exposes the name. Cost of the double
  announcement outweighs the navigation gain.
- **R4. Wrap cards, bands and disclosure groups in `<section>`.** An unnamed
  section conveys nothing; a heading-named one becomes a `region` landmark, and
  directive 9 exists because the site has 147 too many of those.
- **R5. `hgroup` around `.eyebrow` + `h1`.** No assistive-tech behavior
  depends on it; pure markup ceremony.
- **R6. Breadcrumb `nav` around `.backlink`.** A one-item breadcrumb landmark
  is noise; the link’s text (“← all systems”) already says where it goes.
- **R7. Replace the matrix cell `title` tooltips.** The same text is already in
  the sr-only cell copy, and the row header links to the full record — the
  `title` is redundant, not misleading.
- **R8. Give the sticky matrix column an opaque background.** It has one
  (`table.mx th.sys { background: var(--bg-raise) }`). The 1:1 reading is the
  sticky column and the cells sharing a surface color, which is the design, not
  a transparency bug.
- **R9. `role="meter"` / `role="img"` on the prevalence bars.** Each
  `.bar-row` already states its label and count as text and the track is
  `aria-hidden`; a widget role would add a value nobody can act on.
- **R10. `<time datetime>` on the byline and “Release(s) audited”.** The Article
  JSON-LD already carries machine-readable dates for every page.
- **R11. Raise the decorative hairlines (`.tile`, `.chip`, `details`, table row
  rules) to 3:1.** Exempt from 1.4.11 as decoration, and the 1.32:1 hairline is
  the site’s art direction. Directive 10 scopes the contrast fix to controls
  for exactly this reason.
- **R12. The count columns lose their units for screen readers.** `.cw` is
  sr-only-clipped, not `display:none` — “10 affordances” is already announced,
  and the words become visible copy at 375px.
- **R13. Make the matrix legend a list.** Three inline items whose meaning is
  their text; a list adds structure without adding information.

---

## Suggested execution grouping

**Commit A — headings and hierarchy (directives 1, 2, 3, 8).** All CSS plus
three small template edits, one outline change per view, no prerender coupling,
no JS. Land these together so the muted-content rulings and the new headings
are reviewed against each other in one screenshot pass — light and dark, 1440
and 375. Verify: `./scripts/build.sh`, `python3 scripts/check_md_layer.py`,
`npm test`, then re-read `/`, `/insights/` and one system page in both themes.

**Commit B — `/systems/` rows (directive 4).** Closed without a commit: the
2026-07-31 merge deleted the list view and resolved the directive (see its
Resolution).

**Commit C — record structure (5, 6, 7).** `dl`, `h3` and `ul` conversions on
the system detail page and the overview; independent of A and B, and each one
is a contained markup swap with a matching CSS reset (`dd` margin, `.pi` size,
`list-style`).

**Commit D — non-text and controls (9, 10, 11).** The token addition, the
`check_contrast.js` extension and the two role changes. Group them because they
share one verification pass: contrast script, then both themes at 1440 and 375
on `/systems/` and `/techniques/`.

**Commit E — polish (12, 13), and 14 only if the data changes shape.** Do not
mix 14 into any earlier commit: it is the only directive that touches the
payload and the markdown layer.
