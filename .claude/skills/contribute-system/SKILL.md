---
name: contribute-system
description: Use when adding a design system, component library or headless library to the State of AI in Design Systems corpus - "add X to the corpus", "contribute X", "research X for the study", "should X be in the report", or when handed a docs URL for a system that is not yet a record. Runs the qualify, research, draft, verify and audit phases in order and stops before committing.
---

# Contributing a system, end to end

You are adding one record to a published research report whose entire premise is
that a reader can follow any link and see the thing. Every phase below exists
because that promise was broken at least once.

This skill owns the **order, the gates and the stop conditions**. It owns nothing
else. The rules for each phase live in its command file, and you invoke the
command rather than restating what it says. Two copies of a rule drift.

## Before anything

Read `AGENTS.md`, in particular "Constraints that will fail review". Then confirm
the candidate is not already a record:

```sh
python3 -c "import json;print([s['id'] for s in json.load(open('data/design-systems.json'))])"
```

If it is already there, stop and say so. If the user wants it corrected rather
than added, that is `/system:correct`, not this skill.

## Resume before you start

`.work/<id>/` is the handoff medium between phases, so a half-finished run is
resumable. Check it first:

| What exists                                    | Where to resume      |
| ---------------------------------------------- | -------------------- |
| nothing                                        | Phase 1              |
| `.work/<id>/dossier.md`                        | Phase 2              |
| the record is in `data/design-systems.json`    | Phase 3              |
| `.work/<id>/verdicts/` with unresolved defects | Phase 3, fixing them |

Say which phase you are resuming at and why. Do not redo a completed phase to
feel thorough; the evidence files are the record of what was done.

## The phases

Run these in order by invoking the command. Do not inline their instructions.

1. **`/system:research <name or url>`** — qualify the candidate and build a
   sourced dossier. Touches nothing under `data/`.
2. **`/system:draft <id>`** — turn the dossier into a record.
3. **`/system:verify <id>`** — mechanical checks, then independent agents whose
   job is to refute the record.
4. **`/system:audit-prose <id>`** — resync derived counts and re-check the
   comparative claims in `data/insights.json` against the new record set.

Then stop. See "Where this ends".

## The gates

A gate is a phase whose result can be "stop" or "go back". Walking past one is
the failure this pipeline exists to prevent, and it is not a hypothetical: the
contribution that produced these commands looked finished, passed its build, and
was then found to contain five misquotations and four wrong numbers.

**Gate 1, after research.** The bar is open source, active in the last six
months, enough public surface to study. If the candidate fails it, **stop and
report why**. A rejected candidate is a complete and useful result, not a
failure to work around. Do not proceed to draft in the hope it works out.

If licensing is unresolved rather than absent, stop and ask. Source-available is
not open source, and finding that out after a full research pass wastes the pass.

**Gate 2, after verify.** The refutation agents return verdicts. If any defect is
confirmed, **go back to phase 2**, fix it, and run verify again. Do not carry a
known defect forward on the grounds that the build is green. The build cannot
tell you whether a page says what you claim it says; that is exactly what these
agents are for.

Re-run verify after fixing. A fix that was not re-verified is not a fix.

**Gate 3, after audit-prose.** Adding a record changes derived counts, and it can
falsify hand-written comparative prose that no check covers. If the audit turns
up a claim the new record breaks, that is a required fix, not a note. Enumerations
("only X, Y and Z lack one") and superlatives ("the deepest in the study") are
where this bites.

Counts change **again** if you revise the record after the first build. If phase
3 sent you back to phase 2, re-run the audit.

## Where this ends

**Stop before committing.** Leave the working tree green and report:

- the record: affordances, techniques, sources, and how those compare to the corpus
- what the refutation agents tried to refute and what survived
- anything that could not be sourced, and what was probed and not found
- the exact files changed

The user reviews the diff and runs `/system:ship <id>` themselves. Do not run it
for them, and do not commit, push or open a PR from this skill.

Two reasons this line is here. Shipping writes to git, and other sessions may be
committing to this repo at the same time. And a pipeline that grades its own work
and then acts on the grade has no independent check left in it.

## What will trip you up

**`npm run check` piped anywhere reports the pipe's exit code, not the check's.**
`npm run check | tail -40` reports `tail` succeeding. Redirect to a file and read
the status directly:

```sh
npm run check > /tmp/check.log 2>&1; echo "EXIT=$?"
```

This is not a hypothetical either. It is how a failing build was reported as
passing, twice.

**Some checks are advisory today, and you must know which.** `check_snippets.py`
finds real defects at a stricter standard than the existing corpus meets, so it is
not wired into `check.sh`. Run it and read it; do not treat a failure as a blocker
unless it is on the record you are adding. See the corpus backlog issue.

It reports `unreadable` separately from `missing`, and the difference is the whole
point. `missing` accuses your snippet. `unreadable` accuses your `source_url`: the
page returned no text to a plain fetch. Never fix an `unreadable` by re-copying the
quotation — the quotation is usually fine. Fix it by pointing `source_url` at
something that serves the text.

**A URL that a plain fetch cannot read is a broken citation.** The report's promise
is a page that loads and shows the thing, and four kinds of URL silently fail that
while looking fine in a browser:

| What you cited              | What a fetch gets        | Cite instead                          |
| --------------------------- | ------------------------ | ------------------------------------- |
| npm package page            | a Cloudflare challenge   | the repo file, or the tarball         |
| GitHub `/tree/` directory   | nav chrome, no file list | the file the snippet came from        |
| a `.zip` of a skill         | binary                   | still the zip; the checker unpacks it |
| a client-rendered docs page | the navigation shell     | the `.md` twin, if one exists         |

Every one of these was found in this corpus, and each had produced a `missing`
verdict against a quotation that was word-perfect. Five Salesforce snippets were
cited to an npm page behind a bot wall; all five were verbatim in a `SKILL.md` on
GitHub the whole time.

**Fetch a JS-rendered docs site with Chrome, not WebFetch.** WebFetch returns the
navigation shell for anything that renders client-side, and the shell looks like a
real answer: you get a page, it just has no content in it. Astryx's component pages
are the worked example — WebFetch yields 228 lines of sidebar and footer out of
653KB, while Chrome yields the usage prose, the do/don't guidance and the examples.

**This is how you write a false absence, so probe before you claim one.** The
Polaris record said a docs page "contains no AI/MCP/agent content at all". In a
browser that page has an Install AI Toolkit menu with per-host commands for five
agents, an Ask about this page control and a Copy MD button — all client-rendered,
none of it in the HTML. The same page turned out to serve a markdown twin at
`<path>.md` and to honour `Accept: text/markdown`, an affordance the record missed
entirely. "The docs are opaque to agents" and "there is nothing there" are strong
claims about a system; do not make either on the strength of one WebFetch.

Before writing any absence into `gaps`, ask what evidence would have to exist for
you to see it. Absences checked against a repo tree, an HTTP status or DNS are
safe. Absences checked by reading a page are not, until you have opened it.

**Record order in `data/design-systems.json` is load-bearing.** The site renders
the array in file order and draws a cohort divider whenever `ai_maturity` changes,
so the record has to land inside its maturity run. Appending puts a spurious
second band on the page.

**Do not fix an unrelated failure you find on the way.** If the build is already
red for a reason that is not yours, say so, name the commit that caused it, and
stop. Another session may be mid-edit in the same tree.

## Scale

The default path is sequential and modest. If the candidate is large enough that
research wants heavy fan-out, or the user asks for a workflow explicitly, say so
and let them opt in — a workflow spawns many agents and costs real money, so it
is their call, not yours.
