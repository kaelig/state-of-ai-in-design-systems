---
title: "Primer — AI affordances"
description: "Primer is GitHub’s design system, and it is one of the most thoroughly AI-instrumented systems in the study — in both directions. For consumers it ships an official…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/primer-github"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.json"
id: "primer-github"
category: "design-system"
ai_maturity: "ai-native"
affordance_count: 10
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-27T22:13:09Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Primer — AI affordances

GitHub · design-system · MIT · AI maturity: **ai-native** (AI consumption is a design goal, with dedicated surfaces and staff behind it). 10 affordances, 8 coercion techniques.

- Docs: https://primer.style
- Repo: https://github.com/primer/react
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/primer-github

## Summary

Primer is GitHub’s design system, and it is one of the most thoroughly AI-instrumented systems in the study — in both directions. For consumers it ships an official, versioned MCP server (`@primer/mcp`, 20 tools, v0.5.0) plus a sibling `@primer/brand-mcp`, whose tool descriptions are written as explicit behavioral coercion (“CRITICAL: CALL THIS FIRST”, “REQUIRED FINAL STEP... You cannot complete a task involving CSS without a successful run of this tool”). For builders, primer/react carries a full GitHub-Copilot-native agent stack in `.github/`: `copilot-instructions.md`, five path-scoped `*.instructions.md` files, seven `skills/*/SKILL.md`, two custom `*.agent.md` subagents, and gh-aw agentic workflows for issue triage. Notably there is NO llms.txt, no AGENTS.md and no CLAUDE.md in primer/react — the investment is squarely in MCP plus the GitHub/Copilot instruction-file format.

## Maintenance

- Actively maintained: yes
- Last release: @primer/react v38.34.0 — 2026-07-24; @primer/mcp v0.5.0 — 2026-07-20
- Activity: 3,879 stars, last push 2026-07-27 (same day as research). Weekly-cadence releases via changesets; monorepo with 11 packages including a dedicated `packages/mcp` workspace.

## AI affordances (10)

### @primer/mcp

Type: `mcp-server` (MCP server) · Official · Audience: consumers

Official stdio MCP server maintained in-repo at `packages/mcp`. 20 tools spanning project init, component listing/docs/examples/usage/accessibility guidelines, scenario+UI patterns, design-token search and bundles, Octicons lookup, coding guidelines, a `lint_css` Stylelint validator, and an experimental `review_alt_text` accessibility reviewer. Distributed as `npx @primer/mcp@latest`; README carries one-click ‘Install in VS Code’ / ‘VS Code Insiders’ badge buttons.

- Docs: https://primer.style/product/getting-started/foundations/mcp

- Code: https://github.com/primer/react/tree/main/packages/mcp

Notes: v0.5.0 published 2026-07-20; also ships `next` and `canary` dist-tags, so the MCP server rides the same release train as the component library.

