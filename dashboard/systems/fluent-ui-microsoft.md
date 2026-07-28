---
title: "Microsoft Fluent UI — AI affordances"
description: "Fluent UI’s AI story is lopsided. The React monorepo has one of the most sophisticated builder-side agent setups of any major design system: a root AGENTS.md with…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.json"
id: "fluent-ui-microsoft"
category: "design-system"
ai_maturity: "invested"
affordance_count: 8
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-28T03:38:29Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Microsoft Fluent UI — AI affordances

Microsoft · design-system · MIT (repo license metadata reports NOASSERTION due to bundled third-party notices) · AI maturity: **invested** (official MCP, skills or rules with real engineering behind them). 8 affordances, 8 coercion techniques.

- Docs: https://fluent2.microsoft.design
- Repo: https://github.com/microsoft/fluentui
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft

## Summary

Fluent UI’s AI story is lopsided. The React monorepo has one of the most sophisticated *builder*-side agent setups of any major design system: a root AGENTS.md with numbered “never violate” rules, CLAUDE.md symlinked to it, `.agents/skills/` + `.claude/skills/` with nine executable slash-command skills (scaffolding, token lookup, lint auto-fix loops, Storybook+Playwright visual verification, PR review with confidence scoring, issue triage, Dependabot rollup), a `.github/instructions/copilot.instructions.md` with `applyTo: '**'`, and a `copilot-setup-steps.yml` workflow that pre-provisions the GitHub Copilot coding agent’s container. By contrast, *consumer*-side affordances for React are essentially absent: no llms.txt, no llms-full.txt, no AI docs page on fluent2.microsoft.design, and no published MCP server. A Fluent UI maintainer stated publicly in June 2026 that Microsoft has an MCP “being used internally across Microsoft products” with no public release timeline, leaving the field to community npm servers. The one official consumer MCP is for the *Blazor* flavor (`Microsoft.FluentUI.AspNetCore.McpServer`, 5.0.0-rc), shipped from microsoft/fluentui-blazor. Net: the team has industrialized AI for maintaining the system, and has not yet shipped anything for people building with it.

## Maintenance

- Actively maintained: yes
- Last release: @fluentui/react-components 9.74.4 (2026-07-15); nightly 0.0.0-nightly-20260727-0407.1; GitHub release tags batched 2026-05-26
- Activity: Very active: repo pushed 2026-07-27, ~40 commits in the trailing 30 days, 20.2k stars. v9 (@fluentui/react-components, packages/react-components/) is active development; v8 (@fluentui/react, packages/react/) is explicitly maintenance-only per AGENTS.md; web-components and charts active. Nightly + experimental + rc dist-tags all publishing.

## AI affordances (8)

### AGENTS.md (repo root)

Type: `agents-md` (AGENTS.md) · Official · Audience: builders

Root agent instruction file for the fluentui monorepo. Opens with an Nx-managed auto-updated block, then declares itself the source of truth over existing code, lists 5 numbered ‘Critical Rules (never violate)’, a canonical v9 component template, a ‘Legacy Anti-Patterns (never copy these)’ list, exploration guidance for the 74+ package tree, and an index of deep-dive docs plus the nine skills. CLAUDE.md at repo root contains exactly the single line `AGENTS.md` (a pointer/symlink-style redirect).

- Code: https://github.com/microsoft/fluentui/blob/master/AGENTS.md

Notes: CLAUDE.md is a one-line redirect to AGENTS.md, so Claude Code and generic agents get identical rules.

