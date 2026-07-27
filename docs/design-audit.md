# Design audit

Thirty-two directives against the rendered site, taken at 1440 and 375, light and
dark, across all eight views. Each one names what to change, why it matters, which
files it touches, and what it risks.

## Status

**All 32 shipped**, plus the eight "Considered" decisions held. Verified
2026-07-27 against `dashboard/template.html`, `scripts/build_dashboard.py`,
`data/`, and `netlify.toml` — not assumed from the worklist.

Kept here as the record of what was decided and why. The reasoning outlasts the
work: it is the argument for why the matrix groups by cohort, why blue is
reserved, why there is one measure system and not five. Read it before undoing
any of it.

## Binding constraints for executors

- Edit only `dashboard/template.html`, `scripts/*`, `data/*.json` (data fixes), `netlify.toml`,
  `scripts/og-image.html`. Never edit build outputs (`index.html`, `artifact.html`, prerendered
  route files). Rebuild with `./scripts/build.sh`, then `python3 scripts/check_md_layer.py`
  and `npm test`.
- All data-derived strings flow through `esc()`/`fmt()`. No research-process meta in anything
  audience-facing. Copy you author: no AI-writing tells (no em-dash chains, no "not just X but
  Y", no rule-of-three, no vague modifiers), counts computed not hand-typed.
- Preserve shipped a11y invariants: sr-only matrix cell text, `aria-current` nav, visible
  `:focus-visible` rings, reduced-motion gating, skip link, `#main` focus on route change.
- Both themes at every change (tokens only, never literal colors in components); verify 375px;
  chips stay non-interactive metadata (never style a control as a `.chip`).
- Art direction stays: white/#111 grounds, Hanken Grotesk display / Source Sans 3 body,
  hairline lists, 3px blue accent rule, blue = interactive + three sanctioned editorial
  accents (accent rule, eyebrows, findings numerals), slate `--mat-*` washes for data,
  `--data-strong` for marks. Deviations below are deliberate and scoped.

---

## P0 — correctness on the site's core promise

### 1. Fix 7 malformed `source_url` values and gate the build on URL validity
**What:** `data/design-systems.json` contains 7 source URLs of the form
`https://www.npmjs.com/package/@salesforce/afv-skills (tarball: package/skills/…/SKILL.md)` —
the parenthetical is inside the URL string, so the rendered link 404s. Move each parenthetical
into the record's `notes` (or the snippet's note field) as `Path in tarball: …`, leaving a
clean URL. Then add a validation pass to `scripts/build_dashboard.py`: fail the build (exit 1,
listing offenders) if any `source_url`, `docs_url`, `code_url`, or `sources[]` entry contains
whitespace, `(` , a trailing `)`/`]`/`,`, or more than one `http`.
**Why:** the rail promises "every snippet linked to its source"; dead receipts on the flagship
promise outrank any visual work.
**Where:** `data/design-systems.json` (grep `tarball:`), `scripts/build_dashboard.py`.
**Risk:** none if notes carry the moved text; validation may surface further latent offenders —
fix those the same way.

### 2. Metagrid renders a gray slab when the last row is short
**What:** the `.metagrid` rule draws hairlines via `gap: 1px` over a `--line`
background; with `auto-fit` columns, unfilled last-row cells show as a solid gray slab.
Replace the mechanism: `.metagrid { background: var(--bg-raise); gap: 0 }` and draw separators
on cells: `.metagrid > div { outline: 1px solid var(--line); outline-offset: -0.5px }` (or
`box-shadow: 0 0 0 0.5px var(--line)`), keeping the outer 1px border and radius. Verify at
1440/1100/900/375 on a 5-cell record (carbon) and a 4-cell one.
**Why:** a rendering artifact on every system detail page at common widths.
**Where:** `.metagrid` CSS only.
**Risk:** outline vs border rounding seams — check both themes at 100% and 125% zoom.

---

## P1 — craft that changes how the site reads

