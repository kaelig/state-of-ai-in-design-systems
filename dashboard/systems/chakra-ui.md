---
title: "Chakra UI — AI affordances"
description: "Chakra UI is one of the most AI-invested open-source React component libraries: it ships an official MCP server (@chakra-ui/react-mcp, 10 tools, developed in-tree at…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.json"
id: "chakra-ui"
category: "component-library"
ai_maturity: "ai-native"
affordance_count: 8
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-28T05:02:05Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Chakra UI — AI affordances

Chakra UI (Segun Adebayo / Chakra Systems) · component-library · MIT · AI maturity: **ai-native** (AI consumption is a design goal, with dedicated surfaces and staff behind it). 8 affordances, 8 coercion techniques.

- Docs: https://chakra-ui.com
- Repo: https://github.com/chakra-ui/chakra-ui
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui

## Summary

Chakra UI is one of the most AI-invested open-source React component libraries: it ships an official MCP server (`@chakra-ui/react-mcp`, 10 tools, developed in-tree at apps/mcp), six curated llms.txt variants sliced by concern (components / styling / theming / charts / v3-migration) so agents with small context windows load only what they need, and, unusually, three first-party Claude Code Skills (`chakra-ui-builder`, `chakra-ui-migrate`, `chakra-ui-refactor`) installable via `npx skills add`, with progressive-disclosure reference files including a decision tree over all ~114 components. On the building side the team runs committed Claude Code subagents (`.claude/agents/github-issue-triage.md` on Opus, `.claude/agents/ark-ui-version-bumper.md` on Haiku) plus slash commands for changelog and PR review. The main weakness is the consumer-side prohibition surface. The skills are advisory (“prefer semantic tokens”, “avoid deep nesting”) rather than hard-gated: no linter loop on the build path, no machine-readable component registry, no forced MCP call before generation. The repo’s own CLAUDE.md is a stale (Sept 2025) narrative “learning document” rather than an enforced contributor rules file.

## Maintenance

- Actively maintained: yes
- Last release: @chakra-ui/react 3.36.1 — 2026-07-19 (npm registry `time` field); @chakra-ui/react-mcp 2.1.1 — 2025-11-03
- Activity: Very active. Commits within days of the July 2026 research date (2026-07-25 `fix(tree-view)`, 2026-07-25 `fix: missing type="button" on Tag, ActionBar, Dialog, Drawer triggers (#10908)`). Steady v3 minor cadence: 3.32.0 (Feb 2026) → 3.36.1 (Jul 2026). Renovate configured (renovate.json), changesets-based releases. The MCP server package has not been republished since Nov 2025 even though its source lives in the same monorepo, a mild staleness signal for the AI surface specifically.

## AI affordances (8)

### @chakra-ui/react-mcp (official Chakra UI MCP Server)

Type: `mcp-server` (MCP server) · Official · Audience: consumers

First-party MCP server published to npm and developed in-tree at apps/mcp. Registers 10 tools: list_components, get_component_props, get_component_example, get_theme, theme_customization (customize-theme), v2_to_v3_code_review, list_component_templates, get_component_templates, installation, search_docs. Component-name arguments are constrained with a Zod `z.enum()` built from the live component list fetched at server startup, so an agent cannot invent a component name in a tool call. The two `*_templates` tools are gated behind a paid Chakra UI Pro licence via `CHAKRA_PRO_API_KEY` and are filtered out of registration entirely (`tools.filter((tool) => !tool.disabled?.(config))`) when no key is present. Docs cover VS Code, Cursor, Claude Code, Windsurf, Zed and OpenAI Codex; stdio transport only per the docs (an http.ts exists in source).

- Docs: https://chakra-ui.com/docs/get-started/ai/mcp-server

- Code: https://github.com/chakra-ui/chakra-ui/tree/main/apps/mcp

Notes: Announced via blog post apps/www/content/blog/10-announcing-chakra-ui-mcp-server.mdx; docs page ships demo videos for Cursor, VS Code and Claude Code (/videos/claude-code-mcp.mp4).

