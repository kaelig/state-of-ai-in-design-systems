---
title: "Storybook (addon-mcp, manifests, AI docs) — AI capabilities"
description: "Storybook 10 turned the component workshop into an agent-readable API. The pieces: (1) MANIFESTS — /manifests/components.json and /manifests/docs.json, auto-generated…"
url: "https://state-of-ai-in-design-systems.netlify.app/platforms/storybook.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/platforms#storybook"
type: "platform-record"
json: "https://state-of-ai-in-design-systems.netlify.app/platforms/storybook.json"
id: "storybook"
capability_count: 8
design_systems_with_integration_records: 14
data_collected: "2026-07-26/27"
generated: "2026-07-27T21:55:33Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/platforms/storybook.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Storybook (addon-mcp, manifests, AI docs) — AI capabilities

8 capabilities recorded. 14 of the 19 design systems in this study carry an integration record for this platform.

- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/platforms/storybook.json
- Platforms view: https://state-of-ai-in-design-systems.netlify.app/platforms.md

## Summary

Storybook 10 turned the component workshop into an agent-readable API. The pieces: (1) MANIFESTS — `/manifests/components.json` and `/manifests/docs.json`, auto-generated from static analysis of CSF files plus react-docgen prop extraction, containing per-component name, description, path, import statement, props with JSDoc descriptions, and per-story rendered snippets. Manifests evaluate the *final rendered story* with args/decorators applied, so an agent sees real usage, not abstractions. (2) MCP SERVER — `npx storybook add @storybook/addon-mcp` serves an MCP endpoint at http://localhost:6006/mcp with three toolsets: `docs` (list-all-documentation, get-documentation, get-documentation-for-story), `dev` (get-changed-stories, get-storybook-story-instructions, preview-stories — the last renders story previews inline via MCP Apps), and `test` (run-story-tests, which returns a11y results and ‘instructs the agent to interpret the results and resolve any issues found’, creating an explicit ‘self-healing loop’). Toolsets are individually togglable in .storybook/main.ts. (3) COMPOSITION — a composed Storybook’s manifests are automatically merged into MCP responses, so one endpoint can front a multi-repo design system. (4) SHARING — Chromatic auto-publishes the docs toolset at `https://main--.chromatic.com/mcp` (private if the Storybook is private); or self-host with the `@storybook/mcp` tmcp-based library (Node 20+, needs components.json). (5) DOCS-AS-CONTEXT — storybook.js.org serves llms.txt and llms-full.txt, and any docs URL accepts a `.md` suffix with `?renderer=`, `?language=`, `?codeOnly=true`, and `?version=` query params. CONSTRAINTS: the addon/manifests are in ‘preview’ and ‘the API may change’; the docs toolset is React-only today (Vue, Angular, Web Components, Svelte planned) because manifest generation is React-only; the manifest schema is explicitly ‘not yet stable and should not be considered a public API’. Chromatic publishing requires Storybook 10.3+. Dev and test toolsets only work against a locally running Storybook — they cannot be published.

## Capabilities (8)

### @storybook/addon-mcp — install, wire to agent, and the recommended anti-hallucination AGENTS.md

Audience: consumers

OFFICIAL. Three-step setup. Step 3 is the interesting one: Storybook publishes a ready-made AGENTS.md/CLAUDE.md block whose entire purpose is to stop the model inventing props on design-system components — it forces an MCP round-trip before any component use, forbids inferring props from naming conventions, tells the agent to escalate to the human rather than guess, and closes the loop with a mandatory test run.

Link: https://storybook.js.org/docs/ai/mcp/overview

````markdown
npx storybook add @storybook/addon-mcp
npx mcp-add --type http --url "http://localhost:6006/mcp" --scope project

