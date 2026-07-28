---
title: "React Spectrum / Spectrum 2 (S2) — AI affordances"
description: "React Spectrum S2 is one of the most AI-invested public design systems as of mid-2026. Adobe ships two official first-party MCP servers (@react-spectrum/mcp and…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.json"
id: "react-spectrum-s2"
category: "design-system"
ai_maturity: "ai-native"
affordance_count: 10
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-28T05:02:05Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# React Spectrum / Spectrum 2 (S2) — AI affordances

Adobe · design-system · Apache-2.0 · AI maturity: **ai-native** (AI consumption is a design goal, with dedicated surfaces and staff behind it). 10 affordances, 8 coercion techniques.

- Docs: https://react-spectrum.adobe.com
- Repo: https://github.com/adobe/react-spectrum
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2

## Summary

React Spectrum S2 is one of the most AI-invested public design systems as of mid-2026. Adobe ships two official first-party MCP servers (@react-spectrum/mcp and @react-aria/mcp, both v1.2.0 with daily nightlies), a dedicated /ai docs page with one-click “Add to Cursor/VS Code/Claude Desktop” deeplinks and a packaged .mcpb desktop connector, llms.txt plus .md twins of every docs page, and, most distinctively, three official Agent Skills served from https://react-spectrum.adobe.com/.well-known/skills/index.json and installable with `npx skills add https://react-spectrum.adobe.com`. The skills are generated from the docs source by a committed build script (generateAgentSkills.mjs), so agent-facing context is a build artifact regenerated on every docs deploy rather than hand-written prose. The coercion is explicit and layered: a 387-line SKILL.md of named prohibitions, a Figma-MCP guide that demotes Figma output to “reference, not a code generator”, a deterministic scoring rubric behind a report-only spectrum-audit skill, and an `--agent` non-interactive flag added to the s1→s2 codemod CLI specifically for agent callers. Builder-side AI is comparatively thin: a .claude/settings.json oxfmt hook and one internal release-notes skill; no CLAUDE.md, AGENTS.md, .cursorrules, or copilot-instructions in the repo.

## Maintenance

- Actively maintained: yes
- Last release: @react-spectrum/s2@1.5.0 and react-aria-components@1.19.0, both 2026-06-18; MCP packages at 1.2.0 with nightlies published daily (latest 2026-07-27)
- Activity: Repo pushed 2026-07-26; 15,724 stars; Apache-2.0. Active workflows: nightly.yaml, prod-docs.yaml, beta-docs.yaml, weekly-api-diff.yml, weekly-chromatic.yml, lint-pr-titles.yaml. Release cadence roughly every 2-4 weeks (1.4.0 on 2026-05-30, 1.5.0 on 2026-06-18).

## AI affordances (10)

### @react-spectrum/mcp (React Spectrum S2 MCP server)

Type: `mcp-server` (MCP server) · Official · Audience: consumers

First-party stdio MCP server, on npm since 2025-09-09, latest 1.2.0 plus daily nightlies. Registers three doc tools per library (list_s2_pages, get_s2_page_info, get_s2_page) and bundles the React Aria library in the same server (list_react_aria_pages, etc.). S2-specific extras: search_s2_icons, search_s2_illustrations, get_style_macro_property_values. All tools annotated readOnlyHint:true, openWorldHint:true. get_style_macro_property_values throws an error enumerating every valid property when the model guesses wrong, an enum-enforcement loop for the style macro.

- Docs: https://react-spectrum.adobe.com/ai

- Code: https://github.com/adobe/react-spectrum/tree/main/packages/dev/mcp

Notes: Install surface on /ai covers Cursor deeplink, VS Code deeplink + `code --add-mcp`, Claude Code CLI (`claude mcp add react-spectrum-s2 npx @react-spectrum/mcp@latest`), Codex ~/.codex/config.toml, and Gemini CLI. Sibling @react-aria/mcp (created 2025-11-14, also 1.2.0) covers React Aria alone.

```typescript
server.registerTool(
  'get_style_macro_property_values',
  {
    title: 'Get style macro property values',
    description:
      'Returns the allowed values for a given S2 style macro property (including expanded color/spacing value lists where applicable).',
    inputSchema: {propertyName: z.string()},
    annotations: {readOnlyHint: true, openWorldHint: true}
  },
  async ({propertyName}) => {
    const name = String(propertyName ?? '').trim();
    ...
    if (!def) {
      const available = Object.keys(all).sort((a, b) => a.localeCompare(b));
      throw new Error(
        `Unknown style macro property '${name}'. Available properties: ${available.join(', ')}`
      );
    }
    return {content: [{type: 'text', text: JSON.stringify(def, null, 2)}]};
  }
);
```

