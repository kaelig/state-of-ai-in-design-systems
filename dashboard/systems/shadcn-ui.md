---
title: "shadcn/ui — AI affordances"
description: "shadcn/ui is the reference case for an AI-native design system: “AI-Ready — Open code for LLMs to read, understand, and improve” is one of its five stated founding…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.json"
id: "shadcn-ui"
category: "design-system"
ai_maturity: "ai-native"
affordance_count: 10
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-27T22:13:09Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# shadcn/ui — AI affordances

shadcn (Vercel) · design-system · MIT · AI maturity: **ai-native** (AI consumption is a design goal, with dedicated surfaces and staff behind it). 10 affordances, 8 coercion techniques.

- Docs: https://ui.shadcn.com
- Repo: https://github.com/shadcn-ui/ui
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui

## Summary

shadcn/ui is the reference case for an AI-native design system: “AI-Ready — Open code for LLMs to read, understand, and improve” is one of its five stated founding principles, and the whole distribution model (flat-file registry JSON + CLI + MCP server) is machine-consumable by construction. As of July 2026 the project ships an official Agent Skill (`skills/shadcn/` in-repo, installed with `npx skills add shadcn/ui`), an official MCP server bundled in the CLI (`npx shadcn@latest mcp`), a Cursor plugin manifest (`.cursor-plugin/plugin.json`) that bundles both skill and MCP server, a curated `llms.txt`, and an eval suite (`skills/shadcn/evals/evals.json`) that regression-tests the skill’s coercive rules. The skill is unusually prescriptive — a “Critical Rules” section of hard prohibitions (“Never use raw `div` with `space-y-*`“, “no manual `dark:` color overrides”, “NEVER fetch raw files from GitHub manually — always use the CLI”) backed by Incorrect/Correct exemplar files. On the builder side the repo is thinner but real: a `.cursor/rules/*.mdc` parity rule, `.claude/settings.local.json`, and a large AI-executed migration skill (`skills/migrate-radix-to-base`, ~180KB of reference tables) used to drive the Radix→Base UI migration.

## Maintenance

- Actively maintained: yes
- Last release: shadcn@4.15.0 — 2026-07-25 (npm `shadcn` latest = 4.15.0); prior: 4.14.1 (2026-07-23), 4.14.0 (2026-07-22), 4.13.1 (2026-07-17)
- Activity: Extremely active: repo pushed 2026-07-25, ~120k GitHub stars, multiple CLI releases per week, monorepo (apps/v4, packages/shadcn|react|helpers|tests) with CI workflows for tests, browser tests, code-check, and `validate-registries.yml` (validates the community registry index).

## AI affordances (10)

### shadcn MCP server (bundled in the CLI)

Type: `mcp-server` (MCP server) · Official · Audience: consumers

`npx shadcn@latest mcp` starts a stdio MCP server; `mcp init --client claude|cursor|vscode|opencode` writes editor config. Seven tools: get_project_registries, list_items_in_registries, search_items_in_registries, view_items_in_registries, get_item_examples_from_registries, get_add_command_for_items, get_audit_checklist. Registries are read from components.json (namespaced, authenticated via ${ENV} headers, or bare `owner/repo` GitHub sources).

- Docs: https://ui.shadcn.com/docs/mcp

- Code: https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/src/mcp/index.ts

Notes: Ships inside the `shadcn` npm package rather than as a separate MCP package — no extra install step.

### shadcn Agent Skill (skills/shadcn)

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

A first-party Agent Skill living in the shadcn-ui/ui repo: SKILL.md (19.5KB) plus cli.md, registry.md, customization.md, mcp.md, six rule files under rules/ with Incorrect/Correct pairs, an OpenAI/Codex interface manifest (agents/openai.yml), and evals/evals.json. Installed with `npx skills add shadcn/ui`. Frontmatter is `user-invocable: false` with `allowed-tools` restricted to the shadcn CLI, and it injects live project context by executing `npx shadcn@latest info --json` at load time.

- Docs: https://ui.shadcn.com/docs/skills

- Code: https://github.com/shadcn-ui/ui/tree/main/skills/shadcn

### ui.shadcn.com/llms.txt

Type: `llms-txt` (llms.txt) · Official · Audience: consumers

~12KB curated index of the whole docs site, grouped by Overview / Installation / Components (sub-grouped Form & Input, Layout & Navigation, …) / Registry, each entry a URL plus a one-line capability description. The header markets the system to the model: ‘Open Source. Open Code. AI-Ready.’

