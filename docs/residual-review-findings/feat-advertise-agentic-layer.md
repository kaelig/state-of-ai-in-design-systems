# Residual review findings — advertise the agentic layer

Nine reviewers read the branch. Everything actionable landed in `bf60ceb`; what
follows is what was found and deliberately left, so the next person does not
have to rediscover it. Run artifacts: `/tmp/compound-engineering-501/ce-code-review/20260804-130419-7218482e/`.

## Left undone on purpose

- **P2 — nothing in CI executes `setupConfigTabs()` or `setupPageActions()`.**
  `prerender.mjs` calls the view functions directly, so it never goes through
  `route()`, and the one `route()` call baked into the app script fires against
  `/` and never `/ai`. The tab strip's click, keyboard and roving-tabindex code
  therefore runs zero times in `npm run check` — not even a did-not-throw check.
  The cheap fix stays inside the house pattern: expose the function off the
  sandbox the way `askPrompt` and `esc` already are, and drive it through the
  existing `makeEl()` shim. Left out because it is new verification rather than
  a defect fix, and the branch was already carrying a lot.

- **P2 — `dashboard/template.html` is 2388 lines and nothing lints it.** It grew
  by roughly 560 on this branch alone, and it is excluded from eslint, prettier
  and the dead-code pass, so dead selectors and unreachable branches ship
  silently. The build already isolates `<script id="app">` as a textual unit,
  which makes extracting it to a linted source file concrete and low-risk. Real
  work, its own change.

- **P2 — the install-URL encoding has no assertion.** The Cursor and VS Code
  links were decoded by hand and both round-trip, but nothing in the repo
  decodes them and checks the config object. A `prerender.mjs` guard could, and
  the encoding order (base64 then url-encode) is the documented way to get this
  wrong.

- **P3 — one `#copy-status` region, one `say()`.** Two overlapping operations
  can still overwrite each other's announcement. Mostly defused by the
  `isConnected` guard and the shared page-copy flag, but a snippet copy during a
  page copy remains possible.

## Notes for whoever touches this next

- The prompt text lives in two files on purpose: `askPrompt()` in
  `dashboard/template.html` and the literal in `scripts/prerender.mjs`. That is
  the guard. Changing one without the other fails the build, which is the point.
- The `?q=` links and the clipboard both carry `ASK_QUOTE_NOTE`. A third way of
  handing a page to an assistant should carry it too.
- `PA_ICON_PATHS` duplicates two glyphs from `NAV_ICON_PATHS`. They match by
  coincidence, not because they are the same thing, and sharing them would make
  redrawing a nav glyph silently redraw a menu row.

## Open product question

`AE1` in the plan promises a visitor "the single action to take". That is true
for Cursor, VS Code and Claude Code, and false for claude.ai and ChatGPT, whose
honest instruction is a short settings path — and claude.ai is the default-open
tab. The build implements it as one *instruction*, not one *click*. The
acceptance example was left as the brainstorm settled it rather than rewritten
to match the implementation.
