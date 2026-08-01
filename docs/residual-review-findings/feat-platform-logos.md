# Residual review findings — feat/platform-logos

Accepted by Kaelig on 2026-08-01 at the review gate for the platform-logos merge
(review run 20260801-001110-d3eea1a1; six reviewers — correctness, security,
adversarial, project-standards, testing, api-contract).

Most of that review shipped with the branch. The gate was rewritten to reject
the attributes the extraction depends on rather than the ones it discards, after
the adversarial pass reproduced three ways to pass it and still ship a wrong
mark; a logo value naming `../` or an absolute path is now refused; the vendored
README was corrected to describe the contract the code actually enforces;
`AGENTS.md` gained the second vendored directory; and the gate's failure modes
went from hand-demonstrated to sixteen tests. What follows stayed open.

## Schemas are published with no stability note (P2, api-contract)

`schema/platform.schema.json` is served at `/data/platform.schema.json` and named
on `/about/schema.md` as the schema for `/data/platforms.json`. Adding `logo` to
`required` means anyone validating a cached copy of the data against a freshly
fetched schema now fails on records that were valid last week. No schema in
`schema/` carries a version, the four `$id` values are unversioned nouns, and the
only stability disclaimer the site publishes is scoped explicitly to the MCP
tools.

Decision: keep as is. The failure is loud rather than silent, and the report has
never promised its schemas hold still. If it starts to matter, the cheap fix is
one sentence in `schema_md()` saying the schemas track the study rather than a
release cycle, so fetch a schema and its data from the same deploy.

## `get_platform` still says it returns "one whole record" (P3, api-contract)

`logo` is the first authored platform field the MCP allowlist drops, so the
start-here prompt in `netlify/functions/mcp.mjs` is now slightly untrue: an agent
can read `/about/schema.md` through `get_report('schema')`, learn that platforms
have a `logo`, call `get_platform`, and not find one. Keeping the field out of
the tool is the settled decision (KTD7); the wording is what drifted.

Decision: keep as is for now. The fix is to stop promising byte-completeness —
"the full research record for one entry" instead of "one whole record" — and it
belongs with whatever next touches that prompt.

## Nothing checks the platform enum against the platform records (P3, adversarial)

`logoIcon(p.platform)` on a system page is keyed by
`platform_integrations[].platform`, whose enum lives in
`schema/design-system.schema.json`; `LOGO_PATHS` is keyed by `id` in
`data/platforms.json`. Nothing asserts the first set is a subset of the second,
and they already diverge — `penpot` is a record but not an enum value. Add a
seventh enum value or rename a platform id and every system page loses that mark
while `platLabel()` falls back to the raw id, so the text still reads correctly:
green build, no signal.

Decision: keep as is. The plan already defers the `penpot` enum gap as its own
one-file fix, and this guard belongs with it rather than ahead of it. The shape
is a set difference in `resolve_logos()` — read the enum, fault on
`set(enum) - {'other'} - {p['id'] for p in platforms}` — in the same
one-report-per-build form `validate_urls()` already uses.

## `logo` reaches the published dataset (P2, project-standards)

`/data/platforms.json` and `/platforms/<id>.json` serialize each record verbatim,
so they now carry `{"source": "vendored", "value": "supernova.svg"}` — a pointer
to a build input in a file whose every other field is a sourced claim, naming a
file no published surface serves.

Not reopened: the plan's Scope Boundaries settle exactly this, and deliberately.
The resolved geometry is what is kept off the records; the declarative field
rides along because the twins are a verbatim serialization, and `/about/schema.md`
documents it rather than leaving it to be inferred. Recorded because a reviewer
reading `AGENTS.md`'s "publish the report, not the making of it" will land on it
again.

## Smaller notes from the same review

- `jumpList()`'s `i.icon` is interpolated without `esc()`. Correctness cleared
  it — the only caller passes `logoIcon(p.id)`, and `_PATH_D` captures `[^"]*`
  so no quote can escape the attribute — but the safety lives at the call site
  rather than in the signature, and passing an id instead of markup would move
  it back into the helper. It is not the precedent it first looked like, though:
  `extLink(url, text)` has taken a trusted-HTML parameter since long before this
  change, and says so on the line above itself.
- `logoIcon(p.id)` runs twice per platform on a `/platforms` render, once for
  the chip and once for the heading. Six platforms and an object lookup; noted
  and declined.
- `resolve_logos()` repeats the collect-faults-print-exit shape of
  `validate_urls()`, which its own comment names as the precedent. Extracting a
  shared `_fail()` was considered and declined twice on the same grounds: the
  tuple shapes differ, and each block is about four lines.
- `simple-icons` went into `dependencies` rather than `devDependencies` even
  though only the build reads it. That matches `ajv` and contradicts
  `@resvg/resvg-wasm`; the repo has no stated convention either way.
- `AGENTS.md`, `CONTRIBUTING.md`, `docs/architecture.md` and the top-level
  description in `schema/platform.schema.json` all still say five platforms.
  Pre-existing since the Penpot record landed, and already on the plan's
  follow-up list.
- The three new CSS rules use 7px and 9px gaps, off the 6/10/12px rhythm
  `DESIGN.md` describes as house style for dense UI. No documented rule to cite.
