---
description: Resync every hand-typed count and date and re-check every comparative claim after the record set changed
argument-hint: <system-id>
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(python3:*), Bash(./scripts/build.sh:*), Bash(git:*)
---

Resync the derived numbers and audit the written analysis for **$1**.

Adding a record changes the totals the whole report quotes. About a dozen places
type those totals by hand. Separately, the analysis contains enumerations and
superlatives that a new record can quietly falsify.

Run this after `/system:verify`, never before. If the record changes afterwards,
run it again in full: the totals move a second time, and a resync that was
correct an hour ago is now a version behind. That double resync is the step that
has actually been got wrong.

## 1. Build once, and read the numbers off a script rather than the log

```sh
./scripts/build.sh > /tmp/build-$1.log 2>&1; echo "exit=$?"
```

Confirm `exit=0`. The log prints a `meta={...}` line twice, neither at the end,
and it omits two of the nine count keys. It is not the source of truth.

```sh
python3 scripts/check_hand_counts.py --all > /tmp/counts-$1.log 2>&1; echo "exit=$?"
```

The first line of that output is the authority: all nine counts, computed from
the records with the build's own `compute_counts()`.

## 2. Fix what the sweep found

`check_hand_counts.py` reads every tracked file as bytes and matches over the
whole file with newlines flattened, so it sees counts that a line-at-a-time grep
misses (AGENTS.md wraps "how 20" / "open-source design systems") and files that a
filtered grep skips (`scripts/prerender.mjs` is binary to `file(1)`,
`LICENSE-DATA` has no extension).

The output has three sections:

- **counts that state the size of the study and disagree with the records** — fix every one.
- **other numbers next to those words** — mostly local counts that are none of your business. Read each. If a number is deliberately local or historical, put `counts-ok` in a comment on that line and it stops being reported.
- **snapshot dates that disagree with the window** — the window is defined once, in `SNAPSHOT` at the top of `scripts/check_hand_counts.py`. If the research window actually moved, change it there first; everything else quotes it.

Places the sweep habitually finds, so you know what you are editing:
`dashboard/template.html` (four duplicate meta descriptions), the `VIEW_TITLES`
descriptions in `scripts/build_dashboard.py`, the `/systems.md` label in
`scripts/build_md.py`, the doc-set description in `netlify/functions/mcp.mjs`,
`README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `LICENSE-DATA`,
`.github/ISSUE_TEMPLATE/*.yml`, and the two audits under `docs/`.
Trust the sweep over this list. There is no count in the `.rail-foot` sidebar
line, whatever an earlier version of this command said.

In `data/insights.json`, do not type the number. Write a placeholder:
`{systems}`, `{systems:word}`, `{systems:Word}`, and the same for `platforms`,
`affordances`, `techniques`, `official_mcp`, `official_skills`, `llms_txt`,
`technique_categories`, `ai_native`. `resolve_counts()` fills them before
anything renders, and the build fails on an unknown key or an unfilled
placeholder, so a typo cannot reach the page.

If the sweep reports that `compute_counts()` counts an affordance marked
`"present": false` as present, stop and run `/system:correct`. Until that is
fixed, every count of what systems publish is one too high for each documented
absence, and there is no honest way to write the sentence.

## 3. Audit the comparative prose

```sh
python3 scripts/check_prose_claims.py > /tmp/prose-$1.log 2>&1; echo "exit=$?"
```

It sweeps `data/insights.json`, both build scripts, `dashboard/template.html`,
`netlify/functions/mcp.mjs` and `README.md` for the sentence shapes whose truth
depends on the record set, and prints the facts to check them against: who has
each affordance type and who does not, who ships an official MCP server and an
official skill (with the same `Planned ...` exclusion the build applies), the
maturity split, the technique-category counts.

Go sentence by sentence:

- An enumeration ("Only X, Y and Z lack one") is mechanically checkable. Diff the named set against the WITHOUT list. If they differ, the sentence is false: rewrite it with the real set, or replace the enumeration with a placeholder count.
- A superlative ("the deepest in the study", "the largest consumer set") is checkable by inspection. Go and look at the new record. If it ties or beats the incumbent, the sentence is false.
- A proportion ("a third of the study rather than a handful") moves with the denominator. Recount it.
- A claim about a named system that the new record now also satisfies stops being a distinction. Name both, or drop the framing.
- A hit that is about somebody else ("the only browser that ships it") is noise. Leave it.

When every sentence has been read against the facts:

```sh
python3 scripts/check_prose_claims.py --stamp .work/$1/prose.json
```

The stamp binds those sentences to a fingerprint of `data/design-systems.json`
and `data/insights.json`. Revise the record afterwards and the stamp goes stale,
which is correct: the sentences were true about a different corpus.
`/system:ship` refuses to commit against a stale one.

## 4. Rebuild and stamp

Steps 2 and 3 edited generator sources and prose, and the first build predates
them. The build also redraws the social card: `scripts/build_og.mjs` reads the
same counts you have been resyncing, so the card is not yours to correct and
there is no screenshot to take.

```sh
./scripts/build.sh > /tmp/build-$1.log 2>&1; echo "exit=$?"
```

```sh
python3 scripts/check_hand_counts.py --stamp .work/$1/counts.json
```

The stamp records the counts and a fingerprint of `data/*.json`. `/system:ship`
verifies it and refuses to commit if the data moved afterwards, which is exactly
the case where every number you just fixed is stale again.

`dashboard/llms.txt` has a hard 16384-byte limit in
`scripts/check_md_layer.py`, and each record costs roughly 140 bytes of index
line. If the build fails on that limit, it is the size budget talking, not your
record.

## Do not

- Do not type a count into `data/insights.json`. Use a placeholder.
- Do not update a number without rebuilding first and reading it off `check_hand_counts.py`.
- Do not "fix" the two audit documents under `docs/` by rewriting a figure that is deliberately quoted as history. Mark those lines `counts-ok`.
- Do not leave a superlative you did not re-check. It is now the report's oldest lie.
- Do not stamp the prose review before reading the sentences.
- Do not commit here.

## Report

Print the nine computed counts, every file you edited with the old and new
number, every comparative sentence you changed and why, and
`next: /system:ship $1`.