```typescript
server.registerTool(
  'lint_css',
  {
    description:
      'REQUIRED FINAL STEP. Use this to validate your CSS. You cannot complete a task involving CSS without a successful run of this tool.',
    inputSchema: {css: z.string()},
    annotations: {readOnlyHint: true},
  },
  async ({css}) => {
    try {
      // --fix flag tells Stylelint to repair what it can
      const {stdout} = await runStylelint(css)

      return {
        content: [
          {
            type: 'text',
            text: stdout || '✅ Stylelint passed (or was successfully autofixed).',
          },
        ],
      }
    } catch (error: unknown) {
      // If Stylelint still has errors it CANNOT fix, it will land here
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/packages/mcp/src/server.ts

### MCP server (primer.style docs)

Type: `ai-docs-page` (AI docs page) · Official · Audience: consumers

First-class docs page under Getting started → Foundations, described in the site nav as ‘Help AI agents use Primer correctly with the Primer Model Context Protocol server.’ Gives VS Code install steps and a generic `.mcp.json` / `.github/mcp.json` block for Copilot CLI, Cursor and other stdio clients, then enumerates all 20 tools.

- Docs: https://primer.style/product/getting-started/foundations/mcp

Notes: The only AI-specific page on primer.style. The frequently cited claims https://primer.style/mcp and https://primer.style/guides/ai are FALSE POSITIVES — the docs site is an SPA that returns HTTP 200 with the homepage shell for any unknown path.

### @primer/brand-mcp

Type: `mcp-server` (MCP server) · Official · Audience: consumers

Second official MCP server, for Primer Brand (`@primer/react-brand`, marketing/landing pages), maintained in primer/brand at `packages/mcp`. Version-aware: it reads docs and metadata from the consumer’s *installed* `@primer/react-brand` dependency rather than a hosted snapshot. Eight tools including `primer_brand_review`, a self-check tool that scans generated JSX/CSS for unknown components, invalid props and hardcoded values.

- Code: https://github.com/primer/brand/tree/main/packages/mcp

Notes: v0.71.0, published 2026-07-13, versioned in lockstep with @primer/react-brand.

```markdown
| Tool                       | What it does                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `primer_brand_setup`       | Configures Primer Brand first-time. Includes `ThemeProvider`, Mona Sans and RSC-directive configuration among other things |
| `primer_brand_page_design` | Page-design conventions (header/footer, hero media, gridline aesthetic, card grids, labels) and the current-brand reference templates to start from. |
| `primer_brand_component`   | Get a component API information like props, allowed values and named sub-components. |
| `primer_brand_tokens`      | Resolve design tokens by intent (color, space, typography) to CSS variables and values. |
| `primer_brand_review`      | Check generated JSX and CSS against the design system for unknown components, invalid props, hardcoded values |
```

Source: https://raw.githubusercontent.com/primer/brand/HEAD/packages/mcp/README.md

### primer/react .github/copilot-instructions.md

Type: `copilot-instructions` (Copilot instructions) · Official · Audience: builders

~200-line contributor-facing agent brief: repo map, exact build/test/lint commands with measured runtimes and ‘NEVER CANCEL’ timeout warnings, validation scenarios, component file-structure conventions, Storybook story naming rules, and a mandatory PR-creation procedure (fill the PR template, add a changeset, or apply the `skip changeset` label). Routes the agent to in-repo skills for changesets, slots, turborepo and Storybook.

- Code: https://github.com/primer/react/blob/main/.github/copilot-instructions.md

```markdown
# Primer React Copilot Instructions

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Pull Request Creation

When creating a pull request, you MUST:

1. Use the template in `.github/pull_request_template.md` to structure the PR description. Read the template file, fill in all sections appropriately, and include it in the PR body.
2. Include a changeset file in the PR if the change affects the published package (bug fix, new feature, breaking change, etc.). Create a `.changeset/<descriptive-name>.md` file with the appropriate semver bump type. Reference the `changesets` skill (`.github/skills/changesets/SKILL.md`) for detailed guidance on file format, choosing the correct bump type, and when a changeset can be skipped.
3. If no changeset is needed (docs-only, test-only, CI/infra changes), add the `skip changeset` label to the pull request to bypass the CI changeset check.
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/.github/copilot-instructions.md

### primer/react .github/skills/ (7 skills)

Type: `claude-skill` (Agent skill) · Official · Audience: builders

Seven SKILL.md-format skills with YAML `name`/`description` frontmatter, in the same progressive-disclosure format used by Claude Skills and Copilot skills: `changesets`, `deprecations`, `feature-flags`, `slots`, `storybook`, `style-guide`, `turborepo`. Several are routers into `contributor-docs/` (the style-guide skill exists to force the agent to read `contributor-docs/style.md` before authoring). The `storybook` skill is an operational runbook: check port 6006, start Storybook in the background, poll until ready, then call the local `primer-storybook` MCP.

- Code: https://github.com/primer/react/tree/main/.github/skills

````markdown
## Step 1 — Ensure Storybook Is Running

Storybook must be running **before** any MCP tool calls. The MCP server is served by Storybook at `http://localhost:6006/mcp`.

### Verify it is ready

Poll until the server responds:

```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:6006 | grep -q "200\|301\|302"; do sleep 1; done
```

### Available Tools

