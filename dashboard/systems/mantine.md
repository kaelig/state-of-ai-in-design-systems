---
title: "Mantine — AI affordances"
description: "Mantine is one of the few open-source React component libraries that ships a first-party, versioned AI surface: an official @mantine/mcp-server npm package released in…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/mantine"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/mantine.json"
id: "mantine"
category: "component-library"
ai_maturity: "invested"
affordance_count: 9
technique_count: 7
data_collected: "2026-07-26/27"
generated: "2026-07-28T03:49:42Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Mantine — AI affordances

Mantine (mantinedev, maintained by Vitaly Rtishchev) · component-library · MIT · AI maturity: **invested** (official MCP, skills or rules with real engineering behind them). 9 affordances, 7 coercion techniques.

- Docs: https://mantine.dev
- Repo: https://github.com/mantinedev/mantine
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/mantine.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/mantine

## Summary

Mantine is one of the few open-source React component libraries that ships a first-party, versioned AI surface: an official `@mantine/mcp-server` npm package released in lockstep with the library (9.5.0 on 2026-07-27), a machine-readable static MCP data registry at mantine.dev/mcp/index.json, llms.txt plus a 4.2MB llms-full.txt regenerated on every release, and three official Claude Code skills in mantinedev/skills. All of it is emitted by committed build scripts (scripts/llm/compile-llm-doc.ts, compile-mcp-data.ts) from the same MDX and docgen data as the human docs, so it does not rot. The building side is thinner but real: byte-identical AGENTS.md and CLAUDE.md define a mandatory pre-finalize command loop and hand the agent’s own diff to the `codex` CLI for review, plus a .claude/settings.json PostToolUse hook that auto-formats every agent-written file. Coercion is the missing piece: nothing tells an agent “never build your own component” or forces a tool call. Mantine bets on context abundance over behavioral constraint.

## Maintenance

- Actively maintained: yes
- Last release: 9.5.0 — 2026-07-27 (previous: 9.4.2 on 2026-07-21, 9.4.1 on 2026-06-28)
- Activity: Very active. Repo pushed 2026-07-27, ~31.5k stars, MIT. Releases every 1-4 weeks on the 9.x line. The MCP server is versioned in lockstep with the monorepo (@mantine/mcp-server@9.5.0 published to npm at 2026-07-27T08:00Z, ~10 minutes after the GitHub release), so the AI surface ships with every release. The skills repo (mantinedev/skills) is newer and slower: last pushed 2026-02-19, 58 stars.

## AI affordances (9)

### @mantine/mcp-server (official, experimental)

Type: `mcp-server` (MCP server) · Official · Audience: consumers