Source: https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/mcp/s2/src/index.ts

### react-spectrum-s2 Agent Skill

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

387-line SKILL.md plus 211 bundled reference files (one .md per component, guides, and the entire React Aria doc set under references/react-aria/). Served at /.well-known/skills/react-spectrum-s2/ in the agentskills.io format, installed with `npx skills add https://react-spectrum.adobe.com`. Densely prohibitive: bans third-party design systems and icon libraries by name, bans grepping node_modules, bans UNSAFE_* escape hatches, bans macro-output concatenation, bans overflow wrappers around virtualized collections, and routes ambiguous component choices through a Component Decision Tree file.

- Docs: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/SKILL.md

- Code: https://github.com/adobe/react-spectrum/tree/main/packages/dev/s2-docs/skills

```markdown
## Styling

Use S2 components and the S2 `style` macro as the default styling approach.

- Prefer S2 components first; use their `styles` prop only for layout-style properties.
- For generic layouts (flex, grid, etc.), use native HTML elements with the `style` macro.
- Avoid using Tailwind, `radix-ui`, `shadcn/ui`, or any other third-party design system in S2 implementations.
- IMPORTANT: avoid using `UNSAFE_style` and `UNSAFE_className`.

## Icons

Use S2's built-in icons and illustrations.

- Import icons from `@react-spectrum/s2/icons/...`, illustrations from `@react-spectrum/s2/illustrations/...`.
- Don't introduce third-party icon libraries (`lucide-react`, `phosphor-icons`, `heroicons`, etc.).
- Look up icons in the [Icons](references/components/icons.md) catalog (or the S2 MCP `search_s2_icons` tool if available). The catalog is the source of truth.
- Don't grep `node_modules` or the S2 source — slow, often misses the intended name, finds stale/internal matches.
- Search the **full** catalog; don't settle for a partial name match. `Heart` ≠ `HeartBroken`; `Edit` ≠ `EditIn`.
```

Source: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/SKILL.md

### spectrum-audit Agent Skill

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

Report-only audit skill (9 files) that turns an agent into a design-system linter: six numbered check files with grep-level detection recipes and a severity per rule, a deterministic scoring rubric, and a report template. It writes SPECTRUM-AUDIT.md, explicitly refuses to edit code, and hands off to the react-spectrum-s2 skill (with the exact install command) or the migration skill. Includes an anti-hallucination clause: cite only line numbers you actually read or grepped.

- Docs: https://react-spectrum.adobe.com/.well-known/skills/spectrum-audit/SKILL.md

````markdown
# Spectrum Adherence Scoring

The Spectrum Adherence Score is computed **deterministically** from the findings you recorded — never from a subjective sense of overall quality. The same set of findings must always produce the same score. Do not round, fudge, or "feel out" a number; run the arithmetic below.

## Severity weights

| Severity | Weight | Meaning |
|----------|--------|---------|
| Critical | 10 | Breaks the build, breaks accessibility, or ships visibly broken styling to users. |
| High | 5 | Wrong approach that will cause real problems — `UNSAFE_*`, bypassing the design system, missing CSS-bundle optimization. |
| Medium | 2 | Missed reuse or a convention violation that degrades quality but still works. |
| Low | 1 | Polish: redundant default props, minor token choices, naming. |

## Per-category score

```
categoryScore = 100 − min(100, Σ severityWeight for findings in that category)
```
````

Source: https://react-spectrum.adobe.com/.well-known/skills/spectrum-audit/references/scoring-rubric.md

### migrate-react-spectrum-v3-to-s2 Agent Skill

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

Eight-step S1→S2 migration skill (9 files) that drives the official jscodeshift codemod CLI in its dedicated agent mode, makes the agent chase the TODO(S2-upgrade) markers the codemod leaves behind, then run the project’s typecheck/tests/build before declaring done. Explicitly scope-fences the agent away from React major upgrades (‘Do not perform major dependency upgrades such as React version bumps’).

- Docs: https://react-spectrum.adobe.com/.well-known/skills/migrate-react-spectrum-v3-to-s2/SKILL.md