```typescript
export const getComponentExampleTool: Tool<{ componentList: string[] }> = {
  name: "get_component_example",
  description:
    "Retrieve comprehensive example code and usage patterns for a specific Chakra UI component. This tool provides practical implementation examples including basic usage, advanced configurations, and common use cases with complete code snippets.",
  async ctx() {
    try {
      const componentList = await getAllComponentNames()
      return { componentList }
    } catch (error) {
      throw new Error(
        `Failed to initialize component example tool: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  },
  exec(server, { ctx, name, description }) {
    server.tool(
      name,
      description,
      {
        component: z
          .enum(ctx.componentList as [string, ...string[]])
          .describe(
            "The name of the Chakra UI component to get example code for",
          ),
      },
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/apps/mcp/src/tools/get-component-example.ts

### chakra-ui-builder / chakra-ui-migrate / chakra-ui-refactor (official Claude Code Skills)

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

Three first-party Agent Skills in the monorepo’s top-level skills/ directory, documented on the site and installable with `npx skills add https://github.com/chakra-ui/chakra-ui/tree/main/skills`. The builder skill uses progressive disclosure. SKILL.md is the always-loaded spine, and three reference files load on demand: references/theming.md (defineConfig/createSystem, tokens, recipes, typegen), references/charts.md (useChart, Recharts integration), and references/component-decision-tree.md, which the README describes as covering ‘all ~114 Chakra components with head-to-head comparisons’. Skill frontmatter descriptions are deliberately over-triggered with casual phrasings (‘make me a login form’, ‘add my brand colors’, ‘chakra-ify this’) so the skill fires without the user naming it. chakra-ui-refactor doubles as a review rubric with fixed dimensions (Accessibility / Responsiveness / Chakra API correctness / Token and style usage / Component structure / Maintainability).

- Docs: https://chakra-ui.com/docs/get-started/ai/skills

- Code: https://github.com/chakra-ui/chakra-ui/tree/main/skills

Notes: The most distinctive affordance in the survey set. Very few component libraries ship maintained Agent Skills with on-demand reference bundles.

```markdown
For deeper theming work — defining brand color tokens, semantic tokens with dark
mode values, full recipe/slot-recipe authoring, typegen, or ejecting the default
theme — read `references/theming.md` before responding. It covers the complete
`defineConfig` / `createSystem` API with full examples.

For any chart request — bar charts, area charts, line charts, pie/donut charts,
`BarList`, `BarSegment`, or anything involving `@chakra-ui/charts` — read
`references/charts.md` before responding. It covers the `useChart` hook, all
three chart types, Recharts integration, color tokens, and complete runnable
examples.

When you're unsure which component to use, or the user hasn't specified one,
read `references/component-decision-tree.md`. It covers every Chakra component
with guidance on when to choose one over a similar alternative.
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-builder/SKILL.md

### llms.txt + six sliced variants

Type: `llms-txt` (llms.txt) · Official · Audience: consumers

https://chakra-ui.com/llms.txt (1.1 KB index) points at llms-full.txt (verified 2,042,961 bytes) plus concern-sliced files: llms-components.txt (~1.5 MB), llms-charts.txt, llms-styling.txt, llms-theming.txt and llms-v3-migration.txt. The index explicitly frames the split as a context-window budget mechanism, and the docs page tells Cursor users to wire them in via @Docs and Windsurf users via .windsurfrules. All verified HTTP 200. No per-page .md endpoints exist (docs/components/button.md returns 404), so agents must take whole slices.

- Docs: https://chakra-ui.com/docs/get-started/ai/llms

- Code: https://chakra-ui.com/llms.txt

```markdown
# Chakra UI v3 Documentation for LLMs

> Chakra UI is an accessible component system for building products with speed

## Documentation Sets

- [Complete documentation](https://chakra-ui.com/llms-full.txt): The complete Chakra UI v3 documentation including all components, styling and theming
- [Components](https://chakra-ui.com/llms-components.txt): Documentation for all components in Chakra UI v3.
- [Charts](https://chakra-ui.com/llms-charts.txt): Documentation for the charts in Chakra UI v3.
- [Styling](https://chakra-ui.com/llms-styling.txt): Documentation for the styling system in Chakra UI v3.
- [Theming](https://chakra-ui.com/llms-theming.txt): Documentation for theming Chakra UI v3.
- [Migrating to v3](https://chakra-ui.com/llms-v3-migration.txt): Documentation for migrating to Chakra UI v3.

## Notes

- The complete documentation includes all content from the official documentation
- Package-specific documentation files contain only the content relevant to that package
- The content is automatically generated from the same source as the official documentation
```

Source: https://chakra-ui.com/llms.txt

### Dedicated “AI” docs section (get-started/ai/*)

Type: `ai-docs-page` (AI docs page) · Official · Audience: consumers

The docs site carries a first-class AI section with three pages (mcp-server, skills, and llms) sourced from apps/www/content/docs/get-started/ai/. The skills page documents activation triggers, per-skill output contracts and the reference-file loading model; the mcp-server page gives copy-paste config for six clients plus `claude mcp add chakra-ui -- npx -y @chakra-ui/react-mcp`.

- Docs: https://chakra-ui.com/docs/get-started/ai/skills

### @chakra-ui/cli snippet add + @chakra-ui/codemod upgrade

Type: `cli-scaffolding` (CLI scaffolding) · Official · Audience: consumers

Two CLIs the skills instruct agents to shell out to rather than hand-write code. `npx @chakra-ui/cli snippet add` framework-detects and writes provider/toaster/tooltip snippets to the correct path (src/components/ui/, app/components/ui/ for Remix, etc.) and installs next-themes automatically. `npx @chakra-ui/codemod upgrade --dry` is the v2→v3 codemod the migrate skill mandates as a dry run before manual edits. Also `pnpm build:tokens` typegen, giving agents autocomplete-grade token type safety.

- Docs: https://chakra-ui.com/docs/get-started/ai/skills

````markdown
## Step 3 — Run the codemod

The official codemod handles most mechanical changes: component renames, prop
updates, import rewrites, and compound component restructuring. It does not
replace manual review — plan to audit the output.

**Dry run first (no files changed):**

```bash
npx @chakra-ui/codemod upgrade --dry
```
````

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-migrate/SKILL.md

### CLAUDE.md (repo root)

Type: `claude-md` (CLAUDE.md) · Official · Audience: builders

Present at the repo root but atypical: a narrative 'Claude’s Learning Document’ rather than a rules/constraints file. Header reads ‘Last Updated: September 30, 2025’ and it misstates the version as 2.0.0 (repo ships v3.36.x). It has useful architecture orientation: the styled-system file map (system.ts, cva.ts, sva.ts, token-dictionary.ts, breakpoints.ts, conditions.ts, utility.ts, calc.ts), the style resolution flow, canonical pnpm scripts, but it also embeds transient session state (‘Current Git Status’, ‘Staged Files (Recent Work)’, ‘Next Steps / Areas to Explore’) long since stale. No prohibitions, no must/never language, no review gates.

- Code: https://github.com/chakra-ui/chakra-ui/blob/main/CLAUDE.md

Notes: Stale-context risk: an agent reading it would believe the project is on v2.0.0 and that a recipe-bracket-syntax fix is currently staged.

```markdown
# Claude's Learning Document - Chakra UI

**Last Updated:** September 30, 2025

## Project Overview

**Chakra UI** is a comprehensive React component system for building accessible,
high-quality web applications and design systems.

- **Repository:** https://github.com/chakra-ui/chakra-ui
- **Author:** Segun Adebayo
- **License:** MIT
- **Version:** 2.0.0
- **Package Manager:** pnpm 10.15.0
- **Node Version:** >=20.x

...

## Current Git Status

### Staged Files (Recent Work)

- `.changeset/fix-recipe-bracket-syntax.md` - Changeset for recipe fix
- `packages/react/__tests__/recipe.test.ts` - New test suite

---

_This document serves as a living knowledge base for Claude to maintain context
about the Chakra UI project structure, recent changes, and architectural
decisions._
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/CLAUDE.md

### .claude/agents — github-issue-triage & ark-ui-version-bumper subagents

Type: `claude-skill` (Agent skill) · Official · Audience: builders

Two committed Claude Code subagents automating real maintainer workflows, with deliberate per-task model selection. github-issue-triage runs on `model: opus` and owns the full loop: reproduce in /apps/compositions/src/examples/, register the repro in a *.stories.tsx, check Storybook on port 6006/6007, drive Chrome MCP to visually confirm, then trace into node_modules through zag.js and ark-ui to root cause and write a changeset. ark-ui-version-bumper runs on the cheaper `model: haiku` and syncs Ark UI versions across the monorepo, extracts a changeset changelog scoped to components Chakra actually wraps, and must leave typecheck and build green.

- Code: https://github.com/chakra-ui/chakra-ui/tree/main/.claude/agents

```markdown
model: opus
color: cyan
---

You are an expert GitHub issue triage engineer specializing in the Chakra UI
component library. Your mission is to systematically debug, reproduce, and fix
reported issues with precision and thoroughness.

## Your Core Responsibilities

2. **Reproduction Creation**: Create isolated reproduction examples in
   `/apps/compositions/src/examples/` that clearly demonstrate the bug. Follow
   the existing file naming conventions and patterns.

3. **Storybook Integration**: Add your reproduction to the relevant
   `*.stories.tsx` file so the issue can be visually verified.

4. **Environment Verification**: Check if Storybook is running on port 6006
   or 6007. Use the Chrome MCP to open the browser and navigate to the story to
   visually confirm the bug.

5. **Deep Debugging**: Trace bugs through the codebase, including into
   `node_modules` when necessary. Key dependencies to investigate:
   - **zag.js**: State machine logic for components
   - **ark-ui**: Headless UI primitives that Chakra builds upon
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/.claude/agents/github-issue-triage.md

### .claude/commands — ark, changelog, github-reviewer slash commands

Type: `other` (Other) · Official · Audience: builders

Three committed Claude Code slash commands in .claude/commands/: ark.md (Ark UI sync workflow), changelog.md (release-notes generation, visible in commit history as `docs: prepare next release changelog`), and github-reviewer.md (AI-assisted PR review). Committed to the repo, so every contributor with Claude Code inherits the maintainers’ workflows.

- Code: https://github.com/chakra-ui/chakra-ui/tree/main/.claude/commands

## Coercion techniques (8)

### Concern-sliced llms.txt as a context budget device

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

Rather than one monolithic dump, Chakra publishes llms-full.txt (~2 MB) plus five narrower slices and explicitly frames the split for limited-context agents. The docs prose does the routing: pick the slice matching the task. Cheap but effective coercion: an agent that loaded llms-v3-migration.txt cannot see v2-shaped or Tailwind-shaped answers.

```markdown
Separate docs are available if you have a limited context window.

- [/llms-components.txt](https://chakra-ui.com/llms-components.txt): Only
  component documentation
- [/llms-styling.txt](https://chakra-ui.com/llms-styling.txt): Only styling
  documentation
- [/llms-theming.txt](https://chakra-ui.com/llms-theming.txt): Only theming
  documentation

---

We also have a special `llms-v3-migration.txt` file that contains documentation
for migrating to Chakra UI v3.
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/apps/www/content/docs/get-started/ai/llms.mdx

### Zod enum over the live component list (agent cannot hallucinate a component)

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

Every MCP tool taking a component name constrains it with `z.enum(ctx.componentList)` where componentList is fetched from the live docs at tool-registration time via `getAllComponentNames()`. Asking for a nonexistent component yields a schema validation error, not a plausible hallucinated example. Pro-only tools are additionally removed from the registered tool set when no API key is present, so the model never sees an affordance it cannot use.

```typescript
const registeredToolCache = new Map<string, Tool>()

export const initializeTools = async (
  server: McpServer,
  config: ToolConfig,
) => {
  const enabledTools = tools.filter((tool) => !tool.disabled?.(config))

  await Promise.all(
    enabledTools.map(async (tool) => {
      const toolCtx = await tool.ctx?.()
      if (registeredToolCache.has(tool.name)) {
        return
      }
      registeredToolCache.set(tool.name, tool)
      tool.exec(server, {
        name: tool.name,
        description: tool.description,
        ctx: toolCtx,
        config,
      })
    }),
  )
}
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/apps/mcp/src/tools/index.ts

### Token-first styling rule with a narrowly bounded escape hatch

Category: `token-enforcement` (Token enforcement) · all 13 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md

The builder skill devotes a whole step to ‘Use tokens, not raw values’, giving the semantic-token vocabulary (bg.subtle, fg.default, fg.muted, border.subtle) and the v3 prop rename (colorPalette, not colorScheme), then bounds the exception narrowly instead of leaving it open. The refactor skill enforces the same rule in reverse as a review finding: 'Are raw hex or palette values used instead of semantic tokens? These won’t respect dark mode.'

````markdown
## Step 3 — Use tokens, not raw values

Chakra v3 ships semantic tokens that automatically adapt to light/dark mode.
Prefer them over hard-coded palette values — they make the component theme-aware
without any extra work.

```tsx
// Prefer semantic tokens
<Box bg="bg.subtle" color="fg.default" borderColor="border.subtle" />
<Text color="fg.muted" />
<Box shadow="md" rounded="lg" />

// Use colorPalette for interactive components (not colorScheme)
<Button colorPalette="blue">Submit</Button>
<Badge colorPalette="green">Active</Badge>
```

Use raw palette values (`blue.500`, `gray.100`) only when a specific color is
intentional and should not shift with color mode.
````

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-builder/SKILL.md

### Progressive disclosure — ‘read X before responding’

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

The builder SKILL.md refuses to inline theming, charts and component-selection knowledge; instead it issues explicit read-before-answer directives that pull reference files into context only on matching request types. component-decision-tree.md is the key anti-hallucination device: all ~114 components with head-to-head comparisons (Select vs Combobox vs NativeSelect, Dialog vs Drawer, Tooltip vs HoverCard vs Popover), exactly where models otherwise invent or misuse APIs.

```markdown
For deeper theming work — defining brand color tokens, semantic tokens with dark
mode values, full recipe/slot-recipe authoring, typegen, or ejecting the default
theme — read `references/theming.md` before responding. It covers the complete
`defineConfig` / `createSystem` API with full examples.

For any chart request — bar charts, area charts, line charts, pie/donut charts,
`BarList`, `BarSegment`, or anything involving `@chakra-ui/charts` — read
`references/charts.md` before responding. It covers the `useChart` hook, all
three chart types, Recharts integration, color tokens, and complete runnable
examples.

When you're unsure which component to use, or the user hasn't specified one,
read `references/component-decision-tree.md`. It covers every Chakra component
with guidance on when to choose one over a similar alternative.
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-builder/SKILL.md

### Prohibition list on v2 API surface (prop-name blacklist)

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

Both the refactor and migrate skills carry an explicit rename blacklist so v2-heavy training data cannot leak through. The refactor skill turns it into a review checklist with exact wrong→right pairs and names the v2 patterns that must not appear at all (extendTheme, ColorModeScript, useColorModeValue, sx).

```markdown
**Chakra API correctness**

- Are v3 prop names used? (`disabled` not `isDisabled`, `colorPalette` not
  `colorScheme`, `gap` not `spacing`, `open` not `isOpen`)
- Are compound components used correctly? (`Field.Root`/`Field.Label`,
  `Dialog.Root`/`Dialog.Content`, etc.)
- Is `"use client"` placed correctly in Next.js App Router?
- Are there v2 patterns still present? (`extendTheme`, `ColorModeScript`,
  `useColorModeValue`, `sx` prop)

**Token and style usage**

- Are hardcoded colors used where semantic tokens would work? (`bg="#f9fafb"` →
  `bg="bg.subtle"`)
- Are raw hex or palette values used instead of semantic tokens? These won't
  respect dark mode.
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-refactor/SKILL.md

### Migration validation loop: codemod dry-run → typecheck → lint → build → grep for leftovers

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

The strongest enforcement mechanism Chakra ships to consumers. The migrate skill ends with a checkbox list the agent must work through, closing with a literal grep it has to run to prove no v2 imports survive. That converts ‘did the migration work’ from a model judgement into a shell command with an observable exit condition.

````markdown
## Step 10 — Validation checklist

Work through this after the migration is complete:

- [ ] Reinstall dependencies: `npm install` / `pnpm install`
- [ ] TypeScript: `npx tsc --noEmit` — resolve all type errors
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`
- [ ] Visually verify color mode toggle (light ↔ dark)
- [ ] Test interactive components: Dialog, Drawer, Menu, Tabs, Accordion
- [ ] Test form components: Checkbox, Select/NativeSelect, Input, Radio
- [ ] Check for visual regressions across key pages
- [ ] Search codebase for leftover v2 imports:
  ```bash
  grep -r "ColorModeScript\|useColorModeValue\|extendTheme\|styleConfig\|@chakra-ui/icons\|@chakra-ui/next-js" src/
  ```
````

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-migrate/SKILL.md

### Read-the-project-first ordering (inspect before generate)

Category: `scaffolding` (Scaffolding) · all 7 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md

All three skills open with a mandatory context-reading step before any output, targeting the classic failure of emitting v2 code into a v3 project or Vite conventions into a Next.js App Router repo. The migrate skill states it as a hard prohibition: ‘Inspect the project first — never guess the package versions or framework.’ The builder skill adds a defer-or-assume rule: ask when the data shape or design choice materially changes the output, otherwise state assumptions at the top and build.

```markdown
## Step 1 — Read the project context

Check `package.json` if available. Look for:

- Chakra UI version (use v3 patterns by default; only use v2 if explicitly on
  v2)
- Framework: Next.js App Router, Pages Router, Vite, plain React
- TypeScript or JavaScript
- Package manager (from lockfile: `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`,
  `package-lock.json`)

Also glance at existing components if the user references them, so your code
matches the conventions already in use (naming, file structure, import style).

If the requirements are vague or the component is complex enough that choices
matter (layout direction, data shape, color palette), ask
before building rather than generating something that needs to be thrown away.
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-builder/SKILL.md

### Output contract: no placeholders, minimum two breakpoints, bounded explanation

Category: `exemplars` (Exemplars) · all 10 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md

The builder skill pins the response shape so agent output is directly pasteable and consistently responsive. Two clauses do real work: banning ‘TODO’ / ‘...rest of component’ placeholders, and mandating base + md breakpoints as a floor unless the request is explicitly desktop-only, a responsive-by-default guarantee models otherwise skip. (Builder-side analogue: the github-issue-triage subagent may not declare a bug reproduced by reasoning alone; it must render the story and look at it via Chrome MCP.)

```markdown
## Output format

Produce:

1. **Complete, runnable code** — correct imports, no placeholders like `TODO` or
   `...rest of component`
2. **Proper import statements** — group Chakra imports, then local imports
3. **Component separation** — split into multiple components/files if the
   component is complex or contains clearly separable parts
4. **Responsive styles** — at minimum `base` and `md` breakpoints for layout
5. **Brief explanation after the code** — 2–4 sentences on the key decisions
   made (layout approach, accessibility choices, responsive strategy). Skip the
   explanation if the request was trivial.
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-builder/SKILL.md

## Platform integrations (2)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

Official Chakra UI Figma Kit for v3 is published on Figma Community and the docs carry a get-started/figma page; light and dark mode token sets ship with the kit. Community plugins also exist (Chakra UI Design System plugin, FigPilot design-to-code). No Figma Code Connect definitions were found in the chakra-ui repo; the design↔code bridge is asset-level, not Code-Connect / Dev-Mode-MCP level.

Link: https://chakra-ui.com/docs/get-started/figma

### Storybook (addon-mcp, manifests, AI docs)

Storybook 9.1.8 is used internally for component development and visual testing (.storybook/ at repo root, a dedicated sandbox/storybook-ts environment, *.stories.tsx across packages). It functions as a maintainer/AI-verification surface (the issue-triage subagent must add bug repros as stories and confirm them in a real browser) rather than a public consumer-facing Storybook or a published Storybook MCP integration.

## Building the system vs. consuming it

### For consumers (agents building UIs with Chakra UI)

Strong and unusually broad. An agent building product UI with Chakra can go through the MCP server (10 tools, npx-installable, documented for VS Code / Cursor / Claude Code / Windsurf / Zed / Codex), through six concern-sliced llms.txt files, or through three installable Claude Code Skills that carry the house style (semantic tokens over hex, colorPalette over colorScheme, Field.Root for every form field, base+md breakpoints minimum, no placeholder code). The skills’ progressive-disclosure references, especially a decision tree over all ~114 components, target the two hardest failure modes for models on this library: picking the wrong component, and regressing to v2 API surface. Coercion strength is medium: the guidance is specific and well written but almost entirely advisory prose. Nothing forces the agent to call an MCP tool before generating, there is no lint/verify loop on the build path (only on migration), and there is no machine-readable component registry an agent could pull canonical source from.

### For builders (the Chakra UI team using AI on the system itself)

Real, committed, and model-cost-aware. The repo carries .claude/agents/ with two production subagents: github-issue-triage on Opus (repro in apps/compositions → Storybook story → Chrome MCP visual confirmation → trace into zag.js/ark-ui → fix + changeset) and ark-ui-version-bumper on Haiku (monorepo-wide version sync, scoped changeset changelog, typecheck+build must stay green), plus .claude/commands/ with ark, changelog and github-reviewer slash commands, so contributors inherit maintainer workflows automatically. The weak point is CLAUDE.md: a stale September-2025 narrative ‘learning document’ that reports the version as 2.0.0 and still describes a long-merged recipe fix as staged work. There is no AGENTS.md, no .cursorrules, no .github/copilot-instructions.md, and CONTRIBUTING.md does not appear to set AI-contribution policy.

## Gaps

Confirmed absent (probed directly, HTTP 404 on raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/): AGENTS.md, .cursorrules, .cursor/rules/, .github/copilot-instructions.md. No machine-readable component registry for agents: https://chakra-ui.com/r/index.json and /registry.json both 404; the only /r/ assets are theme-token JSON files (e.g. /r/theme/tokens/cursor.json, 200) tied to the CSS-cursor token docs, not a shadcn-style component registry. No per-page markdown endpoints (docs/components/button.md → 404), so agents must ingest whole llms-*.txt slices. No “Add to Cursor” / one-click MCP install button found on the docs page; installation is copy-paste JSON per editor. MCP transport is documented as stdio-only (apps/mcp/src/http.ts exists in source but no hosted remote endpoint is documented), and @chakra-ui/react-mcp has not been republished since 2025-11-03 despite library releases through 3.36.1 (2026-07-19), so tool coverage may lag recent components. No Figma Code Connect files in the repo; no Supernova / Knapsack / zeroheight integration found. No AI-specific contribution policy located in CONTRIBUTING.md. An npm registry search surfaced no community/third-party Chakra MCP server. Not covered here: the full contents of the three builder reference files (theming.md, charts.md, component-decision-tree.md), the bodies of .claude/commands/*.md, and whether the skills are kept in sync with releases (no changesets observed touching skills/).

## Sources (15)

- https://chakra-ui.com/llms.txt

- https://chakra-ui.com/llms-full.txt

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/CLAUDE.md

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/README.md

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-builder/SKILL.md

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-migrate/SKILL.md

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-refactor/SKILL.md

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/.claude/agents/github-issue-triage.md

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/.claude/agents/ark-ui-version-bumper.md

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/apps/mcp/src/tools/index.ts

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/apps/mcp/src/tools/get-component-example.ts

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/apps/mcp/src/tools/list-components.ts

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/apps/mcp/README.md

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/apps/www/content/docs/get-started/ai/mcp-server.mdx

- https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/apps/www/content/docs/get-started/ai/skills.mdx

---

Generated 2026-07-28T05:02:05Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