| `mcp_primer-storyb_list-all-documentation`           | Discover all available component and documentation IDs — call once per task                    |
| `mcp_primer-storyb_get-documentation`                | Retrieve full docs, props, and examples for a component by `id`                                |
| `mcp_primer-storyb_get-storybook-story-instructions` | Get framework-specific imports and story patterns — always call before writing/editing stories |
| `mcp_primer-storyb_preview-stories`                  | Get live preview URLs for stories — always include returned URLs in your response              |
````

Source: https://raw.githubusercontent.com/primer/react/HEAD/.github/skills/storybook/SKILL.md

### primer/react .github/agents/*.agent.md (custom subagents)

Type: `other` (Other) · Official · Audience: builders

Two persona-scoped custom agents in the GitHub Copilot `.agent.md` format with declared `tools:` and `skills:` allowlists: `modular-ds-implementer` (builds components against the ‘spectrum of abstraction’ model in contributor-docs/style.md) and `modular-ds-reviewer`. The implementer file is the densest concentration of prohibition language in the system — a long list of ‘Do not …’ rules covering slots, public hooks, `data-component`, and inventing visual styling without a design reference.

- Code: https://github.com/primer/react/tree/main/.github/agents

```markdown
---
name: modular-ds-implementer
description: Builds Primer React components using the modular design system patterns in the Primer style guide.
tools:
  - read
  - search
  - edit
  - execute
skills:
  - style-guide
---

- Search for existing Primer components, hooks, utilities, and accessibility
  primitives before adding new ones.
- Do not add slots, `useSlots`, or `__SLOT__` markers by default. Prefer normal
  React composition for flexible presentational components. Only add slots when
  the requested API explicitly needs child extraction or a parent component must
  identify a specific child part. Do not reorder consumer-authored children in
  presentational components; preserve author order and document recommended
  structure instead.
- Do not expose `data-component` as a customizable prop. Primer owns
  `data-component` values as component identifiers.
- Avoid inventing visual styling without a concrete design reference, image, or
  specification. If styling is not specified, keep styles minimal and structural
  so the component API and accessibility model can be evaluated independently.
- New components and new public exports require a `minor` changeset for the
  affected package.
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/.github/agents/modular-ds-implementer.agent.md

### primer/react .github/instructions/*.instructions.md (5 files)

Type: `copilot-instructions` (Copilot instructions) · Official · Audience: builders

Five path-scoped instruction files using the Copilot `applyTo:` glob frontmatter, so different rules load for different files: `general-coding` (applyTo `**`), `typescript-react`, `css`, `changesets`, and `component-review` (applyTo `packages/react/src/**/*`). `component-review.instructions.md` is a machine-readable, ADR-backed review rubric: each rule has a stable ID, a Check, a Prefer, and an **Authority** pointing at the specific ADR file it derives from.

- Code: https://github.com/primer/react/tree/main/.github/instructions

```markdown
---
applyTo: 'packages/react/src/**/*'
---

# ADR-backed component review trial

Apply these rules only to behavior or contracts introduced or expanded by the
change. Report concrete impact, cite the rule ID, and do not report pre-existing
migration debt.

## `component-review.children-as-api`

- **Check:** Content uses React children when consumers own the rendered
  elements or need free-form composition.
- **Prefer:** Use data props when the component must own, transform, order, or
  constrain the rendered elements. Do not support equivalent children and data
  APIs without a concrete need.
- **Authority:** `contributor-docs/adrs/adr-004-children-as-api.md`

## `component-review.internal-modules`

- **Check:** New shared modules that are not public API live under
  `packages/react/src/internal` and are not exported from public entrypoints.
- **Prefer:** Keep implementation details internal until a supported public API
  is intentionally designed.
- **Authority:** `contributor-docs/adrs/adr-015-internal-modules.md`
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/.github/instructions/component-review.instructions.md

### primer/primitives AGENTS.md

Type: `agents-md` (AGENTS.md) · Official · Audience: builders

The token repo (Style Dictionary based) uses the AGENTS.md convention rather than copilot-instructions. Short and imperative: a MANDATORY post-change command chain, a ‘do not edit’ marker on the generated DESIGN_TOKENS_SPEC.md, a REQUIRED pre-read for the W3C token format guide, and — unusually — explicit meta-instructions about how the agent should behave in Plan Mode. Has a dedicated `contributor-docs/agents/` directory.

