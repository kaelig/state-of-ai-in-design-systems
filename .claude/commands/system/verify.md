---
description: Verify a record mechanically, then dispatch independent agents whose job is to refute it
argument-hint: <system-id>
allowed-tools: Read, Write, Edit, Glob, Grep, Task, WebFetch, Bash(python3:*), Bash(node:*), Bash(git:*)
---

Verify the record for **$1**. Assume it is wrong until a page says otherwise.

This command has two halves. The first is mechanical and you run it yourself. The
second is adversarial and you must not run it yourself, because you cannot
independently check work you just did. Both halves are re-runnable in isolation.

## Stage A: the mechanical pass

Run each of these as its own command. Do not pipe them, and do not chain them
with `;` or `&&` in one call either: a block of four commands reports only the
last one's status, which is the same defect as piping into `tail` wearing a
different hat.

```sh
node scripts/validate_data.mjs
```

```sh
python3 scripts/check_house_norms.py --invariants
```

```sh
python3 scripts/check_house_norms.py --target $1 --json .work/$1/norms.json
```

```sh
python3 scripts/check_snippets.py --only $1 --refresh --json .work/$1/snippets.json
```

```sh
python3 scripts/check_snippets.py --links --only $1 --refresh --json .work/$1/links.json
```

```sh
python3 scripts/check_snippets.py --offline --json .work/$1/corpus-snippets.json
```

Read every one of them. The last is the whole corpus against whatever is cached:
a URL that rotted in another record, or collateral damage from an edit, is
invisible to a run scoped with `--only`. Findings in other records are not yours
to fix here, but they are yours to report.

`--refresh` matters: `/system:draft` cached these pages, and a URL you edited
since then would otherwise be checked against the old body.

Stage A must be clean before Stage B. Dispatching agents to argue about a snippet
that is provably not verbatim spends the expensive pass on something a script
found for free.

## Stage B: the adversarial pass

Extract the claims first, so every agent argues about the same list, the ids are
stable, and the batches are reproducible:

```sh
python3 scripts/verify_claims.py extract $1
```

That writes `.work/$1/claims.json` with one claim per affordance, technique,
platform integration, source URL, and per record-level field, split into batches
of nine. Claim ids are keyed to the item, not to a running counter, so deleting a
claim during triage does not renumber the rest and a re-dispatch hits the claims
you meant.

Now dispatch one agent per batch with the Task tool, `subagent_type:
"general-purpose"`, all calls in a single message, plus one fit agent. Each agent
writes its own verdict file. You do not transcribe verdicts, and you do not write
those files: `verify_claims.py merge` fails on a batch with no file, and
`/system:ship` reads what the agents wrote, not what you say they said.

Give each batch agent exactly this prompt, with the placeholders filled in:

> You are auditing one entry in a published research report. Your job is to
> REFUTE it, not to confirm it. Somebody else already believes these claims; you
> are the reason they are allowed to be published.
>
> Read `.work/<ID>/claims.json` and take the claims whose ids are in batch
> `<N>`. Do not read `.work/<ID>/dossier.md` or anything under
> `.work/<ID>/evidence/`: those are the notes of the person you are auditing, and
> using them makes you their echo.
>
> Rules:
>
> 1. Fetch every URL yourself, in this session.
> 2. The default verdict is `unsupported`. You move a claim off that default only
>    by quoting the exact text on the page that establishes it. No quote, no
>    support. "The docs clearly describe this" is not a quote.
> 3. For a claim carrying a snippet, compare it to the page line by line.
>    Dropped table header rows, truncated URLs, dropped parentheticals, reflowed
>    code and re-indentation are all defects. A cut marked with `...` on its own
>    line is allowed; an unmarked cut is not. Output from running a command is
>    not a documentation page, so a snippet of terminal output attributed to a
>    docs URL is `contradicted`. Your fetch tool may normalise whitespace, so
>    judge wording, order and completeness, and say so if you cannot see
>    indentation: `scripts/check_snippets.py` covers the bytes and you cover the
>    meaning.
> 4. If the page 404s, needs JavaScript you cannot execute, needs authentication,
>    or has moved, the verdict is `unsupported` with that reason. Never fill the
>    gap from memory of the library.
> 5. If the page says something narrower, wider, or different, the verdict is
>    `contradicted`. Say what the page actually says.
> 6. Check the enum fit too: does `type` / `category` / `audience` match what the
>    page shows, or was the nearest label picked to avoid thinking? The
>    vocabularies and their definitions are in
>    `schema/design-system.schema.json`. `official` means shipped by the
>    maintaining org, so check who publishes the package.
>
> Write `.work/<ID>/verdicts/batch-<N>.json` and nothing else: a JSON array with
> one object per assigned claim id, no prose around it.
>
> ```json
> [
>   {
>     "id": "aff-hosted-mcp-server",
>     "verdict": "supported | unsupported | contradicted",
>     "url_fetched": "the URL you actually loaded",
>     "quote": "the exact text from the page, required when supported",
>     "reason": "one sentence: what the quote establishes, or what is wrong",
>     "suggested_fix": "drop the claim | narrow it to X | repoint source_url to Y | recopy the snippet | null"
>   }
> ]
> ```
>
> A batch where everything comes back `supported` is a batch that did not try.
> That does not mean invent problems. It means read the page, not the claim.

