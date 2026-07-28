---
title: "PatternFly — AI affordances"
description: "PatternFly runs one of the most engineered AI programs of any open design system, but almost none of it lives in patternfly-org. It lives in two purpose-built sibling…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/patternfly"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.json"
id: "patternfly"
category: "design-system"
ai_maturity: "ai-native"
affordance_count: 10
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-28T02:39:42Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# PatternFly — AI affordances

Red Hat · design-system · MIT · AI maturity: **ai-native** (AI consumption is a design goal, with dedicated surfaces and staff behind it). 10 affordances, 8 coercion techniques.

- Docs: https://www.patternfly.org
- Repo: https://github.com/patternfly/patternfly-org
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/patternfly

## Summary

PatternFly runs one of the most engineered AI programs of any open design system, but almost none of it lives in patternfly-org. It lives in two purpose-built sibling repos. `patternfly/patternfly-mcp` (npm `@patternfly/patternfly-mcp`, v2.1.0, published 2026-07-21) is an official MCP server with a resource-centric `patternfly://` URI architecture (docs, component indexes, and machine-readable JSON Schemas for props), reduced to two tools: `searchPatternFlyDocs` then `usePatternFlyDocs`. `patternfly/ai-helpers` is an official *plugin marketplace*: 8 plugins / 32 skills / several subagents, dual-published for Claude Code and Cursor, with an eval harness (`eval/*/eval.yaml`) run in CI on any skill change and pass-rate thresholds including a hard 1.0 gate that the router must NOT fire on non-PatternFly projects. Notably absent: there is no `llms.txt` or `llms-full.txt` on patternfly.org (both 404), and no root AGENTS.md/CLAUDE.md in patternfly-org or patternfly-react.

## Maintenance

- Actively maintained: yes
- Last release: @patternfly/patternfly-mcp 2.1.0 published 2026-07-21; patternfly-mcp repo pushed 2026-07-22; ai-helpers pushed 2026-07-21; patternfly-cli pushed 2026-06-19
- Activity: All three AI repos pushed within days of the July 2026 survey window. ai-helpers created 2025-07-08 (10 stars), patternfly-mcp 3 stars, patternfly-cli 2 stars: low star counts, but high commit velocity and Red Hat staffing; both carry SECURITY.md + GOVERNANCE.md.

## AI affordances (10)

### @patternfly/patternfly-mcp

Type: `mcp-server` (MCP server) · Official · Audience: both

Official MCP server, Node 22+ (pin @1.1.0 for Node 20), stdio + HTTP transports, containerized (podman) option, embeddable via `import { start } from '@patternfly/patternfly-mcp'`, and extensible with sandboxed custom tool plugins (`--tool ./mcp-tools/x.js`). Only two live tools: `searchPatternFlyDocs` (partial match or `*`) and `usePatternFlyDocs` (by `name` OR `urlList`, max 15). `fetchDocs` and `componentSchemas` were removed and folded in, a deliberate tool-surface reduction. Resource layer uses RFC-6570 `patternfly://` URI templates: docs/index, components/index, schemas/{name}, and `patternfly://context`. Binaries: patternfly-mcp / pf-mcp / pfmcp.

- Docs: https://github.com/patternfly/patternfly-mcp/blob/main/docs/usage.md

- Code: https://github.com/patternfly/patternfly-mcp

Notes: AI-guidance resources are sourced from the patternfly/ai-helpers integration, explicitly ‘optimized to help LLMs generate more accurate PatternFly code’.

```markdown
### Tool: searchPatternFlyDocs

Use this to search for PatternFly documentation URLs, `patternfly://` resource URIs, and component names. Accepts partial string matches or `*` to list all available components. From the content, you can select specific URLs, URIs, and component names to use with `usePatternFlyDocs`.
...
### Tool: usePatternFlyDocs

Fetch full documentation and component JSON schemas for specific PatternFly URLs, `patternfly://` URIs, or component names.