- Code: https://github.com/primer/primitives/blob/main/AGENTS.md

````markdown
# Primer Primitives

Design tokens for GitHub's Primer design system, built with Style Dictionary.

## MANDATORY Workflow

**After every change, run and fix any errors:**

```bash
npm run lint && npm run format && npm run test && npm run build
```

## Key Files

- `src/tokens/` - Token definitions (JSON5)
- `DESIGN_TOKENS_SPEC.md` - Generated file, do not edit

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Detailed Guides

- [W3C Design Token Format Guide](contributor-docs/agents/w3c-design-token-format-guide.md) - REQUIRED: Review before adding tokens
- [Token Authoring](contributor-docs/agents/token-authoring.md) - Token format, LLM metadata
- [Build System](contributor-docs/agents/build-system.md) - Build commands, outputs
````

Source: https://raw.githubusercontent.com/primer/primitives/HEAD/AGENTS.md

### gh-aw agentic workflows (issue triage + maintenance)

Type: `other` (Other) · Official · Audience: builders

primer/react runs GitHub Agentic Workflows (github/gh-aw v0.83.1): `.github/workflows/issue-triage.md` is a natural-language agent spec compiled by `gh aw compile` into `issue-triage.lock.yml`, with `.github/aw/actions-lock.json` pinning actions. The safety model is declarative — `permissions: read-all` plus a `safe-outputs:` allowlist capping the agent at 1 issue type, 5 labels, 1 comment, and one hand-off assignment to the Copilot coding agent. Sits alongside `accessibility-alt-text-bot.yml`, `lint-autofix.yml` and `copilot-setup-steps.yml`.

- Code: https://github.com/primer/react/blob/main/.github/workflows/issue-triage.md

```yaml
permissions: read-all

network: defaults

safe-outputs:
  set-issue-type:
    max: 1
    issue-intent: true
  add-labels:
    max: 5
    issue-intent: true
  add-comment:
    max: 1
  assign-to-agent:
    name: copilot
    allowed: [copilot]
    max: 1
    target: triggering
    issue-intent: true

tools:
  github:
    toolsets: [issues, labels]

timeout-minutes: 15
---

# Issue triage

Base every decision only on what the issue and its comments actually say. Do not invent
missing context or guess beyond the evidence. Keep the issue's existing labels; only add
labels. Never close the issue.
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/.github/workflows/issue-triage.md

### Figma Code Connect (primer/react and primer/brand)

Type: `figma-code-connect` (Code Connect) · Official · Audience: both

52 `*.figma.tsx` Code Connect files in primer/react plus `packages/react/figma.config.json`, published by a dedicated `.github/workflows/figma_connect_publish.yml` CI job. primer/brand mirrors the setup. This is what makes Figma Dev Mode MCP return real Primer component code (correct import path and props) instead of generic markup when an agent reads a Primer design.

- Code: https://github.com/primer/react/blob/main/packages/react/figma.config.json

Notes: Confirmed via GitHub code search: 52 files matching extension:figma.tsx in primer/react.

## Coercion techniques (8)

### Hard tool-gated validation loop ("REQUIRED FINAL STEP")

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

The Primer MCP server ships Stylelint as an MCP tool and writes the tool description as a completion precondition, not a suggestion: the agent is told it literally cannot finish a CSS task without a passing `lint_css` run. The server runs Stylelint with `--fix`, returning autofixed output on success and an explicit ‘❌ Errors without autofix remaining’ block on failure, giving the model a repair signal to loop on. `find_tokens` reinforces it from the other end: ‘After identifying tokens and writing CSS, you MUST validate the result using lint_css.’

```typescript
    description:
      'REQUIRED FINAL STEP. Use this to validate your CSS. You cannot complete a task involving CSS without a successful run of this tool.',
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/packages/mcp/src/server.ts

### Forced tool ordering ("CRITICAL: CALL THIS FIRST")

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

