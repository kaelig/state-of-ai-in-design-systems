# Residual review findings — syntax highlighting in snippets

Seven reviewers over the branch that shipped `highlightCode()` (base `f109233`).
The findings that mattered were applied in `899713c`; these are what was left,
each with the reason. Recorded because a residual nobody wrote down is a
residual nobody revisits.

The cross-model adversarial pass was **not** run: the user prohibited external
review for this change, so the adversarial lens ran in-process instead. That is
a real loss of independence and it is why the adversarial findings that did land
were verified by re-running their mutations here rather than taken on trust.

## Not applied, on purpose

- **P2 — `unwrap()` in `tests/highlight.test.mjs` and `unhl()` in
  `scripts/prerender.mjs` still duplicate each other.** `unhl` now delegates to
  the `htmlUnesc` that already existed in that file, which was the real
  duplication. What is left is the test's own copy. Extracting a shared module
  would add a file, a `.fallowrc.jsonc` entry, and an import from a build script
  into shared code, to deduplicate nine lines that a direct test now pins
  (`the round-trip helper decodes entities in the right order`). Revisit if a
  third copy appears.

- **P3 — the `html` and `css` grammars match zero corpus snippets today.** They
  are forward provisioning, and a design-systems corpus will plausibly grow CSS
  and HTML snippets. The honesty problem was in the prose implying they were
  load-bearing; AGENTS.md now says they have no records yet. Both are exercised
  by build-time probes and tests, so they cannot rot silently.

- **P3 — the markdown heading rule still runs inside fenced blocks.** A `#`
  opening a line inside a fenced shell block reads as a heading. One snippet in
  the corpus hits it. Fixing it needs the scanner to carry fence state, which
  makes it a parser; the comment at the rule now says so rather than claiming
  fenced content is untouched.

- **P3 — the grammar count `seven` is written in AGENTS.md and the design audit,
  and enforced only by `tests/highlight.test.mjs`.** An eighth grammar fails
  that assertion, which forces the conversation; the prose then gets updated in
  the same change. A second check on prose would cost more than it saves.

## Not applied, still open

- **P2 — punctuation is asserted by class for `json`, `ts` and `markdown` only.**
  `yaml`, `shell`, `html` and `css` prove their `hl-p` rule through round-trip
  and the build's per-grammar class check, not through a targeted assertion.
  Worth closing next time this file is touched.

- **Residual — synthesized oblique may change tab stops.** `font-style: italic`
  on `.hl-c` has no italic face in the monospace stack, so browsers synthesize
  it, and the skew can push ink past the glyph's advance. A snippet whose
  longest line is a comment sitting within a pixel of the container could gain
  or lose its `tabindex` between browsers. Too small and too browser-dependent
  to chase; recorded because the comment in `route()` states the metrics are
  unchanged, which is true of advance width and not quite true of ink.

- **Residual — CRLF would make the build guard and the browser disagree.** The
  guard tokenizes `sn.content` straight from JSON; the browser tokenizes
  `code.textContent` after the HTML parser has seen it. No corpus snippet
  contains a CR today, so the two agree. A snippet authored with CRLF would
  diverge and nothing would notice.

- **Residual — the `--bg-sunk` literal in `check_contrast.js` is now read back,
  but `.snip`'s `background: var(--bg-sunk)` binding is not.** Moving the
  snippet ground to a different token would invalidate all ten syntax ratios
  while the check stayed green. The four `hl-` role bindings are covered; this
  one is not, because the declaration it would match is a long single-line rule
  that changes for unrelated reasons.

## Verified, no action

Security could not construct an XSS through the new `innerHTML` sink and tried
hard: 420,000 fuzzed strings across all seven grammars, plus a demonstration
that `esc()` is a homomorphism over concatenation, which is why escaping each
token separately is byte-identical to escaping the whole source. Prototype-chain
probes against the alias lookup (`constructor`, `__proto__`, `toString`, …) all
fall through to plain escaped output. The `cls` interpolation is unescaped but
every value is a literal in `HL_RULES`, and a test now asserts that set is
closed.

Performance measured the whole `/techniques` corpus — 157 snippets, 106KB — at
10.7ms of tokenizing, with the largest snippet in the entire corpus at 1.5KB.
The inlined app script grew about 10%.