- Docs: https://ui.shadcn.com/llms.txt

Notes: No llms-full.txt (404 as of 2026-07-27). Per-page markdown source is not served at a .md URL either; the skill instead tells agents to run `npx shadcn@latest docs ` to get canonical URLs and then fetch them.

### .cursor-plugin/plugin.json (Cursor plugin)

Type: `cursor-rules` (Cursor rules) · Official · Audience: consumers

A Cursor plugin manifest at the repo root that bundles BOTH distribution channels in one install: `"skills": "./skills/"` and an `mcpServers.shadcn` entry running `npx shadcn@latest mcp`. Described as ‘UI component and design system framework. Search registries, install components as source code, and audit your project.’

- Code: https://github.com/shadcn-ui/ui/blob/main/.cursor-plugin/plugin.json

### Registry system + community registry index

Type: `registry` (Registry) · Official · Audience: consumers

A machine-readable component distribution format (registry.json / registry-item.json JSON Schemas at ui.shadcn.com/schema/) built with `npx shadcn@latest build`, consumed by CLI and MCP alike. Item types include registry:ui, block, hook, theme, style, base, font, file — and the skill notes registries ‘can distribute components, hooks, utilities, design tokens, pages, config files, docs, rules, workflows, templates, MCP files’. A public index of community registries is served at https://ui.shadcn.com/r/registries.json and browsable at /docs/directory; CI validates it (validate-registries.yml).

- Docs: https://ui.shadcn.com/docs/registry

Notes: This is the deepest AI affordance: agents resolve `@namespace/item` or `owner/repo/item` addresses to full file contents over HTTP, so component source is fetchable without training-data knowledge.

### shadcn CLI as the agent's action surface

Type: `cli-scaffolding` (CLI scaffolding) · Official · Audience: consumers

`init`, `add`, `search`, `view`, `docs`, `info --json`, `diff`, `build`, `apply`, `preset decode|url|open|resolve`. `info --json` is the agent’s project-context oracle (aliases, isRSC, tailwindVersion, tailwindCssFile, style, base, iconLibrary, resolvedPaths, framework, packageManager, preset). `add --dry-run` / `--diff ` give agents a preview-then-merge workflow for updating locally-modified components.

- Docs: https://ui.shadcn.com/docs/cli

### migrate-radix-to-base skill

Type: `claude-skill` (Agent skill) · Official · Audience: both

A ~180KB AI-executed migration skill (SKILL.md + class-mapping.md, consumer-props.md, disclosure.md, display-misc.md, form-controls.md, menus.md, overlays.md, universal-patterns.md, wrapper-shapes.md) that walks an agent through migrating Radix→Base UI, using the registry itself as the ‘golden pair’ oracle and `git merge-file` three-way merges to preserve user customizations. Shipped to consumers, but it is also how the team itself moved the ecosystem to Base UI.

- Code: https://github.com/shadcn-ui/ui/tree/main/skills/migrate-radix-to-base

### .cursor/rules/registry-bases-parity.mdc

Type: `cursor-rules` (Cursor rules) · Official · Audience: builders

The one contributor-facing agent rule in the repo: a globbed .mdc rule (globs: apps/v4/registry/bases/**/*) forcing any agent editing the Base UI registry tree to mirror the change into the Radix tree and vice versa. There is no AGENTS.md, CLAUDE.md, .cursorrules, or .github/copilot-instructions.md at the repo root (all 404).

- Code: https://github.com/shadcn-ui/ui/blob/main/.cursor/rules/registry-bases-parity.mdc

### .claude/ directory (launch.json + settings.local.json)

Type: `other` (Other) · Official · Audience: builders

Committed Claude Code config: launch.json defines a `v4` dev-server config (pnpm --filter=v4 dev, port 4000) so the agent can run the docs app; settings.local.json pre-allows Bash(npm test:*), Bash(npm run typecheck:*), ls, cat, WebSearch, WebFetch(domain:github.com) and sets outputStyle ‘Explanatory’.

- Code: https://github.com/shadcn-ui/ui/blob/main/.claude/settings.local.json

### Community MCP servers (Jpisnice, heilgar, magnusrodseth)

Type: `mcp-server` (MCP server) · Community · Audience: consumers

Several third-party MCP servers predate/parallel the official one: Jpisnice/shadcn-ui-mcp-server (v4 components/blocks/demos across React, Svelte, Vue, React Native), @heilgar/shadcn-ui-mcp-server, @magnusrodseth/shadcn-mcp-server. Largely obsoleted by the official CLI-bundled server, but still widely listed in MCP directories.