Rather than trusting the model to discover token groups, `get_design_token_specs` asserts primacy in its own description and frames every other search as unreliable without it — ‘You cannot search accurately without this map.’ A cheap way to bootstrap the correct token vocabulary into context before the agent starts guessing names.

```typescript
  'get_design_token_specs',
  {
    description:
      'CRITICAL: CALL THIS FIRST. Provides the logic matrix and the list of valid group names. You cannot search accurately without this map.',
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/packages/mcp/src/server.ts

### Semantic color remapping to defeat literal color prompts

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

The sharpest anti-drift trick in the Primer MCP. Users say ‘make it pink’; models then grep tokens for ‘pink’ and either fail or pick a raw scale value. The `find_tokens` description intercepts that failure mode with an explicit translation table from perceptual color words to Primer’s semantic intent namespaces, plus a reminder to check emphasis/muted variants. It also discourages the token-by-token search pattern that blows up context.

```typescript
    description:
      'Search for specific tokens. Tip: If you only provide a \'group\' and leave \'query\' empty, it returns all tokens in that category. Avoid property-by-property searching. COLOR RESOLUTION: If a user asks for "pink" or "blue", do not search for the color name. Use the semantic intent: blue->accent, red->danger, green->success. Always check both "emphasis" and "muted" variants for background colors. After identifying tokens and writing CSS, you MUST validate the result using lint_css.',
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/packages/mcp/src/server.ts

### Named-API prohibitions served over MCP

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

`primer_coding_guidelines` is a tool that exists solely to inject house rules into the consumer’s agent session. It combines soft ‘Prefer…’ guidance (reuse a Primer component over writing a new one; use existing props over adding styles; use Primer icons over inventing icons) with a hard, named-API blocklist encoding Primer’s live internal migration away from `sx` and `Box` — the exact two APIs a model trained on older Primer code reaches for by default.

```typescript
## Authoring & Using Components

- Prefer re-using a component from Primer when possible over writing a new component.
- Prefer using existing props for a component for styling instead of adding styling to a component
- Prefer using icons from Primer instead of creating new icons. Use the `list_icons` tool to find the icon you need.
- Follow patterns from Primer when creating new components. Use the `list_patterns` tool to find the pattern you need, if one exists
- When using a component from Primer, make sure to follow the component's usage and accessibility guidelines

## Coding guidelines

The following list of coding guidelines must be followed:

- Do not use the sx prop for styling components. Instead, use CSS Modules.
- Do not use the Box component for styling components. Instead, use CSS Modules.
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/packages/mcp/src/server.ts

### Agent self-propagation via the `init` tool

Category: `scaffolding` (Scaffolding) · all 7 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md

Primer’s `init` MCP tool does not just scaffold a project — its final bullet instructs the agent to write agent instructions into the consumer’s repo, so future sessions stay on-system even without the MCP server attached. The design system asks the agent to install the design system’s own guardrails.

```typescript
          text: `The getting started documentation for Primer React is included below. It's important that the project:

- Is using a tool like Vite, Next.js, etc that supports TypeScript and React. If the project does not have support for that, generate an appropriate project scaffold
- Installs the latest version of `@primer/react` from `npm`
- Correctly adds the `ThemeProvider` and `BaseStyles` components to the root of the application
- Includes an import to a theme from `@primer/primitives`
- If the project wants to use icons, also install the `@primer/octicons-react` from `npm`
- Add appropriate agent instructions (like for copilot) to the project to prefer using components, tokens, icons, and more from Primer packages
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/packages/mcp/src/server.ts

### Rule IDs with ADR authority citations

Category: `registry-metadata` (Registry metadata) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/registry-metadata.md

Primer’s component-review rubric is structured like a linter ruleset rather than prose: every rule is `component-review.` with Check / Prefer / Authority fields, and the agent is told to cite the rule ID and scope reports to newly-introduced behavior only (‘do not report pre-existing migration debt’). Each rule traces to a numbered ADR in `contributor-docs/adrs/`, so AI review is anchored to human-ratified decisions and can be argued with.

```markdown
# ADR-backed component review trial