```md title="AGENTS.md"
When working on UI components, always use the `your-project-sb-mcp` MCP tools to access Storybook's component and documentation knowledge before answering or taking any action.

- **CRITICAL: Never hallucinate component properties!** Before using ANY property on a component from a design system (including common-sounding ones like `shadow`, etc.), you MUST use the MCP tools to check if the property is actually documented for that component.
- Query `list-all-documentation` to get a list of all components
- Query `get-documentation` for that component to see all available properties and examples
- Only use properties that are explicitly documented or shown in example stories
- If a property isn't documented, do not assume properties based on naming conventions or common patterns from other libraries. Check back with the user in these cases.
- Use the `get-storybook-story-instructions` tool to fetch the latest instructions for creating or updating stories. This will ensure you follow current conventions and recommendations.
- Check your work by running `run-story-tests`.

Remember: A story name might not reflect the property name correctly, so always verify properties through documentation or example stories before using them.
```
````

Source: https://storybook.js.org/docs/ai/mcp/overview.md

### Toolset configuration in .storybook/main.ts

Audience: builders

OFFICIAL. The DS team decides what the agent is allowed to do. `toolsets: { dev, docs, test }`, all `true` by default. Common pattern for a published/library Storybook is to disable `dev` (story authoring) and keep `docs`. Khan Academy’s Wonder Blocks, for example, enables `dev: true, docs: true` and omits `test`.

Link: https://storybook.js.org/docs/ai/mcp/api

```ts
// .storybook/main.ts — CSF 3
// Replace your-framework with the framework you are using (e.g., react-vite, vue3-vite, angular, etc.)

const config: StorybookConfig = {
  framework: '@storybook/your-framework',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    // ... your existing addons
    {
      name: '@storybook/addon-mcp',
      options: {
        toolsets: {
          dev: false,
        },
      },
    },
  ],
};

export default config;
```

Source: https://storybook.js.org/docs/ai/mcp/api.md

### Manifests — /manifests/components.json as a machine-readable component registry

Audience: both

OFFICIAL. The context substrate under the MCP server. Generated from CSF static analysis + react-docgen (react-docgen-typescript recommended for richer props). Each entry carries the exact `import` line, a description, JSDoc tags, per-story rendered `snippet`s, and full prop types with descriptions — i.e. a curated few-shot exemplar set per component. Raw JSON is fetchable at http://localhost:6006/manifests/components.json or /manifests/components.json in a built Storybook, and `subcomponents` are included when a story file declares them. Schema is explicitly not a stable public API while in preview.

Link: https://storybook.js.org/docs/ai/manifests

```json
{
  "components": {
    "components-button": {
      "id": "components-button",
      "name": "Button",
      "path": "./src/components/Button/Button.stories.tsx",
      "stories": [
        {
          "id": "components-button--default",
          "name": "Default",
          "snippet": "const Default = () => <Button>Button</Button>;"
        },
        {
          "id": "components-button--disabled",
          "name": "Disabled",
          "snippet": "const Disabled = () => <Button disabled>Button</Button>;"
        }
      ],
      "import": "import { Button } from \"@mealdrop/ui\";",
      "jsDocTags": {},
      "description": "Primary UI component for user interaction",
      "reactDocgen": {
        "props": {
          "large": {
            "required": false,
            "tsType": { "name": "boolean" },
            "description": "Is the button large?",
            "defaultValue": { "value": "false", "computed": false }
          }
        }
      }
    }
  }
}
```

Source: https://storybook.js.org/docs/ai/manifests.md

### Docs toolset — list-all-documentation / get-documentation / get-documentation-for-story

Audience: consumers

OFFICIAL. The consumption path that keeps an agent on-system. `list-all-documentation` returns the component index; `get-documentation` returns props, the first three stories, an index of the rest, and any extra docs; `get-documentation-for-story` is the escalation when the summary isn’t enough. This is the only toolset that can be published remotely. Storybook’s stated goal: 'Agents will be equipped to reuse your existing components and follow your documented usage guidelines when generating UI, helping ensure the generated UI is consistent with your existing design system.'

Link: https://storybook.js.org/docs/ai/mcp/overview

### Test toolset — run-story-tests as a linter loop the agent must run

Audience: consumers