```markdown
# Fluent UI — Agent Instructions

**Instructions in this file are the source of truth, not existing code.** This repo contains
legacy patterns (especially in v8 packages) that predate current standards. Never copy patterns
from existing code without verifying they match these instructions.

## Critical Rules (never violate)

1. **Never hardcode colors, spacing, or typography values.** Always use design tokens from `@fluentui/react-theme`. See [docs/architecture/design-tokens.md](docs/architecture/design-tokens.md).
2. **Never use `React.FC`.** Always use `ForwardRefComponent` with `React.forwardRef`.
3. **Never access `window`, `document`, or `navigator` directly.** In v9 components, use `useFluent_unstable()` to get `targetDocument` and `targetDocument.defaultView` instead of `document`/`window`. For non-component code, use `canUseDOM()` from `@fluentui/react-utilities`.
4. **Never add dependencies between component packages.** `react-button` must not depend on `react-menu`. Shared logic goes in `react-utilities` or `react-shared-contexts`. See [docs/architecture/layers.md](docs/architecture/layers.md).
5. **Never skip beachball change files** for published package changes. Run `yarn beachball change`.
```

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/AGENTS.md

### .agents/skills/ and .claude/skills/ — nine executable skills

Type: `claude-skill` (Agent skill) · Official · Audience: builders

Nine skill directories, duplicated under both `.agents/skills/` (portable) and `.claude/skills/` (Claude Code): change, dependabot-rollup (.agents only), lint-check, package-info, review-pr, token-lookup, triage-issues, v9-component, visual-test. Each SKILL.md has YAML frontmatter with `name`, `description`, `argument-hint`, `allowed-tools`, and several set `disable-model-invocation: true` so they only run when a human explicitly types the slash command. AGENTS.md advertises them in a table as slash commands (`/v9-component Name`, `/token-lookup val`, `/lint-check [pkg]`, `/visual-test Name`, `/review-pr #123`, `/triage-issues`, `/dependabot-rollup`).

- Code: https://github.com/microsoft/fluentui/tree/master/.agents/skills

Notes: Note the deliberate refusal to let the model free-hand a component: the skill forces the Nx generator (`@fluentui/workspace-plugin:react-component`) rather than describing files to write.

````markdown
---
name: v9-component
description: Scaffold a new v9 component with all required files following Fluent UI patterns (hook, styles, render, types, tests, stories, conformance)
disable-model-invocation: true
argument-hint: <ComponentName>
allowed-tools: Read Write Bash Glob Grep
---

# Scaffold a V9 Component

Create a new v9 component named **$ARGUMENTS** using the repo's Nx generators.

## Steps

### Adding a component to an existing package

Use the `react-component` generator:

```bash
yarn nx g @fluentui/workspace-plugin:react-component --name $ARGUMENTS --project <project-name>
```
````

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/v9-component/SKILL.md

### .github/instructions/copilot.instructions.md

Type: `copilot-instructions` (Copilot instructions) · Official · Audience: builders

Path-scoped Copilot instruction file with frontmatter `applyTo: '**'`. Establishes repo topology (Nx, Yarn 4.x, Node ^22, TypeScript strict), then ranks the four product lines with explicit routing verdicts (v9 ‘PRIORITIZE FOR NEW WORK’, v8 ‘MAINTENANCE ONLY’) and enumerates the exact Nx commands agents must use instead of raw tooling. A second file, dependabot-security-fixes.instructions.md, scopes dependency-security work.

- Code: https://github.com/microsoft/fluentui/blob/master/.github/instructions/copilot.instructions.md

```markdown
---
applyTo: '**'
---

# Fluent UI Copilot Instructions

You are working in the Microsoft Fluent UI monorepo, a comprehensive design system and UI component library for web applications.

## Project Structure

1. **Fluent UI v9** (`@fluentui/react-components`) - **PRIORITIZE FOR NEW WORK**

   - Location: `packages/react-components/`
   - Nx Project Tags: `vNext`

2. **Fluent UI v8** (`@fluentui/react`) - **MAINTENANCE ONLY**

   - Location: `packages/react/`
   - Nx Project Tags: `v8`
   - Status: Maintenance mode
```

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.github/instructions/copilot.instructions.md

### copilot-setup-steps.yml — Copilot coding agent environment provisioning