### 3. Systems list: label the counts once, group by maturity, fix the mobile orphan
Replaces the shipped `10 aff · 8 tech` mono column with the table-native answer:
**a labeled header row + grouped rows + spelled words on mobile.** (Icons with a tooltip
were the other candidate — see C1.)
**What:**
a. Add `.syslist-head` above the list, same grid as rows, using the `.label` treatment
   (11px / 550 / .14em / uppercase / `--ink-2`): `System · Summary · Affordances · Techniques`.
   The last two are right-aligned labels sitting over their number columns (flex, `gap: 14px`,
   each `min-width: 2ch`, right-aligned).
b. Drop the per-row maturity chip column entirely. Insert a group header row before each
   maturity cohort (list is already sorted): `AI-native · 13` — uppercase label in the band's
   `--mat-*-ink` on a `--mat-*` wash strip, full row width, 6px 10px padding, count in
   tabular nums. Maturity `<select>` filtering shows only the matching group; text filtering
   hides groups with zero visible rows. Row grid becomes
   `minmax(190px, 240px) 1fr auto` desktop.
c. Rows carry numbers only: two right-aligned spans, `font-variant-numeric: tabular-nums`,
   12px, `--ink-2`, `min-width: 2ch` each so 8 and 13 align down the list. Each number gets a
   one-word `<span class="sr-only">affordances</span>` / `…techniques</span>` (a word, not a
   sentence). No tooltip — the header row is the visible definition.
d. Mobile (≤860px): hide `.syslist-head`; spell it out — `10 affordances · 8 techniques`,
   12px `--ink-3`, explicitly placed via `grid-template-areas` left-aligned under name/org
   (today `.ct` orphans onto a stray centered line — confirmed defect). Group header rows
   remain visible on mobile (they replace the hidden chips).