Apply these rules only to behavior or contracts introduced or expanded by the
change. Report concrete impact, cite the rule ID, and do not report pre-existing
migration debt.

## `component-review.stable-identifiers` (advisory)

- **Check:** Newly added component roots, public subcomponents, and meaningful
  structural parts follow the established `data-component` naming contract.
- **Prefer:** Use PascalCase component API names, keep state in separate data
  attributes, and test stable identifier values.
- **Authority:** `contributor-docs/adrs/adr-023-stable-selectors-api.md`
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/.github/instructions/component-review.instructions.md

### Mandatory local MCP before answering (Storybook as ground truth)

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

For internal contributors the copilot-instructions forbid answering from model memory about components: the agent must boot the Storybook dev server and query the `primer-storybook` MCP (an HTTP server Storybook itself exposes at localhost:6006/mcp) before answering or acting. `.vscode/mcp.json` pre-wires four servers (github, playwright, primer, primer-storybook) so the tooling is present by default.

```markdown
## Storybook

When working on UI components, always use the `primer-storybook` MCP tools to access Storybook's component and documentation knowledge before answering or taking any action. Reference the `.github/skills/storybook/SKILL.md` file for detailed instructions on using the Storybook MCP effectively and accurately.
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/.github/copilot-instructions.md

### Anti-invention clauses backed by platform-level output caps

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

Across contributor agent files and the CI triage agent, Primer repeatedly writes negative constraints against the model’s strongest failure mode — fabricating structure. The triage bot may only apply labels that already exist and may never close an issue; the implementer agent may not invent visual styling without a design reference and may not add slot machinery ‘by default’. Crucially the prohibition is also enforced at the platform layer via gh-aw `safe-outputs` maxima, not just in the prompt.

```markdown
Base every decision only on what the issue and its comments actually say. Do not invent
missing context or guess beyond the evidence. Keep the issue's existing labels; only add
labels. Never close the issue.

- **Classify the issue type.** If the issue already has a type, leave it. Otherwise set the
  single best-fitting type from those this repository offers. If it is too ambiguous to
  type confidently, leave it untyped.
- **Add relevant labels.** Apply existing repository labels that describe the issue's nature
  and area. Only use labels that already exist; never invent labels, and do not re-add
  labels the issue already has. If nothing fits, add none.
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/.github/workflows/issue-triage.md

## Platform integrations (3)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

Figma Code Connect is live and CI-published: 52 `*.figma.tsx` files plus `packages/react/figma.config.json` in primer/react, published by `.github/workflows/figma_connect_publish.yml`. primer/brand mirrors the setup. This makes Figma Dev Mode MCP output real `@primer/react` component code for Primer designs.

Link: https://github.com/primer/react/blob/main/.github/workflows/figma_connect_publish.yml

### Storybook (addon-mcp, manifests, AI docs)

Storybook is the primary component workbench (`npm start`, localhost:6006) and doubles as an MCP endpoint at `/mcp` exposing list-all-documentation, get-documentation, get-storybook-story-instructions and preview-stories. Registered as `primer-storybook` in the committed `.vscode/mcp.json`.

Link: https://github.com/primer/react/blob/main/.vscode/mcp.json

### other

Docs are a bespoke Next.js site at primer.style rather than Supernova / Knapsack / zeroheight. Component metadata is generated from in-repo `*.docs.json` files via `packages/doc-gen`, and `@primer/react/generated/components.json` is the registry the MCP server reads to enumerate components.

Link: https://primer.style

## Building the system vs. consuming it

### For consumers (agents building UIs with Primer)

Strong and unusually opinionated. `@primer/mcp` (20 tools) plus `@primer/brand-mcp` (8 tools) are officially maintained, versioned alongside the libraries, and documented on primer.style with copy-paste `.mcp.json` for Cursor/Copilot CLI and one-click VS Code install badges. The tool descriptions do real work: forced call ordering, a mandatory Stylelint validation loop, semantic color remapping, and a `primer_coding_guidelines` tool that pushes Primer’s live `sx`/`Box` prohibitions into the consumer’s session. Figma Code Connect closes the design-to-code loop. The notable gap is static context: no llms.txt, no llms-full.txt, no published .cursorrules template, no ‘Add to Cursor/Claude’ deep links — Primer bets entirely on MCP, so agents without MCP configured get nothing beyond ordinary HTML docs.