````markdown
## Step 3: Dry-run the codemod

```bash
npx @react-spectrum/codemods s1-to-s2 --agent --dry
```

## Step 6: Fix remaining TODO(S2-upgrade) comments

Search the codebase for `TODO(S2-upgrade)` comments left by the codemod. Each one marks a change that requires manual review.

## Step 7: Validate

Run the project's own toolchain to verify the migration is complete:

1. Install dependencies if package manifests changed.
2. Run the typecheck or compile step (e.g. `tsc --noEmit`, `tsc -b`).
3. Run tests covering the migrated code. Prefer the narrowest test scope that covers the changed files.
4. Run the build to confirm the output is intact.

In monorepos, validate the affected package first with its own scripts before running workspace-wide checks. Fix any failures before declaring the migration complete.
````

Source: https://react-spectrum.adobe.com/.well-known/skills/migrate-react-spectrum-v3-to-s2/SKILL.md

### Agent Skills discovery manifest (/.well-known/skills/index.json)

Type: `registry` (Registry) · Official · Audience: consumers

Machine-readable registry listing all three skills with name, description, and an exact file manifest (211 files for react-spectrum-s2, 9 each for the other two). Generated by a committed build script that runs the markdown-docs generator, copies docs into references/, and emits the manifest, so agent context is regenerated from the same source as the human docs on every docs deploy.

- Docs: https://react-spectrum.adobe.com/.well-known/skills/index.json

- Code: https://github.com/adobe/react-spectrum/blob/main/packages/dev/s2-docs/scripts/generateAgentSkills.mjs

```javascript
/**
 * Generates Agent Skills for React Spectrum (S2), migration, and React Aria.
 *
 * This script creates skills in the Agent Skills format (https://agentskills.io/specification)
 *
 * Usage:
 * node packages/dev/s2-docs/scripts/generateAgentSkills.mjs.
 *
 * The script will:
 * 1. Run the markdown docs generation if dist doesn't exist
 * 2. Create .well-known/skills directories inside the docs dist output
 * 3. Copy relevant documentation to references/ subdirectories
 * 4. Generate .well-known/skills/index.json for discovery.
 */
```

Source: https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/s2-docs/scripts/generateAgentSkills.mjs

### llms.txt + per-page .md twins + “Copy for LLM” button

Type: `llms-txt` (llms.txt) · Official · Audience: consumers

https://react-spectrum.adobe.com/llms.txt (HTTP 200, ~16 KB) is a curated index of every S2 docs page with a one-line description each. Every docs page has a markdown twin at .md and a Copy for LLM button. Confirmed gap: there is no llms-full.txt (404 SPA fallback) and no /s2/llms.txt.

- Docs: https://react-spectrum.adobe.com/llms.txt

```markdown
# React Spectrum (S2) Documentation

> Plain-text markdown documentation for React Spectrum S2 components.

## Documentation
- [Accordion](Accordion.md): An accordion is a container for multiple accordion items.
- [ActionBar](ActionBar.md): Action bars are used for single and bulk selection patterns when a user needs to perform actions
- [ActionButton](ActionButton.md): ActionButtons allow users to perform an action. They're used for similar, task-based options
- [Collections](collections.md): Many components display a collection of items, and provide functionality such as keyboard navigation, and selection.
- [Migrating to Spectrum 2](migrating.md): Learn how to migrate from React Spectrum v3 to Spectrum 2.
```

Source: https://react-spectrum.adobe.com/llms.txt

### “Working with AI” docs page (/ai, aliased from /mcp)

Type: `ai-docs-page` (AI docs page) · Official · Audience: consumers

Dedicated docs page with per-client install tabs and one-click deeplink buttons. https://react-spectrum.adobe.com/mcp is a meta-refresh redirect to /ai#mcp-server. Includes a cursor:// deeplink, a vscode:mcp/install deeplink, and a Claude Desktop directory link (claude://claude.ai/directory/connectors/ant.dir.gh.adobe.s2), so the S2 server is listed in the Claude connector directory.

- Docs: https://react-spectrum.adobe.com/ai

````markdown
# Working with AI

Learn how to use the React Spectrum MCP Server, Agent Skills, and more to help you build with AI.

## Agent Skills