> **Feature**: This tool automatically detects if a URL belongs to a component (or if a "name" is provided) and appends its machine-readable JSON schema (props, types, validation) to the response, combining human-readable documentation with technical specifications.
...
### Deprecated tools

#### ~~Tool: fetchDocs~~ (Removed)
> "fetchDocs" has been integrated into "usePatternFlyDocs."

#### ~~Tool: componentSchemas~~ (Removed)
> "componentSchemas" has been integrated into "usePatternFlyDocs" and MCP resources.
```

Source: https://raw.githubusercontent.com/patternfly/patternfly-mcp/HEAD/docs/usage.md

### patternfly/ai-helpers plugin marketplace

Type: `registry` (Registry) · Official · Audience: both

Official AI plugin marketplace for Red Hat UXD: `/plugin marketplace add patternfly/ai-helpers` then `/plugin install react@ai-helpers`. 8 plugins (patternfly-mcp, react, migration, design-audit, design-guide, a11y, code-review, pf-workshop) and 32 skills. Content is tool-agnostic by duplication: identical manifests in `.claude-plugin/` and `.cursor-plugin/`, so 'adding support for a new tool = copying the manifest into a new `.-plugin/` directory’. The `patternfly-mcp` plugin’s manifest wires the MCP server in automatically via `mcpServers`.

- Docs: https://www.patternfly.org/ai/ai-assisted-development/marketplace

- Code: https://github.com/patternfly/ai-helpers

```json
{
  "name": "patternfly-mcp",
  "description": "PatternFly MCP server — provides component documentation, design token lookup, and accessibility guidance via the Model Context Protocol",
  "intent": "Connect AI tools to PatternFly documentation and component data",
  "mcpServers": {
    "patternfly": {
      "command": "npx",
      "args": ["-y", "@patternfly/patternfly-mcp"]
    }
  },
  "version": "1.0.0",
  "author": {
    "name": "PatternFly Team",
    "url": "https://www.patternfly.org"
  },
  "repository": "https://github.com/patternfly/ai-helpers",
  "license": "MIT"
}
```

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/plugins/patternfly-mcp/.claude-plugin/plugin.json

### pf-* consumer skills (32 across 8 plugins)

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

Validation skills (pf-component-check, pf-import-check, pf-color-scan, pf-code-token-check, pf-figma-token-check, pf-figma-check, pf-css-migration-scan, pf-react-migration-scan), generation (pf-test-gen, pf-project-gen), design (pf-icon-finder, pf-figma-design-mode, pf-ai-guide, pf-design-comments-setup), plus a builder-only `pf-workshop` plugin (pf-bug-triage, pf-org-version-update, pf-token-build, figma-diff, semantic-release-debug, quarterly-report-gen, prototype-mode…). Skills carry progressive-disclosure `references/` files that agents are told to read before answering.

- Code: https://github.com/patternfly/ai-helpers/tree/main/plugins

```markdown
## PatternFly MCP

If `@patternfly/patternfly-mcp` is available, use it for current props, examples, and new components. This skill and the reference files define **nesting and wrapper rules**; the MCP fills in API details.

## Why structure matters

Layout CSS targets specific parent-child trees. Skipping wrappers (`ToolbarContent`, `CardBody`, `PageSection`, etc.) breaks spacing and alignment; custom CSS is usually papering over a wrong tree. **Use every structural wrapper PatternFly provides for that region.**

## Where the hierarchies live

Reference files hold trees, props notes, examples, and anti-patterns — not duplicated here:
...
Read the relevant file before suggesting structure for that family.
```

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/plugins/react/skills/pf-component-check/SKILL.md

### patternfly.org AI section (guidelines + AI-assisted development)

Type: `ai-docs-page` (AI docs page) · Official · Audience: consumers

A first-class `AI` docs section with two halves: design guidelines for shipping AI features (AI design principles, legal requirements, transparency notices, iconography, color, chatbot avatars, animation, conversation design, plus a bundled ‘Red Hat AI Ethics and Compliance Checklist.pdf’) and AI-assisted development (Marketplace, PatternFly CLI, PatternFly MCP, rapid prototyping, AI-assisted code migration). Includes Red Hat AI policy obligations for anyone using AI with PatternFly.

- Docs: https://www.patternfly.org/ai/ai-assisted-development/patternfly-mcp

- Code: https://github.com/patternfly/patternfly-org/tree/main/packages/documentation-site/patternfly-docs/content/AI

```markdown
### AI-assisted development