### For builders (the Primer team using AI on the system itself)

Equally strong, and committed entirely to GitHub’s own agent-file formats rather than AGENTS.md/CLAUDE.md. primer/react’s `.github/` contains copilot-instructions.md, five path-scoped `*.instructions.md` (including an ADR-backed component-review rubric with stable rule IDs), seven `skills/*/SKILL.md`, and two custom `*.agent.md` subagents with declared tool and skill allowlists. CI runs github/gh-aw agentic workflows (issue-triage compiled from Markdown to a lock file, with `safe-outputs` caps and hand-off to the Copilot coding agent), an accessibility alt-text bot, lint-autofix, and `copilot-setup-steps.yml` to prep the Copilot coding agent environment. Sibling repos differ: primer/primitives uses AGENTS.md with a MANDATORY lint/format/test/build chain and a dedicated `contributor-docs/agents/` directory; primer/brand and primer/view_components use copilot-instructions.md.

## Gaps

Absent, probed directly: (1) No llms.txt; https://primer.style/llms.txt is a 404. (2) No llms-full.txt: that URL returns HTTP 200 but the body starts `` with content-type text/html and is byte-identical in size to the homepage — it is the SPA catch-all. Any scanner reporting llms-full.txt as present is being fooled by the SPA. (3) The often-cited https://primer.style/mcp and https://primer.style/guides/ai do NOT exist — same SPA-shell false positive; the real page is /product/getting-started/foundations/mcp. (4) primer/react has no AGENTS.md, no CLAUDE.md, no .cursorrules, no .cursor/rules/ (all 404 on raw.githubusercontent.com) and no .claude/ directory. (5) No published Claude Skill or Cursor rules package for consumers, and no ‘Add to Cursor/Claude’ install buttons — only VS Code badges. Not established: whether Primer runs AI-assisted codemods for migrations — `migrating.md`, `migration-status.yml`, `lint-autofix.yml` and eslint-plugin-primer-react migration rules all exist, but this study did not confirm an LLM is in that loop; treat as deterministic codemods unless proven otherwise. Also unverified: real adoption/usage numbers for @primer/mcp, and the contents of four skills this study did not open (changesets, deprecations, feature-flags, slots) plus the modular-ds-reviewer agent. NAME COLLISION: npm `@polygonlabs/primer-mcp` (1.0.0, 2026-06-08) is unrelated to GitHub’s Primer — it targets the Primer blockchain SDK, not the design system. no genuine community MCP server for Primer.

## Sources (15)

- https://github.com/primer/react

- https://raw.githubusercontent.com/primer/react/HEAD/.github/copilot-instructions.md

- https://raw.githubusercontent.com/primer/react/HEAD/packages/mcp/src/server.ts

- https://raw.githubusercontent.com/primer/react/HEAD/packages/mcp/README.md

- https://raw.githubusercontent.com/primer/react/HEAD/.github/agents/modular-ds-implementer.agent.md

- https://raw.githubusercontent.com/primer/react/HEAD/.github/instructions/component-review.instructions.md

- https://raw.githubusercontent.com/primer/react/HEAD/.github/instructions/general-coding.instructions.md

- https://raw.githubusercontent.com/primer/react/HEAD/.github/skills/storybook/SKILL.md

- https://raw.githubusercontent.com/primer/react/HEAD/.github/skills/style-guide/SKILL.md

- https://raw.githubusercontent.com/primer/react/HEAD/.github/workflows/issue-triage.md

- https://raw.githubusercontent.com/primer/react/HEAD/.vscode/mcp.json

- https://raw.githubusercontent.com/primer/primitives/HEAD/AGENTS.md

- https://raw.githubusercontent.com/primer/brand/HEAD/packages/mcp/README.md

- https://primer.style/product/getting-started/foundations/mcp

- https://registry.npmjs.org/@primer/mcp

---

Generated 2026-07-27T22:13:09Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