[Agent Skills](https://agentskills.io) are folders of instructions, scripts, and resources that your AI coding tool can load when relevant to help with specific tasks.

To install the React Spectrum skill, run:

```bash
npx skills add https://react-spectrum.adobe.com
```

## MCP Server

[Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install.md?name=React%20Spectrum%20(S2)&config=...)

```bash
claude mcp add react-spectrum-s2 npx @react-spectrum/mcp@latest
```

[Add to Claude Desktop](claude://claude.ai/directory/connectors/ant.dir.gh.adobe.s2)

## Markdown docs

Add the `.md` extension to the URL to get the markdown version of a page.
````

Source: https://react-spectrum.adobe.com/ai.md

### .mcpb Claude Desktop connector bundle

Type: `other` (Other) · Official · Audience: consumers

A committed build script packages the MCP server into a react-spectrum-s2.mcpb desktop-extension bundle (icon, display name, long description, declared tool list) shipped alongside the docs dist, the artifact behind the Add to Claude Desktop button.

- Code: https://github.com/adobe/react-spectrum/blob/main/packages/dev/s2-docs/scripts/generateMcpb.mjs

```javascript
const libraries = {
  s2: {
    packageDir: path.join(repoRoot, 'packages/dev/mcp/s2'),
    packageName: '@react-spectrum/mcp',
    outputFile: 'react-spectrum-s2.mcpb',
    serverEntryPoint: 'server/s2/src/index.js',
    displayName: 'React Spectrum (S2)',
    extensionName: 'react-spectrum-s2',
    description: "Build apps with Adobe's React Spectrum component library.",
    longDescription:
      'Provides tools for browsing the React Spectrum (S2) documentation, including listing and reading pages, searching for available icons and illustrations, and looking up available styling token values. Also bundles the React Aria docs tools for browsing React Aria documentation from the same server.',
    documentation: 'https://react-spectrum.adobe.com/ai.html',
```

Source: https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/s2-docs/scripts/generateMcpb.mjs

### @react-spectrum/codemods s1-to-s2 `--agent` mode

Type: `codemod-ai` (AI codemod) · Official · Audience: consumers

The jscodeshift-based S1→S2 upgrade CLI has a purpose-built flag for agent/CI invocation that suppresses the interactive prompts an LLM cannot answer. A rare case of a design system adding an explicit machine-caller affordance to its migration tooling.

- Code: https://github.com/adobe/react-spectrum/tree/main/packages/dev/codemods/src/s1-to-s2

```markdown
- `-d, --dry`: Run the codemod without writing any changes to disk. Use this to preview migrations before applying.
- `--agent`: Run in non-interactive mode. Skips interactive prompts, package installation, and macro setup. Required when running in CI or from an agent tool. Note: `@react-spectrum/s2` must still be installed and resolvable.
```

Source: https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/codemods/src/s1-to-s2/README.md

### .claude/ in adobe/react-spectrum (release-notes skill + oxfmt hook)

Type: `claude-skill` (Agent skill) · Official · Audience: builders

The only builder-facing AI tooling in the repo. .claude/settings.json registers a PostToolUse hook piping every Edit/Write/MultiEdit file path into oxfmt, a formatter enforcement loop on the agent’s own edits. .claude/skills/release-notes/SKILL.md drives a maintainer workflow: run `yarn releaseNotes`, then rewrite the scaffolded changelog, with guardrails (don’t re-run the script if the user already did, don’t touch frontmatter or the Released packages block, verify against a `{/* Commits: N */}` count comment embedded in the scaffold, fetch PR bodies and the rspbot ts-diff comment when a commit subject is developer-internal).

- Code: https://github.com/adobe/react-spectrum/tree/main/.claude

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path // empty' | { read -r f; [[ -n \"$f\" ]] && oxfmt --no-error-on-unmatched-pattern \"$f\"; } 2>/dev/null || true",
            "statusMessage": "oxfmt"
          }
        ]
      }
    ]
  }
}
```

Source: https://raw.githubusercontent.com/adobe/react-spectrum/main/.claude/settings.json

## Coercion techniques (8)

### Named-competitor prohibition + escape-hatch ban

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

The skill names competing libraries explicitly rather than saying ‘stay on-system’, and shouts the S2 escape hatches. Reinforced downstream: spectrum-audit assigns Severity: High to UNSAFE_style|UNSAFE_className and to Tailwind/clsx usage, with literal grep patterns to detect them.

```markdown
- Avoid using Tailwind, `radix-ui`, `shadcn/ui`, or any other third-party design system in S2 implementations.
- IMPORTANT: avoid using `UNSAFE_style` and `UNSAFE_className`.