First-party MCP server published as @mantine/mcp-server, source in the main monorepo at packages/@mantine/mcp-server. Stdio JSON-RPC hand-rolled over node:readline (no MCP SDK dependency). Four tools: list_items, get_item_doc, get_item_props, search_docs. It is a thin HTTP client over static JSON published on mantine.dev, configurable via MANTINE_MCP_DATA_URL (default https://mantine.dev/mcp) and MANTINE_MCP_TIMEOUT_MS (default 10000). Version-locked: 9.5.0 published 2026-07-27, same day as the library release. Docs still label it experimental.

- Docs: https://mantine.dev/guides/llms/

- Code: https://github.com/mantinedev/mantine/tree/master/packages/%40mantine/mcp-server

Notes: Tool descriptions are terse and non-coercive: they describe capability, not obligation. Nothing instructs the agent to call get_item_props before writing JSX.

```typescript
const TOOL_DEFINITIONS = [
  {
    name: 'list_items',
    description:
      'List Mantine documentation items. Supports filtering by kind (component|hook), package and text query.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['component', 'hook'] },
        package: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_item_doc',
    description: 'Get the LLM-ready markdown documentation for a Mantine item by name or id.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        kind: { type: 'string', enum: ['component', 'hook'] },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_item_props',
    description: 'Get normalized props metadata for a Mantine item by name or id.',
  },
  {
    name: 'search_docs',
    description: 'Search Mantine docs by free text query and return ranked matches.',
  },
];
```

Source: https://raw.githubusercontent.com/mantinedev/mantine/master/packages/%40mantine/mcp-server/src/server.ts

### Static MCP data registry — mantine.dev/mcp/index.json

Type: `registry` (Registry) · Official · Audience: consumers

A 129,074-byte machine-readable index of every Mantine component and hook, generated at build time by scripts/llm/compile-mcp-data.ts from MDX plus docgen props data. Each entry carries id, name, kind, package, route, propsCount, an llmUrl pointing at per-item markdown, a componentDataUrl pointing at per-component JSON (source, docs, markdown, full props array with type/default/required/sourceComponent), and a flattened searchText concatenating name, description, package, route and every prop name for cheap ranked search. This is what the MCP server reads, but it is plain HTTP JSON, so any agent or custom tool can consume it without MCP at all.

- Docs: https://mantine.dev/mcp/index.json

- Code: https://github.com/mantinedev/mantine/blob/master/scripts/llm/compile-mcp-data.ts

Notes: Verified live (HTTP 200). /mcp/items.json and /mcp/manifest.json 404; index.json plus /mcp/components/.json is the whole contract.

```json
[
  {
    "id": "core-accordion",
    "name": "Accordion",
    "kind": "component",
    "package": "@mantine/core",
    "route": "/core/accordion",
    "description": "Divide content into collapsible sections",
    "propsCount": 21,
    "llmUrl": "https://mantine.dev/llms/core-accordion.md",
    "componentDataUrl": "/mcp/components/core-accordion.json",
    "searchText": "accordion divide content into collapsible sections @mantine/core /core/accordion chevron chevroniconsize chevronposition chevronsize defaultvalue disablechevronrotation disablecollapse keepmounted keepmountedmode loop multiple onchange order radius transitionduration value value chevron children disabled icon"
  },
  {
    "id": "core-action-icon",
    "name": "ActionIcon",
    "kind": "component",
    "package": "@mantine/core",
    "route": "/core/action-icon",
    "description": "Icon button",
    "propsCount": 12,
```

Source: https://mantine.dev/mcp/index.json

### llms.txt + llms-full.txt (regenerated every release)

Type: `llms-txt` (llms.txt) · Official · Audience: consumers

Both live and measured: https://mantine.dev/llms.txt (43,113 bytes, a curated llmstxt.org-standard index linking to standalone .md files under /llms/) and https://mantine.dev/llms-full.txt (4,201,406 bytes, the whole corpus in one file; the docs still claim ~1.8MB, so it has more than doubled). The index is FAQ-first: the top of llms.txt is dozens of question-shaped entries harvested from help.mantine.dev, which functions as pre-emptive misconception correction. Generated by scripts/llm/compile-llm-doc.ts from MDX, props tables, demos and Styles API docs; regenerated with each release.

- Docs: https://mantine.dev/llms.txt

- Code: https://github.com/mantinedev/mantine/blob/master/scripts/llm/compile-llm-doc.ts

Notes: The FAQ-as-negative-space design is the most interesting part. Entries like q-third-party-styles.md and q-private-css-variables.md exist specifically to stop agents suggesting patterns Mantine does not support.

```markdown
# Mantine UI - LLM Documentation

This index lists Mantine documentation pages formatted for LLMs.
Each link points to a standalone Markdown file under the /llms path.

For a single consolidated file with all content, use:
- https://mantine.dev/llms-full.txt

## FAQ

- [Are Mantine components accessible?](https://mantine.dev/llms/q-are-mantine-components-accessible.md): Learn about Mantine components accessibility features
- [Can I use Mantine components as server components?](https://mantine.dev/llms/q-server-components.md): Learn about use client directive and server components usage
- [Can I use Mantine with Astro?](https://mantine.dev/llms/q-can-i-use-mantine-with-astro.md): No, Astro does not support React context
- [Can I use Mantine with Emotion/styled-components/tailwindcss?](https://mantine.dev/llms/q-third-party-styles.md): Learn about limitations of third-party styles
- [Can I use Mantine with Vue/Svelte/Angular/etc.?](https://mantine.dev/llms/q-vue-svelte-angular.md): No, Mantine is a React library and does not support other frameworks/libraries
- [Can I use private CSS variables to style components?](https://mantine.dev/llms/q-private-css-variables.md): No, it is not safe and will not work with future versions of Mantine.
```

Source: https://mantine.dev/llms.txt

### mantinedev/skills — three official Claude Code skills

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

A dedicated official repo (MIT, 58 stars, last pushed 2026-02-19) with three skills, each structured SKILL.md + references/api.md + references/patterns.md: mantine-combobox (custom select/autocomplete/multiselect on Combobox primitives), mantine-form (@mantine/form, validation, nested/array fields, form context), mantine-custom-components (factory/polymorphicFactory/genericFactory, Styles API, createVarsResolver, Component.extend()). Installed via `npx skills add https://github.com/mantinedev/skills --skill `. The README claims cross-agent compatibility via skills.sh, not Claude-only. patterns.md files are substantial (279/310/431 lines) and act as few-shot exemplar banks.

- Docs: https://mantine.dev/guides/llms/

- Code: https://github.com/mantinedev/skills

Notes: mantine-custom-components is the strategically interesting one: it exists for the moment an agent needs a component Mantine does not ship, and channels that into Mantine’s own factory/Styles API rather than a hand-rolled div. Coercion by paved road rather than prohibition.

```yaml
---
name: mantine-custom-components
description: >
  Build custom components that integrate with Mantine's theming, Styles API, and core features.
  Use this skill when: (1) creating a new component using factory(), polymorphicFactory(), or
  genericFactory(), (2) adding Styles API support (classNames, styles, vars, unstyled), (3)
  implementing CSS variables via createVarsResolver, (4) building compound components with
  sub-components and shared context, (5) registering a component with MantineProvider via
  Component.extend(), or (6) any task involving Factory, useProps, useStyles, BoxProps,
  StylesApiProps, or ElementProps in @mantine/core.
---
```

Source: https://raw.githubusercontent.com/mantinedev/skills/HEAD/skills/mantine-custom-components/SKILL.md

### “Mantine with LLMs” guide (mantine.dev/guides/llms/)

Type: `ai-docs-page` (AI docs page) · Official · Audience: consumers

The single consolidated AI page: llms.txt/llms-full.txt, per-tool setup for Cursor (@Docs), Windsurf (.windsurfrules), ChatGPT/Claude and GitHub Copilot, skills install commands with example $skill-name prompts, and copy-paste mcpServers JSON for Claude Desktop / Cursor / Windsurf / VS Code+Cline. Also documents how the LLM docs are generated and that they are regenerated per release.

- Docs: https://mantine.dev/guides/llms/

- Code: https://github.com/mantinedev/mantine/blob/master/apps/mantine.dev/src/pages/guides/llms.mdx

Notes: Staleness tell: still tells users to say “you’re using Mantine v8” while the library is at 9.5.0, and still calls the MCP server experimental.

```markdown
### Use skills

In your AI prompt, explicitly tell the agent to use one of the installed skills.

Examples:

- "Use `$mantine-form` and build a profile form with validation and nested fields"
- "Use `$mantine-combobox` and create a searchable multi-select with custom option rendering"
- "Use `$mantine-custom-components` and scaffold a polymorphic component with Styles API support"

If your agent does not support `$skill-name` mentions, reference the skill name in plain text and ask the agent to follow it.

## MCP server (experimental)

Mantine also provides an MCP server package:

- `@mantine/mcp-server`

The server reads Mantine static MCP data published on `mantine.dev` and exposes tools that AI agents can call directly:

- `list_items`
- `get_item_doc`
- `get_item_props`
- `search_docs`
```

Source: https://raw.githubusercontent.com/mantinedev/mantine/master/apps/mantine.dev/src/pages/guides/llms.mdx

### AGENTS.md / CLAUDE.md (byte-identical duplicates)

Type: `agents-md` (AGENTS.md) · Official · Audience: builders

Root-level contributor-facing agent instructions, duplicated verbatim as CLAUDE.md. The two files are identical, no Claude-specific delta, and both open with an empty `## Links` heading (an unfilled template section). Three parts: a mandatory pre-finalize command loop (typecheck, oxlint on changed files, format, build, targeted jest, conditional stylelint, conditional syncpack); a code-style rule banning inline implementation comments while mandating JSDoc preservation on public APIs; and the `[area] Title: Message` monorepo commit convention with four worked examples. The standout is the agent-delegates-to-agent step at the end.

- Code: https://github.com/mantinedev/mantine/blob/master/AGENTS.md

Notes: No .cursorrules, .cursor/rules/, .github/copilot-instructions.md or .github/instructions/: all probed, all absent. CONTRIBUTING.md has zero AI mentions. GitHub code search for cursorrules/copilot in the repo returns total_count 0.

````markdown
## Finalizing Your Work

Choose these commands to run after finalizing your work:

```bash
# Always run these commands before finalizing your work
npm run typecheck
npx oxlint -c oxlint.config.mjs path/to/changed/files
npm run format:write:files path/to/changed/files
npm run build

# Run tests for specific path related to your changes
npm run jest @mantine/charts
npm run jest path/to/changed/file.test.ts

# Run stylelint only if you have made changes to styles or CSS files
npm run stylelint

# Run this script if you've changed dependencies in any package.json
npm run syncpack
```

After running the commands above, check if `codex` CLI is available (`command -v codex`). If it is, run `/codex-code-review` to get an automated code review of unstaged changes and apply fixes.

## Code Style

**Comments Guidelines:**
- **Do not include inline comments** that describe logic or implementation details unless explicitly requested
- **Always preserve documentation comments** on interfaces, types, and function parameters (JSDoc-style comments with `/** */`)
- The codebase prefers clean, self-documenting code for implementation
- Type definitions and public APIs should maintain their documentation comments
````

Source: https://raw.githubusercontent.com/mantinedev/mantine/master/AGENTS.md

### .claude/settings.json — PostToolUse auto-format hook

Type: `claude-md` (CLAUDE.md) · Official · Audience: builders

The only file in the repo’s .claude/ directory (335 bytes). A deterministic PostToolUse hook matching Write|Edit that pipes tool input through jq to extract .tool_input.file_path and runs `npm run format:write:files` on it, with a 30s timeout and `|| true` so it never blocks. Formatting becomes a property of the harness rather than something the model must remember, a mechanical layer under the AGENTS.md checklist.

- Code: https://github.com/mantinedev/mantine/blob/master/.claude/settings.json

Notes: No agents/, commands/ or skills/ under .claude, just this one hook file.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | { read -r f; npm run format:write:files \"$f\"; } 2>/dev/null || true",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

Source: https://raw.githubusercontent.com/mantinedev/mantine/master/.claude/settings.json

### hakxel/mantine-ui-server (community, stale)

Type: `mcp-server` (MCP server) · Community · Audience: consumers

Community MCP server predating the official one: “MCP server for working with Mantine UI components - provides documentation, generation, and theme utilities.” 16 stars, last pushed 2025-03-30, over a year stale and superseded by @mantine/mcp-server. Still surfaces via mcp.so and mcp.aibase.com aggregators despite being abandoned.

- Code: https://github.com/hakxel/mantine-ui-server

Notes: Include only as evidence of the community-then-official progression; not usable in 2026.

### mantine-mcp (community, projectashik)

Type: `mcp-server` (MCP server) · Community · Audience: consumers

npm package `mantine-mcp` (latest 1.0.2; 1.0.0 and 1.0.2 both published within 20 minutes on 2026-01-23, nothing since): “MCP server for Mantine UI component library - provides AI assistants with tools to explore, search, and get documentation for Mantine components and hooks.” Published about a month before the official @mantine/mcp-server alphas and effectively abandoned after.

- Code: https://www.npmjs.com/package/mantine-mcp

Notes: Namespace-confusion risk: `mantine-mcp` vs the official `@mantine/mcp-server`.

## Coercion techniques (7)

### Version-locked AI surface — the MCP server ships with the release

Category: `registry-metadata` (Registry metadata) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/registry-metadata.md

The strongest thing Mantine does. @mantine/mcp-server lives inside the main monorepo and publishes on the same semver line as @mantine/core: 9.5.0 hit GitHub at 2026-07-27T07:49Z and npm at 2026-07-27T08:00Z, with a `next` tag (9.4.3-alpha.0) for alpha docs. Because llms.txt, llms-full.txt and /mcp/index.json are all emitted by committed build scripts from the same MDX and docgen props data that produce the human docs, the AI context cannot drift from the library, the classic failure mode of hand-written llms.txt. The docs state it outright: “llms.txt documentation is updated with every Mantine release.”

```typescript
interface IndexItem {
  id: string;
  name: string;
  kind: 'component' | 'hook';
  package: string;
  route: string;
  description: string;
  propsCount: number;
  llmUrl: string;
  componentDataUrl: string;
  searchText: string;
}

interface ComponentData extends Omit<IndexItem, 'componentDataUrl'> {
  source?: string;
  docs?: string;
  markdown: string;
  props: Array<{
    name: string;
    description?: string;
    required?: boolean;
    defaultValue?: unknown;
    type?: unknown;
    sourceComponent: string;
  }>;
```

Source: https://raw.githubusercontent.com/mantinedev/mantine/master/scripts/llm/compile-mcp-data.ts

### FAQ-as-prohibition: negative answers hoisted to the top of llms.txt

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

Instead of writing rules about what agents must not do, Mantine front-loads llms.txt with a large FAQ block (sourced from help.mantine.dev) whose entries are literally refusals. The verdict sits in the link description, so a model that only reads the index and never fetches the linked .md still absorbs the constraint: “No, Astro does not support React context”; “No, Mantine is a React library and does not support other frameworks/libraries”; “No, it is not safe and will not work with future versions of Mantine” (private CSS variables); “Nested styles are supported only in CSS files”; “SegmentedControl cannot be used without a value”. Prohibition smuggled into an index of URLs, targeting exactly the hallucinations LLMs make about Mantine.

```markdown
- [Can I use Mantine with Astro?](https://mantine.dev/llms/q-can-i-use-mantine-with-astro.md): No, Astro does not support React context
- [Can I use Mantine with Vue/Svelte/Angular/etc.?](https://mantine.dev/llms/q-vue-svelte-angular.md): No, Mantine is a React library and does not support other frameworks/libraries
- [Can I use nested inline styles with Mantine components?](https://mantine.dev/llms/q-nested-inline-styles.md): Nested styles are supported only in CSS files
- [Can I use private CSS variables to style components?](https://mantine.dev/llms/q-private-css-variables.md): No, it is not safe and will not work with future versions of Mantine.
- [Can I use SegmentedControl with empty value?](https://mantine.dev/llms/q-segmented-control-no-value.md): SegmentedControl cannot be used without a value
- [Can I use Mantine with Emotion/styled-components/tailwindcss?](https://mantine.dev/llms/q-third-party-styles.md): Learn about limitations of third-party styles
```

Source: https://mantine.dev/llms.txt

### Paved-road escape hatch: a skill for “I need a component Mantine doesn’t have”

Category: `scaffolding` (Scaffolding) · all 7 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md

The moment an agent decides Mantine lacks a component is the moment it goes off-system. Rather than forbidding that, Mantine ships mantine-custom-components, a skill that intercepts exactly that intent and hands over a complete factory() template wiring Box, useProps, useStyles, createVarsResolver, StylesApiProps, ElementProps, displayName and Component.classes, so a “custom” component is still theme-aware, Styles-API-addressable and registerable via MantineProvider. It embeds a decision table (factory vs polymorphicFactory vs genericFactory) with one of the few directive constraints anywhere in Mantine’s AI surface: “Use polymorphicFactory sparingly — it adds TypeScript overhead and slows IDE autocomplete.”

````tsx
const varsResolver = createVarsResolver<MyComponentFactory>((_theme, { radius }) => ({
  root: { '--my-radius': getRadius(radius) },
}));

export const MyComponent = factory<MyComponentFactory>((_props) => {
  const props = useProps('MyComponent', defaultProps, _props);
  const { classNames, className, style, styles, unstyled, vars, attributes, radius, ...others } = props;

  const getStyles = useStyles<MyComponentFactory>({
    name: 'MyComponent', classes, props,
    className, style, classNames, styles, unstyled, vars, attributes, varsResolver,
  });

  return <Box {...getStyles('root')} {...others} />;
});

MyComponent.displayName = '@mantine/core/MyComponent';
MyComponent.classes = classes;
```

## Factory variant — which to use

| Scenario | Factory function | Type |
|---|---|---|
| Standard component | `factory()` | `Factory<{}>` |
| Supports `component` prop (polymorphic) | `polymorphicFactory()` | `PolymorphicFactory<{}>` — add `defaultComponent` and `defaultRef` |
| Props change based on a generic (e.g. `multiple`) | `genericFactory()` | `Factory<{ signature: ... }>` |

Use `polymorphicFactory` sparingly — it adds TypeScript overhead and slows IDE autocomplete.
````

Source: https://raw.githubusercontent.com/mantinedev/skills/HEAD/skills/mantine-custom-components/SKILL.md

### Mandatory verification loop + cross-vendor agent-reviews-agent handoff

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

AGENTS.md/CLAUDE.md gate “done” behind a fixed command sequence (typecheck, oxlint on changed files, format, build, targeted jest, conditional stylelint for CSS changes, conditional syncpack for dependency changes). The unusual part is the tail: the agent must shell out to detect a second AI tool and hand its own uncommitted diff over for review. A Claude session is instructed to route its work through OpenAI’s Codex CLI as reviewer before finalizing. Capability-probed with `command -v`, so it degrades gracefully when absent.

```markdown
After running the commands above, check if `codex` CLI is available (`command -v codex`). If it is, run `/codex-code-review` to get an automated code review of unstaged changes and apply fixes.
```

Source: https://raw.githubusercontent.com/mantinedev/mantine/master/AGENTS.md

### Harness-level enforcement: formatting as a hook, not an instruction

Category: `token-enforcement` (Token enforcement) · all 13 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md

Rather than trusting the model to run the formatter, .claude/settings.json makes it automatic: every Write or Edit fires a shell hook that extracts the touched file path and runs `npm run format:write:files` on it. Scoped (only the changed file), bounded (30s timeout) and non-blocking (`2>/dev/null || true`) so a formatter failure never derails the session. Combined with the AGENTS.md checklist this is belt-and-braces: the deterministic layer handles what must never be forgotten, the prose layer handles what needs judgement.

```json
"PostToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "jq -r '.tool_input.file_path' | { read -r f; npm run format:write:files \"$f\"; } 2>/dev/null || true",
        "timeout": 30
      }
    ]
  }
]
```

Source: https://raw.githubusercontent.com/mantinedev/mantine/master/.claude/settings.json

### Progressive disclosure in skills: SKILL.md then references/api.md + references/patterns.md

Category: `exemplars` (Exemplars) · all 10 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md

Every Mantine skill uses the same three-file shape: a short SKILL.md whose YAML description is trigger-heavy (enumerated “Use this skill when: (1)...(6)” clauses naming exact API symbols (useCombobox, Combobox.Target, getInputProps, insertListItem, createVarsResolver), so the skill matcher fires on symbol names appearing in the prompt or the open file), a compact core workflow in the body, and two deep reference files loaded on demand (patterns.md runs 279/310/431 lines across the three skills). Always-on token cost stays tiny while a large exemplar bank sits one file-read away, and each SKILL.md ends with a pointer table telling the agent what each reference contains so it knows when the read is worth paying for.

```markdown
## References

