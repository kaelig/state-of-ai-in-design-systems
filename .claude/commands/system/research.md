---
description: Qualify a candidate design system and build a sourced evidence dossier, without touching data/
argument-hint: <system name or docs URL>
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, WebSearch, Task, Bash(python3:*), Bash(git:*), Bash(mkdir:*), Bash(ls:*)
---

Research the candidate: **$ARGUMENTS**

You are gathering evidence for a published research report. Nothing you write in
this command reaches `data/`. The output is a dossier that the next command
turns into a record, and its only currency is pages you fetched in this session.

## Read first

You have not seen this repository. Read these before fetching anything:

- @AGENTS.md, in particular "Constraints that will fail review" and "Write like a person"
- @CONTRIBUTING.md, in particular the bar a candidate has to clear
- `schema/design-system.schema.json`, especially the closed enums for `type`, `category`, `audience`, `ai_maturity` and technique `category`
- Two model records in `data/design-systems.json`, `shadcn-ui` and `patternfly`, end to end

`patternfly` carries the one affordance in the corpus with no URL of any kind:
"llms.txt / llms-full.txt", which exists to record that both files return 404.
That is a finding, not a hole. Copy the pattern only when you have fetched a URL
and watched it 404, mark the affordance `"present": false`, and never invent a
link to fill a gap.

## 1. Qualify

The bar is: open source, active in the last six months, enough public surface to
study. Confirm all three from fetched pages, not from memory.

```sh
python3 -c "import json;print([s['id'] for s in json.load(open('data/design-systems.json'))])"
```

If the candidate is already in that list, stop and say so. Then read
`data/critic-review.json` `missing[]`, the queued backlog of known omissions, and
say whether the candidate is on it. That file is gitignored working material: it
must never be quoted, referenced, or echoed into anything under `data/`,
`dashboard/` or `build/`. `scripts/check_md_layer.py` greps generated output for
the word and fails the build if it leaks.

If the candidate fails the bar, stop here and report why. A rejected candidate is
a complete, useful result.

## 2. Open a workspace

Pick the record id now: kebab-case, matching the pattern of the existing ids.

```sh
mkdir -p .work/<id>/evidence
```

`.work/` is already in `.gitignore`. Do not add anything to `.gitignore`
yourself; an abandoned research pass should leave no diff behind.

If `.work/<id>/dossier.md` exists you are resuming. Read it, list which claims
already have evidence files, and gather only what is missing.

## 3. Measure the shape you are aiming at

```sh
python3 scripts/check_house_norms.py
```

This prints the corpus profile: how many sources, affordances, techniques,
platform integrations and sentences the existing records carry, and which of
those are exact norms rather than ranges. Aim the research at those numbers.
Under-researching and over-researching are both defects, and `/system:draft`
measures the record against the same profile.

The `exception:` lines at the end are records left out of a measurement because
they deviated. A number that got in once is not the norm.

## 4. Fan out

Fetching is the slow half and it parallelises cleanly. Dispatch subagents with
the Task tool, `subagent_type: "general-purpose"`, all in a single message. Six
areas, one agent each:

1. **docs surface** — docs site, AI or agents page, `llms.txt` and `llms-full.txt` (fetch both; a 404 is a finding), markdown twins, condensed indexes
2. **MCP and CLI** — MCP server (official? which org publishes the package?), CLI scaffolding, registry endpoints, generated agent context
3. **instruction files** — `AGENTS.md`, `CLAUDE.md`, Cursor rules, Copilot instructions, agent skills, slash commands, prompt libraries
4. **maintenance** — latest release and its date, commit cadence, whether it is actively maintained, licence
5. **builder side** — how the team itself uses AI to build the system: contributor rules, eval harnesses, lint loops, codemods
6. **platform integrations** — Figma Code Connect, Storybook, Supernova, Knapsack, zeroheight

Give each agent this prompt, with the area and the id filled in:

> You are gathering evidence for a published research report about how design
> systems make themselves usable by AI agents. Your area is **<area>** for
> **<candidate>**.
>
> Rules:
>
> 1. Every claim comes from a page you fetch in this session. Your recollection
>    of this library is not evidence and must not appear in your output.
> 2. Save every page you fetch to `.work/<id>/evidence/<slug>.txt`: the URL on
>    the first line, a blank line, then the body as fetched. Do not tidy it.
> 3. Prefer `raw.githubusercontent.com` over a GitHub blob page, and a permalink
>    pinned to a tag or commit over `main`. `main` moves, and a moved file turns
>    into a fidelity failure months later.
> 4. Quotable lines are copied out of the saved file by line number. Copy bytes,
>    including indentation. Never retype, reflow, re-indent, re-wrap or tidy.
> 5. Terminal output from running a CLI is not a documentation page. If the only
>    evidence is runtime output, find the file in the repo that contains the same
>    text, or say the claim cannot be sourced.
> 6. Read-only outside `.work/`. Do not touch `data/`, `dashboard/` or `scripts/`.
>
> Return a markdown fragment: for each thing you found, its name, what it is, the
> URL, the evidence file, the line range worth quoting, and one line on what it
> proves. Then a list of what you looked for and did not find, with the URL you
> probed. An area with nothing in it is a real answer.

## 5. Assemble the dossier

Merge the fragments into `.work/<id>/dossier.md`:

```markdown
# <Name> (<id>)

## Qualification

- Open source: <license>, <url>
- Active: <last release + date>, <url>
- Public surface: <one line>, <url>
- On critic-review missing[]: yes/no

## Proposed ai_maturity: <none|emerging|invested|ai-native>

The rubric line from CONTRIBUTING.md this meets, and the evidence for it.

## Candidate affordances

### <name> · type: <enum> · official: <bool> · audience: <enum>

- URL: <docs_url or code_url>
- Evidence: evidence/<slug>.txt, lines <n>-<m>
- Proves: <one line>

## Candidate techniques

### <name> · category: <enum>

- Snippet source: <url>, evidence/<slug>.txt, lines <n>-<m>
- What it coerces the model to do: <one line>

## Platform integrations

## Building vs consumption

## Gaps: what could not be confirmed, and what was probed and not found

## Sources: <the URL list>
```

Every technique needs a snippet. `techniques[]` has no `docs_url` and no
`code_url`, so a technique without one has no source at all, and
`check_house_norms.py --invariants` fails the build on it.

## 6. Check the quotations before they become a record

For each candidate snippet, confirm every line appears as a whole line in the
evidence file it came from:

```sh
python3 - <<'PY'
from pathlib import Path
snippet = """<paste the candidate snippet here>"""
page = [ln.rstrip() for ln in Path(".work/<id>/evidence/<slug>.txt").read_text().split("\n")]
for line in [ln.rstrip() for ln in snippet.split("\n") if ln.strip()]:
    print("ok" if line in page else "NOT VERBATIM", line[:100])
PY
```

Whole line, not substring: that is what catches a truncated URL and a dropped
trailing parenthetical, and it is the same test `check_snippets.py` applies after
the record is published. Fix a failure now, in the dossier, by re-copying from
the evidence file.

## Do not

- Do not write a claim you did not read on a page you fetched in this session. A correction from recollection is worse than no correction, and reviewers can tell.
- Do not paraphrase inside quotation marks. A snippet is bytes.
- Do not elide silently. If you cut, leave `...` on its own line.
- Do not edit anything under `data/`, `dashboard/`, `scripts/` or `netlify/`.
- Do not reference `data/critic-review.json` anywhere outside `.work/`.

## Report

Print: the id, the proposed `ai_maturity` and why, the count of candidate
affordances, techniques and sources against the corpus profile, the evidence
files, and every claim you wanted to make and could not source. Then say:
`next: /system:draft <id>`.
