---
title: "Registry metadata — 9 techniques"
description: "Machine-readable registries describing components, dependencies and files, so agents resolve real artifacts instead of inventing them."
url: "https://state-of-ai-in-design-systems.netlify.app/techniques/registry-metadata.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/techniques/registry-metadata.md"
type: "technique-category"
id: "registry-metadata"
technique_count: 9
system_count: 9
data_collected: "2026-07-26/27"
generated: "2026-07-28T04:35:23Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/techniques/registry-metadata.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Registry metadata

9 of the 148 techniques in this study, across 9 of the 19 design systems. Read when publishing machine-readable component metadata.

Machine-readable registries describing components, dependencies and files, so agents resolve real artifacts instead of inventing them.

Systems represented here: [Ant Design](https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md), [Carbon Design System](https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md), [Cloudscape Design System](https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md), [Microsoft Fluent UI](https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md), [HeroUI](https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md), [Mantine](https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md), [Material UI (MUI)](https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md), [Nuxt UI](https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md), [Primer](https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md)

## Version-pinned knowledge (55+ per-minor offline snapshots)

Ant Design · full record: https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md

The CLI/MCP ships pinned JSON snapshots for v3.26.20, v4.0.4 through v4.24.16, v5.0.7 through v5.29.x and v6.x (visible as `data/v*.json` in ant-design-cli). Every command and MCP tool accepts `--version`, and Key Rule 2 requires matching the project’s installed antd. This removes the classic failure mode where a model answers with v5 APIs for a v4 codebase, and makes `antd changelog 4.24.0 5.0.0 Select` a first-class agent tool for diffing an API surface across versions.

```json
{
  "mcpServers": {
    "antd": {
      "command": "npx",
      "args": ["-y", "@ant-design/cli", "mcp", "--version", "5.20.0"]
    }
  }
}
```

Source: https://ant.design/docs/react/mcp.md

## Capability Matrix as machine-readable routing table (with named failure modes)

Carbon Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md

A table that maps intent → tool → must-have filters → expected result fields → ‘Common failure mode’. The failure-mode column is the unusual part: it pre-diagnoses the specific way each query goes wrong (e.g. omitting “ai chat” from query text bypasses index routing entirely). Paired with a ‘Discover → Canonicalize → Target’ three-stage query protocol and numbered Performance Rules that pin exact `size` values per tool.

```markdown
## Core Protocol: Discover → Canonicalize → Target

All queries follow three stages:

1. **Discover** — 1–2 broad queries to identify the correct `component_id`
2. **Canonicalize** — confirm the ID with alias handling and UIShell taxonomy cues
3. **Target** — 1–2 focused queries with `component_id`, `component_type`, and filters

## Performance Rules

1. Use `size: 2` for `code_search` component and icon queries; `size: 3` for `docs_search`; `size: 15` for AI Chat full examples; `size: 1` for `requery_hint` follow-up calls
2. Always enforce `filters.component_type` (except for icons/pictograms)
3. Set `filters.component_id` only after discovery — never guess; verify the returned `component_id` matches exactly
4. When a variant has `example_omitted: true`, use `requery_hint` to fetch it — do NOT increase `size`
9. The server strips search-index artifacts before returning responses — do not look for `search_blob`, `component_aliases_text`, `props_schema`, or other internal fields
```

Source: https://carbondesignsystem.com/developing/carbon-mcp/files/carbon-builder.zip

## Auto-refresh pipeline: docs deploy → MCP re-extraction

HeroUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md

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

## Standards-based machine discovery (server card + api-catalog + content negotiation)

Nuxt UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md

Rather than relying on a human pasting a URL, the docs site is discoverable end-to-end by a crawler or agent: RFC 9727 api-catalog linkset → MCP server-card.json (full tool/resource/prompt inventory with auth status) → llms.txt → per-page markdown via `Accept: text/markdown` or an `.md` suffix, with `Vary: Accept, User-Agent` so agent and human responses cache separately. sitemap.md states the affordance in plain language for models that land on it.

```json
{"$schema":"https://modelcontextprotocol.io/schema/server-card/v1","serverInfo":{"name":"Nuxt UI","version":"4.10.0","title":"Nuxt UI MCP Server","description":"MCP server providing tools, resources and prompts to help AI agents build with Nuxt UI — search components and composables, retrieve documentation, fetch component metadata, and list starter templates.","homepage":"https://ui.nuxt.com","documentation":"https://ui.nuxt.com/docs/getting-started/ai/mcp","license":"MIT","repository":"https://github.com/nuxt/ui"},"endpoints":[{"type":"streamable-http","url":"https://ui.nuxt.com/mcp"}],"capabilities":{"tools":{"listChanged":false},"resources":{"listChanged":false,"subscribe":false},"prompts":{"listChanged":false},"logging":{}}
```

Source: https://ui.nuxt.com/.well-known/mcp/server-card.json

## Rule IDs with ADR authority citations

Primer · full record: https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md

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

## Constraint smuggled into the API schema itself

Cloudscape Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md

Design-system prohibitions are embedded in the generated JSON prop descriptions, so a model reading the machine-readable contract also reads the rule. The Alert `action` region description tells the agent that although any content is technically allowed, only a button is permitted, a UX guideline enforced through the type registry rather than a separate rules file.

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

## Version-locked AI surface — the MCP server ships with the release

Mantine · full record: https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md

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

## Version-fencing the skill so the agent self-invalidates on the wrong major

Material UI (MUI) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md

Every skill carries a machine-readable semver range in metadata.json AND a prose version notice at the top of AGENTS.md instructing the agent to verify API details if the project is on a different major. Combined with the MCP’s `muiPairing` codegen argument, this is MUI’s answer to the biggest failure mode for a 10-year-old library: models confidently emitting v4/v5-era APIs into a v9 codebase.

```markdown
# Material UI styling

Version 1.0.0 (Material UI v9)

> **Version notice:** This skill targets Material UI v9 (`>=9.0.0 <10.0.0`). If you are using a different major version, verify the API details before following this guidance.

> Note: This document is for agents and LLMs maintaining or generating Material UI code. It follows [How to customize](https://mui.com/material-ui/customization/how-to-customize.md) and related sources in this repository (`docs/data/material/customization/`, `docs/data/system/`).
```

Source: https://raw.githubusercontent.com/mui/material-ui/HEAD/skills/material-ui-styling/AGENTS.md

## PR-type classification table that scopes which rules apply

Microsoft Fluent UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md

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

All categories: https://state-of-ai-in-design-systems.netlify.app/techniques.md

---

Generated 2026-07-28T04:35:23Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