OFFICIAL. `run-story-tests` runs component and interaction tests plus axe accessibility checks and, per the docs, ‘Also instructs the agent to interpret the results and resolve any issues found.’ Storybook documents the resulting workflow explicitly as a self-healing loop: the agent finds the submit button fails color contrast, uses the docs toolset to look up documented theme colors, fixes it, and re-runs — ‘without requiring you to intervene.’ This is the closest thing in the ecosystem to a design-system conformance gate an agent is obliged to pass.

Link: https://storybook.js.org/docs/ai/mcp/overview

```markdown
If you have Storybook Test set up in your Storybook, the testing toolset provides tools that allow the agent to run component tests (including accessibility checks, if set up) and interpret their results. It also includes instructions to resolve issues. As the agent develops, it can choose to run tests to validate its work. If it finds issues, it can fix them and re-run the tests to confirm they are resolved. This creates a _self-healing_ loop that helps ensure the quality of the generated UI, without requiring you to intervene.

#### `run-story-tests`
Runs tests for specific stories and returns results, including any accessibility issues (if configured). Also instructs the agent to interpret the results and resolve any issues found.
```

Source: https://storybook.js.org/docs/ai/mcp/overview.md

### Sharing: Chromatic auto-publish or self-host with @storybook/mcp

Audience: builders

OFFICIAL. Two distribution models for a design-system team that wants product teams’ agents to consume the system remotely. Chromatic publishes the MCP server alongside every build at the `/mcp` route (recommended permalink `https://main--.chromatic.com/mcp`); private Storybook → private MCP server, gated to invited collaborators. Requires Storybook 10.3+ and React. Self-hosting uses the `@storybook/mcp` package (a tmcp-based library, Node 20+, needs components.json and optionally docs.json); reference implementations for a Node process and a Netlify Function live in storybookjs/mcp/apps/self-host-mcp. Only the docs toolset is publishable — dev and test are local-only.

Link: https://storybook.js.org/docs/ai/mcp/sharing

````ts
We provide a package, `@storybook/mcp`, which is a library that creates a `tmcp`-based MCP server exposing Storybook component/docs knowledge from manifests.

### Prerequisites
- Node.js 20+
- A manifest source containing:
  - `components.json` (required)
  - `docs.json` (optional)

This is the minimal implementation of a server using `@storybook/mcp`:

```ts title="server.ts"
const storybookMcpHandler = await createStorybookMcpHandler();

export async function handleRequest(request: Request): Promise<Response> {
  if (new URL(request.url).pathname === '/mcp') {
    return storybookMcpHandler(request);
  }

  return new Response('Not found', { status: 404 });
}
```
````

Source: https://storybook.js.org/docs/ai/mcp/sharing.md

### Best practices: writing stories and JSDoc *for the agent*

Audience: builders

OFFICIAL. Storybook reframes documentation hygiene as context engineering. Stories should demonstrate one concept each — the docs mark a combined ‘SizesAndVariants’ story as ‘❌ Bad - demonstrates too many concepts at once, making it less clear and less useful as a reference for agents’. Component-level JSDoc with an `@summary` tag feeds the manifest description the agent sees, and the recommended pattern includes redirecting the agent to a sibling component for the wrong use case.

Link: https://storybook.js.org/docs/ai/best-practices

```ts
/**
 * Button is used for user interactions that do not navigate to another route.
 * For navigation, use [Link](?path=/docs/link--default) instead.
 *
 * @summary for user interactions that do not navigate to another route
 */
export const Button = // ...

// ✅ Good to demonstrate a specific use case
export const Primary: Story = {
  args: { primary: true },
};

// ❌ Bad - demonstrates too many concepts at once, making
// it less clear and less useful as a reference for agents
export const SizesAndVariants: Story = {
  render: () => (
    <>
      Small Button
      Medium Button
      Large Button
      Outline Button
      Text Button
    </>
  ),
};
```

Source: https://storybook.js.org/docs/ai/best-practices.md

### llms.txt, llms-full.txt and .md docs endpoints with renderer/language filters

Audience: both