- **[`references/api.md`](references/api.md)** — Full API: `useCombobox` options and store, all sub-component props, CSS variables, Styles API selectors
- **[`references/patterns.md`](references/patterns.md)** — Code examples: searchable select, multi-select with pills, groups, custom rendering, clear button, form integration
```

Source: https://raw.githubusercontent.com/mantinedev/skills/HEAD/skills/mantine-combobox/SKILL.md

### Redirectable context source (MANTINE_MCP_DATA_URL)

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

The MCP server hard-codes nothing: MANTINE_MCP_DATA_URL (default https://mantine.dev/mcp) and MANTINE_MCP_TIMEOUT_MS let a team repoint the agent’s entire knowledge base, whether at alpha.mantine.dev for pre-release work, at local static files for offline or air-gapped use, or, most interestingly for enterprise design systems, at a fork’s own generated /mcp data. Since the format is just index.json plus per-component JSON produced by a committed script, a company wrapping Mantine can regenerate that payload for their own component set and the official server becomes their server. Documented on the public guide, not just the README.

```json
{
  "mcpServers": {
    "mantine": {
      "command": "npx",
      "args": ["-y", "@mantine/mcp-server"],
      "env": {
        "MANTINE_MCP_DATA_URL": "https://mantine.dev/mcp"
      }
    }
  }
}
```

Source: https://raw.githubusercontent.com/mantinedev/mantine/master/apps/mantine.dev/src/pages/guides/llms.mdx

## Platform integrations (3)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

NO official Figma library. Mantine has never shipped a first-party Figma kit; the maintainers’ position surfaces in mantinedev discussions #382 and #5053. The de-facto standard is Pretine 7 (community, by the RAVN team), a free Figma Community UI kit tracking Mantine 7 with variables for colors/borders/spacing/shadows and light/dark modes; other community files include “Mantine UI Design System v5.10” and “Mantine UI Component Library”. All are community-maintained and lag the 9.x library. Consequently there is NO Figma Code Connect coverage and no Dev Mode MCP mapping for Mantine. The design-to-code AI path is entirely unserved.

Link: https://www.figma.com/community/file/1293978471602433537/pretine-7-the-ultimate-free-ui-kit-for-mantine

### Storybook (addon-mcp, manifests, AI docs)

Storybook is internal-only. The monorepo has a .storybook/ directory for maintainer development, but there is no public Storybook deployment (storybook.mantine.dev does not resolve) and no Storybook-based AI affordance: no addon-docs MCP, no story-derived agent registry. The docs site mantine.dev is the canonical surface, and it is that site, not Storybook, that generates llms.txt and the /mcp data.

Link: https://github.com/mantinedev/mantine/tree/master/.storybook

### other

ui.mantine.dev (Mantine UI, free copy-paste blocks) is live but has NO agent-facing surface: /llms.txt, /registry.json and /r/index.json all return 404. There is no shadcn-style CLI registry for pulling Mantine blocks into a project via an agent. Also confirmed absent: Supernova, Knapsack and zeroheight, with no evidence of any of the three.

Link: https://ui.mantine.dev

## Building the system vs. consuming it

### For consumers (agents building UIs with Mantine)

Well-served and unusually well-plumbed for an OSS component library. An agent building product UI with Mantine can (a) read llms.txt, the per-page .md files, or the 4.2MB llms-full.txt, (b) call four MCP tools via the official version-locked @mantine/mcp-server, (c) hit the raw /mcp/index.json registry with no MCP client at all, or (d) load one of three official Claude Code skills carrying roughly a thousand lines of curated exemplars. All of it is build-generated from the same source as the human docs, so it does not rot. What is deliberately absent is any hard fence: no MCP tool is mandatory, there is no “never write your own Button” rule, no linter or validation loop is imposed on consumers, and there are no distributed editor rule files, no shipped .cursorrules template, no ‘Add to Cursor’ button. The guide simply tells you to paste a URL into @Docs or .windsurfrules. Mantine’s bet is context abundance over behavioral constraint.

### For builders (the Mantine team using AI on the system itself)

Thinner but genuinely mechanical, and clearly written by someone who has actually run agents on this repo. AGENTS.md and CLAUDE.md are byte-identical (one source duplicated for two ecosystems, with an unfilled `## Links` heading at the top of both) and encode a monorepo-aware pre-finalize command loop, a comment-style rule, and the `[area] Title: Message` commit convention with worked examples. Two things stand out: the .claude/settings.json PostToolUse hook that auto-formats every agent-written file, moving enforcement out of prose and into the harness; and the instruction to probe for the `codex` CLI and hand unstaged changes to `/codex-code-review`, a cross-vendor agent-reviews-agent handoff. Beyond that, nothing: no .cursorrules, no .cursor/rules/, no copilot-instructions.md, no .claude/commands or agents, no AI bots in the two GitHub workflows (npm_test, publish), no AI-assisted codemod tooling (there is no codemods package at all in 9.x), and CONTRIBUTING.md never mentions AI. Agent contributions get formatted and reviewed, but are not otherwise governed.

