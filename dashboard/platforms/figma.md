---
title: "Figma (Dev Mode MCP server, Code Connect, Figma Make) — AI capabilities"
description: "Figma is the most complete AI surface among design-system platforms in July 2026, and it works in both directions. CONSUMPTION: the remote MCP server at…"
url: "https://state-of-ai-in-design-systems.netlify.app/platforms/figma.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/platforms#figma"
type: "platform-record"
json: "https://state-of-ai-in-design-systems.netlify.app/platforms/figma.json"
id: "figma"
capability_count: 8
design_systems_with_integration_records: 19
data_collected: "2026-07-26/27"
generated: "2026-07-27T22:05:57Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/platforms/figma.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Figma (Dev Mode MCP server, Code Connect, Figma Make) — AI capabilities

8 capabilities recorded. 19 of the 19 design systems in this study carry an integration record for this platform.

- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/platforms/figma.json
- Platforms view: https://state-of-ai-in-design-systems.netlify.app/platforms.md

## Summary

Figma is the most complete AI surface among design-system platforms in July 2026, and it works in both directions. CONSUMPTION: the remote MCP server at https://mcp.figma.com/mcp (OAuth; no desktop app needed) exposes ~25 tools — get_design_context (returns React+Tailwind reference code + screenshot + hints), get_metadata, get_screenshot, get_variable_defs, search_design_system, get_libraries, get_code_connect_map, get_motion_context, plus write-to-canvas tools (use_figma, generate_figma_design, create_new_file, upload_assets, generate_diagram). A local/desktop server variant runs through the Figma desktop app. Figma also ships official Agent Skills (github.com/figma/mcp-server-guide, 12 SKILL.md files) and first-party plugins for Claude Code (`claude plugin install figma@claude-plugins-official`), Cursor (`/add-plugin figma`) and Codex — these bundle MCP config + skills + asset-handling rules. BUILDING: Code Connect (CLI parser files `.figma.tsx` / framework-agnostic template files `.figma.ts`) maps Figma components to real code; MCP wraps mapped nodes in synthetic `` markers carrying import statement, snippet, prop mappings and ‘Add instructions for MCP’ user rules. Code Connect UI adds a GitHub-integrated, no-CLI path. Figma Make kits let a DS team publish their React npm package plus a `guidelines/` markdown tree that Make must read before generating. CONSTRAINTS: MCP is free during beta but rate-limited by seat/plan — Starter/Professional/Org/Enterprise View or Collab seats get 6 tool calls per MONTH; Dev/Full seats get 200/day (10/min) on Professional, 200/day (15/min) on Organization, 600/day (20/min) on Enterprise; write tools (add_code_connect_map, generate_figma_design, whoami) are exempt. Figma says it ‘will eventually be a usage-based paid feature’. Only clients in the Figma MCP Catalog (VS Code, Cursor, Claude Code, Codex, Xcode) may connect — others must join a waitlist. Code Connect requires Organization or Enterprise plan + a full Design or Dev Mode seat. Figma Make requires a Full seat on a paid plan; private Make-kit npm packages need org-admin scope management. Enterprise-managed auth exists only for Claude via Okta Cross App Access.

## Capabilities (8)

### Remote MCP server (https://mcp.figma.com/mcp) — one-line install per client

Audience: consumers

OFFICIAL. The primary AI-consumption surface. Hosted, OAuth-authenticated, no desktop app. Preferred install is the first-party plugin (which also ships Agent Skills and asset rules); manual install is a single CLI command per client. Docs explicitly gate the client list: ‘Only clients listed in the Figma MCP Catalog like VS Code, Cursor, or Claude Code can connect to the Figma MCP Server.’

Link: https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/

