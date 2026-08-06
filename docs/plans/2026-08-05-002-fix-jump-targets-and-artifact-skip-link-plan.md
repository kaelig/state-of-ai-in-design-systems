---
title: "fix: Make every jump target land the same way"
date: 2026-08-05
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
depth: standard
---

# fix: Make every jump target land the same way

## Goal capsule

Three small, independent defects left over from `f1d8151`, which gave jump links
a copyable URL. Each one is a place
where a reader arrives at a section and gets less than the arrival is supposed
to give them: focus that does not follow, a skip link that changes the page, and
a build that would fail with the wrong error message if any of this moved.

None of them blocks anything. They are grouped because they share one idea —
**every jump target lands the same way** — and because two of them are a single
attribute.

---

## Problem frame

`jumpTo()` (`dashboard/template.html:2701`) is now the one place a reader is put
on a section: it scrolls with the clearance `scroll-margin-top` declares, and it
focuses the target so the next Tab starts from the section rather than the top of
the page. Click, Back/Forward and cold load all go through it.

That contract holds everywhere except three seams.

**1. The `.tech-cat` sections cannot take focus.** `.jump-sec` and `.plat` both
carry `tabindex="-1"`. `.tech-cat` (`dashboard/template.html:2019`) does not,
even though it carries the same `scroll-margin-top` (line 1023) and is the target
of every prevalence bar link on `/techniques` and of any `/techniques#<category>`
URL. `focus()` on it is a silent no-op, so the scroll moves and the focus does
not — the next Tab sends a keyboard reader back to the top of the document. This
is the exact failure `jumpTo()` exists to prevent, surviving on the one route
that never used a `.jump` pill list.

**2. Skip to content is broken in the artifact.** *Verified in Chrome against
`dashboard/artifact.html#/insights`: clicking Skip to content navigated to
`#main` and rendered the **overview** — the `<h1>` changed from "Similarities,
differences, and what actually predicts…" to "How design systems talk to
machines".*

The skip link (`dashboard/template.html:1251`) has no `data-jump`, so the
delegated handler never claims it and the browser navigates the hash. In the
artifact the hash is the route: `hashchange` fires, `parse()` reads `main`, finds
no such key in `VIEWS`, and falls back to `overview`. The one link whose entire
job is getting a keyboard user to the content instead moves them to a different
page. Path mode is unaffected — `#main` there is an ordinary in-page anchor and
has always worked.

**3. The prerender sandbox would fail with the wrong error.**
`scripts/prerender.mjs:78` — `el(key)` mints a stub via `makeEl()` for *any* id,
so `document.getElementById` there never returns null. `makeEl()`
(`scripts/prerender.mjs:48-77`) has `focus()` but no `scrollIntoView`. The path
build runs in that sandbox, so `jumpTo()`'s `ROUTING === 'path'` guard passes;
the only thing keeping `./scripts/build.sh` green is `location.hash` being `''`
at `scripts/prerender.mjs:93`, which makes `id && …` short-circuit before the
lookup. That is true today and the build is green. It is also one line of
`prerender.mjs` away from a `TypeError` naming `jumpTo` and not the reason.

---

## Requirements

- **R1.** A jump to a `.tech-cat` section moves focus, like a jump to any other
  target.
- **R2.** Skip to content keeps the reader on the page they are on, in both
  builds, and behaves identically to today on the site.
- **R3.** The prerender sandbox tolerates `scrollIntoView` whether or not
  anything calls it.
- **R4.** No change to the site's rendered output beyond R1 and R2. The markdown
  mirrors, the JSON twins and the MCP surface are untouched — none of this
  reaches `build_md.py`.
- **R5.** Comments that describe the old behavior are corrected in the same
  change, not left to be believed later.

---

## Key technical decisions

**KTD1. One attribute per fix, not a new mechanism.** Both site-side fixes are
one attribute on existing markup. `tabindex="-1"` is what the other two target
classes already use; `data-jump` is what the existing delegated handler already
claims. Rejected: teaching `jumpTo()` to set `tabindex` at runtime — it would
work, and it would put the reason for the attribute somewhere nobody looks when
reading the markup.

**KTD2. `data-jump` on the skip link, rather than special-casing `#main` in the
hash router.** The router could learn that `main` is not a view, but then every
future in-page anchor needs the same exemption. Routing the skip link through the
handler that already exists to answer "this hash is not a route" puts it with its
own kind. The `href="#main"` stays, so the link still works before the script has
run and if it never runs at all.

**KTD3. Fix the sandbox, not the caller.** `jumpTo()` could guard its
`scrollIntoView` call, but the sandbox is what is lying — a `getElementById` that
never returns null is already the sharp edge, and a shim missing a method the app
calls is a gap in the shim. Adding the no-op keeps the guard out of production
code that has no reason to carry it.

---

## Implementation units

Independent. Any subset ships on its own.

### U1. Let a `.tech-cat` section take focus

`dashboard/template.html:2019`, in `VIEWS.techniques`:

```diff
-      ${order.map(c => `<section class="tech-cat" id="${esc(c)}">
+      ${order.map(c => `<section class="tech-cat" id="${esc(c)}" tabindex="-1">
```

Do **not** touch `dashboard/template.html:1994`, the `<div class="tech-cat">` on
system pages: it has no id and is not a jump target.

U1 falsifies the last sentence of `jumpTo()`'s comment
(`dashboard/template.html:2707-2708`), which currently explains why `.tech-cat`
is an exception. Replace:

```
   not. Elements without tabindex="-1" (the .tech-cat sections) still scroll;
   focus() on them is a no-op rather than an error.
```

with:

```
   not. Every id it is called with sits on a section carrying tabindex="-1" —
   .jump-sec, .plat, .tech-cat — so the focus lands rather than quietly doing
   nothing. An element without one would still scroll; focus() on it is a no-op
   rather than an error.
```

### U2. Route the skip link through the jump handler

`dashboard/template.html:1251`:

```diff
-<a class="skip" href="#main">Skip to content</a>
+<!-- data-jump is what makes this work in the single-file artifact, where the
+     hash is the route: an unclaimed jump to #main is parsed as a request for a
+     view that does not exist, and answered by rendering the overview. On the
+     site the handler writes the same "#main" the browser would have, so nothing
+     about this link changes there. The href stays either way, so the link still
+     works before the script has run and if it never runs at all. -->
+<a class="skip" href="#main" data-jump="main">Skip to content</a>
```

Preconditions already met, no further change needed: `#main` carries
`tabindex="-1"` (line 1269), `#main:focus { outline: none }` (line 147) already
suppresses the ring, and `#main` is in the static shell of every prerendered
file, so the handler's `if (!document.getElementById(id)) return` bail passes.

U2 makes the hash router's comment (`dashboard/template.html:2592-2593`) doubly
wrong: it cites `#systems` and "the stat tiles", and nothing has linked to
`#systems` since the matrix moved to the overview. Replace the first sentence:

```
  /* Only "#/"-prefixed hashes are routes. A plain "#main" is an in-page anchor —
     the skip link is one — and re-rendering on it would answer "skip to the
     content" by replacing the content. The one time a plain anchor still routes
     is when back/forward lands it on a different view than the one on screen:
     the anchor's scroll is lost, but the page is right. */
```

### U3. Give the prerender shim a `scrollIntoView`

`scripts/prerender.mjs`, in `makeEl()` (lines 48-77), beside `focus()`:

```diff
     focus() {},
+    scrollIntoView() {},
```

The shim's header comment says "enough for the app's five DOM touch points"
(line 46) — count what it is actually standing in for and correct the number if
it has moved.

---

## Scope boundaries

**In:** the two attributes, the shim method, and the three comments that describe
behavior the change alters.

**Out:**
- `history.scrollRestoration = 'manual'`. Considered and dropped: Back landed at
  the top of the page in all three verification runs on 5 Aug, so there is no
  observation to justify it, and it would also disable restoration for
  cross-route Back.
- Any second axis in `parse()` to give the artifact copyable section links. The
  artifact's value is being one portable file; a hash that means something only
  inside that file is not worth a routing change.
- The `.bar-link` anchors' own markup. They are native and correct; U1 is what
  they were missing.

---

## Risks

**A section that can take focus can be tabbed into differently.** `tabindex="-1"`
is not reachable by Tab — it only makes the element a valid `focus()` target — so
U1 adds no new tab stop. This is the same attribute `.jump-sec` and `.plat` have
carried since the jump lists shipped.

**U2 changes which code path the skip link takes on the site.** The observable
result should be identical (same URL, same history entry, same scroll, same
focus), but it is now the app's code doing it rather than the browser's. V2 below
is what catches a difference.

---

## Verification contract

`./scripts/build.sh`, then a server that resolves clean URLs — `netlify serve`.
`file://` will not exercise path routing.

- **V1 (U1).** `/techniques` → click a prevalence bar → the category section is
  at the top of the viewport, and Tab moves to the first link *inside* it, not to
  the top of the page. Then reload `/techniques#curated-context` and check the
  same thing on a cold load.
- **V2 (U2, site).** On any route, Tab once from the top and press Enter on Skip
  to content. URL reads `#main`, focus is on `<main>`, no focus ring, page
  unchanged. Press Back: the hash clears and focus returns to `#main`.
- **V3 (U2, artifact).** Open `dashboard/artifact.html`, go to `#/insights`, and
  activate Skip to content. The `<h1>` must still read "Similarities,
  differences, …" and the hash must still be `#/insights`. **This is the
  regression test — it currently renders the overview.**
- **V4 (no regression).** Re-run the checks from `f1d8151`: click a jump pill →
  hash in the URL; copy that URL into a fresh tab → lands on the section; Back
  out of a jump with two `<details>` open on `/platforms` → they are still open.
- **V5 (U3).** `npm run check`. The step that matters is prerender, which runs
  the whole app script in the sandbox. To prove U3 rather than assume it,
  temporarily set `hash: '#findings'` at `scripts/prerender.mjs:93`, confirm the
  build survives, and put it back.
- **V6.** Console clean on every route, both themes, both builds.

## Definition of done

- V1-V6 pass.
- `npm run check` green.
- `git status` shows only `dashboard/template.html` and `scripts/prerender.mjs`
  modified — the `dashboard/` build output is gitignored and must not be staged.
- No comment left in the file describes behavior the change removed.
