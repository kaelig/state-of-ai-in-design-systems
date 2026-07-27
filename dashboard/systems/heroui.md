---
title: "HeroUI — AI affordances"
description: "HeroUI (formerly NextUI) is a 30k-star React component library, now shipping v3 on Tailwind CSS v4 + React Aria Components. It is one of the most thoroughly…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/heroui"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/heroui.json"
id: "heroui"
category: "component-library"
ai_maturity: "ai-native"
affordance_count: 10
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-27T21:54:17Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# HeroUI — AI affordances

HeroUI Inc · component-library · Apache-2.0 · AI maturity: **ai-native** (AI consumption is a design goal, with dedicated surfaces and staff behind it). 10 affordances, 8 coercion techniques.

- Docs: https://www.heroui.com
- Repo: https://github.com/heroui-inc/heroui
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/heroui.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/heroui

## Summary

HeroUI (formerly NextUI) is a 30k-star React component library, now shipping v3 on Tailwind CSS v4 + React Aria Components. It is one of the most thoroughly AI-instrumented open-source component libraries in the study: the v3 monorepo ships a top-level `skills/` directory with three installable Agent Skills, a `prompts/` directory of vendor-specific system prompts (v0.dev, bolt.new, universal), four llms.txt variants per platform sliced by context-window budget, an official stdio MCP server (`@heroui/react-mcp`) auto-refreshed from docs deploys via repository_dispatch, and a `curl | bash` installer that writes skills into Claude Code, Cursor, OpenCode and Codex config dirs. On the builder side the repo carries both AGENTS.md and CLAUDE.md, five `.claude/agents/*` subagent definitions, a `.claude/guides/` reference, and a `.claude/hooks.mjs` pre/post-edit hook running prettier, eslint --fix and tsc on every agent edit. The coercion language is unusually blunt — the CLI-injected index literally opens with “STOP. What you remember about HeroUI React v3 is WRONG for this project.”

## Maintenance

- Actively maintained: yes
- Last release: v3.2.2 (2026-07-07)
- Activity: Repo pushed 2026-07-26; 30,218 stars; releases roughly monthly through v3 (v3.0.5 May, v3.1.0 May, v3.2.0/3.2.1 June, v3.2.2 July 2026). heroui-cli 3.0.4 published 2026-07-06. The MCP monorepo (heroui-inc/heroui-mcp) is slower: last push 2026-04-16, @heroui/react-mcp 1.1.0 published 2026-02-12 — the MCP surface lags the main library. The older @heroui/mcp package is a stale 1.0.0-alpha.17 from Sept 2025, superseded by @heroui/react-mcp.

## AI affordances (10)

### heroui-react Agent Skill (+ heroui-migration, heroui-native)

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

Three first-party Agent Skills versioned in the main repo under skills/. Each has SKILL.md plus a scripts/ dir of .mjs fetchers (list_components, get_component_docs, get_source, get_styles, get_theme, get_docs) so the agent pulls live docs rather than relying on weights. Installed via `curl -fsSL https://heroui.com/install | bash -s heroui-react` or `npx skills add heroui-inc/heroui`; auto-discovered, or invoked as /heroui-react.

- Docs: https://heroui.com/docs/react/getting-started/agent-skills

- Code: https://github.com/heroui-inc/heroui/tree/v3/skills/heroui-react

Notes: Skill frontmatter is keyword-stuffed (“Keywords: HeroUI, Hero UI, heroui, @heroui/react, @heroui/styles”) to force autodiscovery; metadata.version pinned to 3.0.1.

````markdown
## CRITICAL: v3 Only - Ignore v2 Knowledge

**This guide is for HeroUI v3 ONLY.** Do NOT apply v2 patterns — the provider, styling, and component API all changed:

| Feature       | v2 (DO NOT USE)                   | v3 (USE THIS)                   |
| Provider      | `<HeroUIProvider>` required       | **No Provider needed**          |
| Animations    | `framer-motion` package           | CSS-based, no extra deps        |
| Component API | Flat props: `<Card title="x">`    | Compound: `<Card><Card.Header>` |

```tsx
// DO NOT DO THIS - v2 pattern
import { HeroUIProvider } from "@heroui/react";
import { motion } from "framer-motion";
```

**Always fetch v3 docs before implementing.**
````