```shell
Using the Figma plugin for Claude Code (preferred):
The recommended way to set up the Figma MCP server in Claude Code is by installing the Figma plugin, which includes MCP server settings as well as Agent Skills for common workflows.
Run the following command to install the plugin from Anthropic's official plugin marketplace.
claude plugin install figma@claude-plugins-official

Manual setup for Claude Code
Run the following command in your terminal to add the Figma MCP to Claude Code:
claude mcp add --transport http figma https://mcp.figma.com/mcp
Tip: To make your Figma MCP server available across all projects, install it with the --scope user flag:
claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp

Manual setup for Codex:
In your terminal, run the following command:
codex mcp add figma --url https://mcp.figma.com/mcp

Using the Figma plugin for Cursor (preferred):
Install the plugin by typing the following command in Cursor's agent chat:
/add-plugin figma
The plugin includes:
MCP server configuration for the Figma MCP server
Skills for implementing designs, connecting components via Code Connect, and creating design system rules
Rules for proper asset handling from the Figma MCP server
```

Source: https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/

### Tool surface: get_design_context, get_variable_defs, search_design_system, Code Connect tools

Audience: both

OFFICIAL. ~25 tools documented on the Tools and prompts page. Design-system-relevant reads: get_design_context (structured design context, defaults to React + Tailwind), get_metadata (‘sparse XML representation’ of layer properties for large frames), get_screenshot, get_variable_defs (variables and styles — colors, spacing, typography), search_design_system (searches subscribed libraries for reusable components and tokens), get_libraries, get_code_connect_map, get_code_connect_suggestions, get_context_for_code_connect, add_code_connect_map, send_code_connect_mappings, get_motion_context. Write-side: use_figma, generate_figma_design (live UI → Figma layers), create_new_file, upload_assets, download_assets, generate_diagram, whoami. There is also a server-side PROMPT named create_design_system_rules that generates rule files to give ‘agents with the right context to translate designs into high-quality, codebase-aware frontend code’.

Link: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/

### Custom rules: the ‘Figma MCP Integration Rules’ forced-flow template

Audience: consumers

OFFICIAL, and the single most explicit coercion artifact Figma publishes. A drop-in rules block for CLAUDE.md/.cursor/rules that forces a tool-call order (‘Required flow (do not skip)’), demotes MCP output to a reference, and mandates token/component reuse. Note the framing of the page itself: rules are ‘the kind of knowledge around the “unwritten rules” of a codebase that experienced devs know, and would want to pass on to a new junior hire.’

Link: https://developers.figma.com/docs/figma-mcp-server/add-custom-rules/

```markdown
## Figma MCP Integration Rules
These rules define how to translate Figma inputs into code for this project and must be followed for every Figma-driven change.
### Required flow (do not skip)
1. Run get_design_context first to fetch the structured representation for the exact node(s).
2. If the response is too large or truncated, run get_metadata to get the high-level node map and then re-fetch only the required node(s) with get_design_context.
3. Run get_screenshot for a visual reference of the node variant being implemented.
4. Only after you have both get_design_context and get_screenshot, download any assets needed and start implementation.
5. Translate the output (usually React + Tailwind) into this project's conventions, styles and framework. Reuse the project's color tokens, components, and typography wherever possible.
6. Validate against Figma for 1:1 look and behavior before marking complete.
### Implementation rules
- Treat the Figma MCP output (React + Tailwind) as a representation of design and behavior, not as final code style.
- Replace Tailwind utility classes with the project's preferred utilities/design-system tokens when applicable.
- Reuse existing components (e.g., buttons, inputs, typography, icon wrappers) instead of duplicating functionality.
- Use the project's color system, typography scale, and spacing tokens consistently.
- Respect existing routing, state management, and data-fetch patterns already adopted in the repo.
- Strive for 1:1 visual parity with the Figma design. When conflicts arise, prefer design-system tokens and adjust spacing or sizes minimally to match visuals.
```

Source: https://developers.figma.com/docs/figma-mcp-server/add-custom-rules/

### Asset-handling rules (‘DO NOT import/add new icon packages’)

Audience: consumers