- **[Marketplace](/ai/ai-assisted-development/marketplace):** Plugins that give AI coding assistants knowledge and skills to generate more accurate, PatternFly-compliant code.
- **[PatternFly CLI](/ai/ai-assisted-development/patternfly-cli):** A command-line tool for scaffolding projects, performing code modifications, and running project-related tasks.
- **[PatternFly MCP](/ai/ai-assisted-development/patternfly-mcp):** An MCP server that gives AI coding tools PatternFly knowledge and capabilities.
- **[Rapid prototyping](/ai/ai-assisted-development/rapid-prototyping):** Guidance for generating and iterating AI features during early stages of design.
- **[AI-assisted code migration](/ai/ai-assisted-development/ai-assisted-code-migration):** Guidance for using AI to speed up and simplify codebase migrations.
```

Source: https://raw.githubusercontent.com/patternfly/patternfly-org/main/packages/documentation-site/patternfly-docs/content/AI/ai.md

### @patternfly/patternfly-cli

Type: `cli-scaffolding` (CLI scaffolding) · Official · Audience: consumers

Scaffolding + codemod CLI (`patternfly-cli` / `pfcli`) with create/list/update/init/save/load/deploy commands and a `starter` React+TS template. Explicitly positioned as an agent-facing deterministic surface: run it yourself or ‘use it from an AI-enabled editor (such as Cursor) so coding agents can rely on the same predictable commands for scaffolding, updates, and git workflows.’ `update` runs codemods for PF version upgrades (import changes, component renames).

- Docs: https://www.patternfly.org/ai/ai-assisted-development/patternfly-cli

- Code: https://github.com/patternfly/patternfly-cli

```markdown
The [PatternFly CLI](https://github.com/patternfly/patternfly-cli) is a command-line tool for scaffolding projects, performing code modifications, and running project-related tasks. It streamlines everyday development work and PatternFly upgrades, making it convenient and easy to work straight from the terminal. You can run it in the terminal on its own, or use it from an AI-enabled editor (such as [Cursor](https://www.cursor.com/)) so coding agents can rely on the same predictable commands for scaffolding, updates, and git workflows.
```

Source: https://raw.githubusercontent.com/patternfly/patternfly-org/main/packages/documentation-site/patternfly-docs/content/AI/patternfly-cli.md

### patternfly-cli AGENTS.md

Type: `agents-md` (AGENTS.md) · Official · Audience: builders

The only AGENTS.md found in the org. Repo-map table of every source file’s role, ADR links, ‘follow the pattern in these files instead of growing cli.ts’ exemplar routing, and single-file verification commands (`npm run lint:file -- src/create.ts`) to keep agent loops cheap.

- Code: https://github.com/patternfly/patternfly-cli/blob/main/AGENTS.md

```markdown
## Pattern references

`src/cli.ts` is only the **entry point**; each command’s logic lives in a **separate** module. When adding or changing behavior, **follow the pattern** in these files instead of growing `cli.ts`:

- **New or changed “create from template” flow** — follow the pattern in `src/create.ts`; register the command in `src/cli.ts` only.
- **Commit / push workflow** — see `src/save.ts` for how the command delegates to git and GitHub helpers.
...
Use `src/create.ts` as a **reference implementation** when you need a full example of a `run*` export wired from `cli.ts`.
```

Source: https://raw.githubusercontent.com/patternfly/patternfly-cli/main/AGENTS.md

### ai-helpers CLAUDE.md

Type: `claude-md` (CLAUDE.md) · Official · Audience: builders

Short, high-leverage builder rules for the marketplace repo: keep Claude and Cursor manifests byte-identical, regenerate PLUGINS.md via script after any skill rename, enforce the `pf-` prefix convention, and quarantine generic skills into `pf-workshop`.

- Code: https://github.com/patternfly/ai-helpers/blob/main/CLAUDE.md

```markdown
## Working in this repo

- Plugin manifests must be identical in `.claude-plugin/` and `.cursor-plugin/` — always update both
- After adding or renaming skills/agents, run `bash scripts/generate-plugins-md.sh` to regenerate PLUGINS.md and the README plugin table
- Skills in consumer plugins use the `pf-` prefix and are PatternFly-specific. Generic or non-PF skills belong in `pf-workshop`.
- Do not add `mcpServers` to plugin.json files — the PatternFly MCP is a separate user install documented in each plugin's README
```

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/CLAUDE.md

### patternfly-mcp repo agent guidelines + builder skills

Type: `other` (Other) · Official · Audience: builders

Instead of a root CLAUDE.md, the MCP repo uses a `guidelines/` directory (agent_behaviors.md, agent_coding.md, agent_testing.md) plus `guidelines/skills/{add-docs-links,review-zod-integration}/SKILL.md`, symlinked/mirrored through `.claude/skills` and `.agents/skills`, and an `.aiignore`. CONTRIBUTING.md tells humans to bootstrap the agent with a magic phrase: prompt it to `review the repo guidelines`.

- Code: https://github.com/patternfly/patternfly-mcp/tree/main/guidelines

```markdown
### AI agent

If you're using an AI assistant to help with development in this repository, please prompt it to `review the repo guidelines` to ensure adherence to project conventions.

Guidelines for developer-agent interaction can be found in [CONTRIBUTING.md](./CONTRIBUTING.md#ai-agent).
```

Source: https://raw.githubusercontent.com/patternfly/patternfly-mcp/HEAD/README.md

### ai-helpers docs/ — curated LLM-facing PatternFly documentation

Type: `other` (Other) · Official · Audience: consumers

A parallel, deliberately terse documentation tree written for models rather than humans (guidelines/styling-standards.md, component-architecture.md, ai-prompt-guidance.md, components/data-display/table.md, charts/, chatbot/, troubleshooting/common-issues.md). It is also the upstream for the MCP server’s AI-guidance resources. `ai-prompt-guidance.md` is unusual: it teaches the *human* to write coercive prompts, shipping a fill-in prompt template.

- Code: https://github.com/patternfly/ai-helpers/tree/main/docs

````markdown
## Essential Prompt Template

```
Create a [FEATURE] using PatternFly v6 React components. Requirements:
- Follow PatternFly component composition patterns (see styling-standards.md)
- Use component props for spacing/layout before considering utility classes
- Ensure keyboard accessibility with proper ARIA labels
- Verify all components exist in PatternFly packages before using
- [SPECIFIC_FEATURE_REQUIREMENTS]
- Reference: [LINK_TO_RELEVANT_DOCS]
```
````

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/docs/guidelines/ai-prompt-guidance.md

### llms.txt / llms-full.txt

Type: `llms-txt` (llms.txt) · Community · Audience: consumers

NOT PRESENT. https://www.patternfly.org/llms.txt and /llms-full.txt both return 404 (S3 NoSuchKey), as do /mcp and /ai (the AI section lives at versioned paths and 302-redirects from /ai/...). No llms.txt in patternfly-org, patternfly-react, patternfly, or patternfly-mcp repo roots.

Notes: PatternFly’s bet is entirely on MCP + plugin marketplace, skipping the llms.txt convention.

## Coercion techniques (8)

### Eval-gated skills with a 1.0 no-false-positive gate

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

The strongest technique found in this study so far: ai-helpers ships an eval harness (`eval//eval.yaml` + case workspaces with fixture .tsx/.scss files and `annotations.yaml`) run by the `Skill Evals` GitHub Action on any PR touching `plugins/*/skills/**`. Judges are Python `check` blocks; thresholds are explicit. Two judges demand a perfect 1.0 pass rate: `routes_to_subskills` and `gate_skip_non_pf`, the latter failing the build if the router mentions any `pf-*` skill inside a non-PatternFly project. MCP is explicitly denied during evals (`deny: mcp__*`) so the harness measures the prompt’s own influence, not retrieval.

```yaml
permissions:
  allow: []
  deny:
    - "mcp__*"
...
  - name: gate_skip_non_pf
    description: Non-PF project gets no PF-specific routing — generic advice only
    if: "annotations.get('expected_routing') == 'none'"
    check: |
      pf_subskills = [
          "pf-figma-check", "pf-color-scan", "pf-import-check",
          "pf-component-check", "pf-test-gen", "pf-figma-token-check",
          "pf-css-migration-scan", "pf-project-gen", "pf-icon-finder",
          "pf-figma-design-mode", "pf-design-comments-setup", "pf-ai-guide"
      ]
      found_pf = [s for s in pf_subskills if s in text_lower]
      if found_pf:
          return False, f"Non-PF project got PF-specific routing: {found_pf}"
      return True, "No PF sub-skill routing for non-PF project — gate check working"

thresholds:
  routes_to_subskills:
    min_pass_rate: 1.0
  gate_skip_non_pf:
    min_pass_rate: 1.0
  actionable_next_step:
    min_pass_rate: 0.67
```

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/eval/pf-assist/eval.yaml

### Router agent with an explicit opt-out gate

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

`pf-assist` is a dispatcher subagent, always-on in any repo with `@patternfly/*` dependencies, that maps observable signals (changed .tsx importing @patternfly/*, Figma URLs in conversation, empty project dir) to a table of specific `/pf-*` sub-skills across four contexts (Validation / Testing / Scaffolding / Design). Its first instruction is a self-disable clause, the behavior the eval suite then enforces at 100%.

```markdown
# PatternFly assist

Route to the right PatternFly consumer skills based on what the developer is doing. Skip entirely if the project does not depend on `@patternfly/*` packages.
...
## Context detection

Determine which contexts apply based on observable signals:

- **Validation**: changed or new `.tsx`, `.jsx`, `.css`, `.scss` files that import from `@patternfly/*`
- **Testing**: recently implemented or modified components without corresponding test updates
- **Scaffolding**: empty or new project directory, `package.json` just created, user asked to scaffold
- **Design**: Figma URLs in conversation, design-related user requests, `.figma` references

When multiple contexts apply, surface all relevant sub-skills and group findings by context. Only include context sections that were activated. Attribute findings to the specific sub-skill that produced them.
```

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/plugins/code-review/agents/pf-assist.md

### ALWAYS/NEVER prefix prohibitions + ordered escalation ladder

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

styling-standards.md uses checkmark/cross prohibition pairs against legacy class prefixes (a real failure mode: models trained on PF4/PF5 emit `pf-c-*`), then imposes a strict preference order (component composition first, component props second, utility classes only as a last resort), with wrong-answer examples inline so the model sees the anti-pattern it is likely to produce.

````markdown
### PatternFly v6 Requirements
- ✅ **ALWAYS use `pf-v6-` prefix** - All PatternFly v6 classes
- ❌ **NEVER use legacy prefixes** - No `pf-v5-`, `pf-v4-`, `pf-u` or `pf-c-`

```css
/* ✅ Correct v6 classes */
.pf-v6-c-button          /* Components */
.pf-v6-u-m-md            /* Utilities */
.pf-v6-l-grid            /* Layouts */

/* ❌ Wrong - Don't use these */
.pf-v5-c-button
.pf-u-m-md
.pf-c-button
```
...
> **Component-first approach:** Use proper PatternFly component composition for layout and spacing. Components should be children of appropriate containers like PageSection, ActionGroup, Stack, etc.
````

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/docs/guidelines/styling-standards.md

### Two-step search→use retrieval contract with schema fusion

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

The MCP deliberately collapsed four tools into two and forces a discover-then-fetch sequence, capping `urlList` at 15 to bound context. `usePatternFlyDocs` auto-appends the machine-readable JSON Schema (props, types, validation) whenever it detects a component, fusing prose docs with a hallucination-resistant prop contract. A per-LLM tip in the docs prescribes the lookup order for unknown components, and `patternfly://` URIs are framed as a ‘transitional’ compatibility bridge for clients that cannot read MCP resources, pushing clients toward `resources/read`.

```markdown
### Context and guidelines

- **`patternfly://context`**: General PatternFly MCP server context, including high-level development rules and accessibility guidelines.

> **Tip for LLMs**: When a user asks about a component you aren't familiar with, first check `patternfly://docs/index` to find the correct name, then read the documentation via `patternfly://docs/{name}`. Use `patternfly://components/index` for a cleaner list of component-only names.
...
> **Note on AI content**: Specialized AI guidance resources are sourced from the [patternfly/ai-helpers](https://github.com/patternfly/ai-helpers) integration. These are specifically optimized to help LLMs generate more accurate PatternFly code.
```

Source: https://raw.githubusercontent.com/patternfly/patternfly-mcp/HEAD/docs/usage.md

### Allowlisted design sources

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

`pf-figma-design-mode` ships a one-page `references/approved-sources.md` that hard-restricts the agent to exactly two Figma files, preventing it from pulling components from random or forked libraries when composing designs.

```markdown
# Approved Figma Sources

Use components and patterns only from these two Figma files:

- [PatternFly 6 – Components](https://www.figma.com/design/VMEX8Xg2nzhBX8rfBx53jp/PatternFly-6--Components?m=auto)
- [PatternFly 6 – Patterns & Extensions](https://www.figma.com/design/MSr6kVEOuAxmPOkjg7x8PO/PatternFly-6--Patterns---Extensions?m=auto)
```

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/plugins/design-guide/skills/pf-figma-design-mode/references/approved-sources.md

### Deterministic grep commands instead of model judgment

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

Audit skills hand the model exact regexes and ripgrep invocations rather than asking it to ‘look for problems’. pf-import-check ships three `rg` commands targeting the specific import mistakes PF’s packaging invites (charts must come from `/victory`, chatbot and component-groups from `dist/dynamic/*`), plus the corrected import lines verbatim. pf-color-scan specifies HEX/RGB/HSL regexes, the 148-name X11 list, a property filter, and an exception carve-out so token *definitions* are not flagged.

````markdown
Before proposing import fixes, use the PatternFly MCP server to confirm current package paths and examples from the latest docs.

## What to check

1. Charts imported from `@patternfly/react-charts` root (invalid for Victory components).
2. Chatbot imports not using `@patternfly/chatbot/dist/dynamic/*`.
3. Component-group imports not using `@patternfly/react-component-groups/dist/dynamic/*`.
4. Missing package CSS imports for features in use.

## Validation commands

```bash
rg "@patternfly/react-charts['\"]" src
rg "@patternfly/chatbot['\"]" src
rg "@patternfly/react-component-groups['\"]" src
```

## Correct import examples

```tsx
import { ChartDonut } from "@patternfly/react-charts/victory";
import { Chatbot } from "@patternfly/chatbot/dist/dynamic/Chatbot";
import { BulkSelect } from "@patternfly/react-component-groups/dist/dynamic/BulkSelect";
```
````

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/plugins/react/skills/pf-import-check/SKILL.md

### ERROR/WARN severity report contract with fix strings

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

pf-component-check enumerates ~13 families of structural violations as a lookup table (e.g. `` direct under ``, `` without ``, `` without dataLabel = WARN) and pins the output to a lint-like format with severity, path:line, found, and fix. It also constrains autonomy: only unambiguous structural fixes may be applied; anything design-affecting must be reported and asked about.

````markdown
5. If the user requests fixes, apply them. Only fix unambiguous structural issues — if a fix would change behavior or needs a design decision, report it and ask.
...
### Report format

For each violation:

```
[ERROR|WARN] file/path.tsx:42 - <Toolbar> has direct children that are not <ToolbarContent>
  Found: <Button> as direct child of <Toolbar>
  Fix: Wrap children in <ToolbarContent><ToolbarItem>...</ToolbarItem></ToolbarContent>
```

Use `ERROR` for layout-breaking issues; `WARN` for best-practice gaps.
````

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/plugins/react/skills/pf-component-check/SKILL.md

### Role priming + processing-priority headers in builder guidelines

Category: `instruction-files` (Instruction files) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/instruction-files.md

Two distinct in-house conventions. Consumer skills open with a persona (“You are a Senior Design Systems Engineer specializing in CSS refactoring and Design Token implementation”) to bias the review. Builder guidelines in patternfly-mcp add machine-readable precedence metadata: a `## For Agents` block with `### Processing Priority: Critical - This document should be processed first`, plus behavior rules like sequential processing and mandatory architecture confirmation before implementing.

```markdown
## For Agents

### Processing Priority

Critical - This document should be processed first when working with agent guidelines in the repository.
...
## 2. Core Behavior Standards

- **Sequential Processing**: Ask questions one at a time; process requests in logical order; complete one task before starting another.
- **Architectural Alignment**: Always confirm changes against the [system architecture and roadmap](../docs/architecture.md) before proceeding with implementation.
- **Reference-Based Implementation**: Review git history; study existing patterns (e.g., "creator" pattern for tools/resources); maintain code style consistency
...
- **Validation Required**: Follow checklists; verify requirements; test thoroughly.
```

Source: https://raw.githubusercontent.com/patternfly/patternfly-mcp/main/guidelines/agent_behaviors.md

## Platform integrations (3)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

Three Figma-facing skills, all pointed at two allowlisted PF6 Figma libraries: `pf-figma-design-mode` (create/edit Figma files using PF component libraries), `pf-figma-check` (component usage vs PF design guidelines, with a `scripts/patternfly-check.js`), `pf-figma-token-check` (+ token-reference.md), and `pf-icon-finder` (identify PF icons in mockups → React imports). The builder-side `figma-diff` skill in pf-workshop wraps the Figma REST API with scripts to diff token/library versions and generate changelogs and release notes. No Figma Code Connect files were found in any patternfly repo.

Link: https://github.com/patternfly/ai-helpers/tree/main/plugins/design-audit/skills

### other

Cursor is a first-class distribution target, not an afterthought: `.cursor-plugin/marketplace.json` at the repo root and a `.cursor-plugin/plugin.json` in every plugin, byte-identical to the Claude Code manifests (CLAUDE.md enforces that they never drift), with install demo GIFs for both. No `.cursorrules` or `.cursor/rules/*.mdc` files exist in patternfly-org, patternfly-react, patternfly, patternfly-mcp, or patternfly-cli; distribution is via plugins, not distributed editor rules.

Link: https://github.com/patternfly/ai-helpers

### other

@patternfly/chatbot is a shipped product surface for building AI UIs (dynamic-import-only package, `@patternfly/chatbot/dist/dynamic/Chatbot`), backed by conversation-design docs and chatbot-avatar guidelines on patternfly.org. No Storybook integration found; PatternFly documents components in its own patternfly-org docs site instead.

Link: https://www.patternfly.org/ai/guidelines/conversation-design

## Building the system vs. consuming it

### For consumers (agents building UIs with PatternFly)

Very strong and unusually complete. A consumer installs one thing (`/plugin marketplace add patternfly/ai-helpers` → `/plugin install react@ai-helpers`) and gets the MCP server auto-wired plus a routing agent that fires on any repo with `@patternfly/*` deps and dispatches to 32 skills covering validation (structure, imports, tokens, colors, legacy classes), test generation, scaffolding, migration, and Figma work. Retrieval is a two-step search→use contract with JSON prop schemas fused into responses, so props are grounded rather than recalled. Deterministic surfaces (patternfly-cli codemods, ripgrep commands) are preferred over model judgment wherever possible. The one conventional gap is llms.txt: PatternFly has none, so agents without MCP or plugins get nothing machine-optimized.

### For builders (the PatternFly team using AI on the system itself)

Real but deliberately non-standard. There is no CLAUDE.md or AGENTS.md in patternfly-org or patternfly-react, the two biggest repos, so agents working on the docs site or the React library get no repo instructions. The AI-adjacent repos are the opposite: patternfly-cli has a thorough AGENTS.md, ai-helpers has a tight CLAUDE.md, and patternfly-mcp replaces CLAUDE.md with a versioned `guidelines/` tree (agent_behaviors / agent_coding / agent_testing) surfaced through `.claude/skills` and `.agents/skills`, an `.aiignore`, and a documented human ritual: prompt the agent to `review the repo guidelines`. The pf-workshop plugin is explicitly the DS team’s own toolbox and skill incubator (bug triage, release debugging, org version bumps, token builds, quarterly reports, figma-diff), with CONTRIBUTING-SKILLS.md as the promotion path from incubator to consumer plugin, and .coderabbit.yaml for AI code review.

## Gaps

Not confirmed, or contradictory: (1) The `claude mcp add patternfly-mcp` one-liner that circulates elsewhere doesn’t appear verbatim in the docs; README and docs/usage.md document JSON `mcpServers` config, npx, and podman instead; treat the CLI one-liner as unconfirmed phrasing. (2) it was not possible to fetch the actual text of `patternfly://context` (the server’s ‘high-level development rules and accessibility guidelines’ payload): it is generated at runtime from src/ and the ai-helpers docs tree, so the exact coercion language shipped to models via that resource is unread. (3) Internal contradiction: ai-helpers CLAUDE.md says 'Do not add `mcpServers` to plugin.json files’, yet plugins/patternfly-mcp/.claude-plugin/plugin.json contains an `mcpServers` block and the README claims the MCP ‘is installed automatically when you install any plugin — no extra setup required’. Whether other plugins actually auto-wire the MCP is unverified. (4) this study did not read the a11y and code-review plugins’ skills directories (both only contain `.gitkeep`: a11y has no skills despite being listed, and code-review ships only the pf-assist agent), so the README’s ‘32 skills’ badge is script-generated and may count agents. (5) patternfly.org/ai/* returns 302 (versioned redirect targets not followed), so exact live URLs for the AI pages are inferred from the docs source frontmatter, not confirmed 200s. (6) No search was done for community (non-Red Hat) PatternFly MCP servers; none surfaced in the org-scoped search. (7) No Figma Code Connect or Storybook artifacts found; absence is based on tree greps of patternfly-react/patternfly-org/patternfly, not exhaustive org-wide search.

## Sources (15)

- https://registry.npmjs.org/@patternfly/patternfly-mcp

- https://github.com/patternfly/patternfly-mcp

- https://raw.githubusercontent.com/patternfly/patternfly-mcp/HEAD/README.md

- https://raw.githubusercontent.com/patternfly/patternfly-mcp/HEAD/docs/usage.md

- https://raw.githubusercontent.com/patternfly/patternfly-mcp/main/guidelines/agent_behaviors.md

- https://github.com/patternfly/ai-helpers

- https://raw.githubusercontent.com/patternfly/ai-helpers/main/README.md

- https://raw.githubusercontent.com/patternfly/ai-helpers/main/CLAUDE.md

- https://raw.githubusercontent.com/patternfly/ai-helpers/main/.claude-plugin/marketplace.json

- https://raw.githubusercontent.com/patternfly/ai-helpers/main/plugins/code-review/agents/pf-assist.md

- https://raw.githubusercontent.com/patternfly/ai-helpers/main/eval/pf-assist/eval.yaml

- https://raw.githubusercontent.com/patternfly/ai-helpers/main/.github/workflows/skill-evals.yml

- https://raw.githubusercontent.com/patternfly/ai-helpers/main/docs/guidelines/styling-standards.md

- https://raw.githubusercontent.com/patternfly/patternfly-org/main/packages/documentation-site/patternfly-docs/content/AI/ai.md

- https://raw.githubusercontent.com/patternfly/patternfly-cli/main/AGENTS.md

---

Generated 2026-07-28T02:39:42Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