Source: https://github.com/heroui-inc/heroui/tree/v3/skills/heroui-react

### @heroui/react-mcp (and @heroui/native-mcp)

Type: `mcp-server` (MCP server) · Official · Audience: consumers

Official stdio MCP server exposing 6 tools. Docs ship copy-paste config for Cursor (plus one-click deeplink link.heroui.com/mcp-cursor-install), Claude Code, Windsurf, Zed, VS Code/Copilot, Codex (TOML) and OpenCode. Also pitched as an upgrade agent: ‘Hey Cursor, update HeroUI to the latest version’ → compares versions, reads changelog, applies updates.

- Docs: https://heroui.com/docs/react/getting-started/mcp-server

- Code: https://github.com/heroui-inc/heroui-mcp

Notes: v3-only, stdio-only. Requires Node 22+.

```json
claude mcp add heroui-react -- npx -y @heroui/react-mcp@latest

{
  "mcpServers": {
    "heroui-react": {
      "command": "npx",
      "args": ["-y", "@heroui/react-mcp@latest"]
    }
  }
}

| Tool | Description |
| `list_components` | List all available HeroUI v3 components |
| `get_component_docs` | Get complete component documentation including anatomy, props, examples, and usage patterns |
| `get_component_source_code` | Access the React/TypeScript source code (.tsx files) for components |
| `get_component_source_styles` | View the CSS styles (.css files) for components |
| `get_theme_variables` | Access theme variables for colors, typography, spacing with light/dark mode support |
| `get_docs` | Browse the full HeroUI v3 documentation including guides and principles |
```

Source: https://heroui.com/docs/react/getting-started/mcp-server.mdx

### llms.txt family (8 files, sliced by context budget)

Type: `llms-txt` (llms.txt) · Official · Audience: consumers

Eight files: /llms.txt (517 lines, 76 KB index), /llms-full.txt (~7 MB), /llms-components.txt and /llms-patterns.txt, each also namespaced per platform under /react/ and /native/. Explicitly tiered ‘For limited context windows’. Every docs page is also retrievable as raw MDX by appending .mdx, with a header naming the upstream GitHub source file.

- Docs: https://heroui.com/docs/react/getting-started/llms-txt

````markdown
**Core documentation:**
- [/react/llms.txt](/react/llms.txt) — Quick reference index for React documentation
- [/react/llms-full.txt](/react/llms-full.txt) — Complete HeroUI React documentation

**For limited context windows:**
- [/react/llms-components.txt](/react/llms-components.txt) — Component documentation only
- [/react/llms-patterns.txt](/react/llms-patterns.txt) — Common patterns and recipes

**Windsurf:** Add to your `.windsurfrules` file:
```
#docs https://heroui.com/react/llms-full.txt
```

## Contributing

