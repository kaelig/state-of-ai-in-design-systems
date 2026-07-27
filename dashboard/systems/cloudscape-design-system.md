---
title: "Cloudscape Design System — AI affordances"
description: "Cloudscape’s AI story is almost entirely on the CONSUMPTION side, and it is built as a documentation-pipeline problem rather than a tooling problem. Every docs page is…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.json"
id: "cloudscape-design-system"
category: "design-system"
ai_maturity: "invested"
affordance_count: 8
technique_count: 7
data_collected: "2026-07-26/27"
generated: "2026-07-27T22:05:57Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Cloudscape Design System — AI affordances

Amazon Web Services (AWS) · design-system · Apache-2.0 · AI maturity: **invested** (official MCP, skills or rules with real engineering behind them). 8 affordances, 7 coercion techniques.

- Docs: https://cloudscape.design
- Repo: https://github.com/cloudscape-design/components
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system

## Summary

Cloudscape’s AI story is almost entirely on the CONSUMPTION side, and it is built as a documentation-pipeline problem rather than a tooling problem. Every docs page is mirrored as Markdown (`/index.html.md`), every component ships a machine-readable API definition (`/index.html.json`, ~915 KB for the combined index), 181 coded pattern snippets are exposed as flat `.txt` files behind a searchable index, and a daily-regenerated `llms.txt` stitches it all together — plus an official “AI Tools Support” docs page telling builders how to point agents at it. There is NO official MCP server, no distributed editor rules, no Claude skill, no Figma Code Connect, and no llms-full.txt; the only MCP servers are two low-star community projects, one dormant since June 2025. On the BUILDING side the team rolled AGENTS.md out across 14 org repos in March 2026 and restructured docs/ into agent-routable guides, but the files are deliberately thin pointers rather than coercive rulebooks — the actual prohibitions live in the linked contributor docs.

## Maintenance

- Actively maintained: yes
- Last release: 3.0.1334 — 2026-07-24 (npm @cloudscape-design/components 3.0.1334)
- Activity: Extremely active. Daily patch releases by policy (‘We release patch versions on a daily basis’ — docs/GENERAL_GUIDE.md). All 17 org repos pushed within days as of 2026-07-27; components pushed 2026-07-27T10:31Z. llms.txt carries ‘Generated: 2026-07-27T06:52:04.989Z’, confirming AI-facing artifacts rebuild on the same daily cadence as the library.

## AI affordances (8)

### cloudscape.design/llms.txt

Type: `llms-txt` (llms.txt) · Official · Audience: consumers

Official, auto-regenerated llms.txt (~57 KB, 296 lines) indexing 12 sections: Get Started, Components, Patterns, Demos, Foundations, About, Search, Terms, Privacy, Github, Gen Ai, Code Snippets. Each component line carries both a Markdown docs URL and a JSON API URL. Regenerated daily — footer reads ‘Generated: 2026-07-27T06:52:04.989Z’. Note: /llms-full.txt returns 404.

- Docs: https://cloudscape.design/llms.txt

```markdown
# Cloudscape Design System - Documentation for LLMs

> Cloudscape Design System is an open source design system for the cloud. Cloudscape offers user interface guidelines, front-end components, design resources, and development tools for building intuitive, engaging, and inclusive user experiences at scale.

## Components

- [All Components](https://cloudscape.design/components/index.html.md): Components are built with React and implement the design patterns and guidelines of Cloudscape. All components are tested, responsive, and accessible.
- [All Components API](https://cloudscape.design/components/index.html.json): Complete API reference for all components in JSON

- [Alert](https://cloudscape.design/components/alert/index.html.md) ([API](https://cloudscape.design/components/alert/index.html.json)): A brief message that provides information or instructs users to take a specific action.

## Code Snippets

- [Snippets Index](https://cloudscape.design/snippets-content/index.md): Searchable index of coded UI pattern snippets with source code
- Individual snippet source: `https://cloudscape.design/snippets-content/{snippet-name}.txt`