- Code: https://github.com/Jpisnice/shadcn-ui-mcp-server

## Coercion techniques (8)

### Hard prohibition list ('Critical Rules … always enforced')

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

The skill front-loads a list of negative constraints in bold imperative form, each linked to a rule file with Incorrect/Correct code pairs. Notably it bans generic markup in favour of system components ('Callouts use Alert. Don’t build custom styled divs’), bans raw Tailwind color values in favour of semantic tokens, and bans layout primitives the system doesn’t use (space-x/space-y).

```markdown
## Critical Rules

These rules are **always enforced**. Each links to a file with Incorrect/Correct code pairs.

### Styling & Tailwind → [styling.md](./rules/styling.md)

- **`className` for layout, not styling.** Never override component colors or typography.
- **No `space-x-*` or `space-y-*`.** Use `flex` with `gap-*`. For vertical stacks, `flex flex-col gap-*`.
- **Use `size-*` when width and height are equal.** `size-10` not `w-10 h-10`.
- **No manual `dark:` color overrides.** Use semantic tokens (`bg-background`, `text-muted-foreground`).
- **No manual `z-index` on overlay components.** Dialog, Sheet, Popover, etc. handle their own stacking.

### Forms & Inputs → [forms.md](./rules/forms.md)

- **Forms use `FieldGroup` + `Field`.** Never use raw `div` with `space-y-*` or `grid gap-*` for form layout.
- **`InputGroup` uses `InputGroupInput`/`InputGroupTextarea`.** Never raw `Input`/`Textarea` inside `InputGroup`.

### Use Components, Not Custom Markup → [composition.md](./rules/composition.md)

- **Use existing components before custom markup.** Check if a component exists before writing a styled `div`.
- **Callouts use `Alert`.** Don't build custom styled divs.
- **Empty states use `Empty`.** Don't build custom empty state markup.
- **Use `Separator`** instead of `<hr>` or `<div className="border-t">`.
- **Use `Skeleton`** for loading placeholders. No custom `animate-pulse` divs.
- **Use `Badge`** instead of custom styled spans.
```

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/SKILL.md

### Forcing the CLI as the only source of truth (no training-data guessing, no raw GitHub fetches)

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

The skill repeatedly forbids the model from relying on memory or ad-hoc HTTP, routing every knowledge lookup and every mutation through the CLI. It also refuses to let the agent pick a registry on the user’s behalf, and forbids destructive `--overwrite` without explicit approval — an anti-autonomy guardrail.

```markdown
**When creating, fixing, debugging, or using a component, always run `npx shadcn@latest docs` and fetch the URLs first.** This ensures you're working with the correct API and usage patterns rather than guessing.

...

8. **Registry must be explicit** — When the user asks to add a block or component, **do not guess the registry**. If no registry is specified (e.g. user says "add a login block" without specifying `@shadcn`, `@tailark`, `owner/repo`, etc.), ask which registry to use. Never default to a registry on behalf of the user.

## Updating Components

When the user asks to update a component from upstream while keeping their local changes, use `--dry-run` and `--diff` to intelligently merge. **NEVER fetch raw files from GitHub manually — always use the CLI.**

1. Run `npx shadcn@latest add <component> --dry-run` to see all files that would be affected.
2. For each file, run `npx shadcn@latest add <component> --diff <file>` to see what changed upstream vs local.
...
4. **Never use `--overwrite` without the user's explicit approval.**
```

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/SKILL.md

### Live project-context injection at skill load (`info --json`)

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

Rather than describing shadcn/ui in the abstract, the skill executes the CLI inside its own body (`!` command interpolation) so the model always sees the real project’s aliases, base library, icon library, Tailwind version and installed components. It then tells the model exactly how to act on each field — e.g. never assume lucide-react, never hardcode `@/`, never create a new CSS file. `allowed-tools` narrows the agent to shadcn CLI invocations only.

````markdown
---
name: shadcn
description: Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI, including chat interfaces. ...
user-invocable: false
allowed-tools: Bash(npx shadcn@latest *), Bash(pnpm dlx shadcn@latest *), Bash(bunx --bun shadcn@latest *)
---

## Current Project Context

```json
!`npx shadcn@latest info --json`
```

...

## Key Fields

- **`aliases`** → use the actual alias prefix for imports (e.g. `@/`, `~/`), never hardcode.
- **`isRSC`** → when `true`, components using `useState`, `useEffect`, event handlers, or browser APIs need `"use client"` at the top of the file.
- **`tailwindCssFile`** → the global CSS file where custom CSS variables are defined. Always edit this file, never create a new one.
- **`base`** → primitive library (`radix` or `base`). Affects component APIs and available props.
- **`iconLibrary`** → determines icon imports. Use `lucide-react` for `lucide`, `@tabler/icons-react` for `tabler`, etc. Never assume `lucide-react`.
````

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/SKILL.md

### MCP-side audit checklist as a post-generation validation loop

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

The MCP server exposes a tool whose whole purpose is to make the agent self-review after generating code. The tool description is written as an instruction to the model (‘Make sure to run the tool after all required steps have been completed’), and the returned payload is a markdown checkbox list that pushes the agent into lint/typecheck/browser verification — including chaining to Playwright MCP.

```typescript
      {
        name: "get_audit_checklist",
        description:
          "After creating new components or generating new code files, use this tool for a quick checklist to verify that everything is working as expected. Make sure to run the tool after all required steps have been completed.",
        inputSchema: zodToJsonSchema(z.object({})),
      },

// ...

      case "get_audit_checklist": {
        return {
          content: [
            {
              type: "text",
              text: dedent`## Component Audit Checklist

              After adding or generating components, check the following common issues:

              - [ ] Ensure imports are correct i.e named vs default imports
              - [ ] If using next/image, ensure images.remotePatterns next.config.js is configured correctly.
              - [ ] Ensure all dependencies are installed.
              - [ ] Check for linting errors or warnings
              - [ ] Check for TypeScript errors
              - [ ] Use the Playwright MCP if available.
              `,
            },
          ],
        }
      }
```

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/packages/shadcn/src/mcp/index.ts

### Incorrect/Correct exemplar pairs as the rule bodies

Category: `exemplars` (Exemplars) · all 10 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md

Every Critical Rule links to a rules/*.md file (styling, forms, composition, icons, chat, base-vs-radix) built almost entirely out of minimal-pair code blocks labelled **Incorrect:** / **Correct:**. This is few-shot conditioning rather than prose policy — the model sees the exact wrong output it is likely to produce next to the sanctioned one.

````markdown
## Semantic colors

**Incorrect:**

```tsx
<div className="bg-blue-500 text-white">
  <p className="text-gray-600">Secondary text</p>
</div>
```

**Correct:**

```tsx
<div className="bg-primary text-primary-foreground">
  <p className="text-muted-foreground">Secondary text</p>
</div>
```

---

## No raw color values for status/state indicators

For positive, negative, or status indicators, use Badge variants, semantic tokens like `text-destructive`, or define custom CSS variables — don't reach for raw Tailwind colors.

**Incorrect:**

```tsx
<span className="text-emerald-600">+20.1%</span>
<span className="text-green-500">Active</span>
<span className="text-red-600">-3.2%</span>
```
````

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/rules/styling.md

### Committed eval suite for the skill (rule-level assertions)

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

skills/shadcn/evals/evals.json holds prompt → expectations pairs where each expectation is a restatement of a Critical Rule (‘Uses gap-* instead of space-y-*’, ‘No manual dark: color overrides’). This turns the coercion rules into a regression-testable contract on model output — rare among design systems.

```json
{
  "skill_name": "shadcn",
  "evals": [
    {
      "id": 1,
      "prompt": "I'm building a Next.js app with shadcn/ui (base-nova preset, lucide icons). Create a settings form component with fields for: full name, email address, and notification preferences (email, SMS, push notifications as toggle options). Add validation states for required fields.",
      "expected_output": "A React component using FieldGroup, Field, ToggleGroup, data-invalid/aria-invalid validation, gap-* spacing, and semantic colors.",
      "files": [],
      "expectations": [
        "Uses FieldGroup and Field components for form layout instead of raw div with space-y",
        "Uses Switch for independent on/off notification toggles (not looping Button with manual active state)",
        "Uses data-invalid on Field and aria-invalid on the input control for validation states",
        "Uses gap-* (e.g. gap-4, gap-6) instead of space-y-* or space-x-* for spacing",
        "Uses semantic color tokens (e.g. bg-background, text-muted-foreground, text-destructive) instead of raw colors like bg-red-500",
        "No manual dark: color overrides"
      ]
    }
```

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/evals/evals.json

### Globbed parity rule for contributors' agents

Category: `instruction-files` (Instruction files) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/instruction-files.md

The single builder-facing rule file uses Cursor’s .mdc frontmatter (description + globs + alwaysApply:false) so it only fires when an agent touches the dual Base UI / Radix registry trees, then forbids one-sided edits and demands the agent report which trees it updated.

```markdown
---
description: Keep registry base and radix trees in sync when editing shared UI
globs: apps/v4/registry/bases/**/*
alwaysApply: false
---

# Registry bases: Base UI ↔ Radix parity

`apps/v4/registry/bases/base` and `apps/v4/registry/bases/radix` are **parallel registries**. Anything that exists in both trees for the same purpose (preview blocks, mirrored examples, shared card layouts, etc.) **must stay in sync**.

## When editing

- If you change a file under **`bases/base/...`**, apply the **same behavioral and visual change** to the matching path under **`bases/radix/...`** (and the reverse).
- Only diverge where APIs differ (e.g. import paths like `@/registry/bases/base/ui/*` vs `@/registry/bases/radix/ui/*`, or Base UI vs Radix component props).
- Do **not** update only one side unless the user explicitly asks for a single-base change.

After edits, briefly confirm both trees were updated (or state why one side is intentionally unchanged).
```

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/.cursor/rules/registry-bases-parity.mdc

### Registry-as-oracle AI codemod (golden-pair three-way merge)

Category: `design-code-mapping` (Design–code mapping) · all 3 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/design-code-mapping.md

AI-driven codemod. The Radix→Base UI migration skill refuses to let the model invent transforms: it makes the agent diff the user’s file against the canonical registry payload for their exact style URL, then replay their diff onto the base variant with `git merge-file`, and finishes with a mandatory grep sweep because ‘A clean merge is NOT proof of a clean file.’ It also enforces a baseline typecheck before any dependency change and one commit per component.

```markdown
You migrate shadcn wrappers, hand-rolled radix compositions, and their
consumers to `@base-ui/react`, keeping the project buildable at every step.
Be precise; never guess a mapping. When a prop or part is not in these
reference files, check `node_modules/@base-ui/react/**/*.d.ts` before
transforming, and record gaps in the report.

## Preflight (always)

1. `npx shadcn@latest info --json` ... Trust it over inference.
3. Require a clean git tree; work on a branch; one commit per component.
4. Baseline check BEFORE touching dependencies: run the project's
   typecheck/build so pre-existing failures are never attributed to you.

## Strategy: golden pair first, transformation engine second

  1. Classify each ui wrapper FIRST: diff the user's file against its stock
     origin, using the components.json style VERBATIM in the URL
     (`https://ui.shadcn.com/r/styles/<style>/<component>.json`, files[0].content).
  4. CUSTOMIZED wrappers: fetch the base variant and replay the user's diff
     onto it ... `git merge-file user.tsx radix-golden.tsx base-golden.tsx`
  5. MANDATORY leftover sweep on EVERY golden-pair file, including ones that
     merged "clean": `grep -n "radix-ui\|@radix-ui\|IconPlaceholder"` per
     file. ... A clean merge is NOT proof of a clean file.
```

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/migrate-radix-to-base/SKILL.md

## Platform integrations (3)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

No first-party Figma library and no official Code Connect. /docs/figma is an explicitly community-curated link list (‘Note: The Figma files are contributed by the community’) listing 2 free kits (Sitsiilia Bergmann; Pietro Schirano) and 6+ paid kits (shadcndesign.com, shadcncraft, shadcn/studio, Shadcnblocks, Obra shadcn/ui Pro, Shadcn Space). Several paid kits advertise Figma MCP readiness and design-to-shadcn-code export, but none are maintained by the shadcn team.

Link: https://ui.shadcn.com/docs/figma

### Storybook (addon-mcp, manifests, AI docs)

No official Storybook integration or addon in the repo; documentation is a bespoke Next.js docs app (apps/v4) with a live registry preview system, and CI runs `browser-tests.yml` (Playwright) rather than Storybook test-runner. Community Storybook setups exist but are out of scope of the project.

Link: https://github.com/shadcn-ui/ui/tree/main/apps/v4

### other

The registry itself is the platform integration story: `shadcn build` emits JSON that any site can host, `ui.shadcn.com/r/registries.json` is a public directory of community registries (browsable at /docs/directory) validated by the `validate-registries.yml` workflow, and registry items can carry components, hooks, tokens, docs, rules, workflows and MCP config files. No Supernova / Knapsack / zeroheight integration found.

Link: https://ui.shadcn.com/docs/directory

## Building the system vs. consuming it

### For consumers (agents building UIs with shadcn/ui)

Very heavily invested and arguably best-in-class. Four stacked channels: (1) the CLI itself as the agent’s action surface (`info --json` for project context, `search`/`view`/`docs` for retrieval, `add --dry-run --diff` for safe mutation, `preset`/`apply` for theming); (2) an official MCP server bundled in the same npm package with `mcp init --client claude|cursor|vscode|opencode` one-liners; (3) an official Agent Skill (`npx skills add shadcn/ui`) whose SKILL.md is a dense, prohibition-heavy policy document with linked Incorrect/Correct rule files, a Cursor plugin manifest, an OpenAI/Codex interface manifest, and a committed eval suite; (4) `llms.txt` plus a machine-readable registry (JSON Schema’d registry.json / registry-item.json, `owner/repo` addressing, a public community registry index at /r/registries.json validated in CI). The design principles page explicitly frames the whole architecture as LLM-facing: ‘AI-Ready: Open code for LLMs to read, understand, and improve’ and 'A shared, composable interface means it’s predictable for both your team and LLMs.'

### For builders (the shadcn/ui team using AI on the system itself)

Much lighter, and deliberately so. There is no AGENTS.md, CLAUDE.md, .cursorrules, or .github/copilot-instructions.md at the repo root (all 404 as of 2026-07-27), and CONTRIBUTING.md makes no mention of AI, agents, or LLM-assisted contribution. What exists: a single scoped Cursor rule (`.cursor/rules/registry-bases-parity.mdc`) enforcing Base UI ↔ Radix registry parity; a committed `.claude/` directory with a dev-server launch config and a pre-approved permission allowlist (npm test, typecheck, ls, cat, WebSearch, WebFetch github.com) plus outputStyle ‘Explanatory’; and the `skills/migrate-radix-to-base` skill, an AI-driven codemod for the project’s own biggest migration that is simultaneously shipped to users. Interestingly the team’s dogfooding is inverted: the artifacts they build for consumers (skill, MCP, registry) are the same artifacts they use internally to change the system.

## Gaps

Not confirmed, or absent: (1) https://ui.shadcn.com/llms-full.txt returns 404, as does /ai — there is no full-text dump, and no per-page `.md` variant; the skill compensates by telling agents to run `npx shadcn@latest docs ` and fetch the returned URLs. (2) No `registry:rule` item type exists in the published registry-item JSON Schema (enum is lib/block/component/ui/hook/theme/page/file/style/base/font/item) — rule and AGENTS.md distribution happens via the generic `registry:file` type as claimed in skills/shadcn/registry.md, which this study did not verify against a live registry that actually ships rules. (3) this study did not verify whether the docs site renders one-click ‘Add to Cursor’ / ‘Install MCP’ deeplink buttons — the mcp.mdx source uses tabbed CLI instructions (`shadcn mcp init --client …`), not deeplinks, so any such buttons are unconfirmed. (4) No AI-authored-PR bot, AI code review bot, or AI mention in CONTRIBUTING.md was found; `.github/workflows` contains no LLM-invoking job. (5) Community MCP servers (Jpisnice, heilgar, magnusrodseth) were confirmed to exist via search results and package listings but this study did not fetch their source or check current maintenance. (6) shadcn CLI download/adoption numbers were not retrieved. (7) Of `skills/shadcn/rules/`, only styling.md was read in full; chat.md, composition.md, forms.md, icons.md, base-vs-radix.md were listed but summarized from the SKILL.md index.

## Sources (15)

- https://github.com/shadcn-ui/ui

- https://ui.shadcn.com/llms.txt

- https://ui.shadcn.com/docs/mcp

- https://ui.shadcn.com/docs/skills

- https://ui.shadcn.com/docs/figma

- https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/SKILL.md

- https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/rules/styling.md

- https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/mcp.md

- https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/registry.md

- https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/evals/evals.json

- https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/agents/openai.yml

- https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/migrate-radix-to-base/SKILL.md

- https://raw.githubusercontent.com/shadcn-ui/ui/main/.cursor/rules/registry-bases-parity.mdc

- https://raw.githubusercontent.com/shadcn-ui/ui/main/.cursor-plugin/plugin.json

- https://raw.githubusercontent.com/shadcn-ui/ui/main/packages/shadcn/src/mcp/index.ts

---

Generated 2026-07-27T22:13:09Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