OFFICIAL. Storybook’s own docs site is a model for AI-consumable design-system documentation, and worth copying: an index at /llms.txt, a full dump at /llms-full.txt, and `.md` appended to any docs URL for clean markdown. Query params let an agent request exactly the dialect it needs — `?renderer=vue&language=ts`, `?codeOnly=true` to strip prose, and `?version=9` for older majors. Verified live: /llms.txt returns 200 (8.7 KB).

Link: https://storybook.js.org/llms.txt

```markdown
# Storybook
> Storybook is a frontend workshop for building UI components and pages in isolation.
Current version: Version 10.5 (10.5)

## Documentation
- [Storybook Docs](https://storybook.js.org/docs): Main documentation
- [Full Documentation (Markdown)](https://storybook.js.org/llms-full.txt): Complete documentation in plain text for LLM consumption

## Markdown Access
Append `.md` to any docs URL to get clean markdown with code examples:
- `https://storybook.js.org/docs/writing-stories/decorators.md`

### Query Parameters
All markdown endpoints (`.md` URLs and `llms-full.txt`) support these query parameters:
- `renderer` - Framework filter for code snippets (default: `react`). Options: `react`, `vue`, `angular`, `svelte`, `web-components`, `solid`, `preact`, `html`, `ember`, `qwik`
- `language` - Language filter for code snippets (default: `ts`). Options: `ts`, `js`
- `codeOnly` - When `true`, returns only the code snippets without prose

Examples:
- `GET /docs/writing-stories/decorators.md?renderer=vue&language=ts`
- `GET /llms-full.txt?renderer=angular&language=js`
```

Source: https://storybook.js.org/llms.txt

## Adoption by design systems

A GitHub code search for `"@storybook/addon-mcp" filename:main.ts` returns 589 public hits (gh api search/code, 2026-07-27). Verified design-system and component-library repos with the addon registered in `.storybook/main.ts`: Khan/wonder-blocks (Khan Academy Wonder Blocks — configured with `toolsets: { dev: true, docs: true }`, i.e. testing deliberately omitted), marigold-ui/marigold (Reservix Marigold), zenkigen/zenkigen-component, reshaped-ui/reshaped, LuccaSA/lucca-front, tetrascience/ts-lib-ui-kit, Wai-Technologies/raaghu-react, Frontify/fondue. Broader product adopters in the same result set include backstage/backstage (Spotify Backstage), coder/coder, NangoHQ/nango, mastra-ai/mastra, OneKeyHQ/app-monorepo, and storybookjs/storybook itself. Note the React-only limitation shapes this list — Angular-based lucca-front appears in search but the docs toolset would not generate manifests for it. Chromatic-published MCP servers are the recommended distribution path but public example URLs are not indexed, so remote-consumption adoption could not be verified from public sources.

Design systems with a recorded integration: [Atlassian Design System (ADS / Atlaskit)](https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md), [Carbon Design System](https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md), [Chakra UI](https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md), [HeroUI](https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md), [Lightning Design System (SLDS)](https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md), [Polaris (Shopify)](https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md), [Primer](https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md), [React Spectrum / Spectrum 2 (S2)](https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md), [shadcn/ui](https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md), [Fluent UI (Fluent 2)](https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md), [Mantine](https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md), [Material UI (MUI)](https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md), [Nord Design System](https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md), [U.S. Web Design System (USWDS)](https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Sources (12)

- https://storybook.js.org/docs/ai/mcp

- https://storybook.js.org/docs/ai/mcp/overview

- https://storybook.js.org/docs/ai/mcp/api

- https://storybook.js.org/docs/ai/mcp/sharing

- https://storybook.js.org/docs/ai/manifests

- https://storybook.js.org/docs/ai/best-practices

- https://storybook.js.org/llms.txt

- https://www.chromatic.com/docs/mcp/

- https://github.com/storybookjs/mcp

- https://raw.githubusercontent.com/Khan/wonder-blocks/main/.storybook/main.ts

- https://raw.githubusercontent.com/marigold-ui/marigold/main/.storybook/main.ts

- https://raw.githubusercontent.com/storybookjs/storybook/next/AGENTS.md

---

Generated 2026-07-27T21:55:33Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
