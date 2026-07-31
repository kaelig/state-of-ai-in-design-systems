---
title: 'feat: Draw the social card from the records'
date: 2026-07-28
status: design
supersedes: none
---

# feat: Draw the social card from the records

## Summary

The Open Graph card becomes generated output. `scripts/build.sh` renders it from
the same `compute_counts()` dict the prose reads, writes it under a
content-hashed filename, and puts that filename in the `og:image` and
`twitter:image` tags. `dashboard/og-image.png` stops being a tracked binary and
`scripts/og-image.html` is deleted.

## Problem

The published card says `19 systems · 5 platforms · 168 AI affordances · 148 coercion techniques`. <!-- counts-ok: the card's wrong numbers are the problem being described -->
Its own source, `scripts/og-image.html`, says `20 · 5 · 178
· 157`. The records say `20 · 5 · 179 · 157`. Two separate drifts have stacked:
the PNG was never re-rendered after the source was corrected, and the source has
since fallen a count behind.

This is the one artifact the repository's central rule does not reach. Counts are
computed and never typed, and `scripts/check_hand_counts.py` enforces that well
enough to have already flagged `og-image.html:79 '178 AI affordances' (computed
affordances=179)`. But it reads text, and no check in the repository can read a
PNG. The wrong numbers survived the commit that renamed everything else to 20
because nothing was able to look at them.

So the defect is not the number. It is that the card has no feedback loop, and
the corpus is expected to keep growing. Correcting the PNG by hand re-arms the
same trap for the next record that lands.

There is a second failure the same change removes. `scripts/og-image.html` pulls
Hanken Grotesk from Google Fonts, so the screenshot step races the font load. A
capture taken a moment early ships a card set in a fallback face, and, as with
the counts, nothing would catch it.

## Approach

Generate the card at build time and address it by content hash.

Two alternatives were considered. An edge function using `og_edge` is the
approach Netlify documents and the one that first suggests itself, but it buys
nothing here: `data/*.json` moves only through a commit, Netlify runs
`./scripts/build.sh` on every deploy, and there is no write path that changes the
records without a build. It also loses on caching. Social crawlers key their
caches by URL and `netlify.toml` serves the card `immutable` for a year, so a
dynamic image at a fixed URL stays wrong in every cache that has already seen it.
The edge function would still need the build to emit a versioned URL, which is
the whole of the build-time approach plus a renderer at the edge.

Stamping the counts the PNG was rendered from and failing `npm run check` on
disagreement is cheaper and adds no dependency, but leaves a manual re-render on
the path of every new record. It is subsumed by this design: the assertions below
give the same guarantee without the manual step.

## Architecture

`build.sh` gains one step between the existing steps 2 and 3.

`build_dashboard.py` already writes `build/payload.json` with a `counts` block on
its first pass. A new `scripts/build_og.mjs` reads the four counts it needs from
there, builds the card as SVG, rasterizes it with `@resvg/resvg-wasm`, hashes the
PNG bytes, and writes `dashboard/og-image-<hash8>.png` alongside
`build/og-image.json` naming the file it wrote.

`build_dashboard.py --final` then substitutes that filename into the `og:image`
and `twitter:image` tags as it writes both shells. There is exactly one place to
do this: `build_dashboard.py` reads `template.html` once at line 575 and writes
`index.html` and `artifact.html` from it, and `prerender.mjs` reads
`dashboard/index.html` as the shell for all 27 routes. Every route inherits the
substitution from that single edit.

The existing two-pass shape of the build is what makes the ordering work. The
counts exist after pass one, the image is rendered against them, and pass two
picks up the filename. No new sequencing is introduced.

### The card

Only the stats line varies. The eyebrow, the title, the rule and the byline are
fixed, so the title's two lines are written as two literal lines rather than
wrapped by a layout engine. Colors carry over from `scripts/og-image.html`
unchanged, so the published card differs from today's only in its numbers.

### The font

Hanken Grotesk ships in the repository as a variable WOFF2 under `assets/fonts/`,
with `OFL.txt` beside it. `@resvg/resvg-wasm` loads WOFF2 through `fontBuffers`,
so no conversion step is needed and the variable file covers the three weights
the card uses without weight-matching logic in the generator.

Vendoring rather than fetching is what makes the render deterministic: the build
stops depending on `fonts.gstatic.com` being reachable, and an upstream revision
of the font can no longer reflow the card with no commit behind it. Rasterizing
text into a PNG does not distribute the font, so nothing the site publishes
carries an OFL obligation. Committing the file does, and `OFL.txt` satisfies it.
It scopes to that one asset the way `LICENSE-DATA` scopes to `data/`, and leaves
the repository's split between MIT code and CC BY 4.0 data alone.

## Guards

`20 systems · 5 platforms · 179 AI affordances · 157 coercion techniques` at 26px <!-- counts-ok: the card spec as designed on 2026-07-28; the card reads live counts at build -->
leaves modest headroom in the 1040px content box. The generator measures the
rendered stats line and fails the build when it exceeds the box, so a fourth
digit or a longer noun cannot silently clip. Whether the measurement comes from
resvg's bounding box or from summing advance widths out of the font is an
implementation detail to settle during the plan; the guard is not optional either
way.

Three assertions replace the manual re-render, none of which needs to read
pixels:

- the generated SVG source contains the computed counts
- the PNG is 1200 by 630
- the `og:image` URL in the prerendered HTML names a file present on disk

The third is the one that matters. It makes a card that disagrees with the
records unbuildable, because the records are what draw it.

## File changes

| Path                                     | Change                                                    |
| ---------------------------------------- | --------------------------------------------------------- |
| `scripts/build_og.mjs`                   | New. SVG, rasterize, hash, write.                         |
| `scripts/build.sh`                       | One step between 2 and 3.                                 |
| `scripts/build_dashboard.py`             | Substitute the card filename into both shells.            |
| `scripts/og-image.html`                  | Deleted.                                                  |
| `dashboard/og-image.png`                 | `git rm`. Generated and hashed from here on.              |
| `assets/fonts/`                          | New. Variable WOFF2 and `OFL.txt`.                        |
| `.gitignore`                             | `dashboard/og-image-*.png`.                               |
| `netlify.toml`                           | Immutable header moves to `/og-image-*.png`.              |
| `package.json`                           | `@resvg/resvg-wasm` in devDependencies.                   |
| `AGENTS.md`, `CONTRIBUTING.md`           | Three tracked source files under `dashboard/` become two. |
| `.claude/commands/system/audit-prose.md` | Manual screenshot procedure deleted.                      |
| `.claude/commands/system/ship.md`        | Card removed from the commit file list.                   |

Stale hashed PNGs are swept from `dashboard/` on each build, the way
`prerender.mjs` already sweeps routes.

## Out of scope

`check_hand_counts.py` reports stale counts in `README.md`, `LICENSE-DATA`, two
issue templates, `docs/design-audit.md` and `docs/semantic-audit.md`, including
`README.md:14 '178 affordances'`. Those are a prose resync and belong to
`/system:audit-prose`, not to this change. This design removes only the card from
that sweep's reach, by making the card uncountable by hand.

The card's visual design is unchanged. Reworking it is a separate question.

## Risks

The measurement API for the layout guard is unverified. If `@resvg/resvg-wasm`
does not expose a usable bounding box, the fallback is to sum advance widths from
the font, which is more code but no less exact for a single line of text.

Adding a build dependency to a repository whose prerenderer states "No
dependencies" is a real cost. It is accepted because the alternative is a
published artifact no check can read, and because the dependency is confined to
the build and never reaches the site or the edge.