Generated: 2026-07-27T06:52:04.989Z
```

Source: https://cloudscape.design/llms.txt

### AI Tools Support (official docs page)

Type: `ai-docs-page` (AI docs page) · Official · Audience: consumers

A first-class docs page under Get Started > For developers explaining llms.txt, the Markdown mirrors, and the JSON API definitions, with copy-paste prompt templates. It routes agents to different artifact types by task: .md for guidelines/tests, .json for implementation. Also warns the formats are for LLM consumption and may change (i.e. do not script against them).

- Docs: https://cloudscape.design/get-started/for-developers/ai-tools-support/

````markdown
## LLMs Support

### How to Use LLMs Documentation

1. **Reference /llms.txt**: Point your AI agent to `https://<cloudscape_url>/llms.txt` so that it gets aware of the documentation pages available at Cloudscape and how to retrieve them while building.
3. **Use API Definitions for Coding**: For implementation, you might need to point your AI agent to all the components API definitions using `https://<cloudscape_url>/components/index.html.json` or the specific component API definition URL.
4. **Use Components Guidelines for Testing:** For unit and integration tests, point your AI agent to the components Markdown URL.

### Examples of Prompts

```
"I'm building a web interface. Using the Cloudscape Design System (https://<cloudscape_url>/llms.txt), help me create an alert component for error messages use https://<cloudscape_url>/components/alert/index.html.json and https://<cloudscape_url>/components/alert/index.html.md for ensuring the code is valid and implement production code, maintainable, and well tested"
```

### Supported LLM Documentation

These files are intended for LLMs consumption and their structure might change in the future, so you shouldn't use scripts that depend on their structure.
````

Source: https://cloudscape.design/get-started/for-developers/ai-tools-support/index.html.md

### Per-component JSON API definitions (index.html.json)

Type: `registry` (Registry) · Official · Audience: consumers

Every component publishes a structured JSON contract — regions (slots), functions, properties with types and descriptions, events — generated by @cloudscape-design/documenter. A combined index at /components/index.html.json is ~915 KB. This is the closest thing Cloudscape has to a machine-readable component registry for agents; it removes prop hallucination without needing an MCP server.

- Docs: https://cloudscape.design/components/alert/index.html.json

```json
{
  "name": "alert",
  "componentName": "Alert",
  "displayName": "Alert",
  "regions": [
    {
      "name": "action",
      "description": "Specifies an action for the alert message.\nAlthough it is technically possible to insert any content, our UX guidelines only allow you to add a button.",
      "isDefault": false,
      "displayName": "action"
    },
    {
      "name": "children",
      "description": "Primary text displayed in the element.",
      "isDefault": true,
      "displayName": "content"
    }
  ],
  "functions": [
    {
      "name": "focus",
      "description": "Sets focus on the alert content.",
      "returnType": "void",
      "parameters": []
    }
  ]
```

Source: https://cloudscape.design/components/alert/index.html.json

### Code Snippets corpus (181 addressable exemplars)

Type: `registry` (Registry) · Official · Audience: consumers

A dedicated agent-facing exemplar library: 181 coded UI pattern snippets, each with a one-line description in a Markdown index and raw source at a predictable `/snippets-content/{name}.txt` URL. Covers what models routinely get wrong in Cloudscape (empty states, server-side collection hooks, unsaved-changes modals, form validation states). Surfaced as its own top-level section in llms.txt.

- Docs: https://cloudscape.design/snippets-content/index.md

