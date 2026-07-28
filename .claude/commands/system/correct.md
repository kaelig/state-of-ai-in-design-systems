---
description: Fix one fact in one record from a fetched page, as a one-file diff, and clear the standing defects the checks report
argument-hint: <system-id> [what is wrong]
allowed-tools: Read, Edit, Glob, Grep, WebFetch, Task, Bash(python3:*), Bash(node:*), Bash(npx:*), Bash(npm:*), Bash(git:*)
---

Correct: **$ARGUMENTS**

CONTRIBUTING.md opens by saying corrections are the most valuable contribution
and that a one-record correction should be a one-file diff. This is that path. A
new system is `/system:research`, and it is deliberately much longer.

## 1. Read what the report currently says, and where it says it

```sh
python3 -c "
import json,sys
r=next(s for s in json.load(open('data/design-systems.json')) if s['id']=='$1')
print(json.dumps(r,indent=2)[:6000])
"
```

Then fetch the `source_url` on the claim you think is wrong and read it. Every
correction starts with the existing source, because half the time the page still
says what the record says and the disagreement is about reading it.

## 2. Correct it

One fact, one record, from a page you fetched in this session. The new claim
carries the URL you fetched, not a citation and not a recollection. If the fix is
a snippet, re-copy it out of the page: whole lines, indentation included, `...`
on its own line for any cut.

If the correction turns something into an absence (a file that used to exist and
now 404s), keep the affordance, set `"present": false`, drop the URL, and say in
the description what you probed and when.

Then, each on its own:

```sh
npx prettier --write data/design-systems.json
```

```sh
node scripts/validate_data.mjs
```

```sh
python3 scripts/check_snippets.py --only $1 --refresh
```

```sh
python3 scripts/check_snippets.py --links --only $1 --refresh
```

```sh
python3 scripts/check_house_norms.py --invariants
```

## 3. Did the correction move a number?

Changing a description does not. Adding, removing or retyping an affordance or a
technique does, and so does flipping `official` or `present`.

```sh
python3 scripts/check_hand_counts.py > /tmp/correct-counts.log 2>&1; echo "exit=$?"
```

If nothing is stale, the correction is a one-file diff and you are done after the
gate. If something is stale, the correction has become a resync: run
`/system:audit-prose $1`, which also re-checks the comparative sentences that a
changed count can falsify.

## 4. Have somebody else check it

For anything beyond a typo, dispatch one Task agent, `subagent_type:
"general-purpose"`, with this prompt:

> Fetch `<url>`. The record `<id>` in `data/design-systems.json` now claims:
> "`<the new text>`". Quote the exact line on the page that establishes it, or
> say it does not. Default to "not established". Do not read anything under
> `.work/`, and do not answer from memory of this library. Return a JSON object:
> `{"verdict": "supported|unsupported|contradicted", "quote": "...", "reason": "..."}`.

`unsupported` means the correction is not ready, however sure you are.

## 5. Gate and commit

```sh
npm run check > /tmp/check-correct.log 2>&1; echo "exit=$?"
```

Read the log. Never pipe it: a pipeline reports the last command's status and a
failing gate reads as green.

Commit `data/design-systems.json` alone if the numbers did not move. If they did,
the file set is the one in `/system:ship`. Message in the imperative, naming the
fact: "Repoint the Primer MCP package at @primer/mcp-server".

## The standing corrections

Three checks were added to `npm run check` after the records were written, so a
fresh clone reports work that predates you. Clearing this list is a correction in
its own right, and each item is small. Do them in this order.

**1. Stale study-size counts.** `python3 scripts/check_hand_counts.py` names
them. `.github/ISSUE_TEMPLATE/config.yml`, `.github/ISSUE_TEMPLATE/new-system.yml`
and `LICENSE-DATA` say 19 design systems and there are 20: fix those. The hits in
`docs/design-audit.md` and `docs/semantic-audit.md` are inside worklist items
that quote what a surface said at the time. Read each one. If it is quoted
history, put `counts-ok` in a comment on that line rather than rewriting somebody
else's record of the past. If it is a live spec for what the site should say,
update the number.

**2. A snippet over the documented budget.** `check_house_norms.py --invariants`
reports nuxt-ui's technique snippet at 1524 characters against the 1500 the
schema documents. Two honest fixes: shorten the quote at a line boundary and mark
the cut with `...`, or raise the number in
`schema/design-system.schema.json` ("verbatim excerpt, <= 40 lines / 1500 chars")
because the budget was always advisory. Pick one deliberately. If you change the
schema, run `npm run types` and commit `types/data.d.ts` with it.

**3. The counts cannot express an absence.** `check_hand_counts.py` fails with
the patch. `patternfly`'s "llms.txt / llms-full.txt" affordance exists to record
that both files return 404, and `compute_counts()` counts it as a system that
publishes one, so `data/insights.json` publishes "{llms_txt} of {systems} systems
publish llms.txt" with a number that is one too high. The rule that counts are
never typed by hand and the rule that the report says true things both apply to
that sentence, and the tie is broken by making the count true:

1. In `scripts/build_dashboard.py`, `systems_with()` skips affordances where `a.get("present", True)` is false. The exact patch is printed by the check.
2. In `schema/design-system.schema.json`, add `present` to the affordance properties: `{"type": "boolean", "description": "false when this records that the artifact does not exist. Defaults to true. Excluded from the counts."}`.
3. `npm run types`, and commit `types/data.d.ts` with the schema.
4. In `data/design-systems.json`, set `"present": false` on patternfly's llms.txt affordance.
5. Rebuild and read the new counts. `llms_txt` drops by one, the prose placeholder now resolves to the true number, and nothing was typed by hand.

Absence is a finding this study makes repeatedly, and the schema could not say it.
That is the correction.

## Do not

- Do not correct a fact from a model's recollection of the library. It is worse than no correction, and reviewers can tell.
- Do not edit a snippet to make a check pass. Re-copy it, or drop it.
- Do not add a URL to an item that documents an absence.
- Do not turn a one-file diff into a resync you did not need: check whether a number actually moved before touching prose.
- Do not commit anything generated under `dashboard/` or `build/`.

## Report

Print the record and field you changed, the URL you fetched and the line that
establishes the new claim, the refuter's verdict, whether any count moved, the
gate's exit status, and the committed file list.