Type: `other` (Other) · Official · Audience: builders

A GitHub Actions workflow whose job is named `copilot-setup-steps` specifically so the GitHub Copilot coding agent picks it up and pre-installs the toolchain (checkout with full history, Node 22 with yarn cache, `yarn install --immutable`) before the agent starts work. This is infrastructure investment in autonomous agent PRs, not just prompt text.

- Code: https://github.com/microsoft/fluentui/blob/master/.github/workflows/copilot-setup-steps.yml

```yaml
name: 'Copilot Setup Steps'

on: workflow_dispatch

jobs:
  # The job MUST be called `copilot-setup-steps` or it will not be picked up by Copilot.
  copilot-setup-steps:
    runs-on: ubuntu-latest

    permissions:
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          cache: 'yarn'
          node-version: '22'

      - run: yarn install --immutable
```

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.github/workflows/copilot-setup-steps.yml

### Microsoft.FluentUI.AspNetCore.McpServer (Fluent UI Blazor)

Type: `mcp-server` (MCP server) · Official · Audience: consumers

The only OFFICIAL Microsoft MCP server for any Fluent UI flavor. Lives at src/Tools/McpServer on the `dev-v5` branch of microsoft/fluentui-blazor and ships to NuGet as a global dotnet tool (`dotnet tool install -g Microsoft.FluentUI.AspNetCore.McpServer`, binary `fluentui-mcp`, 5.0.0-rc.1, MIT). Serves docs for 142+ Blazor components. Tools: ListComponents, SearchComponents, GetComponentDetails, GetEnumValues, GetComponentEnums. The source tree also contains a `Prompts/` and `Resources/` directory, i.e. it exposes MCP prompts, not only tools. Does NOT cover Fluent UI React.

- Docs: https://www.nuget.org/packages/Microsoft.FluentUI.AspNetCore.McpServer

- Code: https://github.com/microsoft/fluentui-blazor/tree/dev-v5/src/Tools/McpServer

Notes: Release-candidate status as of 5.0.0-rc.1 (Feb 2026). Not present on the `main`/`dev` branches; v5 line only.

````markdown
# Fluent UI Blazor MCP Server