e. Numeral-family decision, applied site-wide in the same change: counts render in
   **sans tabular** (`font-variant-numeric: tabular-nums`, Source Sans) at `--ink-2`/`--ink-3`
   — update `.tech-cat .th .n` and any heading counts to match (see #21).
**Why:** a header row is the list's missing table furniture; grouping removes 19 redundant
chips (the sort already encodes maturity); words beat a private icon language.
**Where:** `renderSyslist()`, `.syslist*`/`.sysrow` CSS, mobile query.
**Risk:** filter interactions with group headers — test: text filter with 1 result, maturity
filter, both, none. Status line stays "N of 19 systems".

### 4. Matrix: make it fit, make the sticky header real, fade only when it must scroll
**What (in this order):**
a. Let header labels wrap: `table.mx thead th { white-space: normal; line-height: 1.15;
   vertical-align: bottom }` (the global `th, td { white-space: nowrap }` currently forces
   "Repo agent files" onto one line — that rule stays for `td` only).
b. Tighten cells: `padding: 7px 6px` (from `8px 10px`).
c. Apply the same maturity grouping as #3: one group header row per cohort — use multiple
   `<tbody>` elements, each opening with
   `<tr class="mx-group"><th colspan="12" scope="rowgroup">AI-native · 13</th></tr>` on the
   band wash; drop the per-row chip from the first column and reduce `th.sys` `min-width`
   to 130px. Keep row-header links and all existing sr-only cell text.
d. Result must be ≤ the 1040px content column at 1440: then
   `@media (min-width: 1060px) { .scroller { overflow: visible } }` — which makes the
   existing (currently dead — the scroller has no vertical scroll context) `thead
   { position: sticky; top: 0 }` finally work against the viewport, keeping column labels
   through all 19 rows. Verify the fixed theme toggle stays above it (`z-index`).
e. Below 1060px keep `overflow-x: auto` and add edge fades: wrapper `position: relative`,
   two `pointer-events: none` overlays (`linear-gradient` to `var(--bg-raise)`), toggled by a
   `passive: true` scroll listener + `ResizeObserver` setting `data-at-start`/`data-at-end`
   (correct on load and rotate, not only after scroll).
**Why:** the centerpiece view currently loses its column labels the moment you read row 2, and
scrolls on desktop only because of a leaked `nowrap`.
**Where:** matrix view fn + `table.mx`/`.scroller` CSS.
**Risk:** sticky + `overflow: visible` interplay; multiple-tbody borders; re-test the sr-only
cell layer and the horizontal-scroll a11y (`tabindex`/role stay for the <1060 case).

### 5. Maturity spectrum: vertical bands that encode magnitude, calm headers
**What:** replace the three equal `auto-fit` columns (13 / 5 / 1 systems — geometry encoding
nothing, one band mostly void) with **full-width stacked bands**, one per maturity level,
in scale order. Band header row: uppercase label (`AI-native`) left + tabular count right,
on the `--mat-*` wash with `--mat-*-ink`; definition beneath the header INSIDE the band as
sentence-case 12px `--ink-3` (no more two-line uppercase shouting); system links wrap below
(existing `.spec-band li a` treatment). Render **all four** scale steps — an empty step
(`None · 0`) appears as a header-only band with a short "no systems here in this snapshot"
line — the page claims an ordinal scale, so show the scale. Remove the 3px `--data-strong`
top border (it duplicated the sanctioned accent-rule weight in a second color).
**Why:** band length becomes the chart; mobile and desktop become one layout; the strongest
visual on the landing page stops lying by geometry.
**Where:** `VIEWS.overview` bands markup + `.spectrum`/`.spec-band` CSS.
**Risk:** overview gets vertically longer — acceptable; check the fade-in animation still
applies once, and dark-mode wash intensities still read as an ordered ramp top-to-bottom.

### 6. One measure system: 62ch ledes, 74ch body — everywhere
**What:** add `--measure-lede: 62ch; --measure-body: 74ch` to `:root`. Sweep every local
measure cap onto them: `.lede` → lede; `.findings` container →
`calc(var(--measure-body) + 48px)` (48px = numeral gutter, so hairlines end where text ends);
`.findings p, .aff-body p.desc, .tech-ex .tb p, .tech-cat .def, .plat .sum, .plat .adopt,
.h2-sub, .prose` → body. Delete the 70/88/90ch variants.
**Why:** five simultaneous measures is composition without an editing pass; the ~330px of dead
hairline under every finding was the symptom.
**Where:** tokens + the listed selectors.
**Risk:** prose blocks narrow slightly — re-check widows on findings titles (`text-wrap:
balance` stays) and that `.syslist`/`.metagrid`/tables remain full-width (they are tabular,
not prose — do NOT cap them).

### 7. Technique expander rows: give 148 rows their affordance cue
**What:** `.tech-ex > summary` gets the same marker system as `.aff`: `content: "+" / "";`
(`"–"` when open) in a 14px slot before the system name, and `:hover { background:
var(--bg-sunk) }`. Two required companions: shift `.tech-ex .tb` left padding to align the
body under the title now that the marker slot exists; and **remove** the current
hover text-recolor to `--accent-ink` (background is the hover signal, matching `.aff`;
two signals is louder than the component it's matching — and accent implies link).
**Why:** the clearest interaction inconsistency in the build: identical behavior, one has an
affordance cue, the other has none.
**Where:** `.tech-ex` CSS only.
**Risk:** none beyond alignment — check a wrapped two-line summary at 375px.

### 8. Copy-button feedback is currently inaudible to screen readers
**What:** the `aria-label="Copy snippet to clipboard"` pins the accessible name, so the
`copied` text swap is never announced — and `aria-live` on the button is the wrong container.
Remove the aria-label; the button reads `copy<span class="sr-only"> snippet</span>`. Add ONE
document-level `<span role="status" class="sr-only" id="copy-status"></span>`; the click
handler writes "Copied to clipboard" / "Couldn't copy" there (and clears it after ~2s so
repeat copies re-announce).
**Why:** 300+ buttons whose only confirmation is visual.
**Where:** snippet template + copy handler + one status node in the shell.
**Risk:** none; keep the visible text swap exactly as is.

### 9. Delete the body theme transition
**What:** remove `body { transition: background-color .3s, color .3s }`.
**Why:** only `body` transitions — every hairline, wash, chip, and snippet ground flips
instantly, so toggling reads as 300ms of patchwork, and the transition is ungated by
reduced-motion besides. Instant swap is the only version that can't look wrong. (Deliberate
deviation from kaelig.fr, which transitions a page that is only text.)
**Where:** one line.
**Risk:** none.

### 10. Route the essay and methodology through `fmt()` — no raw interpolation
**What:** `VIEWS.insights` and `VIEWS.methodology` interpolate `DATA.insights.essay` /
`.methodology` raw. Convert the `<strong>`/`<em>` markup inside
those strings in `data/insights.json` to `**bold**` / backtick forms `fmt()` already renders
(add `*italic*`→`<em>` support to `fmt()` only if the data actually uses italics), then wrap
both interpolations in `fmt()`.
**Why:** the escaping invariant currently has two silent exceptions; one bare `&` in future
data corrupts the page.
**Where:** `data/insights.json`, `fmt()`, two view lines.
**Risk:** diff the rendered essay before/after — byte-identical output is the acceptance test.

### 11. One masthead stack, on every view
**What:** make the header stack invariant across all views: eyebrow → h1 → lede → byline
(overview only) → accent rule. Author short ledes (1–2 sentences, plain voice, no AI tells)
for **Insights** and **Methodology** — the two views a skeptical reader lands on cold, and
the two with no orientation today. System detail: promote the record's `category`
("design-system" → "Design system") into the eyebrow slot and move the `← all systems`
backlink above the eyebrow (mono backlink stops impersonating an eyebrow).
**Why:** by view five the identical-but-not-quite header reads as generated, not edited.
**Where:** view fns; two new lede strings in `data/insights.json`.
**Risk:** lede copy must go through the un-ai-writing check; keep each under 160 chars.

### 12. Demote the system-detail summary from lede to body
**What:** on detail pages the record summary (often 200 words) renders as a 16px `--ink-2`
lede — the heaviest, grayest block on the page. Render it as `.detail-sum`: 15.5px,
`var(--ink)`, `max-width: var(--measure-body)`, `text-wrap: pretty`. `.lede` remains for
authored one-liners on index views.
**Why:** a lede is one to three lines; 14 gray lines is neither lede nor body.
**Where:** `VIEWS.system` + one CSS class.
**Risk:** none; verify the accent rule spacing after it.

### 13. Smart-quote pass over prose at build time
**What:** in `build_dashboard.py`, add a conservative curly-quote/apostrophe pass applied to
prose fields only (summaries, descriptions, notes, findings, essay, ledes, gaps, activity):
straight `'`/`"` → `’` `‘’` `“”` with standard pairing rules — **skipping** anything inside
backticks, and never touching `snippet.content`, URLs, or code-ish fields. Log a count of
replacements per build.
**Why:** the dataset's own `CAT_DEF` strings use proper quotes while the findings above the
fold use straight ones; on a report built on verbatim quotation, mismatched quote marks are
the most visible typographic tell there is.
**Where:** build script (single function, unit-tested inline with 5 asserted examples,
including a backtick-protected case and an apostrophe-in-contraction case).
**Risk:** false conversions inside prose that quotes code without backticks — the backtick
skip plus a `[A-Za-z]` adjacency requirement for apostrophes keeps this safe; review the
build's replacement log once.

---

## P2 — polish that compounds

### 14. Stat tiles: prose stops wearing mono; third lines share a baseline
**What:** `.tile .d` becomes sans 11.5px `--ink-3`; wrap actual commands in `<code>` (only
`npx skills add …` qualifies today). Baseline fix: `.tile { display: flex; flex-direction:
column } .tile .d { margin-top: auto; padding-top: 6px }` so all five third lines align
regardless of label wrapping. Fold in #31's stat alignment: tile 1's `.d` becomes
`+ 5 platforms · 168 affordances` (computed).
### 15. Platforms view: measure + jump links
**What:** summaries adopt `--measure-body` + `text-wrap: pretty` (no speculative paragraph
splitting — the data has no `\n\n`). Under the accent rule, add a jump row of the five
platform names reusing the `.spec-band li a` treatment linking to the existing card `id`s.
### 16. Snippet source links: owner/repo, not "source"
**What:** derive link text from `source_url`: for `github.com` / `raw.githubusercontent.com`,
path segments 1–2 (`shadcn-ui/ui`); otherwise the bare hostname (`ant.design`). Mono 10.5px,
keep position and ↗ + sr-only "(opens in new tab)". (Basename was prototyped and rejected:
62 of 257 snippet URLs end in `SKILL.md`, 26 more in `AGENTS.md` — the least discriminating
token in the URL.)
### 17. Filter empty state: say it once, offer a way back
**What:** `#syscount` (role=status) keeps the announcement. `#syslist` renders
`Nothing matches “<query>” at that maturity level.` (esc the query; wording adapts if only
one filter is active) plus a link-styled `<button>` "Clear filters" (accent underline-on-hover
— NOT `.chip`, NOT the square button chrome) that resets both controls, re-renders, and
returns focus to `#q`. Removes today's duplicated "No systems match." — the string is
emitted twice in the systems view, once per empty-state branch.
### 18. Gaps & platform-integration bodies get body treatment
**What:** stop rendering primary content as `.h2-sub` chrome — new `.body-block` (14px,
`--ink-2` → `--ink` for Gaps, `--measure-body`); `.h2-sub` reserved for actual subtitles.
### 19. Sources become a hairline list with real link anatomy
**What:** replace the truncated mono URL soup: one source per hairline row (the `.findings`
device, no numerals), rendered via `extLink()` with host in `--ink-3` + path in `--ink`,
wrapping allowed, ↗ restored. Remove the 64-char hard truncation.
### 20. One h2 size
**What:** unify h2 at 19px/650 (`.plat h2`, `.tech-cat .th h2` inherit; card-internal
"Capabilities" becomes a labeled h3). Verify heading order stays h1>h2>h3 on every view.
### 21. One count treatment
**What:** all counts beside headings/labels render sans tabular `--ink-3` (e.g.
`Affordances · 10` — drop the 9.5px chip-wrapped `<span class="chip">10</span>` in h2s;
`12 instances · 5 systems` restyles to match). Same family as #3's numbers and #5's band
counts — this is one decision, applied four places.
### 22. Anchor the rail foot
**What:** ≥861px: `.rail { display: flex; flex-direction: column } .rail-foot
{ margin-top: auto }` — the column reads designed instead of ran-out.
### 23. Authorship appears once per surface
**What:** cut the rail-foot "By Kaelig …" line (keep the stats line); keep the overview
byline (the editorially correct one) and the site footer attribution.
### 24. Print stylesheet finishes the job
**What:** in `@media print`: `:root { color-scheme: light only }` (dark-mode users currently
print a black page); `.snip pre { white-space: pre-wrap; overflow: visible }` (snippets are
currently guillotined at the paper edge); `break-inside: avoid` on `.aff`, `.tile`,
`.findings li`, `.tech-cat`; `a[href^="http"]::after { content: " (" attr(href) ")";
font-size: 9px; color: var(--ink-3) }` scoped to content areas (not the rail/footer).
The existing beforeprint details-expansion stays.
### 25. Trim the webfont request to the axes actually used
**What:** Hanken Grotesk `wght@550..700`; Source Sans 3 `wght@400..700`, drop the italic
axis (no italics on the site). Same fonts, same source, smaller and faster; artifact-CSP
fallback behavior unchanged. (Self-hosting was considered; keeping Google Fonts preserves
kaelig.fr parity — see C6.)
### 26. Theme toggle: state that doesn't lie
**What:** add `aria-pressed` reflecting dark state (update on toggle + initial load), keep
`aria-label="Toggle dark mode"`. The fixed circular placement STAYS (kaelig.fr signature —
see C5).

---

## P3 — hygiene

### 27. Chips 9.5→10px, letter-spacing .05em→.04em; then re-verify `table.mx th.sys`
width, the `.aff > summary` wrap at 375px, and expected pill height ≈19–20px. (The 110px
`.sysrow` chip track disappears with #3.)
### 28. `touch-action: manipulation` + `-webkit-tap-highlight-color: transparent` on
`a, button, summary` only (not `.scroller`, not `.rail nav`) — paired with
`.sysrow:active, .spec-band li a:active { background: var(--bg-sunk) }` so taps are never
silent.
### 29. `/` focuses the filter on /systems (guard `!e.target.closest('input,textarea,select')`,
`preventDefault`, focus `#q`); a subtle `<kbd>/</kbd>` hint sits right-aligned inside the
input (`aria-hidden`, hidden ≤860px).
### 30. `-webkit-line-clamp` gains the standard `line-clamp` companion property.
### 31. Surface the 168: og-image's "168 AI affordances" appears nowhere on the site — fold
the number into tile 1's detail line (see #14) so the social card's promise lands.
### 32. Response headers in `netlify.toml`: `Referrer-Policy: strict-origin-when-cross-origin`;
`Cache-Control: public, max-age=3600` for HTML, long-max-age immutable for `og-image.png` /
`favicon.svg` / `data.js` is NOT safe (data.js changes per build — give it the HTML policy);
CSP only if the app-script hash can be computed at build time in `build_dashboard.py`
(`default-src 'self'; script-src 'self' 'sha256-<computed>'; style-src 'self' 'unsafe-inline'
https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:`),
verified in-browser with zero console violations on every route — if the hash automation
fights the pipeline, ship the other headers and drop CSP rather than shipping a broken one.

---

## Considered, deliberately not changing

- **C1 — Icon + tooltip counts.** The shape was 12px stroke glyphs (grid = affordances,
  shield = techniques) plus a legend, a CSS tooltip, and sr-only sentences. A symbol that
  must be defined before first use is a cipher, not a symbol; it would be the site's second
  tooltip mechanism; and four subsystems to convey two integers is surface area without
  information. The column header + spelled mobile words (#3) carries the same meaning in the
  site's own voice: hairlines, uppercase labels, words.
- **C2 — Syntax highlighting in snippets.** No. Multi-language honesty, zero dependencies.
- **C3 — Max-height on tall snippets.** No — they already live inside collapsed `<details>`.
- **C4 — Numbered findings.** Keep; the accent `decimal-leading-zero` counter is the best
  editorial detail on the site.
- **C5 — Moving the theme toggle into the rail.** Keep the fixed circle: it is the one shared
  signature with kaelig.fr, and #26 fixes its real (state) problem.
- **C6 — Self-hosting fonts.** Optional future step; #25 removes most of the cost.
- **C7 — `.sysref` slate non-link names in techniques.** Keep — `--data-strong`'s one earned
  text role; `min-width: 110px` makes it read as a column.
- **C8 — Native `title` tooltips on matrix cells and maturity definitions.** Keep native;
  do not introduce a custom tooltip layer (see C1). The sr-only layer already carries the
  same content accessibly.

## Suggested execution order

Two passes: **A (structural):** 1, 2, 3, 4, 5, 6, 10, 11, 12 — these move markup and share
files; do them together, rebuild, screenshot-verify all views both themes at 1440/375.
**B (surface):** everything else — independent, low-conflict, verifiable per-directive.
Re-run the full build + browser sweep after each pass; the shipped a11y tree (matrix caption,
rowheaders, sr-only cells, status regions) is the regression baseline.