The fit agent gets this instead, and writes `.work/<ID>/verdicts/fit.json` in the
same shape, using the ids given:

> You are auditing the editorial judgement in one entry of a published research
> report, defaulting to `unsupported`. Read `data/design-systems.json`, the record
> with id `<ID>`, plus `shadcn-ui` and `patternfly` as calibration, plus the
> `ai_maturity` rubric in CONTRIBUTING.md and the enum descriptions in
> `schema/design-system.schema.json`. Do not read anything under `.work/`.
>
> - `fit-maturity` The `ai_maturity` rating. Which rubric line does the evidence meet? Would the same evidence in another record have earned it?
> - `fit-category` The `category` enum against the schema definition.
> - `fit-technique-categories` Every technique's `category`. Is `other` doing work a real category should do? Is `design-code-mapping` used for something that is not a Figma-to-code artifact?
> - `fit-summary` Does every sentence of `summary` trace to something in `affordances`, `techniques` or `maintenance`? Name any that does not.
> - `fit-voice` Does the record's prose follow the "Write like a person" rules in AGENTS.md? Quote any sentence that does not: em-dash chains, "not just X, but Y", three-item flourishes, robust / seamless / comprehensive, mid-sentence bolding.
> - `fit-gaps` Does `gaps` name what was searched for and not found, or is it a formality?
> - `fit-decay` Anything stated as permanent that will be wrong in three months.

## Stage C: triage

```sh
python3 scripts/verify_claims.py merge $1
```

That checks every batch produced a file, that each file judges exactly its own
claims, that no claim went unjudged, and that nothing marked `supported` came
back without a quote. Then, claim by claim:

- `contradicted`: fix the record to say what the page says, or delete the claim. There is no third option.
- `unsupported`: find a page that supports it and add that URL, or delete the claim. A claim you believe and cannot source is a claim the report cannot carry.
- `supported`: leave it.

Write the disposition of every non-supported verdict into `.work/$1/decisions.md`.
If two agents disagree about the same claim, fetch the page yourself and write
down which one was reading it correctly.

## The re-run rule, and when to stop

Any edit invalidates the verification of the claims you touched, and Stage A
entirely. After triage: re-run all of Stage A, re-extract, re-dispatch the
batches containing the claims you edited, and merge again.

Three rounds is the limit. A claim still unsettled after two attempts at a
different source gets dropped, and what you looked for goes into `gaps`. Dropping
claims can take the record under a cohort norm; that is a finding about the
system, not a hole in the record. Argue it in `EXCEPTIONS` and ship it, or say
the candidate does not have enough public surface and stop.

Editing the record also moves the study's derived totals, so
`/system:audit-prose` has to run after this command, never before it.

## Do not

- Do not verify your own work by rereading your own notes.
- Do not write, edit or "tidy" a file under `.work/$1/verdicts/`. They are the agents' output and they are the evidence that the pass happened.
- Do not accept a paraphrase as a quote.
- Do not accept "the page is down, but I know this is true".
- Do not soften a `contradicted` verdict into a hedge in the description. The record says what the source says or it does not say it.
- Do not touch `data/insights.json`, counts, or the build here.

## Report

Print the merge summary, the disposition of every non-supported claim, the count
dropped or narrowed, anything the corpus-wide snippet run found in other records,
and `next: /system:audit-prose $1`.