```markdown
# Cloudscape Code Snippets

Searchable index of coded UI pattern snippets from the Cloudscape design system.
Each snippet demonstrates a specific UI pattern using Cloudscape components.

Each entry below lists the snippet name and a short description of what it does.
To access any snippet's source code, use: `{domain}/snippets-content/{snippet-name}.txt`
For example: `{domain}/snippets-content/empty-states-table.txt`

Total snippets: 181

## Snippets

- [attribute-editor](attribute-editor.txt) - Key-value attribute editor with add/remove rows, inline validation, and tag limit
- [collection-hooks-api-table](collection-hooks-api-table.txt) - Server-side collection hooks with API-driven table data
- [empty-states-table](empty-states-table.txt) - Table empty state with header actions, filter, pagination, and create button
- [inclusive-language-validation](inclusive-language-validation.txt) - Form field validation that checks for inclusive language compliance
- [unsaved-changes-modal](unsaved-changes-modal.txt) - Confirmation modal warning users about unsaved changes before navigation
- [validation-server-side](validation-server-side.txt) - Server-side form validation with async error handling
```

Source: https://cloudscape.design/snippets-content/index.md

### AGENTS.md across 14 cloudscape-design repos

Type: `agents-md` (AGENTS.md) · Official · Audience: builders

Org-wide AGENTS.md rollout (added 2026-03-31, ‘chore: add AGENTS.md and conventions’ #4387; updated 2026-07-01 #4681). Present in components, collection-hooks, board-components, global-styles, theming-core, documenter, chat-components, browser-test-tools, chart-components, component-toolkit, jest-preset, test-utils, code-view, build-tools. Deliberately minimal — a router into docs/ plus a short ‘Conventions to watch’ section covering the CI checks agents keep tripping. Satellite repos delegate to the main repo’s guide rather than duplicating rules.

- Code: https://github.com/cloudscape-design/components/blob/main/AGENTS.md

Notes: No CLAUDE.md, .cursorrules, .cursor/rules/, .github/copilot-instructions.md, or .claude/ exists anywhere in the org (verified via gh code search and direct raw.githubusercontent probes — all 404).

```markdown
# AGENTS.md

React component library for [Cloudscape Design System](https://cloudscape.design/) — an open source design system for building accessible, inclusive web experiences at scale.

## Getting Started

See [docs/SETUP.md](docs/SETUP.md) for setup, building, and running locally.

## Docs Index

See [docs/CLOUDSCAPE_COMPONENTS_GUIDE.md](docs/CLOUDSCAPE_COMPONENTS_GUIDE.md) for guides on component conventions, styling, writing tests, and more.
For running tests and configs, see [docs/RUNNING_TESTS.md](docs/RUNNING_TESTS.md).

## Conventions to watch

- **Commit and PR titles: `type: subject`, no scope.** The PR-title lint (`cloudscape-design/actions/.github/workflows/lint-pr.yml`) allows exactly these types: `chore`, `feat`, `fix`, `refactor`, `test`, `revert`. The title must start with `type:` followed by the subject (for example `feat: Add multi-column sort`). Scope parentheses are not supported (`feat(table): …` fails the check), and other Conventional Commits types such as `docs` or `style` are not allowed — use `chore:` for documentation and tooling changes.
```

Source: https://raw.githubusercontent.com/cloudscape-design/components/HEAD/AGENTS.md

### @agentience/react-design-systems-mcp

Type: `mcp-server` (MCP server) · Community · Audience: consumers

Community FastMCP/TypeScript server, Cloudscape-only. ~19 tools: search_components, get_component_details, get_component_properties, get_component_events, get_component_functions, get_component_examples, get_component_usage, search_usage_guidelines, generate_component_code, generate_pattern_code, validate_component_props, search_patterns, compare_components, generate_layout_code, get_frontend_setup, get_link_resource. Ships a prompt-library file (prompts/claude-cloudscape-amplify-prompt.md) that hard-forces the agent through MCP lookups. STALE: 9 stars, last push 2025-06-10.

- Code: https://github.com/agentience/react-design-systems-mcp

Notes: Not AWS-affiliated. Verified: no Cloudscape MCP server exists in awslabs/mcp.

```markdown
# Claude 4 System Prompt: Expert Cloudscape Developer with AWS Amplify Gen 2

You are an expert front-end developer specializing in AWS Cloudscape Design System and AWS Amplify Gen 2. You leverage the React Design Systems MCP server to provide comprehensive, accurate, and efficient solutions for building AWS web applications.

## MCP Server Integration

You have access to multiple MCP servers that you must use systematically to provide accurate, up-to-date solutions:

### Primary MCP Servers
1. **React Design Systems MCP** (`mcp__react-design-systems-mcp`) - For Cloudscape components

#### Component Discovery & Information
- `search_components` - Find Cloudscape components with advanced filtering
- `get_component_details` - Get comprehensive component information including props, events, and methods

I approach Amplify Gen 2 by:
- Researching current implementation patterns before providing solutions
- Using MCP tools to verify correct Gen 2 syntax and patterns
```

Source: https://raw.githubusercontent.com/agentience/react-design-systems-mcp/main/prompts/claude-cloudscape-amplify-prompt.md

### praveenc/cloudscape-docs-mcp

Type: `mcp-server` (MCP server) · Community · Audience: consumers

Community MCP server providing semantic (vector embeddings + LanceDB) search over Cloudscape docs, returning relevant component docs and full content for natural-language queries. Very small: 2 stars, last push 2025-11-27. Not AWS-affiliated.

- Code: https://github.com/praveenc/cloudscape-docs-mcp

Notes: Unverified beyond repo metadata and third-party listings (PulseMCP, LobeHub) — this study did not fetch and read its full tool surface.

### Official Figma component library — but NO Code Connect

Type: `figma-code-connect` (Code Connect) · Official · Audience: consumers

AWS publishes an official Figma library at figma.com/@cloudscape with all components, variants, and variables (color, text, layer styles), usable as a published library or sticker sheet. However there is NO Figma Code Connect: a GitHub code search for ‘code-connect’ across org:cloudscape-design returns 0 results, so Figma Dev Mode MCP has no first-party node-to-component binding for Cloudscape.

- Docs: https://cloudscape.design/get-started/for-designers/design-resources/

## Coercion techniques (7)

### Dual-format docs routing: .md for reasoning, .json for typing

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

Rather than one giant llms-full.txt, Cloudscape appends `/index.html.md` to every docs page and `/index.html.json` to every component page, and llms.txt lists BOTH per component. The official docs then instruct agents which to fetch for which task — Markdown guidelines for tests and usage rules, JSON for implementation-time prop correctness. This is context-budget engineering: the agent pulls only the shape it needs instead of loading the whole system.

```markdown
#### 1. Component API Definitions and Guidelines

- **Guidelines Files** (`/index.html.md`): Implementation guides, combining unit and integration tests specifications with practical examples, design principles, and accessibility standards to ensure proper component usage.
- **API Definition Files** (`/index.html.json`): Component specifications including types, properties, events, and functions.

#### 2. Get Started, Patterns, Demos, and More

All our documentation pages are available in markdown by appending /index.html.md . This includes get started, patterns, demos, foundations, and contributions guidelines. This provides the AI agent the context you will need for your design or code development.
```

Source: https://cloudscape.design/get-started/for-developers/ai-tools-support/index.html.md

### Constraint smuggled into the API schema itself

Category: `registry-metadata` (Registry metadata) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/registry-metadata.md

Design-system prohibitions are embedded in the generated JSON prop descriptions, so a model reading the machine-readable contract also reads the rule. The Alert `action` region description tells the agent that although any content is technically allowed, only a button is permitted — a UX guideline enforced through the type registry rather than a separate rules file.

```json
"regions": [
    {
      "name": "action",
      "description": "Specifies an action for the alert message.\nAlthough it is technically possible to insert any content, our UX guidelines only allow you to add a button.",
      "isDefault": false,
      "displayName": "action"
    }
]
```

Source: https://cloudscape.design/components/alert/index.html.json

### 181 addressable few-shot exemplars at predictable URLs

Category: `exemplars` (Exemplars) · all 10 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md

Instead of hoping the model memorized idiomatic Cloudscape, the team publishes a whole corpus of correct pattern implementations as plain text with a deterministic URL template (`/snippets-content/{snippet-name}.txt`) plus a one-line-per-snippet index. An agent can scan the index semantically then pull exactly one exemplar. Coverage skews toward what models get wrong: empty states, server-driven collection hooks, unsaved-changes guards, three distinct form-validation states.

```markdown
Each entry below lists the snippet name and a short description of what it does.
To access any snippet's source code, use: `{domain}/snippets-content/{snippet-name}.txt`
For example: `{domain}/snippets-content/empty-states-table.txt`

Total snippets: 181
```

Source: https://cloudscape.design/snippets-content/index.md

### Hard CSS prohibitions in contributor docs (builder-side)

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

docs/STYLING.md is written as absolute negative rules with the reason attached — the shape that survives an LLM’s summarization. ‘Use logical properties only — no left/right/top/bottom/width/height’, ‘No descendant combinators’, ‘Root elements must not have outer margins’. This is the real rulebook AGENTS.md routes agents to, rather than being inlined in AGENTS.md itself.

```markdown
# Styling

Prefer design tokens and custom CSS properties over hardcoded values (colors, spacing, font sizes, etc.). This keeps styles consistent across themes and modes.

## Rules

- Root elements must not have outer margins — spacing is managed by parent components
- No descendant combinators (`.a .b` with a space) — breaks CSS scoping because it applies to all `.class-b` elements at unlimited depth
- Wrap animations in the `with-motion` mixin to ensure motion can be toggled on and off
- Use logical properties only — no `left`/`right`/`top`/`bottom`/`width`/`height` in CSS. Use `inline-start`/`inline-end`/`block-start`/`block-end`/`inline-size`/`block-size` instead. Required for RTL support.
```

Source: https://raw.githubusercontent.com/cloudscape-design/components/HEAD/docs/STYLING.md

### 'Never X — use Y' escape-hatch closing in satellite repos

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

The chart-components AGENTS.md spends its single content bullet on one absolute prohibition with a named replacement — the classic pattern for keeping a model off an API it will otherwise reach for by habit (Highcharts’ well-documented `series.data`). Everything else is delegated upward to the main repo’s guide.

```markdown
## Conventions

This repository follows the same conventions as the [main Cloudscape components library](https://github.com/cloudscape-design/components). Refer to the [Cloudscape Components Guide](https://github.com/cloudscape-design/components/blob/main/docs/CLOUDSCAPE_COMPONENTS_GUIDE.md) for details on component structure, props, events, styling, testing, code style, dev pages, and API docs.

## Highcharts

Never access `series.data` directly — use `getSeriesData()` from `src/internal/utils/highcharts`. See the [Highcharts pitfalls section in CONTRIBUTING.md](CONTRIBUTING.md#highcharts-pitfalls) for details.
```

Source: https://raw.githubusercontent.com/cloudscape-design/chart-components/HEAD/AGENTS.md

### Teaching the agent the CI check it will otherwise fail

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

The only ‘Conventions to watch’ entry in the main AGENTS.md is the PR-title lint, spelled out with the exact allowlist, the exact workflow file that enforces it, an explicit failing example (`feat(table): …` fails), and a substitution rule (‘use chore: for documentation and tooling changes’). Pre-emptive loop-closing: rather than letting the agent discover the failure from CI, the enumerated grammar is stated up front. Weak form though — nothing instructs agents to run lint/tests themselves before proposing changes.

```markdown
## Conventions to watch

- **Commit and PR titles: `type: subject`, no scope.** The PR-title lint (`cloudscape-design/actions/.github/workflows/lint-pr.yml`) allows exactly these types: `chore`, `feat`, `fix`, `refactor`, `test`, `revert`. The title must start with `type:` followed by the subject (for example `feat: Add multi-column sort`). Scope parentheses are not supported (`feat(table): …` fails the check), and other Conventional Commits types such as `docs` or `style` are not allowed — use `chore:` for documentation and tooling changes.
```

Source: https://raw.githubusercontent.com/cloudscape-design/components/HEAD/AGENTS.md

### Docs shattered into an agent-routable index

Category: `instruction-files` (Instruction files) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/instruction-files.md

Rather than one long CONTRIBUTING.md, docs/ was split into 12 single-topic files (SETUP, COMPONENT_CONVENTIONS, STYLING, WRITING_TESTS, RUNNING_TESTS, CODE_STYLE, TEST_PAGES, API_DOCS, INTERNALS, DIRECTORY_LAYOUT, GENERAL_GUIDE) fronted by CLOUDSCAPE_COMPONENTS_GUIDE.md, an index whose every line is ‘file — what it covers’. AGENTS.md points at the index; the index routes to the one file needed. All 14 repos’ AGENTS.md point at the same index, so the org shares one rulebook with no duplication drift.

```markdown
# Cloudscape Components Documentation

Reference docs for contributing to [cloudscape-design/components](https://github.com/cloudscape-design/components).

- [General Guide](https://github.com/cloudscape-design/components/blob/main/docs/GENERAL_GUIDE.md) — setup, building, running locally, frameworks, versioning
- [Component Conventions](https://github.com/cloudscape-design/components/blob/main/docs/COMPONENT_CONVENTIONS.md) — component structure, props, events, refs
- [Styling](https://github.com/cloudscape-design/components/blob/main/docs/STYLING.md) — design tokens, CSS rules, RTL support
- [Writing Tests](https://github.com/cloudscape-design/components/blob/main/docs/WRITING_TESTS.md) — test utils, unit and integration tests
- [Running Tests](https://github.com/cloudscape-design/components/blob/main/docs/RUNNING_TESTS.md) — test configs and commands
- [Code Style](https://github.com/cloudscape-design/components/blob/main/docs/CODE_STYLE.md) — prettier, stylelint, eslint
- [API Docs](https://github.com/cloudscape-design/components/blob/main/docs/API_DOCS.md)  — API documentation comments
- [Internals](https://github.com/cloudscape-design/components/blob/main/docs/INTERNALS.md) — internal shared utilities
```

Source: https://raw.githubusercontent.com/cloudscape-design/components/HEAD/docs/CLOUDSCAPE_COMPONENTS_GUIDE.md

## Platform integrations (2)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

Official Cloudscape Figma community library — all components, variants, and variables (color, text, layer styles), usable as a published library or sticker sheet. No Figma Code Connect mappings published (0 hits for ‘code-connect’ across org:cloudscape-design), so Figma Dev Mode MCP has no first-party node-to-component binding.

Link: https://www.figma.com/@cloudscape

### other

No Storybook (0 hits for ‘storybook’ across org:cloudscape-design), and no Supernova / Knapsack / zeroheight. Cloudscape runs its own bespoke docs site, an internal `pages/` dev-page harness, and a separate cloudscape-design/demos repo instead.

Link: https://cloudscape.design/components/

## Building the system vs. consuming it

### For consumers (agents building UIs with Cloudscape Design System)

Strong and genuinely engineered, but entirely pull-based over HTTP. An agent gets: llms.txt (daily-regenerated index of 12 sections including a Gen AI patterns section and a Code Snippets section), a Markdown mirror of every docs page, a typed JSON API contract per component plus a 915 KB combined index, and 181 addressable code exemplars. What’s missing is anything that pushes constraints INTO the agent’s session: no official MCP server, no shipped .cursor/rules or copilot-instructions template, no ‘Add to Cursor’ button, no Claude skill, no CLI scaffolder. Cloudscape’s stance is ‘here is perfect machine-readable context, you go fetch it’ — which works for high-capability agents with web access and fails silently for anything else. Notably there is also nothing forbidding the agent from hand-rolling components or hardcoding values; the coercion is informational, not adversarial.

### For builders (the Cloudscape Design System team using AI on the system itself)

Thin but real and org-wide. AGENTS.md landed 2026-03-31 in 14 of 17 repos and was tuned once since (2026-07-01). The design is a router, not a rulebook: ~20 lines pointing at a 12-file docs/ index, with only the highest-frequency CI trap (PR-title lint grammar) inlined. Satellite repos (chart-components, board-components) delegate to the main guide and add only their own local prohibition; the smallest ones (test-utils, documenter, collection-hooks) are 5 lines saying little beyond ‘This project uses npm.’ There is zero evidence of AI-assisted codemods, AI review bots, AI-authored PRs, or any mention of AI in CONTRIBUTING.md — a grep for AI/agent/LLM/copilot/generat in CONTRIBUTING.md returns nothing. The 10 shared workflows in cloudscape-design/actions are conventional CI/release with no LLM steps.

## Gaps

Rated ‘emerging’ rather than ‘invested’ strictly on the schema’s definition — Cloudscape has no official MCP server, no distributed editor rules, and no agent skills. In substance it sits at the very top of that band: the JSON API registry and 181-snippet exemplar corpus are materially more engineering than most ‘llms.txt only’ systems. Confirmed absent (probed, 404 or 0 results — not assumed): /llms-full.txt, /ai, /docs/mcp, CLAUDE.md, .cursorrules, .cursor/rules/, .github/copilot-instructions.md, .claude/ anywhere in the org; Figma Code Connect; Storybook. No Cloudscape MCP server exists in awslabs/mcp. Both community MCP servers are effectively abandoned or near-zero adoption (9 and 2 stars; last pushes 2025-06-10 and 2025-11-27) and this study did not verify praveenc/cloudscape-docs-mcp’s tool surface first-hand. Unresolved: the 2026-07-01 commit ‘chore: Document i18n no-fallback and commit-message conventions for agents (#4681)’ implies an i18n bullet in AGENTS.md, but no i18n text is present at HEAD — it appears to have been moved into docs/ or partially reverted; this study did not diff the commit. Also not audited: merged PRs for AI-assistance disclosure, and the cloudscape-design/demos repo (which notably has no AGENTS.md despite being the main example-code repo).

## Sources (15)

- https://cloudscape.design/llms.txt

- https://cloudscape.design/get-started/for-developers/ai-tools-support/index.html.md

- https://cloudscape.design/snippets-content/index.md

- https://cloudscape.design/components/alert/index.html.json

- https://cloudscape.design/components/index.html.json

- https://cloudscape.design/get-started/for-designers/design-resources/index.html.md

- https://raw.githubusercontent.com/cloudscape-design/components/HEAD/AGENTS.md

- https://raw.githubusercontent.com/cloudscape-design/components/HEAD/docs/CLOUDSCAPE_COMPONENTS_GUIDE.md

- https://raw.githubusercontent.com/cloudscape-design/components/HEAD/docs/STYLING.md

- https://raw.githubusercontent.com/cloudscape-design/components/HEAD/docs/GENERAL_GUIDE.md

- https://raw.githubusercontent.com/cloudscape-design/chart-components/HEAD/AGENTS.md

- https://raw.githubusercontent.com/cloudscape-design/board-components/HEAD/AGENTS.md

- https://github.com/cloudscape-design/components/commits/main/AGENTS.md

- https://github.com/agentience/react-design-systems-mcp

- https://raw.githubusercontent.com/agentience/react-design-systems-mcp/main/prompts/claude-cloudscape-amplify-prompt.md

---

Generated 2026-07-27T22:05:57Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