### No `UNSAFE_style` / `UNSAFE_className`
- **Rule:** Avoid `UNSAFE_style` and `UNSAFE_className`; they bypass tokens and the style layer ordering.
- **Detect:** grep `UNSAFE_style|UNSAFE_className`.
- **Severity:** High.

### No concatenation of macro output
- **Rule:** `style()` results encode style precedence; concatenating them with template literals, `clsx`, `classnames`, or string spaces breaks ordering.
- **Severity:** High.
```

Source: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/SKILL.md

### Catalog-as-source-of-truth: forbid grepping node_modules, force the MCP tool

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

Rather than letting the model discover icon names by searching the installed package (where it finds stale/internal names), the skill declares the docs catalog canonical, points at the search_s2_icons MCP tool, and pre-empts near-miss hallucination with worked counterexamples.

```markdown
- Look up icons in the [Icons](references/components/icons.md) catalog (or the S2 MCP `search_s2_icons` tool if available). The catalog is the source of truth.
- Don't grep `node_modules` or the S2 source — slow, often misses the intended name, finds stale/internal matches.
- Search the **full** catalog; don't settle for a partial name match. `Heart` ≠ `HeartBroken`; `Edit` ≠ `EditIn`.
```

Source: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/SKILL.md

### Build-toolchain validation loop before declaring done

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

The S2 skill closes with a compulsory verification section that exploits the style macro being a build-time construct, so a typecheck/build run doubles as a design-system linter. Console warnings are promoted to hard failures. The migration skill repeats the pattern as its Step 7.

```markdown
## Verify before declaring done

Before reporting the task as complete, exercise the project's own toolchain. The `style` macro performs build-time checks that the editor alone won't show.

- **Typecheck.** Run the project's typecheck (`tsc --noEmit`, `tsc -b`, etc.). Fix everything — wrong `size` values, missing required props, raw CSS in the macro all surface here.
- **Build or dev server.** Run at least once. The macro's "cannot statically evaluate" error means a value inside `style({...})` depends on something non-literal; refactor to use runtime conditions or the runtime style function.
- **Runtime warnings.** If you can render the page, check the console for missing `aria-label`/`textValue`, deprecated props, etc. Treat these as failures.
```

Source: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/SKILL.md

### Deterministic scoring rubric with anti-vibe language

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

The audit skill removes model judgement from the final number: fixed severity weights, a closed-form per-category formula, fixed category weights, and an instruction forbidding estimation. Paired with a citation-integrity rule.

```markdown
The Spectrum Adherence Score is computed **deterministically** from the findings you recorded — never from a subjective sense of overall quality. The same set of findings must always produce the same score. Do not round, fudge, or "feel out" a number; run the arithmetic below.

[from SKILL.md Phase 1:]
For every violation, record a finding: `{file:line, rule, severity, category, fix}`. Cite only line numbers you actually read or grepped — never invent locations. Record **one finding per distinct root cause** at a `file:line`.
```

Source: https://react-spectrum.adobe.com/.well-known/skills/spectrum-audit/references/scoring-rubric.md

### Demote the Figma MCP from generator to reference

Category: `design-code-mapping` (Design–code mapping) · all 3 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/design-code-mapping.md

Because Figma Dev Mode MCP emits React + Tailwind against raw CSS variables, Adobe’s guide reclassifies that output as untrusted reference material and prescribes a re-implementation workflow, plus a Figma-name → S2-props mapping table and disambiguation of mixed S1/S2/product libraries in one file. This substitutes for the Code Connect mappings Adobe has not published.

```markdown
When the user supplies a Figma frame, node, or URL and asks for an S2 implementation, treat the Figma MCP as a **reference**, not a code generator. The MCP returns React + Tailwind targeting raw CSS variables — it does **not** produce S2 output. Your job is to recognize what the design *is* (in Spectrum terms), then re-implement it with S2 components and the [`style` macro](style-macro.md).

5. **Re-implement with S2 + the `style` macro.** Drop the absolute positioning, the arbitrary pixel values, and the Tailwind classes.
6. **Verify against the screenshot.** Call `get_screenshot` on the same node when you're done and compare.

### Watch out for axis-order differences between S1 and S2

