---
title: "Atlassian Design System (ADS / Atlaskit) — AI affordances"
description: "ADS is one of the most deliberately AI-engineered design systems in the study: an official MCP server shipped both hosted (https://mcp.atlassian.com/v1/ads/public/mcp)…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.json"
id: "atlassian-design-system"
category: "design-system"
ai_maturity: "ai-native"
affordance_count: 8
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-27T21:55:33Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Atlassian Design System (ADS / Atlaskit) — AI affordances

Atlassian · design-system · AI maturity: **ai-native** (AI consumption is a design goal, with dedicated surfaces and staff behind it). 8 affordances, 8 coercion techniques.

- Docs: https://atlassian.design
- Repo: https://bitbucket.org/atlassian/atlassian-frontend-mirror
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system

## Summary

ADS is one of the most deliberately AI-engineered design systems in the study: an official MCP server shipped both hosted (https://mcp.atlassian.com/v1/ads/public/mcp) and as npm stdio (`@atlaskit/ads-mcp`, v1.7.1 published the day of this research), a topic-split llms.txt suite, a public `DESIGN.md` portable design-context manifest, and an internal `atlassian-design-system` agent skill — all generated from the same structured content source. The MCP server carries an unusual amount of coercion engineering: server-level `instructions`, a two-tier `ads_*` (canonical) vs `atlaskit_*` (fallback research) tool hierarchy, “You MUST call this” accessibility gating, “last resort” discouragement of full-catalog dumps, an axe-core analyze→fix loop, and opt-out telemetry on every tool call. Atlassian has also published comparative evals (MCP vs skill vs DESIGN.md vs no context) with token/time/turn numbers — rare in this dataset. The BUILDING direction is largely unobservable: the public Bitbucket repo is a one-way daily automated mirror of the internal monorepo with no AGENTS.md/CLAUDE.md/.cursorrules at root.

## Maintenance

- Actively maintained: yes
- Last release: @atlaskit/ads-mcp 1.7.1 — 2026-07-27T09:40:14Z (npm registry `time`)
- Activity: Public repo receives automated mirror commits daily (latest observed: 2026-07-26T13:38:30+00:00, message “Automatic commit created Sun Jul 26 13:38:30 UTC 2026”) — it is an export, not a development repo. ads-mcp shipped 1.5.2→1.7.1 in the recent version window; remote MCP endpoint responded live to an `initialize` JSON-RPC call (serverInfo: atlassian-mcp-server 1.0.0, protocolVersion 2025-06-18). MCP README states “Current state: Early Access”.

## AI affordances (8)

### ADS MCP server (remote, hosted)

Type: `mcp-server` (MCP server) · Official · Audience: both

Hosted HTTP/streamable MCP endpoint at https://mcp.atlassian.com/v1/ads/public/mcp. Verified live: `initialize` returns protocolVersion 2025-06-18, serverInfo {name: atlassian-mcp-server, version: 1.0.0}, capabilities logging/tools/resources. `tools/list` returned 16 tools: ads_plan, ads_search_tokens, ads_search_icons, ads_search_components, ads_get_all_tokens, ads_get_all_icons, ads_get_all_components, ads_get_guidelines, ads_get_a11y_guidelines, ads_analyze_a11y, ads_suggest_a11y_fixes, ads_get_lint_rules, ads_migration_guides, ads_i18n_conversion_guide, atlaskit_get_components, atlaskit_search_components (+ hooks/utilities tool entry points present in the package). Note: the report’s lead URL https://mcp.atlassian.com/v1/ads is a 404 — the path needs /public/mcp.

- Docs: https://atlassian.design/llms.txt

Notes: ads_analyze_localhost_a11y (live-URL axe run) is deliberately NOT exposed on the remote deployment — ‘only exposed when this MCP runs locally’.

### @atlaskit/ads-mcp (local stdio)

Type: `mcp-server` (MCP server) · Official · Audience: both

Published npm package, `npx -y @atlaskit/ads-mcp`. v1.7.1, description: ‘The official Atlassian Design System MCP server to develop apps and user interfaces matching the Atlassian style.’ Bundles its own catalogs (tokens/icons/components codegen), fuse.js fuzzy search, zod schemas, axe-core + playwright/puppeteer for accessibility analysis. Source mirrored at design-system/ads-mcp. README documents per-IDE config for Cursor, VS Code Copilot, Codelassian, Rovodev, and the Atlas CLI MCP plugin, plus one-click vscode:mcp/install badges.

- Docs: https://www.npmjs.com/package/@atlaskit/ads-mcp

- Code: https://bitbucket.org/atlassian/atlassian-frontend-mirror/src/HEAD/design-system/ads-mcp/

Notes: Ships opt-out telemetry: tool name, tool parameters, success/failure, agent, os, version, staffId. Opt out with ADSMCP_ANALYTICS_OPT_OUT=true. `ADSMCP_AGENT` enum: cursor | vscode | rovodev | codelassian | unknown.

### llms.txt + topic-split sets

Type: `llms-txt` (llms.txt) · Official · Audience: consumers

https://atlassian.design/llms.txt (5,781 bytes, text/plain) is a hand-curated index, not a link dump: it names packages, lists key features, embeds an ESLint config snippet and a Hypermod codemod command, and links six topic sets — llms-components.txt, llms-primitives.txt, llms-tokens.txt, llms-styling.txt, llms-a11y.txt (verified 200, 20,929 bytes), llms-content.txt. It also advertises the MCP server and the internal agent skill.

- Docs: https://atlassian.design/llms.txt

Notes: llms-full.txt (859KB) was serving an S3 error document during part of this study but now returns valid markdown.

```markdown
### ADS MCP server

Official Model Context Protocol server for ADS tokens, icons, components and primitives, and accessibility tooling.

- **Remote (hosted):** [https://mcp.atlassian.com/v1/ads/public/mcp](https://mcp.atlassian.com/v1/ads/public/mcp) — point your MCP client at this URL (HTTP transport).
- **Local (stdio):** `npx -y @atlaskit/ads-mcp` — run the published [`@atlaskit/ads-mcp`](https://www.npmjs.com/package/@atlaskit/ads-mcp) package.

### Internal skill: `atlassian-design-system` (Atlassian only)

The **`atlassian-design-system`** agent skill bundles progressive-disclosure guidance for ADS tokens and components together with MCP-oriented workflows. It is generated from the same content as this file and is published for internal usage with `@atlassian/skills`.
```

Source: https://atlassian.design/llms.txt

### DESIGN.md — portable design-context manifest

Type: `other` (Other) · Official · Audience: consumers

https://atlassian.design/DESIGN.md (80,756 bytes, content-type text/markdown) — `version: alpha, revision: 0.0.7`. ~1,000 lines of YAML frontmatter (every color hex, type scale, spacing, radii, border widths, component ‘recipes’) followed by ~700 lines of prose governed by RFC 2119. Atlassian is an author/adopter of the emerging DESIGN.md spec. Explicitly scoped: 'This file is for generating UI in the style of Atlassian’s system, not for use generating production screens inside Atlassian apps’ — it routes production work to the MCP server or the ADS skill.

- Docs: https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice

```markdown
# Atlassian DESIGN.md

> A portable, token-first manifest for producing anything that should look like it belongs at
> Atlassian — product UI, slides, charts, dashboards, onboarding screens, or marketing surfaces.

Everything needed to build UI is in this file: **YAML above** (every color hex, type scale, spacing,
corner radii, border widths, and a few control "recipes") plus **this prose** (how the pieces fit
together). Rules use RFC 2119: MUST, MUST NOT, SHOULD, MAY.

For implementation-level references — per-component API bindings, dark/light token catalogs, prompt
guidance, and linting rules — load the Atlassian Design System MCP server or
**atlassian-design-system** skill.
```

Source: https://atlassian.design/DESIGN.md

### atlassian-design-system agent skill

Type: `claude-skill` (Agent skill) · Official · Audience: both

Progressive-disclosure agent skill for ADS token/component lookup and ADS MCP usage, generated from the same structured content as llms.txt. Published internally via `@atlassian/skills` — NOT available on the public npm registry (registry.npmjs.org/@atlassian/skills returns 404). Referenced by both llms.txt and DESIGN.md as the recommended implementation-level context source. Atlassian’s own published eval measured it head-to-head against the MCP server.

- Docs: https://atlassian.design/llms.txt

Notes: Internal only — content and SKILL.md frontmatter are not publicly observable.

### @atlaskit/eslint-plugin-design-system + @atlaskit/eslint-plugin-ui-styling-standard

Type: `other` (Other) · Official · Audience: consumers

Deterministic enforcement layer surfaced to agents two ways: (a) the recommended config is embedded directly in llms.txt so an agent wiring up a repo installs the guardrail, and (b) the MCP server ships `ads_get_lint_rules`, which returns bundled docs for rules like `icon-label`, `ensure-proper-xcss-usage`, `no-deprecated-apis` so a model can explain and fix a lint error without leaving the tool loop. DESIGN.md names the plugins as ‘enforcement layer for CI in repos that wire them up.’

- Docs: https://atlassian.design/llms.txt

### Hypermod codemod CLI + ads_migration_guides

Type: `codemod-ai` (AI codemod) · Official · Audience: consumers

llms.txt hands agents the exact codemod invocation (`npx @hypermod/cli --packages="@atlaskit/tokens#theme-to-design-tokens" --experimental-loader --parser tsx `) with example package targets. Complemented by the MCP `ads_migration_guides` tool, which returns structured before/after migration guides for an enum of known migrations (jira-spotlight, single-step, multi-step, motion) and whose schema ‘enforces valid combinations’ of migration id + description.

- Docs: https://atlassian.design/llms.txt

### design-system/storybook-addon

Type: `storybook-integration` (Storybook) · Official · Audience: builders

A `storybook-addon` package exists under design-system/ in the mirror alongside ads-mcp. Its contents were not inspected in this pass and no AI-specific behaviour is claimed.

- Code: https://bitbucket.org/atlassian/atlassian-frontend-mirror/src/HEAD/design-system/

Notes: Listed for completeness; AI relevance unverified.

## Coercion techniques (8)

### Two-tier tool hierarchy: ads_* canonical, atlaskit_* fallback-only

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

The single strongest coercion device. The server’s `instructions` and README both establish a priority order and then explicitly demote the broader catalog: ‘Do not treat Atlaskit results as equal-priority replacements for ADS components in standard UI decisions.’ Individual tool descriptions reinforce it (‘Prefer ADS resources first for standard UI’). This stops a model from reaching for a deprecated or non-ADS `@atlaskit/*` package just because the search index surfaced it.

```markdown
Use `ads_*` tools first for standard UI work. They are the canonical source for ADS components,
tokens, icons, foundations, accessibility, lint rules, i18n, and migrations.

### Atlaskit Fallback Research Tools

- `atlaskit_get_components` - Get a compact inventory of public `@atlaskit/*` component packages
  outside the ADS catalog
- `atlaskit_search_components` - Search non-ADS public `@atlaskit/*` components with examples and
  props
- `atlaskit_get_hooks` - Get a compact inventory of public `@atlaskit/*` hooks outside the ADS
  catalog
- `atlaskit_search_hooks` - Search non-ADS public `@atlaskit/*` hooks with usage details
- `atlaskit_get_utilities` - Get a compact inventory of public `@atlaskit/*` utilities outside the
  ADS catalog
- `atlaskit_search_utilities` - Search non-ADS public `@atlaskit/*` utilities with usage details

Use `atlaskit_*` tools for fallback research when an ADS search has no useful match, or when you are
looking for a public `@atlaskit/*` package that is not part of ADS. Do not treat Atlaskit results as
equal-priority replacements for ADS components in standard UI decisions.
```

Source: https://bitbucket.org/atlassian/atlassian-frontend-mirror/raw/HEAD/design-system/ads-mcp/README.md

### Server-level `instructions` string as a persona + routing table

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

`@atlaskit/ads-mcp` ships a dedicated `dist/cjs/instructions.js` module exporting a single `instructions` string injected at MCP handshake time. It sets a persona (‘You are an expert in the Atlassian Design System’), encodes the ads_*/atlaskit_* split, and — notably — pairs each ADS tool with a sibling Context Engine MCP tool so the model composes org-wide policy with system-specific guidance instead of choosing one. It ends with an explicit escape hatch to the llms.txt files for deep research.

```text
You are an expert in the Atlassian Design System (ADS).
You can search for tokens, icons, and components and return guidance on how to build user interfaces.
Use ads_* tools for canonical ADS resources: components, tokens, icons, foundations, accessibility, lint rules, i18n, and migrations.
Use atlaskit_* tools only for further research into public @atlaskit/* scoped packages that are not covered by the ADS catalog, such as non-ADS components, hooks, and utilities. Prefer ADS resources first for standard UI.
You have special accessibility knowledge and can ensure interfaces built with ADS components are accessible to all users.
You can analyze code for accessibility violations, provide specific fix suggestions, and offer guidance on accessibility best practices.
For org-wide standards alongside ADS tools: pair Context Engine `get_accessibility_docs` with `ads_get_a11y_guidelines`, `get_content_standards_docs` with `ads_get_guidelines`, and `ads_i18n_conversion_guide` (Traduki/i18n policy plus the bundled formatMessage refactor guide).
These tools will support you, but for deep research you may also fetch https://atlassian.design/llms.txt, https://atlassian.design/llms-a11y.txt, or https://atlassian.design/ directly.
```

Source: https://unpkg.com/@atlaskit/ads-mcp@1.7.1/dist/cjs/instructions.js

### Mandatory accessibility gate ('You MUST call this')

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

`ads_get_a11y_guidelines` is the only tool in the set written as an obligation rather than an affordance, and it pre-empts the model’s parametric knowledge: ‘DO NOT rely on generic web accessibility advice alone—ADS conventions may differ.’ It also splits jurisdiction between org-wide standards (Context Engine `get_accessibility_docs`) and ADS-specific patterns.

```text
Returns Atlassian Design System (ADS) accessibility guidance: best practices and patterns for buttons, interactions, color contrast, forms, and other design-system topics shipped in this tool.

Use this alongside the Context Engine MCP tool `get_accessibility_docs` for Atlassian-wide accessibility standards (e.g. A11YKB); this tool supplies ADS-specific component and pattern guidance.

WHEN TO USE:
You MUST call this when generating or substantially changing a new interactive or visual user interface built with ADS, or when you need topic-specific ADS guidance (e.g. focus, forms, motion).

DO NOT rely on generic web accessibility advice alone—ADS conventions may differ. Use `get_accessibility_docs` for org-wide standards and this tool for ADS-topic guidance.
```

Source: https://mcp.atlassian.com/v1/ads/public/mcp

### `ads_plan` as the default one-shot discovery call, with full-catalog dumps demoted to 'last resort'

Category: `token-enforcement` (Token enforcement) · all 13 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md

Token budget is treated as a first-class design constraint. `ads_plan` fans out to token/icon/component/atlaskit searches in one call and is positioned as ‘the default way to discover’; it even coaches recall behaviour (‘Prefer supplying **multiple** terms per non-empty array... broader queries improve recall’) and requires at least one non-empty array. Symmetrically, all three `ads_get_all_*` tools are labelled ‘Last resort’ and ‘**very large** output’ so a model does not burn its window enumerating catalogs. Blog-reported effect of the structured-content work: ‘26% reduction in AI tooling calls, with 16% reduction in AI token usage’.

```text
### ads_plan
Runs **ads_search_tokens**, **ads_search_icons**, **ads_search_components**, and **ads_search_atlaskit_components** in one call and returns a single JSON payload (each section only if that list was non-empty). Use this as the default way to discover ADS **tokens**, **icons**, and **components** (including legacy/broader Atlaskit) for a UI task.

WHEN TO USE:
**Implementing or iterating on a UI**—new screen, feature, or polish—and you need candidate **token** names, **icon** imports, and **component** packages/props in one pass.

### ads_get_all_tokens
Returns **every** ADS design token from bundled metadata (name, example value, usage guidelines)—one JSON object per token, **very large** output.

WHEN TO USE:
Last resort when `ads_plan` / `ads_search_tokens` cannot answer the question and you need the full list (e.g. exhaustive audit). Prefer targeted search for normal development.
```

Source: https://mcp.atlassian.com/v1/ads/public/mcp

### DESIGN.md 'drift pattern' table — an explicit anti-AI-slop prohibition list

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

The most quotable artifact in the whole system: a two-column Do/Don’t table introduced as ‘Each line is a drift pattern to correct on sight’. It targets the exact failure modes of unguided LLM UI generation by name — gradient-filled text via `background-clip: text`, glass cards and `backdrop-filter` blur stacks ‘as generic polish’, the ‘Default “hero metric” template’, ‘Repeated identical tiles (icon + heading + body + CTA × N) as the only layout’, Unicode/emoji glyphs standing in for icons, and even competitor default fonts (‘Inter / Geist / SF Pro / Roboto in product’). It also disambiguates accent vs semantic token misuse, which is the classic token-drift error.

```markdown
## Do's and Don'ts

The scan-friendly TL;DR. Each line is a drift pattern to correct on sight. Tokens are referenced by
their YAML key; hex values resolve from the frontmatter.

| Do | Don't |
| Hex anchored to a token (`text` → `#292A2E`) | Arbitrary one-off hex (`color: '#172B4D'`) with no token mapping |
| Padding / margin / gap on a `space-*` step | `padding: 13px` or any off-rail value |
| `background-danger-bold` for destructive CTAs | `background-accent-red-bolder` for destructive CTAs (accent ≠ semantic) |
| Sentence case ("Create work item") | Title Case ("Create Work Item"); ALL CAPS / letter-spaced "EYEBROW" labels |
| Atlassian core icon at 16px for chevrons, checks, arrows | Unicode / emoji / HTML-entity glyphs (`›` `→` `▶` `✓` `✕` `…` `⚠`) as icons |
| Atlassian Sans in product; Charlie only on marketing | Inter / Geist / SF Pro / Roboto in product; Charlie in settings pages |
| Solid `text-*` tokens + `weight-*` for hierarchy | Gradient-filled text (`background-clip: text` + `linear-gradient`) |
| Restrained metrics: `metric-*` surface per [Components](#components), no decoration | Default "hero metric" template (oversized number + tiny label + stat row + decorative gradient) |
| Borders and whitespace for depth; `backdrop-filter` only when ADS specifies it | Glass cards, glow borders, or `backdrop-filter` blur stacks as generic polish |
```

Source: https://atlassian.design/DESIGN.md

### axe-core validation loop with capability-scoped tools

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

A three-step loop is baked into the tool graph: `ads_analyze_a11y` (JSX string → heuristic/axe findings) → `ads_suggest_a11y_fixes` (violation string → ADS-biased ‘recipe map’ fixes) → `ads_get_a11y_guidelines` (topic guidance). The descriptions are unusually honest about their own limits — ‘not every finding maps to a specific ADS component fix’, ‘Does not replace testing in a real browser with assistive technologies’ — which reduces false confidence. Crucially, the live-browser variant `ads_analyze_localhost_a11y` is gated by deployment: ‘it is **only exposed when this MCP runs locally**, not in the remote MCP deployment.’ The package depends on axe-core, @axe-core/playwright and @axe-core/puppeteer to back this.

```text
### ads_analyze_a11y
Analyzes a **string of React/JSX** code for likely accessibility issues (heuristics and/or axe-related paths) and returns hints that often **point to** `ads_suggest_a11y_fixes` or generic axe/WCAG-style context—not every finding maps to a specific ADS component fix.

LIMITATIONS:
- Does not replace testing in a real browser with assistive technologies or full keyboard traversal.
- For rendered UI, `ads_analyze_localhost_a11y` (live URL + axe) is preferable when available—it is **only exposed when this MCP runs locally**, not in the remote MCP deployment.

### ads_suggest_a11y_fixes
WHAT YOU GET (varies by match):
- **Curated hit:** ADS-biased examples and patterns from this server's recipe map (components, tokens, common fixes).
- **No strong match:** Generic guidance (e.g. "use ADS components", labeling, testing)—still useful, but **not** guaranteed to be ADS-specific.
```

Source: https://mcp.atlassian.com/v1/ads/public/mcp

### AI-provenance marking: `.ai-non-final` message-ID suffix

Category: `token-enforcement` (Token enforcement) · all 13 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md

The bundled i18n playbook (`ads_i18n_conversion_guide`) forces agents to tag their own output so humans can find it later. Verbatim from the guide payload in dist/cjs/tools/i18n-conversion/guide.js: '**CRITICAL: ai-non-final Suffix**: ALL new message IDs MUST end with `.ai-non-final` suffix. This applies to ALL newly created messages, regardless of whether existing messages in the file have this suffix. Format: `{message-key}.ai-non-final`. Example: `applinks.administration.list.applinks-table.system-label.ai-non-final`. This suffix indicates the message is AI-generated and may need review before finalization.‘ The same guide fences scope aggressively — ’**CRITICAL: ONLY CONVERT STRINGS WITH ESLINT-DISABLE**: You MUST **ONLY** convert strings that have eslint-disable comments for @atlassian/i18n/no-literal-string-in-jsx’, ‘Do NOT modify files outside the provided scope’, and ‘Do NOT modify pre-existing messages that were already in the codebase, even if they have poor descriptions’ — turning an existing lint suppression into the authoritative worklist so the agent cannot expand its own blast radius.

```markdown
**CRITICAL: ai-non-final Suffix**: ALL new message IDs MUST end with `.ai-non-final` suffix. This applies to ALL newly created messages, regardless of whether existing messages in the file have this suffix. Format: `{message-key}.ai-non-final`. Example: `applinks.administration.list.applinks-table.system-label.ai-non-final`. This suffix indicates the message is AI-generated and may need review before finalization.
```

Source: https://unpkg.com/@atlaskit/ads-mcp@1.7.1/dist/cjs/tools/i18n-conversion/guide.js

### Published head-to-head context-delivery evals

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

Atlassian ran an eval (agents generating a login screen) comparing four context strategies and published token usage, wall time, and turn counts: no context ~5% tokens / 4m19s / 43 turns; ADS MCP ~80% / 5m01s / 35.1 turns; ADS Skill ~80% / 5m23s / 36 turns; DESIGN.md ~30% / 6m46s / 45.3 turns. They report DESIGN.md consumed ‘92% more tokens’ than MCP with ‘2.7x the variance in token consumption between runs’, and — the most useful negative finding in the study — that DESIGN.md ‘frequently caused agents to re-create components rather than use the existing system’, because it is ‘a guide on how to re-implement’ rather than ‘an instruction manual to using the existing design system’. Separate blog figures for the structured-content/MCP work: ‘52% accuracy improvement in AI calls’, ‘34% faster on average across ADS specific tasks’.

```text
However, DESIGN.md frequently caused agents to "re-create components rather than use the existing system," introducing technical debt by reimplementing instead of importing existing design system components.

DESIGN.md consumed approximately "92% more tokens" than the MCP approach and showed "2.7x the variance in token consumption between runs."
```

Source: https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice

## Platform integrations (3)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

Official Figma libraries + plugin advertised in llms.txt with ‘Design token integration’ and ‘Code snippets’ features. Figma Make is named as a consumer of the ADS context engine. No public Code Connect (`figma.connect`) definitions were found — @atlaskit/code-connect does not exist on npm.

Link: https://atlassian.design/get-started/figma-libraries

### Storybook (addon-mcp, manifests, AI docs)

A design-system/storybook-addon package exists in the mirror; contents and any AI relevance unverified.

Link: https://bitbucket.org/atlassian/atlassian-frontend-mirror/src/HEAD/design-system/

### other

Editor/agent distribution: one-click `vscode:mcp/install` badges for Cursor and VS Code in the ads-mcp README; documented configs for Cursor (~/.cursor/mcp.json), VS Code Copilot (.vscode/mcp.json), Codelassian (~/.codelassian/mcp.json), Rovodev (~/.rovodev/mcp.json, supports `timeout`), and `atlas plugin install -n mcp` for the Atlas CLI MCP registry. Inside the internal AFM monorepo the server is pre-wired: ‘ads-mcp is pre-configured and ready to use’; ‘Rovodev users get ads-mcp enabled automatically anywhere within AFM.’ Replit is named as an external AI prototyping integration.

Link: https://www.npmjs.com/package/@atlaskit/ads-mcp

## Building the system vs. consuming it

### For consumers (agents building UIs with Atlassian Design System (ADS / Atlaskit))

Extremely well served, and served in tiers by environment. If you have an ADS-capable React stack: point your client at the hosted MCP (https://mcp.atlassian.com/v1/ads/public/mcp) or run `npx -y @atlaskit/ads-mcp`, and the tool graph will steer you to canonical components, real token names, correct icon import paths, ESLint rule docs, migration codemods, and an axe-backed accessibility loop — with `ads_plan` as the intended single discovery call. If you are outside that stack (prototyping, theming, non-React surfaces), https://atlassian.design/DESIGN.md gives you the whole visual system in one 80KB RFC 2119 manifest, at the documented cost that agents tend to reimplement rather than import. llms.txt plus six topic files cover plain fetch-based agents. Third tier — the `atlassian-design-system` skill — is internal-only, so external consumers get the MCP and the markdown but not the progressive-disclosure skill.

### For builders (the Atlassian Design System (ADS / Atlaskit) team using AI on the system itself)

Almost entirely opaque from outside, by construction. https://bitbucket.org/atlassian/atlassian-frontend-mirror is a one-way export of the internal Atlassian Frontend Monorepo (AFM) with automated daily commits (‘Automatic commit created ...’), and root probes for AGENTS.md, CLAUDE.md, .cursorrules, .cursor/rules/index.mdc, .github/copilot-instructions.md and CONTRIBUTING.md all 404. What leaks through the mirror and the blogs is suggestive of heavy internal investment: agent-facing content is generated from structured schemas (‘Schemas live in TypeScript files alongside the code. From this source, we can generate everything agents need’), the skill and llms.txt are generated from the same source as the MCP catalogs (components.codegen.js in the package confirms codegen), the MCP server ships per-tool telemetry so the DS team can see which tools agents actually call and whether they fail, and support runs through an internal #help-ads-ai Slack channel. Reported org scale: 35+ designers on the core ADS team, 550+ designers using contribution tooling, 58+ updates in 12 months.

## Gaps

Not confirmed, or reported wrongly elsewhere: (1) https://mcp.atlassian.com/v1/ads is a 404 (‘404 Not Found’, server AtlassianEdge); the working path is https://mcp.atlassian.com/v1/ads/public/mcp. (2) github.com/atlassian-labs/design-system-mcp does NOT exist — HTTP 404 and `gh api repos/atlassian-labs/design-system-mcp` returns ‘Not Found’. The MCP source lives in the Bitbucket mirror at design-system/ads-mcp instead. (3) ‘Published MCP benchmarks/evals’ — partially true: the eval numbers are published in Atlassian *blog posts*, not as a reproducible harness, dataset, or repo; no eval code, prompts, or judge rubric is public, and the figures (52% accuracy, 34% faster, 26% fewer calls, 16% fewer tokens) are self-reported with no methodology disclosed. (4) There is no AI/MCP *docs page* on atlassian.design: /mcp, /ai, /resources/mcp-server, /AGENTS.md, /CLAUDE.md and /DESIGN.json all return the Gatsby 404 shell; discovery is via llms.txt and DESIGN.md only. atlassian.design/sitemap-index.xml also 404s, so site-wide enumeration of AI-related pages was not possible. (5) https://atlassian.design/llms-full.txt is broken — HTTP 200 wrapping an S3 `NoSuchKey` 404 XML document. (6) llms-components.txt / llms-primitives.txt / llms-tokens.txt / llms-styling.txt / llms-content.txt were not individually fetched (only llms.txt and llms-a11y.txt were checked, both 200). (7) The `atlassian-design-system` skill and the `@atlassian/skills` registry are internal; SKILL.md content, frontmatter, and progressive-disclosure structure are unobservable. Same for the ‘Context Engine MCP’ referenced by the server instructions (get_accessibility_docs / get_content_standards_docs / get_i18n_docs) — internal, never fetched. (8) OBSERVABILITY LIMIT: the public repo is a mirror, so absence of CLAUDE.md/AGENTS.md/.cursorrules is NOT evidence of absence internally — the README FAQ, the AFM pre-configuration text, and the codegen pipeline all imply internal agent config that is simply not exported. No PRs, issues, or review discussion are visible. (9) Figma Code Connect not confirmed (no @atlaskit/code-connect on npm; no figma.connect files located). (10) design-system/storybook-addon contents not inspected. (11) License not established (LICENSE.md is present in the tarball but its contents are not covered here). (12) Tool count: `tools/list` returned 17 tools, but the package contains entry points for atlaskit hooks/utilities search too — the remote deployment may expose a different set than local stdio, and only the local build exposes ads_analyze_localhost_a11y.

## Sources (15)

- https://atlassian.design/llms.txt

- https://atlassian.design/DESIGN.md

- https://atlassian.design/llms-a11y.txt

- https://mcp.atlassian.com/v1/ads/public/mcp

- https://www.npmjs.com/package/@atlaskit/ads-mcp

- https://registry.npmjs.org/@atlaskit/ads-mcp

- https://unpkg.com/@atlaskit/ads-mcp@1.7.1/dist/cjs/instructions.js

- https://bitbucket.org/atlassian/atlassian-frontend-mirror/raw/HEAD/design-system/ads-mcp/README.md

- https://bitbucket.org/atlassian/atlassian-frontend-mirror/src/HEAD/design-system/ads-mcp/

- https://api.bitbucket.org/2.0/repositories/atlassian/atlassian-frontend-mirror/commits?pagelen=3

- https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice

- https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era

- https://www.atlassian.com/blog/ai-at-work/teaching-ai-to-speak-our-design-language

- https://www.atlassian.com/blog/development/redesigning-homepage-20-minutes-with-rovo-dev

- https://github.com/atlassian/atlassian-mcp-server

---

Generated 2026-07-27T21:55:33Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
