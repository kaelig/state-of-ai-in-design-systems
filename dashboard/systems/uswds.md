---
title: "U.S. Web Design System (USWDS) — AI affordances"
description: "USWDS is the sharpest public-sector contrast case in this study: a heavily-used, actively-committed federal design system with essentially zero consumer-facing AI…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/uswds"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/uswds.json"
id: "uswds"
category: "design-system"
ai_maturity: "emerging"
affordance_count: 6
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-28T04:35:23Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# U.S. Web Design System (USWDS) — AI affordances

U.S. General Services Administration (GSA) / Technology Transformation Services · design-system · Public domain / CC0-1.0 (U.S. Government work, LICENSE.md) · AI maturity: **emerging** (llms.txt or an AI docs page, little more). 6 affordances, 8 coercion techniques.

- Docs: https://designsystem.digital.gov
- Repo: https://github.com/uswds/uswds
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/uswds.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/uswds

## Summary

USWDS is the sharpest public-sector contrast case in this study: a heavily-used, actively-committed federal design system with essentially zero consumer-facing AI affordances and exactly one builder-facing one. There is no llms.txt, no llms-full.txt, no /ai docs page, no official MCP server, no Code Connect, no distributed editor rules. designsystem.digital.gov returns a 404 HTML page for every AI-convention path probed. What the team does ship, as of 2026-07-06, is a single official `AGENTS.md` at the repo root (PR #6748, merged), a terse, high-density operational brief for contributors’ coding agents that reads as pure onboarding compression rather than design-system coercion. Every agent affordance aimed at people *building with* USWDS is community-built and explicitly disclaims federal endorsement.

## Maintenance

- Actively maintained: yes
- Last release: v3.13.0, published 2025-05-23 (npm @uswds/uswds latest = 3.13.0; no 3.14 tag as of 2026-07-27 — a 14-month release gap)
- Activity: Repo commits are current: latest commits on `develop` dated 2026-07-24 (contributors-update automation) and 2026-07-23 (Sass `if` syntax task #6747). So: active day-to-day maintenance, stalled release cadence. Public reporting from March 2026 describes the USWDS core team as effectively one person (Anne Petersen), with design-file updates deprioritized, consistent with the observed release gap, though this study did not find a first-party GSA statement confirming headcount, so treat that as unverified.

## AI affordances (6)

### AGENTS.md (uswds/uswds repo root)

Type: `agents-md` (AGENTS.md) · Official · Audience: builders

The only official AI affordance in the entire uswds GitHub org. A ~4.3KB vendor-agnostic agents.md-convention file covering Runtime, Architecture, Common Commands, Testing Quirks, Style/Lint, Git/PR Workflow, and Gotchas. Merged 2026-07-06 via PR #6748 closing issue #6711; only two commits touch it (‘add agents file’, ‘update agents’). Its value is disambiguation of a genuinely confusing build (Gulp 4 not Vite, `develop` not `main`, packages/ monorepo that is not an npm workspace, Mocha+jsdom not Jest). It contains no design-token or component-usage constraints; it is a contributor onboarding doc, not a generation guardrail.

- Code: https://github.com/uswds/uswds/blob/develop/AGENTS.md

Notes: PR body: 'AI coding agents (e.g., OpenCode, Copilot Workspace, Cursor) operating on this repository lacked a structured reference for USWDS-specific conventions... AGENTS.md is a lightweight, zero-dependency way to improve agent accuracy with no impact on end users or the build pipeline.' Note the framing: cost-free, no user impact, no pipeline risk. That is how AI adoption gets justified inside a federal repo.

```markdown
## Git / PR Workflow

- **Default Branch**: `develop` (not `main`); PRs target `develop`. `main`/`library--main` trigger npm publish; do not push.
- **Commit Signatures**: All commits *must* be verified (GPG/SSH); unsigned rejected by `verify-commit-signatures.yml`. Sign before commit.
- **`COMMUNITY.md`**: Do not edit unless requested.
```

Source: https://raw.githubusercontent.com/uswds/uswds/HEAD/AGENTS.md

### Planned: accessibility skill for coding agents (issue #6749)

Type: `claude-skill` (Agent skill) · Official · Audience: builders

Open issue filed 2026-07-06 by the same maintainer who merged AGENTS.md, immediately after reviewer @jonathanbobel proposed an accessibility section. @ethangardner’s reply on PR #6748: 'What you describe sounds like it would be a great addition. I’ll add an issue so we can make that a skill for accessibility that’s included in the repo per our Slack convo.' Issue #6711 had also originally scoped a `.agents/skills/` directory; that acceptance criterion was dropped, and no `.agents/` directory exists in the repo today. This is the clearest signal of intended direction: a11y-as-a-skill, not component-generation-as-a-skill.

- Docs: https://github.com/uswds/uswds/issues/6749

Notes: Unbuilt as of 2026-07-27. The proposed content (quoted in the PR thread) is notable for its constraint language: 'Automated `test:a11y` (pa11y/aXe) failures are blocking, not advisory’ and 'don’t treat a component-level fix as closing an app-level a11y issue reported against a downstream project.'

### uswds-mcp (bibekpdl)

Type: `mcp-server` (MCP server) · Community · Audience: consumers

The most substantial USWDS agent affordance in existence, and it is unofficial. Published to npm as `uswds-mcp`, registry name `io.github.bibekpdl/uswds-mcp`, runnable via `npx -y uswds-mcp`. Ships a prebuilt `data/records.json` index ingested from the public uswds/uswds and uswds/uswds-site repos (the site’s `_data/*.yml` token and package files make this scrapeable). Nine tools: search_uswds, get_component, get_pattern, get_template, recommend_uswds_structure, generate_uswds_page, validate_uswds_markup, get_uswds_integration_recipe, validate_uswds_project_setup. Plus MCP resources `uswds://component/{slug}`, `uswds://pattern/{slug}`, `uswds://template/{slug}`, `uswds://token/{category}`. Bundles its own Codex/agent skill at `.agents/skills/uswds/SKILL.md`, the exact path uswds/uswds dropped from its own acceptance criteria.

- Code: https://github.com/bibekpdl/uswds-mcp

Notes: Leads with a disclaimer: 'not affiliated with, endorsed by, sponsored by, or maintained by the U.S. General Services Administration (GSA), Technology Transformation Services (TTS), or the official USWDS team.' Its own skill repeats the constraint to the model: ‘do not imply GSA, TTS, or the official USWDS team endorses the output.’ 1 GitHub star as of 2026-07-27: high engineering quality, near-zero adoption signal.

### USWDS-prototype Claude plugin (emilycryan/USWDS-design)

Type: `claude-skill` (Agent skill) · Community · Audience: consumers

A Claude Code plugin marketplace repo (`.claude-plugin/marketplace.json`) shipping one skill, `USWDS-prototype`, aimed at product designers producing federal-looking prototypes. Curated-context approach rather than tool-gating. The skill carries its own offline context bundle: `assets/components.md`, `assets/tokens-color.md`, `assets/tokens-spacing.md`, `assets/tokens-typography.md`, `assets/fonts.md`, plus `examples/starter.html` and a full worked prototype (`prototypes/doe-renewable-energy.html`) as a few-shot exemplar. Four output modes (Spec / HTML / Figma / Paper). Pins USWDS to an exact CDN version.

- Code: https://github.com/emilycryan/USWDS-design

Notes: Authored from an ICF (contractor) perspective; the skill’s own description literally begins ‘You are a product designer (or a role acting as a product designer) at ICF’. Illustrates how agency contractors, not GSA, are filling the AI-affordance vacuum.

### react-uswds-mcp (focus-digital)

Type: `mcp-server` (MCP server) · Community · Audience: consumers

MCP server for the third-party React port `@trussworks/react-uswds`. Distinct architecture from uswds-mcp: instead of shipping a scraped docs index, it indexes the consumer’s own locally-installed package from `node_modules` (configurable via `REACT_USWDS_PACKAGE`) and exposes component discovery, best-effort props-surface inspection, import/usage snippet generation, and use-case-to-component suggestion. Local-install-as-source-of-truth avoids version drift between the agent’s context and the project’s actual dependency.

- Code: https://github.com/focus-digital/react-uswds-mcp

Notes: 0 stars, last push 2025-12-16. Note that trussworks/react-uswds itself, by far the most-used React implementation, has no AGENTS.md, CLAUDE.md, .cursorrules, or llms.txt (all four probed, all 404).

### Other community MCP experiments

Type: `mcp-server` (MCP server) · Community · Audience: consumers

Two further low-signal projects surfaced: `ctrimm/uswds-local-mcp-server` (‘stand up a local mcp server to interact with USWDS’, last push 2026-01-04) and `Chris39704/ui_mcp` (‘MCP server for the latest MUI, Angular Material, and USWDS documentation and context’, last push 2026-03-17). Both 0 stars. Recorded for completeness of the community picture; neither is production-signalling.

- Code: https://github.com/ctrimm/uswds-local-mcp-server

Notes: Listed together because individually they are noise; collectively they show repeated independent attempts to build the MCP layer GSA has not.

## Coercion techniques (8)

### Anti-hallucination gotcha list (build-system disambiguation)

Category: `instruction-files` (Instruction files) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/instruction-files.md

The dominant technique in USWDS’s own AGENTS.md is not prohibiting design decisions. It pre-empts the specific wrong assumptions an LLM makes about an unusual 2015-era-lineage build. Note the explicit negations: ‘Not direct npm scripts’, ‘Do not assume Vite builds the whole project’, ‘Generated; do not edit’, ‘not Jest/Vitest’. Each one is a correction of a plausible model prior. This is the cheapest, highest-yield agent-file pattern for legacy toolchains, and it costs the team nothing to maintain.

```markdown
- **Build**: Gulp 4 (`gulpfile.js`, `tasks/*.js`). Not direct npm scripts. Vite is only for web-components CDN banner (`vite.config.banner.cdn.js`); main lib uses Gulp/Browserify/Uglify. Do not assume Vite builds the whole project.

- **`dist/`**: Generated; do not edit. `gulp cleanDist` clears.
- **Project Focus**: US federal (GSA/TTS) open source project. Accessibility, performance, and security are critical. All updates must align with these requirements.

- **JS Unit Tests**: Mocha with `jsdom-global/register` (browser-ish env); not Jest/Vitest. `sinon` available.
```

Source: https://raw.githubusercontent.com/uswds/uswds/HEAD/AGENTS.md

### Human-review-preserving framing (opt-in, non-replacing)

Category: `other` (Other) · all 2 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/other.md

The governance language around adopting agent files in a federal repo is itself the finding. Issue #6711’s Notes section explicitly firewalls the agent file from the review process, a formulation that lets an AI-tooling change clear a public-sector approval bar. Note also that the acceptance criterion for a `.agents/skills/` directory was silently dropped between the issue and the merged PR: only the vendor-agnostic prose file shipped.

```markdown
Create an `AGENTS.md` file and a `.agents/skills/` directory with basic skills to help contributors and maintainers using agents work more effectively with USWDS.

## Acceptance Criteria

- [x] A vendor agnostic `AGENTS.md` is created with comprehensive project context

## Notes

- This is opt-in for contributors who use agents
- This does not replace human code review or existing CI/CD.
```

Source: https://github.com/uswds/uswds/issues/6711

### Mandatory validator loop before finalizing output

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

Community uswds-mcp’s skill forbids the agent from declaring done until its own MCP validator tools return clean. This is the strongest coercion mechanism in the USWDS ecosystem, and it is unofficial. Two validators are gated: `validate_uswds_markup` (DOM/class/ARIA/token drift) and `validate_uswds_project_setup` (import paths, CDN usage, global CSS blast radius).

```markdown
8. Validate generated markup with `validate_uswds_markup` and validate project setup with `validate_uswds_project_setup` before finalizing.

- Do not finalize generated markup until the MCP validator reports no errors; if warnings remain, explain why they are acceptable or what the user should fix.
- Do not claim Section 508 compliance from component usage alone; USWDS guidance still requires project-specific accessibility testing.
```

Source: https://raw.githubusercontent.com/bibekpdl/uswds-mcp/HEAD/.agents/skills/uswds/SKILL.md

### Query-the-server-before-you-choose (tool gating)

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

uswds-mcp’s skill orders the agent to hit MCP tools before making UI decisions and before writing framework code, and establishes a precedence hierarchy: official templates > patterns > individual components, with third-party React ports demoted to ‘optional adapters, not the source of truth’. It even makes the agent smoke-test the server’s availability with a `search_uswds('button')` call before proceeding, with a scripted recovery path if the index is empty.

```markdown
1. Verify the MCP server `io.github.bibekpdl/uswds-mcp` is available by calling `search_uswds` with a small query such as `button`.
2. If tools return an empty-index error, tell the user to run `npm run ingest` in the package checkout or reinstall a package that includes `data/records.json`.
3. Query the USWDS MCP before choosing UI patterns.
4. Prefer official templates and patterns before composing individual components.
5. Use official USWDS HTML structure and classes as the canonical output.
6. For framework work, call `get_uswds_integration_recipe` before writing code.
7. Adapt to React, Next.js, Angular, Rails, Drupal, or other frameworks only after preserving the documented USWDS DOM shape, classes, ARIA, ids, and data attributes.
```

Source: https://raw.githubusercontent.com/bibekpdl/uswds-mcp/HEAD/.agents/skills/uswds/SKILL.md

### Token-over-custom-CSS with an explicit escape hatch

Category: `token-enforcement` (Token enforcement) · all 13 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md

Rather than an absolute ban on custom CSS (which models violate and then rationalize), uswds-mcp’s skill sets a preference order plus a bounded, named exception: ‘small, documented, and subordinate’. Worth contrasting with the community Claude skill, which uses the blunter absolute prohibition form.

```markdown
- Prefer USWDS design tokens, Sass settings, and utilities over custom CSS.
- Custom CSS is acceptable for application-specific layout and integration gaps, but keep it small, documented, and subordinate to USWDS tokens/utilities.
- Treat third-party framework implementations as optional adapters, not the source of truth.
```

Source: https://raw.githubusercontent.com/bibekpdl/uswds-mcp/HEAD/.agents/skills/uswds/SKILL.md

### Absolute prohibition on inventing UI

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

The emilycryan Claude skill opens with a four-line Core Behavior block using the strongest available form: ‘Always’ / ‘Do not invent’. Contrast with uswds-mcp’s graduated preference language. Both are community-authored; USWDS itself publishes no such constraint anywhere.

```markdown
## Core Behavior
- Always use USWDS components and patterns
- Do not invent custom UI if a USWDS pattern exists
- Follow standard government UX conventions
- Prioritize clarity, accessibility, and simplicity
```

Source: https://raw.githubusercontent.com/emilycryan/USWDS-design/main/plugins/uswds-prototype/skills/USWDS-prototype/SKILL.md

### Version-pinned CDN exemplar shell

Category: `exemplars` (Exemplars) · all 10 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md

Because there is no official machine-readable registry, the community skill hard-codes a pinned CDN version and a mandatory HTML shell, then ships a full worked example page (`prototypes/doe-renewable-energy.html`) and `examples/starter.html` as few-shot grounding. Note ‘always use these exact versions’: pinning to 3.13.0 is a direct consequence of USWDS’s 14-month release gap making version drift a non-issue, but it will silently rot on the next release.

````markdown
### CDN links (always use these exact versions)

```html
<!-- In <head> — load init script first -->
<script src="https://unpkg.com/@uswds/uswds@3.13.0/dist/js/uswds-init.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@uswds/uswds@3.13.0/dist/css/uswds.min.css">

<!-- Before </body> — load full JS last -->
<script src="https://unpkg.com/@uswds/uswds@3.13.0/dist/js/uswds.min.js"></script>
```

### Required HTML shell

Every prototype must use this base structure:
````

Source: https://raw.githubusercontent.com/emilycryan/USWDS-design/main/plugins/uswds-prototype/skills/USWDS-prototype/SKILL.md

### De-facto registry via scrapeable Jekyll data files

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

USWDS publishes no agent registry, but uswds-site’s Jekyll `_data/` directory is a structured, machine-readable substrate that community tools ingest: `_data/tokens/{color,spacing,shadow,opacity,z-index,order,flex,conversion,special}.yml`, `_data/packages.yml` (per-component name, fullSize, sourceSize, dependency graph), `_data/utilities.yml`, `_data/settings/`. uswds-mcp’s `npm run ingest` builds its whole index from this plus the component repo. Accidental agent-readiness: the data is structured for a docs site, and agents get it as a side effect.

```yaml
- name: "usa-accordion"
  fullSize: 10
  sourceSize: 3
  dependencies:
    - "uswds-fonts"
    - "usa-icon"
- name: "usa-alert"
  fullSize: 13
  sourceSize: 7
  dependencies:
    - "uswds-fonts"
    - "usa-icon"
- name: "usa-banner"
  fullSize: 32
  sourceSize: 7
  dependencies:
    - "uswds-fonts"
    - "usa-media-block"
```

Source: https://raw.githubusercontent.com/uswds/uswds-site/HEAD/_data/packages.yml

## Platform integrations (3)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

Official USWDS Design Kit (Beta) published to Figma Community since November 2024: 42 components built with USWDS design tokens, using variables and smart layouts. Docs state 'We’ve provided an official USWDS design kit for Figma since November 2024. We’ve stopped maintaining our Adobe XD assets.' No Figma Code Connect, no Dev Mode MCP support, no published variable-to-token mapping for agents. The getting-started-for-designers page contains zero references to Code Connect, Storybook, or AI tooling.

Link: https://www.figma.com/community/file/1440921849343185329/uswds-design-kit-beta

### Storybook (addon-mcp, manifests, AI docs)

Storybook is used internally as the dev environment and a11y test harness: `npm start` runs Storybook on :6006, component packages ship `src/*.stories.js`, and `npm run test:a11y` drives Playwright + Axe against a built Storybook (`_site/`). But there is no publicly hosted Storybook instance; https://designsystem.digital.gov/storybook/ and https://uswds.github.io/uswds/ both 404. No @storybook/addon-mcp or equivalent agent integration.

Link: https://github.com/uswds/uswds/tree/develop/.storybook

### other

Design assets also distributed as a versioned ZIP (Figma + Sketch) from uswds-for-designers releases. No Supernova, Knapsack, or zeroheight presence found; the docs site is a self-hosted Jekyll build (uswds/uswds-site), which is why its `_data/` YAML is the only structured surface agents can consume.

Link: https://github.com/uswds/uswds-for-designers

## Building the system vs. consuming it

### For consumers (agents building UIs with U.S. Web Design System (USWDS))

Nothing official. Every AI-convention path on designsystem.digital.gov returns the site’s 404 HTML page: /llms.txt, /llms-full.txt, /ai/, /documentation/ai/ (all 404, all serving a 40KB HTML error page rather than any text file). robots.txt contains a single Sitemap line and nothing else: no AI-crawler directives in either direction. There is no official MCP server, no component registry endpoint, no shadcn-style CLI, no ‘Add to Cursor’ button, no distributed .cursorrules template, no Claude skill, no Code Connect. Consumers relying on agents get three things by accident: (1) the docs site’s Jekyll `_data/*.yml` token/package files, structured enough to scrape; (2) very high pretraining density: USWDS HTML/class conventions are stable since 3.0 in 2022 and heavily represented in public federal code; (3) unofficial community MCP servers and Claude skills that disclaim GSA endorsement in their first paragraph. The single most-used React implementation, @trussworks/react-uswds, likewise has no AGENTS.md, CLAUDE.md, .cursorrules, or llms.txt.

### For builders (the U.S. Web Design System (USWDS) team using AI on the system itself)

Exactly one artifact, three weeks old at time of study: `AGENTS.md` at the root of uswds/uswds, merged 2026-07-06 (PR #6748, closing issue #6711, two commits total). It is deliberately vendor-neutral: no CLAUDE.md, no .cursorrules, no .cursor/rules/, no .github/copilot-instructions.md, no .claude/ or .agents/ directory anywhere in the org (all probed; all 404 or absent). Nothing in the 7 GitHub Actions workflows is AI-related (build-diff, codeql-analysis, contributors, release, verify-commit-signatures, verify-documentation-links). Neither uswds/uswds nor uswds/uswds-site CONTRIBUTING.md mentions AI, agents, Copilot, LLMs, or generative tooling at all. There is no disclosure policy for AI-assisted contributions, which for a federal repo requiring GPG/SSH-verified commits on every change is a conspicuous gap. No AI-assisted codemods or migration tooling found. One roadmapped item: issue #6749, an accessibility skill for coding agents, open and unstarted. An earlier community attempt at agent directions (PR #6654, mgifford, May 2026) was closed unmerged with zero files changed.

## Gaps

Not confirmed, or not found: (1) The ‘team of one (Anne Petersen)’ claim about current USWDS staffing came from a secondary search result dated March 2026; no first-party GSA/TTS statement confirming it and did not verify it. The 14-month release gap is consistent with reduced capacity, but it is not proof. (2) this study did not read the source of ctrimm/uswds-local-mcp-server or Chris39704/ui_mcp; both are 0-star and listed only to complete the community landscape. (3) this study did not audit the internals of uswds-mcp’s validator implementations; the coercion language quoted is from its shipped skill file, not from verified tool behavior. (4) this study did not probe designsystem.digital.gov’s internal search or every docs subpage for AI mentions; the four canonical AI paths plus the designers’ getting-started page were checked directly and were clean. (5) Possible AI usage inside GSA/TTS that is not visible in public repos (internal Slack was referenced twice in PR #6748 and issue #6749 (‘per our Slack convo’), so some AI-tooling decisions demonstrably happen off-GitHub and are not auditable here). (6) No evidence either way on whether GSA has an internal policy governing AI-assisted contributions to public repos.

## Sources (15)

- https://raw.githubusercontent.com/uswds/uswds/HEAD/AGENTS.md

- https://github.com/uswds/uswds/pull/6748

- https://github.com/uswds/uswds/issues/6711

- https://github.com/uswds/uswds/issues/6749

- https://github.com/uswds/uswds/pull/6654

- https://designsystem.digital.gov/llms.txt

- https://designsystem.digital.gov/robots.txt

- https://designsystem.digital.gov/documentation/getting-started-for-designers/

- https://github.com/bibekpdl/uswds-mcp

- https://raw.githubusercontent.com/bibekpdl/uswds-mcp/HEAD/.agents/skills/uswds/SKILL.md

- https://raw.githubusercontent.com/emilycryan/USWDS-design/main/plugins/uswds-prototype/skills/USWDS-prototype/SKILL.md

- https://github.com/focus-digital/react-uswds-mcp

- https://raw.githubusercontent.com/uswds/uswds-site/HEAD/_data/packages.yml

- https://registry.npmjs.org/@uswds/uswds

- https://www.figma.com/community/file/1440921849343185329/uswds-design-kit-beta

---

Generated 2026-07-28T04:35:23Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