- S2: `Button (M, Accent)` — `(size, variant)`
- S1: `Button (Accent, M)` — `(variant, size)`
```

Source: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/references/guides/figma-to-s2.md

### Anti-“reinvent the component” clauses with named failure modes

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

Instead of a generic ‘reuse components’, the skill enumerates the exact hand-rolled shapes LLMs produce (card divs, wrapper spans around collection items, an overflow div around a virtualized list, a custom empty-state div, a separate spinner) and forbids each with the mechanical reason it breaks.

```markdown
### Don't reinvent `Card` / `CardView`

For grids of objects/files/products/people, use `CardView` plus a prescribed variant (`AssetCard`, `UserCard`, `ProductCard`) or `Card` composed with `CardPreview`/`Content`/`Text`/`Footer`. Don't emit hand-rolled card divs or `<article>` wrappers.

`TableView`, `ListView`, `TreeView`, `CardView`, `Menu`, and `ListBox` virtualize and scroll internally. Don't wrap them in an `overflow`/`overflowY`/`overflowX` container — that produces a nested scroller and breaks keyboard navigation.

- Empty state: pass `renderEmptyState` returning an `IllustratedMessage`. Don't conditionally swap the whole collection for a custom empty `div`.
- Async data: use `useAsyncList` (or the user's preferred data fetching library) plus the collection's `loadingState`/`onLoadMore` props. Don't render a separate spinner.
```

Source: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/SKILL.md

### Progressive disclosure over a generated 211-file reference tree

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

SKILL.md stays ~380 lines and defers to references/components/.md, references/guides/*.md, and a bundled React Aria doc set, all emitted from docs source by generateAgentSkills.mjs on each deploy, keeping agent context and human docs in lockstep. Entry conditions are stated up front so the model loads the right file before generating any code.

```markdown
If the requirements do not clearly specify which React Spectrum component to use, consult the [Component Decision Tree](references/guides/component-decision-tree.md) before choosing a component.

If the request involves a Figma design, frame, or URL — or if the Figma MCP (`get_design_context`,`search_design_system`, etc.) is available — consult [Implementing Figma designs with React Spectrum S2](references/guides/figma-to-s2.md) before generating code.

When writing tests that exercise S2 components, consult [Testing with React Spectrum S2](references/guides/test-utils-guidance.md) and prefer the ARIA pattern testers from `@react-spectrum/test-utils` over hand-rolled role/selector queries.

[and on the bundled React Aria docs:]
- [React Aria Components](references/react-aria/llms.txt): Documentation for unstyled accessible primitives. Use only when no React Spectrum S2 component fits the requirements.
```

Source: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/SKILL.md

### Layered skill handoff (build → audit → migrate)

Category: `scaffolding` (Scaffolding) · all 7 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md

The three skills cross-reference each other by name and hand off with literal install commands, forming a closed system: audit finds violations but refuses to edit, pointing to the build skill for fixes and to the migration skill if S1 packages are present; the Figma guide recommends the migration skill when it detects S1 Figma libraries.

````markdown
## Phase 4 — Hand off

This skill does not edit code. Recommend:

- The `react-spectrum-s2` skill to implement the fixes. If it is not installed:

  ```bash
  npx skills add https://react-spectrum.adobe.com --skill react-spectrum-s2
  ```

- The `migrate-react-spectrum-v3-to-s2` skill if Spectrum 1 packages (`@adobe/react-spectrum`, `@react-spectrum/*`, `@spectrum-icons/*`) are present.
````

Source: https://react-spectrum.adobe.com/.well-known/skills/spectrum-audit/SKILL.md

## Platform integrations (3)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

No public Figma Code Connect mappings found for @react-spectrum/s2: no *.figma.tsx files in the repo, and the only ‘code connect’ code-search hit is prose inside the figma-to-s2 skill guide. Instead Adobe ships a written Figma-MCP translation guide with a Figma-component-name → S2-props mapping table, S1-vs-S2 library disambiguation via search_design_system, and a default of disableCodeConnect: true when no mapping exists.

Link: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/references/guides/figma-to-s2.md

### Storybook (addon-mcp, manifests, AI docs)

Storybook is used internally for development and visual review; the repo carries both .storybook (v3) and .storybook-s2 configs plus .chromatic and a weekly-chromatic.yml workflow. No AI/agent-facing Storybook integration (e.g. an addon exposing stories to agents) was found.

Link: https://github.com/adobe/react-spectrum/tree/main/.storybook-s2

### other

The docs site is a custom in-repo app (packages/dev/s2-docs) that also emits the markdown docs, llms.txt, the .well-known/skills tree, and the .mcpb bundle. No Supernova, Knapsack, or zeroheight presence found.

Link: https://github.com/adobe/react-spectrum/tree/main/packages/dev/s2-docs

## Building the system vs. consuming it

### For consumers (agents building UIs with React Spectrum / Spectrum 2 (S2))

Very strong and unusually complete. Four independent delivery channels for the same curated context: MCP server (npm + .mcpb desktop bundle + a Claude connector-directory entry), three Agent Skills served over a /.well-known manifest, llms.txt with per-page .md twins and a Copy-for-LLM button, and one-click editor install deeplinks for Cursor/VS Code plus CLI recipes for Claude Code, Codex, and Gemini CLI. The instruction content is the standout: explicit prohibitions naming competing libraries, a deterministic audit rubric, a mandatory build-toolchain validation loop, and an --agent flag on the migration codemod. All of it is generated from docs source by committed build scripts, so it tracks releases automatically.

### For builders (the React Spectrum / Spectrum 2 (S2) team using AI on the system itself)

Thin by comparison, and apparently deliberately so. No CLAUDE.md, AGENTS.md, .cursorrules, .cursor/rules/, or .github/copilot-instructions.md at the repo root (all probed, all 404). CONTRIBUTING.md contains zero mentions of AI/agents/Copilot/Claude, and the PR template has no AI-disclosure checkbox. The entire builder-side footprint is .claude/settings.json (a PostToolUse oxfmt hook applied to the agent’s own edits) and one internal .claude/skills/release-notes skill for polishing generated changelogs. CI workflows (nightly, prod-docs, beta-docs, weekly-api-diff, weekly-chromatic, labeler, lint-pr-titles) contain no AI bots; the ‘rspbot’ referenced inside the release-notes skill is their pre-existing ts-diff comment bot, not an LLM.

## Gaps

Not confirmed, or absent: (1) No llms-full.txt: https://react-spectrum.adobe.com/llms-full.txt returns HTTP 404 (SPA fallback body), as does /s2/llms.txt; only the root /llms.txt exists. (2) No public Figma Code Connect mappings found in the repo or via search; the figma-to-s2 guide substitutes for them; Adobe may maintain Code Connect internally. (3) No hosted or remote MCP endpoint found; both servers are stdio-over-npx only. (4) No .cursorrules or copilot-instructions templates distributed to consumers; Cursor/Copilot are served via the generic Agent Skills format plus the MCP deeplink instead. (5) SKILL.md was read for all three skills, the figma-to-s2 guide, the scoring rubric and check 03, but not the remaining audit checks (01, 02, 04, 05, 06) or the 211 component reference files; the pattern in the checks appears consistently grep-recipe + severity. (6) Unverified whether Adobe product teams run additional private agent tooling on top of these public skills, and unverified how the Claude connector-directory listing (ant.dir.gh.adobe.s2) is maintained.

## Sources (15)

- https://react-spectrum.adobe.com/ai.md

- https://react-spectrum.adobe.com/mcp

- https://react-spectrum.adobe.com/llms.txt

- https://react-spectrum.adobe.com/.well-known/skills/index.json

- https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/SKILL.md

- https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/references/guides/figma-to-s2.md

- https://react-spectrum.adobe.com/.well-known/skills/spectrum-audit/SKILL.md

- https://react-spectrum.adobe.com/.well-known/skills/spectrum-audit/references/scoring-rubric.md

- https://react-spectrum.adobe.com/.well-known/skills/spectrum-audit/references/checks/03-styling.md

- https://react-spectrum.adobe.com/.well-known/skills/migrate-react-spectrum-v3-to-s2/SKILL.md

- https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/mcp/s2/src/index.ts

- https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/mcp/shared/src/server.ts

- https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/s2-docs/scripts/generateAgentSkills.mjs

- https://raw.githubusercontent.com/adobe/react-spectrum/main/packages/dev/s2-docs/scripts/generateMcpb.mjs

- https://raw.githubusercontent.com/adobe/react-spectrum/main/.claude/settings.json

---

Generated 2026-07-28T05:02:05Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
