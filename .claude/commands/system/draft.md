---
description: Turn a research dossier into a record in data/design-systems.json, formatted, validated, quoted verbatim and measured against the corpus
argument-hint: <system-id>
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(python3:*), Bash(node:*), Bash(npx:*), Bash(git:*)
---

Draft the record for **$1** from `.work/$1/dossier.md`.

If that dossier does not exist, stop and say `run /system:research first`. This
command writes one record into `data/design-systems.json` and nothing else. It
does not build, and it does not resync counts.

## 1. Read the models again

Read `shadcn-ui` and `patternfly` in `data/design-systems.json` end to end before
you type anything. The schema requires seven keys. Fifteen are universal in the
corpus and `license` is on all but one, so a record that satisfies the schema
while missing eight of them is still wrong.

```sh
python3 -c "
import json
r=json.load(open('data/design-systems.json'))
u=set.intersection(*[set(x) for x in r])
print('universal:', sorted(u))
print('sometimes:', sorted(set().union(*[set(x) for x in r]) - u))
"
```

Read the "Write like a person" section of @AGENTS.md before writing any prose,
because this command is where the published prose gets typed: `summary`, `gaps`,
`building_vs_consumption`, and a description on every affordance and technique.
No em-dash chains, no "not just X, but Y", no three-item flourishes, no robust /
seamless / comprehensive, no bolding mid-sentence, no emoji. Contractions are
fine. Say the specific thing. Nothing in the gate checks this and every reader
can smell it.

## 2. Write the record

Facts come from the dossier, and every one of them carries the URL it came from.

Snippets are published as verbatim quotation. Copy them out of
`.work/$1/evidence/*.txt`, byte for byte, indentation included. If a snippet
needs a cut, put `...` on its own line. Attribute each snippet to the document
the text is in, and use a `snippet.language` already in use in the corpus.

Every technique carries a snippet with a `source_url`, and carries no other URL
field. `techniques[]` has `name`, `category`, `description` and `snippet` and
nothing else; a `docs_url` on a technique validates, renders nowhere, is fetched
by no check, and is the cheapest path to an unsourced claim. The invariant check
fails on both.

An affordance that records something's absence takes `"present": false` and no
URL. That is the only case where a missing link is correct, and the field is what
keeps it out of the counts.

Write `gaps` from what the research could not confirm. It is a real field, not a
formality, and it is where an unsourced claim goes to be honest instead of being
published.

## 3. Place it in the array

Nothing in the build sorts. The site renders the array in file order and draws a
cohort divider when `ai_maturity` changes, so grouping by cohort in the order
`dashboard/template.html` uses (`const MAT_ORDER`) is load-bearing: a record
filed outside its block splits the cohort in two on the page.

Inside a cohort, case-insensitive alphabetical by the `name` field is a
convention, not a rendering rule. Every record follows it today. Follow it unless
you have a reason, and say the reason if you do.

```sh
python3 -c "
import json
MAT=['ai-native','invested','emerging','none']
r=json.load(open('data/design-systems.json'))
w=sorted(r,key=lambda s:(MAT.index(s['ai_maturity']),s['name'].casefold()))
print('index for $1:',[s['id'] for s in w].index('$1'))
print('matches the convention:',[s['id'] for s in r]==[s['id'] for s in w])
"
```

## 4. Format and validate

Run each on its own, and read the output.

```sh
npx prettier --write data/design-systems.json
node scripts/validate_data.mjs
```

`data/` is not in `.prettierignore` and `npx prettier --check .` is the second
step of the gate, so a hand-indented record fails in seconds and reads like a
data problem when it is a formatting one.

`validate_data.mjs` catches missing required fields and out-of-vocabulary enum
values. It cannot tell you whether a URL says what you claim. That is the next
two steps and the next command.

## 5. Measure against the corpus

```sh
python3 scripts/check_house_norms.py --target $1
```

Nothing in that script is a hard-coded threshold. It measures the other records
and judges yours against what it measured, so "every ai-native record has exactly
8 techniques" is printed only because it is currently true. Records already
excluded for deviating are named at the bottom of the profile and are not in the
measurement.

Every deviation is a decision:

- bring the record inside the measured range, or
- keep it, write the argument in `.work/$1/decisions.md`, and add the metric to `EXCEPTIONS` in `scripts/check_house_norms.py` with that argument in the string.

The second one is what stops your deviation from becoming the norm the next
record is measured against. Silence is not an option: an unacknowledged deviation
is how a record with nine techniques shipped into a corpus where every comparable
record has eight.

## 6. Check the quotations and the links

```sh
python3 scripts/check_snippets.py --only $1 --refresh --json .work/$1/snippets.json
```

```sh
python3 scripts/check_snippets.py --links --only $1 --refresh --json .work/$1/links.json
```

The first fetches every `snippet.source_url` and requires each snippet line to
equal a whole line on the page, in order, contiguously. The second fetches every
other URL the record publishes, including all fifteen `sources[]`, and fails on
anything that does not load.

What the statuses mean:

- `missing` — the line is not on the page. It was retyped, or the snippet is attributed to a page it did not come from. Runtime CLI output under a docs URL is the classic.
- `truncated` — the line is part of a longer page line and the rest was dropped. Quote the whole line, or mark the cut.
- `gap` — every line is verbatim but the page has a line between them that the snippet drops. Restore it or put `...` on its own line. Dropped table headers land here.
- `respaced` — it matches only after whitespace is normalised, so the code was re-indented or the prose re-wrapped. A reflowed code block is not a quotation. Fix it.
- `out-of-order` — the snippet stitches the page together in an order the page does not have. Split it into two quotes.
- `unfetchable` — the URL you published does not load. Replace it.

`--refresh` matters here: `/system:research` may have cached these pages hours
ago, and the cache never expires.

Loop 4 to 6 until validate passes, house norms are clean or consciously accepted,
and both snippet runs exit 0.

## When the loop will not close

Two attempts at a claim is the limit. If a page will not settle it, drop the
claim and put what you looked for into `gaps`. If dropping it takes the record
below a cohort norm, that is the finding: this system publishes less than its
cohort. Record it, argue it in `EXCEPTIONS`, and move on. Do not pad the record
back up to the number.

## Do not

- Do not type a study-wide count anywhere in the record. Counts are computed at build time; a number typed into prose goes stale silently.
- Do not write comparative or superlative prose into `summary` or `gaps` ("the deepest in the study", "the only system that"). Those claims break when the next record lands, and the sweep that finds them lives two commands away.
- Do not paraphrase inside a snippet, tidy indentation, truncate a URL inside quoted text, or drop a table header to make a snippet shorter.
- Do not elide without a marker.
- Do not add a URL to an item that documents an absence, and do not remove `patternfly`'s missing link to make an invariant pass.
- Do not run `./scripts/build.sh` here. The build comes after verification, and running it now means running it twice more anyway.

## Report

Print the record's index in the array, the house-norm deviations you accepted and
the argument for each, the two check results, and `next: /system:verify $1`.