Found an issue with AI-generated code? Help us improve our LLMs.txt files on [GitHub](https://github.com/heroui-inc/heroui).
````

Source: https://raw.githubusercontent.com/heroui-inc/heroui/v3/apps/docs/content/docs/en/react/getting-started/(ui-for-agents)/llms-txt.mdx

### heroui-cli agents-md

Type: `cli-scaffolding` (CLI scaffolding) · Official · Audience: consumers

`npx heroui-cli@latest agents-md --react [--output AGENTS.md CLAUDE.md]` git-sparse-checkouts the v3 docs branch into `.heroui-docs/react/`, builds a compact index, injects it into AGENTS.md/CLAUDE.md, and auto-appends `.heroui-docs/` to .gitignore. Explicitly adapted from Vercel’s next-codemod agents-md tool; the docs page links Vercel’s ‘AGENTS.md outperforms Skills in our agent evals’ post as justification.

- Docs: https://heroui.com/docs/react/getting-started/agents-md

- Code: https://github.com/heroui-inc/heroui-cli/blob/main/src/helpers/agents-docs/heroui-agents-md.ts

Notes: Split-brain: agents-md is v3-only while the CLI’s add/init/upgrade commands still target v2.

```typescript
if (library === 'react') {
    parts.push('[HeroUI React v3 Docs Index]');
    if (reactDocsPath) parts.push(`root: ${reactDocsPath}`);
    parts.push(
      'STOP. What you remember about HeroUI React v3 is WRONG for this project. Always search docs and read before any task.'
    );

    const targetFile = outputFile || 'AGENTS.md';

    parts.push(
      `If docs missing, run this command first: heroui agents-md --react --output ${targetFile}`
    );
```

Source: https://raw.githubusercontent.com/heroui-inc/heroui-cli/HEAD/src/helpers/agents-docs/index-and-inject.ts

### prompts/ — vendor-specific system prompt packs

Type: `prompt-library` (Prompt library) · Official · Audience: consumers

Three maintained prompt packs in-repo: heroui-system-prompt.md (universal, usable as .cursorrules), v0-heroui.md (v0.dev, App Router + RSC), bolt-heroui.md (bolt.new/StackBlitz, full runnable Vite setup). README names Lovable, Replit Agent and Windsurf as further targets and tells contributors to diff prompts against real v3 source to catch drift.

- Code: https://github.com/heroui-inc/heroui/tree/v3/prompts

```markdown
# HeroUI v3 — AI Integration Prompt Packs

System prompts that teach AI code-generation tools to produce correct, idiomatic HeroUI v3 code.

| File | Purpose |
| `heroui-system-prompt.md` | Universal prompt — works with any LLM or AI coding tool (Claude, ChatGPT, Cursor, Copilot, etc.) |
| `v0-heroui.md` | Tailored for [v0.dev](https://v0.dev) — emphasizes Next.js App Router, RSC patterns, and Tailwind v4 |
| `bolt-heroui.md` | Tailored for [bolt.new](https://bolt.new) / StackBlitz — includes full Vite setup and runnable single-file examples |

## Contributing

When updating these prompts, verify that the component names, APIs, and import patterns match the actual v3 source code in this repo. Run a quick check against the component docs in `apps/docs/content/docs/react/components/` to catch any drift.
```

Source: https://github.com/heroui-inc/heroui/tree/v3/prompts

### heroui.com/install — multi-harness skill installer

Type: `cli-scaffolding` (CLI scaffolding) · Official · Audience: consumers

A bash script served from the docs domain that detects installed agent harnesses and drops the requested skill tarball into each: ~/.claude/skills/, ~/.cursor/skills/, ~/.config/opencode/skill/, and $CODEX_HOME. It also garbage-collects the previous-generation `heroui` skill and its /heroui slash command. Distribution-as-coercion: the skill lands in the agent’s global config without the user editing anything.

- Code: https://heroui.com/install

```bash
#!/bin/bash
# HeroUI Skill Installer
# Usage: curl -sSL https://heroui.com/install | bash -s [skill-name]
# Default: heroui-react
# Available skills: heroui-react, heroui-native, heroui-migration

SKILL_NAME="${1:-heroui-react}"
SKILL_URL="${BASE_URL}/skills/${SKILL_NAME}.tar.gz"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

# Claude Code - Skill only (skills are auto-discovered, no command needed)
if [ -d "$HOME/.claude" ]; then
  mkdir -p "$HOME/.claude/skills/${SKILL_NAME}"
  curl -sL "$SKILL_URL" | tar xz -C "$HOME/.claude/skills/${SKILL_NAME}"
  echo "✓ Installed ${SKILL_NAME} skill for Claude Code"
fi

# Cursor - Install skill
if [ -d "$HOME/.cursor" ]; then
  mkdir -p "$HOME/.cursor/skills/${SKILL_NAME}"
  curl -sL "$SKILL_URL" | tar xz -C "$HOME/.cursor/skills/${SKILL_NAME}"
fi
```

Source: https://heroui.com/install

### AGENTS.md + CLAUDE.md (contributor-facing)

Type: `agents-md` (AGENTS.md) · Official · Audience: builders

Both at repo root, largely mirroring each other (AGENTS.md is richer, ~220 lines). They encode the monorepo map, an exact command table, conventional-commit rules enforced by husky+commitlint, and hard styling prohibitions that constrain what an agent may write.

- Code: https://github.com/heroui-inc/heroui/blob/v3/AGENTS.md

````markdown
### Creating a New Component

Always use the scaffold script:

```bash
cd packages/react
pnpm add:component ComponentName
```

### Styling Rules

1. **Styles go in `.styles.ts` files**, never in `.tsx` files. Use `tv()` from `tailwind-variants`.
2. **Import from `tailwind-variants`**, never from `@heroui/standard`.
3. **Never use `twMerge` manually** — `tailwind-variants` already includes it.
4. **Add `"use client"` directive** at the top of every component `.tsx` file.
5. **Display names** follow: `HeroUI.ComponentName` or `HeroUI.Component.SubPart`.
````

Source: https://github.com/heroui-inc/heroui/blob/v3/AGENTS.md

### .claude/agents/ — five specialised subagents + .claude/guides/

Type: `claude-skill` (Agent skill) · Official · Audience: builders

Checked-in Claude Code subagent definitions: docs-curator.md (13 KB, model: opus), heroui-docs-writer.md (16 KB), style-migrator.md (11 KB, .styles.ts → BEM CSS migration), tailwind-v4-css-expert.md, storybook-debugger.md — plus .claude/guides/tailwindcss-v4-css-guide.md as shared curated context. They chain: style-migrator is told to delegate to tailwind-v4-css-expert for validation.

- Code: https://github.com/heroui-inc/heroui/tree/v3/.claude/agents

```markdown
**CRITICAL: Before Reviewing Documentation**

Before reviewing or improving any documentation, you MUST:

1. **Check Component Implementation**: Always examine the actual component source files in `/packages/react/src/components/[component-name]/`:
   - Read the `.tsx` file to understand the component structure and compound parts
   - **MANDATORY: Read the `.stories.tsx` file thoroughly** - This is your PRIMARY reference for validating demos
   - Verify demos match Storybook story patterns and structures

4. **Verify Component APIs**: Never assume component structure - always verify:
   - Compound parts match actual implementation
```

Source: https://github.com/heroui-inc/heroui/tree/v3/.claude/agents

### .claude/hooks.mjs — pre/post-edit validation loop

Type: `other` (Other) · Official · Audience: builders

Programmatic guardrails around every agent file edit: preEdit hard-throws on a protected-files denylist (lockfiles, .env.production, firebase.json) and warns on formatting; postEdit runs `pnpm lint --fix` and `tsc --noEmit` on the edited file and surfaces failures back to the agent. Enforcement in code rather than prose.

- Code: https://github.com/heroui-inc/heroui/blob/v3/.claude/hooks.mjs

```javascript
// Hook that runs before editing files
export async function preEdit({filePath}) {
  // Prevent editing of certain protected files
  const protectedFiles = ["yarn.lock", "package-lock.json", ".env.production", "firebase.json"];
  const fileName = path.basename(filePath);

  if (protectedFiles.includes(fileName)) {
    throw new Error(`❌ Cannot edit protected file: ${fileName}`);
  }

  return {proceed: true};
}

// Hook that runs after editing files
export async function postEdit({filePath, success}) {
  if (!success) return;

  if (filePath.match(/\.(ts|tsx|js|jsx)$/)) {
    try {
      execSync(`pnpm lint --fix "${filePath}"`, {stdio: "pipe"});
      console.log("✅ Lint fixes applied");
    } catch (e) {
      console.log("⚠️  Lint errors detected - please review");
    }
  }
```

Source: https://github.com/heroui-inc/heroui/blob/v3/.claude/hooks.mjs

### T-hash06/heroui-mcp (community)

Type: `mcp-server` (MCP server) · Community · Audience: consumers

Independent community MCP server for HeroUI component context, predating the official one. 17 stars, last pushed 2025-07-20 — effectively dormant and superseded by @heroui/react-mcp.

- Code: https://github.com/T-hash06/heroui-mcp

Notes: Listed for completeness; not recommended.

## Coercion techniques (8)

### "STOP. What you remember is WRONG" — weight-invalidation preamble

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

The strongest coercion artefact in the corpus. Every AGENTS.md/CLAUDE.md index the CLI writes into a consumer project opens by asserting the model’s parametric memory of HeroUI is invalid, mandates doc retrieval before any task, and gives a recovery command if the docs directory is missing. It directly targets v2/NextUI contamination: ~30k stars of v2 code in training data against a v3 API that broke almost everything.

```typescript
parts.push('[HeroUI React v3 Docs Index]');
if (reactDocsPath) parts.push(`root: ${reactDocsPath}`);
parts.push(
  'STOP. What you remember about HeroUI React v3 is WRONG for this project. Always search docs and read before any task.'
);

const targetFile = outputFile || 'AGENTS.md';

parts.push(
  `If docs missing, run this command first: heroui agents-md --react --output ${targetFile}`
);
```

Source: https://raw.githubusercontent.com/heroui-inc/heroui-cli/HEAD/src/helpers/agents-docs/index-and-inject.ts

### Negative exemplars — a labelled "DO NOT DO THIS" code block

Category: `exemplars` (Exemplars) · all 10 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md

The heroui-react skill pairs a v2/v3 contrast table with an explicitly labelled wrong-answer sample followed by the corrected one. Rather than only describing the target API, it shows the exact hallucination it expects (HeroUIProvider + framer-motion + flat Card props) and marks it forbidden.

````tsx
```tsx
// DO NOT DO THIS - v2 pattern
import { HeroUIProvider } from "@heroui/react";
import { motion } from "framer-motion";

<HeroUIProvider>
	<Card title="Product" description="A great product" />
</HeroUIProvider>;
```

### CORRECT (v3 patterns)

```tsx
// DO THIS - v3 pattern (no provider, compound components)
import { Card } from "@heroui/react";

<Card>
	<Card.Header>
		<Card.Title>Product</Card.Title>
		<Card.Description>A great product</Card.Description>
	</Card.Header>
</Card>;
```
````

Source: https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/skills/heroui-react/SKILL.md

### Forced retrieval — the skill ships executable fetchers, not prose

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

heroui-react deliberately withholds component API detail from SKILL.md and instead hands the agent six node scripts plus a deterministic MDX URL scheme, repeating “Always fetch component docs before implementing.” The skill body stays small (6.5 KB) while every concrete answer must come from a live fetch — the same discipline the MCP server enforces via tools.

```bash
**For component details, examples, props, and implementation patterns, always fetch documentation:**

# List all available components
node scripts/list_components.mjs

# Get component documentation (MDX)
node scripts/get_component_docs.mjs Button

# Get component source code
node scripts/get_source.mjs Button

# Get component CSS styles (BEM classes)
node scripts/get_styles.mjs Button

# Get theme variables
node scripts/get_theme.mjs

Component docs: `https://heroui.com/docs/react/components/{component-name}.mdx`

**Important:** Always fetch component docs before implementing. The MDX docs include complete examples, props, anatomy, and API references.
```

Source: https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/skills/heroui-react/SKILL.md

### Semantic-token enforcement — "Don't use raw colors"

Category: `token-enforcement` (Token enforcement) · all 13 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md

The skill supplies a variant-intent table (primary = 1 per context, tertiary = dismissive, danger = destructive) and forbids raw/visual color choices, pushing the agent toward semantic variants and oklch CSS variables that adapt to theme and contrast. The naming convention is machine-checkable: bare var = background, `-foreground` suffix = text.

```markdown
## Semantic Variants

| Variant     | Purpose                           | Usage          |
| `primary`   | Main action to move forward       | 1 per context  |
| `secondary` | Alternative actions               | Multiple       |
| `tertiary`  | Dismissive actions (cancel, skip) | Sparingly      |
| `danger`    | Destructive actions               | When needed    |

**Don't use raw colors** - semantic variants adapt to themes and accessibility.

**Color naming:**

- Without suffix = background (e.g., `--accent`)
- With `-foreground` = text color (e.g., `--accent-foreground`)
```

Source: https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/skills/heroui-react/SKILL.md

### Scaffold-only component creation (builders)

Category: `scaffolding` (Scaffolding) · all 7 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md

Contributor agents are forbidden from hand-rolling a new component directory; AGENTS.md mandates `pnpm add:component ComponentName` then a build to regenerate package.json exports. Combined with the enumerated prohibitions (never twMerge, never styles in .tsx, never import tv from @heroui/standard) this narrows the agent to filling in a generated skeleton.

````markdown
### Creating a New Component

Always use the scaffold script:

```bash
cd packages/react
pnpm add:component ComponentName
```

Then build to update package.json exports:

```bash
pnpm build
```
````

Source: https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/AGENTS.md

### Hook-enforced validation loop on every edit

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

Rather than asking the agent to remember to lint, .claude/hooks.mjs runs prettier check pre-edit and `pnpm lint --fix` + `tsc --noEmit --skipLibCheck` post-edit, feeding results back into the transcript; a denylist throws outright for protected files. Deterministic enforcement outside the model’s discretion.

```javascript
  // Run type checking on TypeScript files
  if (filePath.match(/\.(ts|tsx)$/)) {
    try {
      execSync(`npx tsc --noEmit --skipLibCheck "${filePath}"`, {stdio: "pipe"});
    } catch (e) {
      console.log("⚠️  TypeScript errors detected - please review");
    }
  }
```

Source: https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/.claude/hooks.mjs

### Ground-truth-first subagents ("never assume, always verify")

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

The docs-curator subagent is barred from writing docs off memory: it must first read the component .tsx, its .stories.tsx (declared the PRIMARY reference), .styles.ts and BEM CSS, and verify React Aria `links.rac` frontmatter. Storybook stories are promoted to the executable spec docs are validated against. Sibling agents are pointed at .claude/guides/tailwindcss-v4-css-guide.md as shared curated context, with explicit CSS prohibitions.

```markdown
**IMPORTANT**: Always refer to the comprehensive Tailwind CSS v4 guide at `.claude/guides/tailwindcss-v4-css-guide.md` for:

- Proper @apply directive usage and v4-specific changes
- CSS nesting syntax with & symbol

- **DO NOT add any @utility directives** - the plugin handles CSS injection
- Proper use of `@apply` directives for Tailwind utilities (IMPORTANT: Only ONE @apply per CSS rule block - combine all utilities into a single @apply statement)

**IMPORTANT**: When creating or analyzing CSS files, use the tailwind-v4-css-expert agent to ensure proper Tailwind CSS v4 syntax and patterns.
```

Source: https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/.claude/agents/style-migrator.md

### Auto-refresh pipeline: docs deploy → MCP re-extraction

Category: `registry-metadata` (Registry metadata) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/registry-metadata.md

A GitHub Actions workflow listens for Vercel deployment webhooks on the v3 branch and repository_dispatches `react-docs-deployed` / `native-docs-deployed` into heroui-inc/heroui-mcp, so the MCP server’s corpus is re-extracted from the freshly deployed docs. Infrastructure that keeps the agent-facing surface from drifting from the docs.

```yaml
name: Trigger MCP Extraction on Vercel Deployment

on:
  repository_dispatch:
    types:
      - vercel.deployment.success
      - vercel.deployment.promoted

jobs:
  trigger-extraction:
    steps:
      - name: Trigger React MCP Extraction
        if: |
          github.event.client_payload.git.ref == 'v3' ||
          github.event.client_payload.git.ref == 'refs/heads/v3'
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.MCP_DISPATCH_TOKEN }}
          repository: heroui-inc/heroui-mcp
          event-type: react-docs-deployed