OFFICIAL. Figma’s recommended CLAUDE.md block that blocks the two most common agent failure modes with Figma output: inventing icons from an npm package, and leaving placeholders. The same page also ships general-purpose one-liners: '- IMPORTANT: Always use components from `/path_to_your_design_system` when possible’, ‘- Avoid hardcoded values, use design tokens from Figma where available’, '- Place UI components in `/path_to_your_design_system`; avoid inline styles unless truly necessary’.

Link: https://developers.figma.com/docs/figma-mcp-server/add-custom-rules/

```markdown
For Claude Code, you can do something similar in your CLAUDE.md file:

# MCP Servers
## Figma MCP server rules
  - The Figma MCP server provides an assets endpoint which can serve image and SVG assets
  - IMPORTANT: If the Figma MCP server returns a localhost source for an image or an SVG, use that image or SVG source directly
  - IMPORTANT: DO NOT import/add new icon packages, all the assets should be in the Figma payload
  - IMPORTANT: do NOT use or create placeholders if a localhost source is provided
```

Source: https://developers.figma.com/docs/figma-mcp-server/add-custom-rules/

### Official Agent Skills (github.com/figma/mcp-server-guide) — MANDATORY-prerequisite pattern

Audience: consumers

OFFICIAL. 12 skills: figma-design-to-code, figma-code-connect, figma-generate-design, figma-generate-library, figma-use, figma-use-figjam, figma-use-motion, figma-use-slides, figma-implement-motion, figma-generate-diagram, figma-create-new-file, figma-swiftui. These are shipped inside the Claude Code/Cursor plugins and also served as MCP resources (skill://figma//SKILL.md, fetched via get_figma_skill / read_skill_uri). The coercion technique is notable: the skill *description* itself declares the skill a mandatory prerequisite for a tool call, and the body uses RFC-2119 ‘You MUST / You MUST NOT’ throughout, including a hint-priority ladder that puts Code Connect snippets above raw hex.

Link: https://github.com/figma/mcp-server-guide/blob/main/skills/figma-design-to-code/SKILL.md

```markdown
---
name: figma-design-to-code
description: "**MANDATORY prerequisite** — you MUST invoke this skill BEFORE calling the `get_design_context` Figma MCP tool. You MUST trigger this skill whenever the user wants to implement, build, port, or code up a Figma design as code. ... This skill provides critical instructions and steps to the agent on how to correctly implement Figma designs in code and must NOT be skipped."
disable-model-invocation: false
---

### 2. Treat the output as a reference, not final code
- The returned code is React + Tailwind enriched with hints. You MUST treat it as a REFERENCE, not as final code to paste verbatim.
- You MUST adapt it to the target project's language, framework, component library, styling system, and conventions. Match the surrounding code.

### 3. Reuse what the project already has
- Before writing new code, You MUST check the target project for existing components, layout patterns, and design tokens that match the design intent.
- You MUST reuse the project's existing components and tokens instead of generating new equivalents from scratch.

### 4. Honor the response hints by priority
Apply the hints in this order — earlier sources override later ones:
1. **Code Connect snippets** → use the mapped codebase component directly.
2. **Component documentation links** → follow them for usage and guidelines.
3. **Design annotations** → follow any designer notes or constraints.
4. **Design tokens (CSS variables)** → map them to the project's token system.
5. **Raw hex / absolute positioning** → loosely structured; lean on the screenshot for intent.

- **Render every icon/image from its exported asset.** Never hand-write or inline `<svg>`/`<path>`, never author your own icon file, never drop an icon or leave a placeholder
```

Source: https://raw.githubusercontent.com/figma/mcp-server-guide/main/skills/figma-design-to-code/SKILL.md

### Code Connect — the machine-readable Figma→code registry

Audience: both

OFFICIAL. `figma.connect(Component, url, { props, example })` files (`.figma.tsx` parser API, or framework-agnostic `.figma.ts` template files) published via the Code Connect CLI. Supported: React/React Native, HTML (Web Components, Angular, Vue), SwiftUI, Jetpack Compose, and a Storybook integration. Crucially for AI: ‘Code Connect files are not executed... the Code Connect CLI essentially treats code snippets as strings’ — so the mapping is a curated few-shot exemplar, not runtime behavior. When MCP hits a mapped node it emits a synthetic `` wrapper carrying design properties, import statements, the real component snippet, and 'Instructions: Any custom instructions you’ve added to help guide AI code generation’. Code Connect UI adds an ‘Add instructions for MCP’ field whose text is injected as ‘user rules’. Requires Organization or Enterprise plan + full Design or Dev Mode seat.

Link: https://developers.figma.com/docs/code-connect/react/

```tsx
import figma from '@figma/code-connect/react'

figma.connect(Button, 'https://...', {
  props: {
    label: figma.string('Text Content'),
    disabled: figma.boolean('Disabled'),
    type: figma.enum('Type', {
      Primary: 'primary',
      Secondary: 'secondary',
    }),
  },
  example: ({ disabled, label, type }) => {
    return (
      <Button disabled={disabled} type={type}>
        {label}
      </Button>
    )
  },
})
```

Source: https://developers.figma.com/docs/code-connect/react/

### Agent-authored Code Connect (figma-code-connect skill + MCP mapping tools)

Audience: builders

OFFICIAL. DS maintainers can have an agent generate and maintain mappings: get_code_connect_suggestions discovers unmapped published components, get_context_for_code_connect returns Figma property definitions (TEXT / BOOLEAN / VARIANT / INSTANCE_SWAP / SLOT), the agent writes the `.figma.ts` template, then add_code_connect_map / send_code_connect_mappings persist it. The skill front-loads hard preconditions so the agent stops rather than fabricating mappings.

Link: https://github.com/figma/mcp-server-guide/blob/main/skills/figma-code-connect/SKILL.md

````markdown
## Prerequisites

- **Figma MCP server must be connected** — verify that Figma MCP tools (e.g., `get_code_connect_suggestions`) are available before proceeding. If not, guide the user to enable the Figma MCP server and restart their MCP client.
- **Components must be published** — Code Connect only works with components published to a Figma team library. If a component is not published, inform the user and stop.
- **Organization or Enterprise plan required** — Code Connect is not available on Free or Professional plans.
- **URL must include `node-id`** — the Figma URL must contain the `node-id` query parameter.
- **TypeScript types** — for editor autocomplete and type checking in `.figma.ts` files `@figma/code-connect/figma-types` must be added to `types` in `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "types": ["@figma/code-connect/figma-types"]
    }
  }
  ```

## Step 2: Discover Unmapped Components
Call the MCP tool `get_code_connect_suggestions` with:
- `fileKey`, `nodeId`, `excludeMappingPrompt` — `true` (returns a lightweight list of unmapped components)
- **"No published components found in this selection"** — inform the user they need to publish the component to a team library in Figma first, then stop.
````

Source: https://raw.githubusercontent.com/figma/mcp-server-guide/main/skills/figma-code-connect/SKILL.md

### Figma Make kits: ship your React npm package + a guidelines/ tree Make must read

Audience: builders

OFFICIAL, and the most prescriptive ‘keep the model on-system’ document Figma publishes. A Make kit = your production React design-system npm package (React 18, Vite-compatible, public npm or a Figma-hosted private registry) plus a `guidelines/` markdown folder that Figma Make reads before generating. Figma explicitly advises progressive disclosure (‘Multiple short guidelines files are better than a few large files... with the size of the context window in mind’) and imperative phrasing (‘”Do not use small text for anything except captions” is better than “Use small text sparingly”’). Figma Make can also auto-draft guidelines from your package. Availability: Full seats on paid plans; only org admins manage private-registry scopes.

Link: https://developers.figma.com/docs/code/write-design-system-guidelines/

```markdown
## Reading order
**MUST READ before writing any code:**
1. This file (`overview.md`) — product character, rules, and workflows
2. `setup.md` — providers, CSS imports, build configuration
3. `foundations/` — all token files (color, typography, spacing, surfaces)
4. `components/overview.md` — full component catalog with alternative names
**Read on-demand:**
- `components/{name}.md` — read BEFORE using that component

### Before using a component
1. Check `components/overview.md` for the component catalog
2. Read `components/{name}.md` for the specific component
4. Do NOT write code using a component until you have read its guidelines file
### Before using an icon
2. Do NOT guess icon names — verify the icon exists first
4. Icons are ALWAYS imported from `lucide-react`, never from `@brettmcm/astraui`

## Rules
IMPORTANT: Every desktop page MUST include `SidebarNavigation` — the 60px dark icon rail on the far left. No exceptions.
IMPORTANT: The page background is ALWAYS `brand-tertiary`. Never use white or gray as the page canvas.
IMPORTANT: Do NOT use `brand-primary` or `brand-secondary` as backgrounds for large areas — they are for small accents and interactive highlights only.
- Always use design system components over raw HTML elements (`InputField` not `<input>`, `SelectField` not `<select>`)
- All spacing must use design system tokens (`gap-xl`, `p-2xl`) — never hardcode pixel values
- Surface color defines layout hierarchy, not borders — do not add borders between layout regions
- Icons always come from `lucide-react` — never create inline SVGs or guess icon names
- Navigation hierarchy is strict: `SidebarNavigation` → `SecondaryNav` → `Tabs`. Never skip levels.
```

Source: https://developers.figma.com/docs/code/write-design-system-guidelines/

## Adoption by design systems

Code Connect adoption is broad and verifiable: a GitHub code search for `"@figma/code-connect" filename:package.json` returns 248 public repos (gh api search/code, 2026-07-27). Named design systems in that result set include carbon-design-system/carbon (IBM Carbon), primer/react and primer/brand (GitHub Primer), CMSgov/design-system, coinbase/cds, contentful/forma-36, equinor/design-system, launchdarkly/launchpad-ui, MetaMask/metamask-design-system, JetBrains/ring-ui, bcgov/design-system (Government of British Columbia), db-ux-design-system/core-web (Deutsche Bahn), commercetools/nimbus, vtex/shoreline, getsentry/sentry, moodlehq/design-system, dequelabs/cauldron, coveo/plasma, Infineon/infineon-design-system-stencil, LedgerHQ/lumen, Synerise/synerise-design, PhillipsAuctionHouse/seldon, narmi/design_system, and Figma’s own reference system figma/sds (Simple Design System). Figma also maintains figma/code-connect and figma/mcp-server-guide as first-party references. Caveat: a package.json dependency proves the tooling is installed, not that mappings are published to a production library — verify per repo. No public case study found for Figma Make kits at a named enterprise design system (the docs example, ‘Astra UI’ / @brettmcm/astraui, is a Figma-authored demo).

Design systems with a recorded integration: [Ant Design](https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md), [Atlassian Design System (ADS / Atlaskit)](https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md), [Carbon Design System](https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md), [Chakra UI](https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md), [daisyUI](https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md), [HeroUI](https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md), [Lightning Design System (SLDS)](https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md), [Nuxt UI](https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md), [PatternFly](https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md), [Polaris (Shopify)](https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md), [Primer](https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md), [React Spectrum / Spectrum 2 (S2)](https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md), [shadcn/ui](https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md), [Cloudscape Design System](https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md), [Fluent UI (Fluent 2)](https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md), [Mantine](https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md), [Material UI (MUI)](https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md), [Nord Design System](https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md), [U.S. Web Design System (USWDS)](https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Sources (12)

- https://developers.figma.com/docs/figma-mcp-server/

- https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/

- https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/

- https://developers.figma.com/docs/figma-mcp-server/add-custom-rules/

- https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/

- https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/

- https://developers.figma.com/docs/figma-mcp-server/create-skills/

- https://developers.figma.com/docs/code-connect/react/

- https://developers.figma.com/docs/code/write-design-system-guidelines/

- https://developers.figma.com/docs/code/bring-your-design-system-package/

- https://github.com/figma/mcp-server-guide

- https://github.com/figma/code-connect

---

Generated 2026-07-27T22:05:57Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
