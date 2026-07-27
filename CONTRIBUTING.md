# Contributing

This report is a snapshot of 26–27 July 2026. Design systems ship fast, so parts
of it are already wrong. Telling us which parts is the most valuable thing you
can do here.

You do not need to run the build, clone the repo, or know Python to contribute.
Filing an issue with a link in it is a complete contribution. If you want to open
a pull request, the rest of this page tells you how.

## Three ways in

### 1. Correct something

The main one. A version number moved, an MCP server shipped or was archived, a
link died, a snippet is quoted out of context, a whole record describes a system
that has since changed direction.

[File a data correction →](https://github.com/kaelig/state-of-ai-in-design-systems/issues/new?template=data-correction.yml)

One requirement: a source URL. Every claim on the site links to the page it came
from, and a correction without a link can't replace one that has a link. Link the
specific page, not the site root. For a file in a repo, a permalink pinned to a
commit or tag is best, because `main` moves.

If you maintain the system in question, say so in the issue. It doesn't waive the
source requirement, but it tells us how to weigh a judgement call.

### 2. Suggest a system

19 systems and 5 platforms are in. The bar is: open source, active in the last
six months, and enough public surface to study. That last one rejects most
suggestions — a system whose monorepo is private can still qualify on published
packages and docs, but somebody has to be able to read something.

[Suggest a design system →](https://github.com/kaelig/state-of-ai-in-design-systems/issues/new?template=new-system.yml)

Bring links. Adding a system means researching it against
[`schema/design-system.schema.json`](schema/design-system.schema.json), and the
evidence you bring is the head start.

### 3. Change the site or the code

Bugs, accessibility problems, build issues, a page that reads badly on a phone.

[File a site bug →](https://github.com/kaelig/state-of-ai-in-design-systems/issues/new?template=site-bug.yml)
· [Send freeform feedback →](https://github.com/kaelig/state-of-ai-in-design-systems/issues/new?template=feedback.yml)

## How the build works

Five lines, because they explain most of the rules further down:

1. `data/*.json` holds the records. It is the only place facts are written.
2. `scripts/build_dashboard.py` turns those records into a payload and two HTML
   shells, using the markup, CSS and view functions in `dashboard/template.html`.
3. `scripts/build_md.py` turns the same payload into the markdown mirrors, the
   JSON twins, `llms.txt`, the sitemap and the public SQLite.
4. `scripts/build_dashboard.py --final` runs again, now that the `/ai` page copy
   exists and its file counts can be measured rather than typed.
5. `scripts/prerender.mjs` writes one static HTML file per route.

`./scripts/build.sh` runs all five in order. It refuses to finish if a route
renders empty, if a placeholder survives into the HTML, if the nav and the route
table disagree, or if the WebMCP tools and the `/ai` copy name different tools.

## The rules

**Never edit anything in `dashboard/` except `template.html`.** Every other file
in there is generated. Your edit will survive until the next build and then
vanish, and in the meantime the markdown mirror and the HTML page will disagree
about what the report says. Edit `data/` for facts and `template.html` for
markup, CSS and view logic.

**Every claim needs a `source_url`.** Not a citation, not "the docs say" — a URL
that loads and shows the thing. This is the whole basis on which anyone trusts
the report, and it's the one rule with no exceptions.

**Counts are computed, never typed.** 19, 5, 168, 148 and every other number on
the site is derived from the records at build time. If you find yourself typing a
number into prose, stop: there is a mechanism for that, and a hand-typed number
is a number that will be wrong in a month.

**Data strings flow through `esc()` or `fmt()`.** Anything from `data/` that
reaches the DOM goes through one of them. `esc()` escapes HTML;
`fmt()` handles the light inline markup the descriptions use. Interpolating a
record string straight into an HTML template is how a stray `<` in somebody's
docs quietly breaks a page.

**Blue means interactive.** The palette reserves blue for things you can click,
focus or tab to. If you're adding colour to something that isn't interactive,
it isn't blue.

## Where the data lives

| File | What's in it |
|---|---|
| `data/design-systems.json` | The 19 system records: affordances, techniques, sources |
| `data/platforms.json` | The 5 platform records and their capabilities |
| `data/insights.json` | The written findings, essay, methodology and caveats |
| `schema/design-system.schema.json` | The record schema, including the controlled vocabularies |

The schema is worth reading before you edit a record. `type`, `category`,
`audience` and `ai_maturity` are closed enums; inventing a new value will pass
`json.load` and then quietly fall out of every count that groups by it.

`ai_maturity` is an editorial call against one rubric, not a score: `none`,
`emerging` (an llms.txt or an AI docs page, little more), `invested` (official
MCP, skills or rules with real engineering behind them), `ai-native` (AI
consumption is a core design goal). Arguing that a system is rated wrong is a
legitimate correction — open a data correction issue and make the case.

## Opening a pull request

```sh
git clone https://github.com/kaelig/state-of-ai-in-design-systems.git
cd state-of-ai-in-design-systems
npm install
./scripts/build.sh                  # regenerate every published surface
python3 scripts/check_md_layer.py   # markdown layer self-check
npm test                            # MCP server suite
```

All three must pass. Commit the regenerated `dashboard/` output along with your
source change — the site is deployed from those files, so a data change that
doesn't include them doesn't reach anybody.

The diff on a one-record change is large. That's expected: an edit fans out to
the HTML, the markdown mirrors, the JSON twins, the SQLite export and `llms.txt`.
A diff that touches `dashboard/` without touching `data/` or `template.html` is
the one to look at twice.

Requirements: Python 3 (no packages needed), Node 20 or newer.

## If you're an agent

Everything above applies. Some specifics.

File a correction without a browser:

```sh
gh issue create --repo kaelig/state-of-ai-in-design-systems \
  --title "[data] Primer — MCP server package renamed" \
  --label data \
  --body "**Record:** systems/primer-github, affordance \"Primer MCP server\"

**Report says:** the package is \`@primer/mcp\`.

**Should say:** the package is \`@primer/mcp-server\`.

**Source:** https://github.com/primer/react/blob/v37.0.0/packages/mcp/package.json

**Found via:** MCP server"
```

Or drive the issue form directly. Prefill any field by its `id`, so a human can
review before submitting:

```
https://github.com/kaelig/state-of-ai-in-design-systems/issues/new
  ?template=data-correction.yml
  &title=[data]+Primer
  &subject=Primer+(primer-github)
  &claim=...
  &correction=...
  &source=https://...
```

Field ids are in `.github/ISSUE_TEMPLATE/data-correction.yml`. The `subject`
dropdown wants the exact option string, id included.

Read the data rather than scraping the site. Every route has a `.md` twin and
every record has a `.json` twin, `/llms.txt` indexes all of them with measured
sizes, and `/mcp` serves the same records over MCP. Details: `/ai`, or `AGENTS.md`
in this repo.

Verify before you file. Fetch the `source_url` on the record you think is wrong
and confirm it actually says what the report claims. A correction based on a
model's recollection of a library, rather than on a page that was fetched, is
worse than no correction, and it is obvious to the reviewer.

## What happens next

Corrections with a working source URL get applied. Corrections without one get a
reply asking for the link. Suggestions for new systems are queued and batched,
because each one is a research pass, not an edit.

The dataset is CC BY 4.0 and the code is MIT. Contributing means you're fine with
your contribution going out under those. See [LICENSE](LICENSE) and
[LICENSE-DATA](LICENSE-DATA).