A Model Context Protocol (MCP) server that provides documentation for the [Fluent UI Blazor](https://github.com/microsoft/fluentui-blazor) component library.

## Overview

This MCP server enables AI assistants to access comprehensive documentation about Fluent UI Blazor components, including:

- **Component listing** - Browse all 142+ available components with descriptions
- **Component details** - Get complete documentation including parameters, events, and methods
- **Search** - Find components by name or description
- **Enum information** - Explore enum types and their values

## Installation

### Option 1: Install as dotnet tool based on NuGet.org (Recommended)

```bash
dotnet tool install -g Microsoft.FluentUI.AspNetCore.McpServer
```

**For Visual Studio Code** (`.vscode/mcp.json`):

```json
{
    "servers": {
        "fluent-ui-blazor": {
            "command": "fluentui-mcp"
        }
    }
}
```
````

Source: https://raw.githubusercontent.com/microsoft/fluentui-blazor/dev-v5/src/Tools/McpServer/README.md

### Internal Microsoft Fluent UI React MCP (unreleased)

Type: `mcp-server` (MCP server) · Official · Audience: consumers

In GitHub Discussion #35732 (June 2026), Fluent UI maintainer @mainframev responded to a community MCP server announcement by disclosing that Microsoft already operates an MCP for Fluent UI React ‘being used internally across Microsoft products,’ built on current documentation plus additional sources. No public release timeline was given. Recorded here because it is the reason the public React surface has no official MCP. This is a deliberate internal-first posture, not an absence of work.

- Docs: https://github.com/microsoft/fluentui/discussions/35732

Notes: UNRELEASED / not publicly installable. Verify before citing as available.

### fluentui-mcp (community, blendsdk)

Type: `mcp-server` (MCP server) · Community · Audience: consumers

Community npm MCP server for Fluent UI React, announced in microsoft/fluentui Discussion #35732. Scans Fluent UI source to extract docs, type information, examples and patterns for AI consumption; built explicitly to stop models producing ‘inconsistent, incomplete, or just plain wrong’ Fluent UI code. npm `fluentui-mcp` 1.2.1, last published 2026-06-03.

- Docs: https://blendsdk.github.io/fluentui-mcp/

- Code: https://github.com/blendsdk/fluentui-mcp

### Other community Fluent UI MCP servers

Type: `mcp-server` (MCP server) · Community · Audience: consumers

A fragmented long tail: aminvishvam/fluentui-mcp-server (12 tools across 4 categories: custom hooks, style generation, TypeScript interfaces, accessibility compliance checking) and npm `mcp-fluent-ui` 1.0.2 (last published 2025-09-05, likely abandoned). Listed on aggregators such as LobeHub and mcpmarket. None are endorsed by Microsoft.

- Code: https://github.com/aminvishvam/fluentui-mcp-server

Notes: Quality unverified; mcp-fluent-ui is ~11 months stale.

## Coercion techniques (8)

### “Source of truth, not existing code” — overriding the repo itself

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

The single most transferable trick in the file. Fluent UI’s monorepo is 74+ v9 packages sitting next to a large v8 legacy tree, so RAG-over-the-repo and pattern-matching from neighbours actively produce wrong output. AGENTS.md pre-empts that by ranking the instruction file ABOVE the codebase, then names the contaminated directories explicitly so the agent can’t rationalize its way back in.

```markdown
**Instructions in this file are the source of truth, not existing code.** This repo contains
legacy patterns (especially in v8 packages) that predate current standards. Never copy patterns
from existing code without verifying they match these instructions.

## Legacy Anti-Patterns (never copy these)

- **DO NOT copy patterns from `packages/react/` (v8).** That's maintenance-only legacy code using runtime styling, class components, and different APIs.
- **DO NOT use `@fluentui/react` imports for new v9 work.** Use `@fluentui/react-components`.
- **DO NOT use `mergeStyles` or `mergeStyleSets`.** Use Griffel `makeStyles` with design tokens.
- **DO NOT use `IStyle` or `IStyleFunctionOrObject`.** Use Griffel's `GriffelStyle` type.
- **DO NOT use `initializeIcons()`.** V9 uses `@fluentui/react-icons` with tree-shaking.
```

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/AGENTS.md

### Numbered “Critical Rules (never violate)” with token enforcement at #1

Category: `token-enforcement` (Token enforcement) · all 13 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md

Five hard prohibitions, each phrased as ‘Never X. Always Y.’ plus a link to the deep-dive doc. Rule 1 is the classic design-system coercion: no hardcoded colors, spacing or typography, always `tokens` from `@fluentui/react-theme`. Rule 4 encodes the package-layering invariant (‘react-button must not depend on react-menu’) that agents routinely violate. Rule 5 forces a release-process side effect (`yarn beachball change`) the model would otherwise skip.

```markdown
1. **Never hardcode colors, spacing, or typography values.** Always use design tokens from `@fluentui/react-theme`.
2. **Never use `React.FC`.** Always use `ForwardRefComponent` with `React.forwardRef`.
3. **Never access `window`, `document`, or `navigator` directly.** In v9 components, use `useFluent_unstable()` to get `targetDocument` and `targetDocument.defaultView` instead of `document`/`window`.
4. **Never add dependencies between component packages.** `react-button` must not depend on `react-menu`.
5. **Never skip beachball change files** for published package changes. Run `yarn beachball change`.
```

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/AGENTS.md

### Lint-rule → fix-recipe table, with re-run verification per file

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

The `/lint-check` skill turns the repo’s custom `@fluentui/*` ESLint rules into a machine-readable remediation table (rule name → what it catches → how to fix), then mandates a per-file verify step: apply the fix, re-run lint on that file, repeat. This is the enforcement arm behind AGENTS.md’s prohibitions: the prose bans `React.FC`, and `@fluentui/no-global-react` makes it fail CI, and the skill teaches the agent how to close the loop.

```markdown
2. **Parse the output** and categorize errors by the custom Fluent UI ESLint rules:

   | Rule                                    | What it catches                             | How to fix                                            |
   | `@fluentui/ban-context-export`          | Context exported from wrong layer           | Move to `react-shared-contexts` package               |
   | `@fluentui/ban-instanceof-html-element` | `instanceof HTMLElement` (breaks iframes)   | Use element.tagName or feature detection              |
   | `@fluentui/no-global-react`             | `React.FC`, `React.useState` etc.           | Use named imports: `import { useState } from 'react'` |
   | `@fluentui/no-restricted-imports`       | Banned import paths                         | Use the allowed import path from the error message    |
   | `@fluentui/no-context-default-value`    | Context created without `undefined` default | Use `createContext(undefined)` and add a guard hook   |

3. **Auto-fix** any issues found by editing the source files directly. For each fix:

   - Read the file
   - Apply the fix
   - Verify the fix by re-running lint on that specific file
```

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/lint-check/SKILL.md

### Forcing the generator instead of free-hand scaffolding

Category: `scaffolding` (Scaffolding) · all 7 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md

`/v9-component` never tells the model which files to create. It routes every path through the repo’s own Nx generators (`yarn nx g @fluentui/workspace-plugin:react-component`, `yarn create-package`) and then hands the agent a post-generation checklist (fill in logic per component-patterns.md, add token-based styles, regenerate API docs via `yarn nx run :generate-api`). The generator is the spec; the agent is only allowed to fill the holes.

````markdown
Use the `react-component` generator:

```bash
yarn nx g @fluentui/workspace-plugin:react-component --name $ARGUMENTS --project <project-name>
```

Where `<project-name>` is the Nx project (e.g., `react-button`). This generates all required files: component, types, hook, styles, render, index barrel, and conformance test.

### After scaffolding

1. **Review generated files** against [docs/architecture/component-patterns.md]...
2. **Add styles** in `use${ARGUMENTS}Styles.styles.ts` using design tokens
4. **Update API docs** after adding exports:
   ```bash
   yarn nx run <project>:generate-api
   ```

## Critical Rules

- Always use `ForwardRefComponent` with `React.forwardRef` — never `React.FC`
````

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/v9-component/SKILL.md

### Token lookup as a search procedure + few-shot mapping table

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

`/token-lookup ` gives the model a value-category decision tree (hex → color tokens, px → spacing/font-size/radius, ms → duration), points it at the exact theme source path to grep (`packages/react-components/react-theme/library/src/`), constrains it to `allowed-tools: Read Grep Glob` (read-only, so it cannot ‘fix’ anything, only advise), and seeds a few-shot table of common hardcoded→token mappings. Crucially it also handles the failure mode: if no exact match, suggest the closest semantic token AND explain the difference.

````markdown
---
name: token-lookup
description: Find the matching Fluent UI design token for a hardcoded CSS value (color, spacing, font size, border radius, shadow)
argument-hint: <css-value>
allowed-tools: Read Grep Glob
---

2. **Search the theme source** for matching values:

   ```
   packages/react-components/react-theme/library/src/
   ```

4. **If no exact match exists**, suggest the closest semantic token and explain the difference.

## Common Mappings

| Hardcoded           | Token                                                    |
| `#0078d4`           | `tokens.colorBrandBackground`                            |
| `#323130`           | `tokens.colorNeutralForeground1`                         |
| `#ffffff`           | `tokens.colorNeutralBackground1`                         |
````

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/token-lookup/SKILL.md

### Visual verification loop: per-component Storybook + Playwright screenshot

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

`/visual-test` closes the see-what-you-built loop. It pins an exact tool version (`npx -y @playwright/cli@0.1.1`) so nothing is installed globally, and hard-constrains the agent to boot only the per-component stories package via the nx `storybook` target, because the full Storybook would drag in 74 packages. It even encodes a temporal caveat about workspace snapshots older than April 2026, and an explicit stop-and-ask branch when the stories package doesn’t exist.

````markdown
## Critical: use the per-component Storybook only

Always boot the **per-component stories package** (`react-<component>-stories`) via nx `storybook` target, which only imports its own component's stories and dependencies.

1. **Find the component's stories package.**

   ```bash
   yarn nx show project react-<lowercase-component-name>-stories --json
   ```

   If nx returns nothing with output of `Could not find project react-<component>-stories`, the component doesn't have its own stories package — check for a preview package (`react-<component>-preview-stories`) or ask before proceeding.

2. **Start the component's Storybook dev server.** Use the `storybook` target on the stories project directly — it's the most portable, since library aliases like `react-<component>:start` were only added in April 2026 and may not exist in older workspace snapshots
````

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/visual-test/SKILL.md

### Recommend-then-apply gating on mutating skills

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

Every skill that can change shared state is gated twice: YAML `disable-model-invocation: true` (a human must type the slash command; the model cannot autonomously decide to run it) plus an in-prose approval checkpoint. `/triage-issues` names the mode outright and justifies it with an asymmetric-cost argument; `/dependabot-rollup` enumerates the exact forbidden mutations and refuses to guess at invalid arguments, hard-caps the batch at 11, and requires a temporary git worktree so unrelated local changes survive.

```markdown
This skill operates in **recommend-then-apply** mode: never mutate issues until the user has approved the batch. A wrong label is cheap to add and annoying to remove, so lean on the approval step.

--- and, from dependabot-rollup/SKILL.md ---

The default operation is read-only: discover candidates, classify them, and present a plan. Never create a branch, merge commits, push, close pull requests, or open a rollup PR until the user explicitly approves the proposed candidates.

Reject an invalid repository name, a `--max` value that is not an integer from 1 through 11, an unknown Git remote, or unknown arguments instead of guessing. The value 11 is an absolute ceiling, not only the default.

Do not require a clean current working tree. Approved rollups must use a temporary Git worktree so unrelated local changes remain untouched.
```

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/dependabot-rollup/SKILL.md

### PR-type classification table that scopes which rules apply

Category: `registry-metadata` (Registry metadata) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/registry-metadata.md

`/review-pr` refuses to run a uniform checklist. It first classifies the PR from changed-file globs and branch prefixes into six types, each with an explicit check scope, then suppresses rule families by directory: v9 pattern checks are skipped for `packages/react/` (v8 maintenance) and React checks skipped for `packages/web-components/`. This prevents the review agent from generating the false positives that would otherwise train maintainers to ignore it. Output is a merge-readiness confidence score.

```markdown
## Phase 2: Classify PR Type

| Type             | Detection                                                            | Check scope                                    |
| **docs-only**    | All files are `*.md`, `docs/**`, `**/stories/**`, `**/.storybook/**` | Change file only                               |
| **test-only**    | All files are `*.test.*`, `*.spec.*`, `**/testing/**`                | Change file + test quality                     |
| **bug-fix**      | Branch starts with `fix/` or title contains "fix"                    | All checks, extra weight on tests              |
| **feature**      | Branch starts with `feat/` or adds new exports                       | All checks, extra weight on API + patterns     |
| **refactor**     | No new exports, restructures existing code                           | All checks, extra weight on no behavior change |
| **config/infra** | Changes to CI, configs, scripts only                                 | Change file + no regressions                   |

For **v8 packages** (`packages/react/`): skip V9 pattern checks — those are maintenance-only with different patterns.
For **web-components** (`packages/web-components/`): skip React-specific checks.
```

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/review-pr/SKILL.md

## Platform integrations (3)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

Official Fluent 2 UI kits published on Figma Community (Microsoft Fluent 2 Web, Fluent 2 iOS, Fluent Android, Fluent system iconography). The Web kit was refactored so components use Figma variables aligned to code tokens, and Microsoft has described an internal Figma plug-in that replaces the native properties panel so designers assign tokens rather than raw colors/stroke-widths. this study found NO evidence of Figma Code Connect (`*.figma.tsx` files) in microsoft/fluentui, and no Dev Mode MCP guidance in the docs; treat Code Connect as unconfirmed or absent.

Link: https://www.figma.com/community/file/836828295772957889/microsoft-fluent-2-web

### Storybook (addon-mcp, manifests, AI docs)

Storybook is the primary dev/docs surface: per-component stories packages (`react--stories`) each with their own nx `storybook` target, a root `.storybook/`, plus StoryWright-driven visual regression testing wired into `pr-vrt.yml` / `vrt-baseline.yml` workflows. The `/visual-test` agent skill drives these per-component Storybooks with Playwright to give agents a screenshot feedback loop.

Link: https://github.com/microsoft/fluentui/tree/master/.storybook

### other

Nx workspace with custom plugins (`tools/workspace-plugin/`) providing the `react-component` and `react-library` generators; API Extractor generates `api.md` files as machine-readable API surface; Beachball manages change files and releases. The root AGENTS.md carries an Nx-managed auto-updated block instructing agents to use `nx_workspace`, `nx_project_details` and `nx_docs` MCP tools, so Fluent UI inherits the Nx MCP server as a builder-side affordance.

Link: https://raw.githubusercontent.com/microsoft/fluentui/master/AGENTS.md

## Building the system vs. consuming it

### For consumers (agents building UIs with Microsoft Fluent UI)

Thin, and notably thinner than Fluent UI’s stature would suggest. No llms.txt or llms-full.txt on fluent2.microsoft.design (every path returns the same Astro SPA shell; this study confirmed /llms.txt, /llms-full.txt, /ai, /docs/mcp and a deliberately fake path all return byte-identical HTML, so those 200s are a catch-all, not content). No llms.txt on react.fluentui.dev (genuine 404). No AI/MCP/Copilot mention anywhere on fluent2.microsoft.design/get-started/develop. No official React MCP server, no `@fluentui/mcp` on npm, no ‘Add to Cursor’ buttons, no distributed .cursorrules template for consumers, no published component registry for agents, no consumer-facing Claude skill. The one official artifact is the Blazor MCP server (`Microsoft.FluentUI.AspNetCore.McpServer`, rc, dotnet tool `fluentui-mcp`, 142+ components, 5 tools), a different platform from the flagship React library. React consumers are served by community MCP servers (blendsdk/fluentui-mcp on npm, aminvishvam/fluentui-mcp-server) whose existence a maintainer implicitly acknowledged as filling a real gap while noting Microsoft runs an equivalent internally. There is a `packages/cra-template` and `starter-templates/` for scaffolding, but neither is AI-aware.

### For builders (the Microsoft Fluent UI team using AI on the system itself)

Deep and unusually operational, among the strongest builder-side setups in this study. Four layers. (1) Instruction files: AGENTS.md at root with ‘source of truth over existing code’ framing, five numbered never-violate rules, a canonical v9 component template, an anti-pattern blocklist, and a package-map for the 74+ package tree; CLAUDE.md is a one-line redirect to it; `.github/instructions/copilot.instructions.md` with `applyTo: '**'` plus a scoped dependabot-security-fixes instruction file. (2) Executable skills: nine SKILL.md files mirrored into `.agents/skills/` and `.claude/skills/`, covering scaffolding (v9-component), token remediation (token-lookup), lint auto-fix loops (lint-check), visual verification via Storybook+Playwright (visual-test), change-file generation (change), package introspection (package-info), PR review with confidence scoring (review-pr), issue triage (triage-issues), and Dependabot batching (dependabot-rollup). (3) Agent infrastructure: `copilot-setup-steps.yml` pre-provisions the Copilot coding agent’s container with Node 22 + immutable yarn install; `.github/triage-bot.config.json` and `issues.yml`/`pr-housekeeping.yml` workflows automate queue hygiene. (4) Curated deep-dive docs written for agents to follow the links: docs/architecture/{component-patterns,design-tokens,layers}.md, docs/workflows/{contributing,testing}.md, docs/team-routing.md, docs/quality-grades.md, docs/tech-debt-tracker.md. The `.agents/` + `.claude/` duplication signals deliberate multi-vendor portability rather than betting on one assistant.

## Gaps

Not confirmed, or not found: (1) No llms.txt or llms-full.txt anywhere. fluent2.microsoft.design returns HTTP 200 with an identical Astro SPA shell for /llms.txt, /llms-full.txt, /ai, /docs/mcp, /mcp AND for a nonsense control path: a catch-all router, not real files. react.fluentui.dev/llms.txt is a hard 404. Anyone scanning by status code will produce a false positive here. (2) No official Fluent UI React MCP server exists publicly; the maintainer statement about an internal one (Discussion #35732, June 2026) is a claim in a GitHub comment, with no artifact, no timeline, and no way to verify scope. (3) No Figma Code Connect found: GitHub code search for `*.figma.tsx` in the repo returned 404/not-found for my token’s search scope, so it was not possible to exhaustively prove absence; no positive evidence in the repo tree or docs either. Treat as ‘no evidence of’, not ‘definitively absent’. (4) this study did not read every one of the nine SKILL.md files end-to-end (change, package-info, and the tails of review-pr/triage-issues/dependabot-rollup were sampled from their heads only), so additional coercion language likely exists beyond what is quoted here. (5) No AI-assisted codemod evidence: `packages/codemods` exists but this study did not confirm any AI/LLM involvement. It appears to be conventional jscodeshift-style tooling, and the v8→v9 migration guidance is documentation, not an agent. (6) `.github/instructions/dependabot-security-fixes.instructions.md` was confirmed to exist but not read. (7) The Blazor MCP server is 5.0.0-rc.1 on a non-default branch (`dev-v5`); it is official but pre-release, and its tool list came partly from a maintainer’s blog post rather than the source. (8) GitHub release tags are batched oddly (latest tags dated 2026-05-26 while npm `latest` for @fluentui/react-components is 9.74.4 published 2026-07-15). npm is the reliable freshness signal, not GitHub Releases. (9) Community MCP server quality is entirely unassessed; `mcp-fluent-ui` on npm is ~11 months stale and may be abandoned.

## Sources (15)

- https://raw.githubusercontent.com/microsoft/fluentui/master/AGENTS.md

- https://raw.githubusercontent.com/microsoft/fluentui/master/CLAUDE.md

- https://raw.githubusercontent.com/microsoft/fluentui/master/.github/instructions/copilot.instructions.md

- https://raw.githubusercontent.com/microsoft/fluentui/master/.github/workflows/copilot-setup-steps.yml

- https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/v9-component/SKILL.md

- https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/token-lookup/SKILL.md

- https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/lint-check/SKILL.md

- https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/review-pr/SKILL.md

- https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/visual-test/SKILL.md

- https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/triage-issues/SKILL.md

- https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/dependabot-rollup/SKILL.md

- https://github.com/microsoft/fluentui/discussions/35732

- https://raw.githubusercontent.com/microsoft/fluentui-blazor/dev-v5/src/Tools/McpServer/README.md

- https://dvoituron.com/2026/02/20/fluentui-blazor-mcp-server/

- https://fluent2.microsoft.design/get-started/develop

---

Generated 2026-07-28T03:38:29Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
