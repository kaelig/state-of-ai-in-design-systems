# Residual review findings — refactor/matrix-becomes-systems

Accepted by Kaelig on 2026-07-31 at the review gate for the matrix-becomes-systems
merge (review run 20260731-085530-2c3c69ce; findings #1 and #2 were applied and
shipped with the branch).

## #3 (P2, advisory) — unknown paths soft-serve the overview to JS visitors

`parse()` in `dashboard/template.html` falls back to `{ view: 'overview' }` for
any unknown top-level segment, and `route()` runs on the served 404 page — so a
JS-enabled visitor following an old `/matrix` link gets the overview rendered
over the 404 body, and the `/#/matrix` hash form serves the overview at a clean
200 while the shim rewrites the address bar to the dead path. The HTTP layer
still returns 404 for `/matrix` itself.

This is pre-existing behavior shared by every unknown URL, not something the
merge introduced; the merge just gave it a route people may actually have
bookmarked. Decision: keep the behavior, record the finding. Revisit if honest
in-page 404s start to matter — the fix is routing unknown segments to a
not-found rendering in `parse()` and sending unknown hash forms to `/` instead
of `'/' + p`.

## Follow-ups noted by the same review (not defects in this change)

- `techniques.md` and `about/schema.md` tables share the blank-line emission
  pattern fixed for `systems.md` — same one-block fix applies if their strict-GFM
  parseability ever matters.
- `check_hand_counts.py` has no `routes` keyword, so hand-typed route counts
  (README, netlify.toml) have no staleness check.
- The MCP `resources/read` path (`dsai://report/{section}`) has its own section
  lookup and error wording, untested for retired sections; the `get_report` tool
  path is covered.
