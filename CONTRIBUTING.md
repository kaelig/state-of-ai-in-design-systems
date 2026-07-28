# Contributing

This report is a snapshot of 26–28 July 2026. Design systems ship fast, so parts
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
from, and a correction without a link can’t replace one that has a link. Link the
specific page, not the site root. For a file in a repo, a permalink pinned to a
commit or tag is best, because `main` moves.

If you maintain the system in question, say so in the issue. It doesn’t waive the
source requirement, but it tells us how to weigh a judgement call.

### 2. Suggest a system

20 systems and 5 platforms are in. The bar is: open source, active in the last
six months, and enough public surface to study. That last one rejects most
suggestions. A system whose monorepo is private can still qualify on published
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

A few lines, because they explain most of the rules further down:

1. `data/*.json` holds the records. It is the only place facts are written.
2. `scripts/validate_data.mjs` checks every record against its schema. Nothing is
   generated until this passes.
3. `scripts/build_dashboard.py` turns those records into a payload and two HTML
   shells, using the markup, CSS and view functions in `dashboard/template.html`.
4. `scripts/build_md.py` turns the same payload into the markdown mirrors, the
   JSON twins, `llms.txt`, the sitemap and the public SQLite.
5. `scripts/build_dashboard.py --final` runs again, now that the `/ai` page copy
   exists and its file counts can be measured rather than typed.
6. `scripts/prerender.mjs` writes one static HTML file per route.

`./scripts/build.sh` runs them in order. It refuses to finish if a record fails
its schema, if a route renders empty, if a placeholder survives into the HTML, if
the nav and the route table disagree, or if the WebMCP tools and the `/ai` copy
name different tools.

Netlify runs the same script on every deploy, so what ships is always built from
`data/`, never from anything committed.

## The rules

**Three files in `dashboard/` are source: `template.html`, `favicon.svg` and
`og-image.png`.** Everything else in there is generated and gitignored, so an
edit to one is invisible to git and gone at the next build. Edit `data/` for
facts and `template.html` for markup, CSS and view logic.

**Every claim needs a `source_url`.** Not a citation, and not “the docs say”: a URL
that loads and shows the thing. This is the whole basis on which anyone trusts
the report, and it’s the one rule with no exceptions.

**Counts are computed, never typed.** 20, 5, 179, 157 and every other number on
the site is derived from the records at build time. If you find yourself typing a
number into prose, stop: a hand-typed number is a number that will be wrong in a
month.

The mechanism is a placeholder in `data/insights.json`. Write `{systems}` for 20,
`{systems:word}` for twenty, or `{systems:Word}` for a count that opens a
sentence; `compute_counts()` in `scripts/build_dashboard.py` lists the keys you
can use. The build fails on a key that doesn't exist and on a placeholder it
couldn't fill, so a typo can't reach the page.

**Data strings flow through `esc()` or `fmt()`.** Anything from `data/` that
reaches the DOM goes through one of them. `esc()` escapes HTML;
`fmt()` handles the light inline markup the descriptions use. Interpolating a
record string straight into an HTML template is how a stray `<` in somebody’s
docs quietly breaks a page.

**Blue means interactive.** The palette reserves blue for things you can click,
focus or tab to. If you’re adding colour to something that isn’t interactive,
it isn’t blue.

## Where the data lives

| File                               | What’s in it                                            |
| ---------------------------------- | ------------------------------------------------------- |
| `data/design-systems.json`         | The 20 system records: affordances, techniques, sources |
| `data/platforms.json`              | The 5 platform records and their capabilities           |
| `data/insights.json`               | The written findings, essay, methodology and caveats    |
| `schema/design-system.schema.json` | The system record schema and controlled vocabularies    |
| `schema/platform.schema.json`      | The platform record schema                              |
| `schema/insights.schema.json`      | The shape of the written analysis                       |

The schema is worth reading before you edit a record. `type`, `category`,
`audience` and `ai_maturity` are closed enums, and the build validates every
record against its schema before generating anything, so an invented value fails
the build and names itself rather than quietly falling out of every count that
groups by it.

`ai_maturity` is an editorial call against one rubric, not a score: `none`,
`emerging` (an llms.txt or an AI docs page, little more), `invested` (official
MCP, skills or rules with real engineering behind them), `ai-native` (AI
consumption is a core design goal). Arguing that a system is rated wrong is a
legitimate correction: open a data correction issue and make the case.

## Opening a pull request

```sh
git clone https://github.com/kaelig/state-of-ai-in-design-systems.git
cd state-of-ai-in-design-systems
npm install
npm run check                       # everything CI runs
```

`npm run check` has to pass. It runs the linters, the formatter, the type
checkers, the build, the tests and the markdown-layer self-check, and CI runs the
same script on your pull request, so a green run locally means a green run there.

Do not commit anything under `dashboard/`. It is generated and gitignored.
Netlify runs the build on every deploy and publishes what that writes, so
building locally is how you check your change rather than something you hand in.
A one-record correction should be a one-file diff, and a pull request that
touches generated output is the one to look at twice.

Requirements: Node 24 and Python 3.12, both pinned in `.nvmrc` and `runtime.txt`.
Building needs no Python packages. The linters do, and `npm run check` fetches
them for you with `uvx` if you do not already have them.

## If you’re an agent

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

Or drive the issue form directly. Prefill the text fields by their `id`, so a
human can review before submitting:

```
https://github.com/kaelig/state-of-ai-in-design-systems/issues/new
  ?template=data-correction.yml
  &labels=data
  &title=[data]+Primer
  &claim=...
  &correction=...
  &source=https://...
```

Field ids are in `.github/ISSUE_TEMPLATE/data-correction.yml`. The `title` and
the textareas prefill; the `subject` dropdown does not, so name the record in
`claim` and leave the dropdown for whoever submits.

Read the data rather than scraping the site. Every route has a `.md` twin and
every record has a `.json` twin, `/llms.txt` indexes all of them with measured
sizes, and `/mcp` serves the same records over MCP. Details: `/ai`, or `AGENTS.md`
in this repo.

Verify before you file. Fetch the `source_url` on the record you think is wrong
and confirm it actually says what the report claims. A correction based on a
model’s recollection of a library, rather than on a page that was fetched, is
worse than no correction, and it is obvious to the reviewer.

## What happens next

Corrections with a working source URL get applied. Corrections without one get a
reply asking for the link. Suggestions for new systems are queued and batched,
because each one is a research pass, not an edit.

The dataset is CC BY 4.0 and the code is MIT. Contributing means you’re fine with
your contribution going out under those. See [LICENSE](LICENSE) and
[LICENSE-DATA](LICENSE-DATA).