## Gaps

Confirmed absences (probed, not assumed): mantine.dev/ai, /docs/mcp and /getting-started/ai all 404; the only AI page is /guides/llms/. No .cursorrules, .cursor/rules/, .github/copilot-instructions.md or .github/instructions/ in the repo (GitHub code search for cursorrules/copilot in mantinedev/mantine returns total_count 0). .claude/ contains exactly one file, settings.json: no commands, agents or skills. CONTRIBUTING.md has zero AI/LLM/agent/codex mentions. No AI bots or AI steps in .github/workflows (only npm_test.yml and publish.yml). No codemods package in the 9.x tree, so no AI-assisted migration tooling; version migrations are prose-only. No Figma Code Connect, no Dev Mode MCP, no official Figma library. No public Storybook. ui.mantine.dev has no llms.txt or agent registry. No ‘Add to Cursor’/‘Add to Claude’ one-click buttons anywhere. Not established: whether the `/codex-code-review` slash command is defined anywhere in-repo. There is no .codex/ or prompts directory, so it may be a maintainer-local command, which would make that AGENTS.md line a dangling reference for outside contributors. Staleness tells: the LLM guide still says llms-full.txt is ~1.8MB (measured 4,201,406 bytes) and still tells users to say “I’m using Mantine v8” while the library is at 9.5.0; the MCP server is still labelled experimental; mantinedev/skills has not been touched since 2026-02-19 while the library has shipped several minors since. Excluded because it could not be confirmed: an `@agentience/react-design-systems-mcp` npm package surfaced in search claiming multi-design-system support including Mantine. This study did not verify its contents or currency.

