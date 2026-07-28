---
description: Verify the stamps and the refutation verdicts, run the full gate with the exit status captured, then commit exactly the right file set
argument-hint: <system-id>
allowed-tools: Read, Glob, Grep, Bash(npm:*), Bash(python3:*), Bash(./scripts/build.sh:*), Bash(git:*)
---

Ship the record for **$1**.

## 1. Refuse to start on stale ground

Run each on its own. Four commands in one block report only the last one's exit
status, which is how a `STALE STAMP` on line one gets masked by a passing check
on line three.

```sh
python3 scripts/check_hand_counts.py --verify-stamp .work/$1/counts.json
```

```sh
python3 scripts/check_prose_claims.py --verify-stamp .work/$1/prose.json
```

```sh
python3 scripts/verify_claims.py merge $1
```

```sh
python3 scripts/check_house_norms.py --target $1
```

```sh
python3 scripts/check_snippets.py --refresh --json /tmp/snip-$1.json
```

```sh
python3 scripts/check_snippets.py --links --refresh --json /tmp/links-$1.json
```

What each refusal means:

- `STALE STAMP` from the counts check: the records moved after the last resync. Run `/system:audit-prose $1` again in full. Do not commit around it.
- A stale or missing prose stamp: the comparative sentences were checked against a different corpus, or never checked.
- `verify_claims.py merge` non-zero: a refutation batch produced no file, judged claims that were not its own, left a claim unjudged, marked something supported with no quote, or something is still `unsupported` or `contradicted`. Verification did not happen, whatever anybody remembers. Those verdict files are written by the refutation agents; if you find yourself writing one, stop.
- House norms: every deviation has to be argued in `.work/$1/decisions.md` and recorded in `EXCEPTIONS`.

The last two runs are unscoped and refreshed on purpose. This is the one place
every snippet and every published URL in the corpus is checked against a live
fetch, including the ones your edit did not touch.

## 2. Run the gate, unpiped

This is the one instruction in the whole process with no judgement in it.

```sh
npm run check > /tmp/check-$1.log 2>&1; echo "exit=$?"
```

Then read `/tmp/check-$1.log`.

Never pipe `npm run check` into `tail`, `head`, `grep` or anything else. A
pipeline reports the exit status of the last command, so `npm run check | tail
-20` reports tail's success and a failing gate reads as green. This has already
happened here, and it makes every other check in this process optional. If you
want the tail, redirect to a file and read the file. In bash you could use
`${PIPESTATUS[0]}`; this repository's shell is zsh, where that variable does not
exist and the equivalent is spelled differently, which is one more reason to
redirect instead of remembering.

The gate runs under `set -e`: eslint, prettier, tsc, generated types, ruff, mypy,
deno over the edge functions, the contrast check, the data invariants, the
hand-typed counts and dates, the cached snippet fidelity, the build, the tests,
and the markdown-layer check. CI runs the same script, so a green local run is a
green CI run. Fix anything it reports, then run it again in full. Do not run the
individual step you think you broke and call the gate passed.

If it fails on something you did not touch, read `/system:correct`: the three
data checks were added to the gate after the records were written, and there is a
short standing punch list.

## 3. Commit the right file set

Re-read the working tree immediately before committing. Other agents may be
editing this repository, and a `git status` from ten minutes ago is fiction.

```sh
git status --porcelain
```

May be committed:

- `data/design-systems.json` and `data/insights.json`
- `netlify/edge-functions/lib/md-routes.ts`, which `build_md.py` generates but which stays tracked because the edge function imports it. Adding a record adds a line there and it must be in the diff.
- the generator sources you edited during the count resync: `dashboard/template.html`, `scripts/build_dashboard.py`, `scripts/build_md.py`, `netlify/functions/mcp.mjs`, `scripts/og-image.html`
- `dashboard/og-image.png`, if you re-rendered it
- prose: `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `LICENSE-DATA`, `docs/*.md`, `.github/ISSUE_TEMPLATE/*.yml`
- `scripts/check_snippets.py`, `scripts/check_house_norms.py`, `scripts/check_hand_counts.py`, `scripts/check_prose_claims.py`, `scripts/verify_claims.py`, `scripts/check.sh`, `.gitignore` and `.claude/commands/system/*.md`, if this run changed them — an `EXCEPTIONS` entry is part of the record's argument and belongs in the same commit
- `schema/design-system.schema.json` and `types/data.d.ts` together, never one without the other, if the schema moved

Must never be committed:

- anything else under `dashboard/`. Three files in there are source: `template.html`, `favicon.svg` and `og-image.png`. Everything else is generated, gitignored, and rebuilt by Netlify on every deploy.
- anything under `build/`, including the snippet cache
- anything under `.work/`, and `data/critic-review.json` under any circumstances
- and nothing else at all. If a path is not on the list above, it is not part of this contribution.

Check the diff before you commit, not after:

```sh
git diff --stat
```

```sh
git diff data/design-systems.json
```

Commit message: imperative, describing the change rather than the process. "Add
the Astryx record", not "Complete research and verification for Astryx". No
process narration, no agent attribution in the body, no emoji.

## 4. Verify what you actually committed

```sh
git show --stat HEAD
```

Read the file list. If `netlify/edge-functions/lib/md-routes.ts` is missing, the
edge function will not route the new record's markdown twin. If any generated
`dashboard/` file is present, the commit is wrong and should be amended before it
is pushed.

## Do not

- Do not pipe the gate.
- Do not commit with a failing or unread check log.
- Do not commit generated output to "make sure it deploys". Netlify runs the build itself and publishes what that writes.
- Do not write or edit anything under `.work/$1/verdicts/` to make step 1 pass.
- Do not push or open a pull request unless you were asked to. Committing is where this command stops.

## Report

Print the gate's exit status, the merge summary from `verify_claims.py`, the
committed file list, the commit subject, and anything you deliberately left
uncommitted.