```

Source: https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/.github/workflows/trigger-mcp-extraction.yml

## Platform integrations (3)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

Official HeroUI Figma Kit V3 on Figma Community, marketed as a 1:1 match with v3 code (same variants, naming, structure) using Figma variables mapped to code tokens (--accent, --surface, --radius) and Figma slots for composition. No Code Connect (*.figma.tsx) files exist anywhere in the heroui-inc org — code search returned only prose mentions in blog/docs MDX. Figma Dev Mode MCP is not documented as supported.

Link: https://www.figma.com/community/file/1546526812159103429/heroui-figma-kit-v3

### Storybook (addon-mcp, manifests, AI docs)

Storybook is the internal component-development environment (`pnpm dev`, port 6006); every component ships a .stories.tsx. It is used as an AI substrate on the builder side — docs-curator treats stories as the primary source of truth for docs demos, and a dedicated storybook-debugger subagent exists. No public Storybook-based MCP or addon for consumers.

Link: https://github.com/heroui-inc/heroui/tree/v3/packages/storybook

### other

HeroUI Pro (commercial block library) ships its own agent-skills and Figma docs pages; not verified in depth here. No Supernova / Knapsack / zeroheight presence found.

Link: https://heroui.pro/docs/react/getting-started/agent-skills

## Building the system vs. consuming it

### For consumers (agents building UIs with HeroUI)

Exceptionally well served, and deliberately multi-modal so the same guidance lands whatever harness the developer uses: Agent Skills (Claude Code / Cursor / OpenCode / Codex, installed by a one-line curl or `npx skills add heroui-inc/heroui`), an official MCP server with six retrieval tools and copy-paste config for seven clients plus a one-click Cursor deeplink, four tiers of llms.txt per platform, `.mdx` suffix retrieval on every docs page, a `heroui-cli agents-md` command that vendors the docs into the consumer’s repo and rewrites their AGENTS.md/CLAUDE.md, and vendor-tuned prompt packs for v0.dev and bolt.new. The unifying strategy is anti-memory: because v3 broke nearly every v2/NextUI API models were trained on, almost every artefact’s first move is to invalidate the model’s priors and force a live fetch.

### For builders (the HeroUI team using AI on the system itself)

Also unusually mature for an OSS component library. The repo root carries both AGENTS.md and CLAUDE.md (overlapping; AGENTS.md is the fuller spec), plus `.claude/` with five committed subagent definitions (docs-curator on opus, heroui-docs-writer, style-migrator, tailwind-v4-css-expert, storybook-debugger), a curated `.claude/guides/tailwindcss-v4-css-guide.md`, and `hooks.mjs` enforcing lint/typecheck/protected-file rules on every agent edit. The style-migrator subagent is a genuine AI-assisted migration tool (tailwind-variants .styles.ts → BEM CSS) built for the v2→v3 restyle. Notably absent: any .cursorrules, .cursor/rules/, or .github/copilot-instructions.md, and CONTRIBUTING.md contains zero mentions of AI, agents, Claude, Copilot or skills — the agent tooling is entirely undocumented for outside contributors.

## Gaps

1) No Figma Code Connect: despite a 1:1 Figma Kit V3, a GitHub code search across heroui-inc found no *.figma.tsx or Code Connect configuration — only prose mentions in blog/docs MDX. No Figma Dev Mode MCP integration documented. 2) No shadcn-style machine-readable component registry (registry.json returned 0 results org-wide); agents get docs and source via MCP/scripts, not an installable registry. 3) MCP staleness: @heroui/react-mcp last published 2026-02-12 and heroui-inc/heroui-mcp last pushed 2026-04-16 while the library shipped v3.2.2 in July 2026 — the auto-extraction workflow keeps the docs corpus fresh but the server package lags. Legacy @heroui/mcp is stuck at 1.0.0-alpha.17 (Sept 2025) and still surfaces in search. 4) Tooling split-brain: heroui-cli’s agents-md is v3-only while add/init/upgrade still target v2, flagged in a docs Callout. 5) The migration skill points at a preview Vercel URL (heroui-git-docs-migration-heroui.vercel.app) rather than a stable domain, and is marked status: preview. 6) No Supernova / Knapsack / zeroheight presence found. 7) /llms-full.txt is ~7 MB — far beyond most context windows despite the ‘full’ framing; heroui.com/llms.txt serves a JS redirect shell to some clients before resolving to the 76 KB / 517-line index. 8) No AI guidance for external contributors: CONTRIBUTING.md never mentions the .claude/ tooling. 9) No evidence found of AI review bots on PRs or AI-authored codemods beyond the style-migrator subagent. 10) AGENTS.md and CLAUDE.md substantially duplicate each other, a drift risk.

## Sources (15)

- https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/AGENTS.md

- https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/CLAUDE.md

- https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/.claude/hooks.mjs

- https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/.claude/agents/docs-curator.md

- https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/.claude/agents/style-migrator.md

- https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/skills/heroui-react/SKILL.md

- https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/skills/heroui-migration/SKILL.md

- https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/prompts/README.md

- https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/prompts/heroui-system-prompt.md

- https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/.github/workflows/trigger-mcp-extraction.yml

- https://heroui.com/install

- https://heroui.com/docs/react/getting-started/mcp-server.mdx

- https://raw.githubusercontent.com/heroui-inc/heroui/v3/apps/docs/content/docs/en/react/getting-started/(ui-for-agents)/llms-txt.mdx

- https://raw.githubusercontent.com/heroui-inc/heroui-cli/HEAD/src/helpers/agents-docs/index-and-inject.ts

- https://www.figma.com/community/file/1546526812159103429/heroui-figma-kit-v3

---

Generated 2026-07-27T21:54:17Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