## Sources (15)

- https://mantine.dev/llms.txt

- https://mantine.dev/llms-full.txt

- https://mantine.dev/mcp/index.json

- https://mantine.dev/guides/llms/

- https://raw.githubusercontent.com/mantinedev/mantine/master/apps/mantine.dev/src/pages/guides/llms.mdx

- https://raw.githubusercontent.com/mantinedev/mantine/master/AGENTS.md

- https://raw.githubusercontent.com/mantinedev/mantine/master/CLAUDE.md

- https://raw.githubusercontent.com/mantinedev/mantine/master/.claude/settings.json

- https://raw.githubusercontent.com/mantinedev/mantine/master/packages/%40mantine/mcp-server/src/server.ts

- https://raw.githubusercontent.com/mantinedev/mantine/master/packages/%40mantine/mcp-server/README.md

- https://raw.githubusercontent.com/mantinedev/mantine/master/scripts/llm/compile-mcp-data.ts

- https://github.com/mantinedev/skills

- https://raw.githubusercontent.com/mantinedev/skills/HEAD/skills/mantine-custom-components/SKILL.md

- https://raw.githubusercontent.com/mantinedev/skills/HEAD/skills/mantine-combobox/SKILL.md

- https://registry.npmjs.org/@mantine%2Fmcp-server

---

Generated 2026-07-28T03:49:42Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
