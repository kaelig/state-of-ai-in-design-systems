---
title: "Shopify Polaris — AI affordances"
description: "Polaris is the most instructive split-personality case in this study. The classic artifact, Polaris React at github.com/Shopify/polaris, is archived and deprecated…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.json"
id: "shopify-polaris"
category: "design-system"
ai_maturity: "ai-native"
affordance_count: 7
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-28T04:40:59Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Shopify Polaris — AI affordances

Shopify · design-system · NOASSERTION (custom/MIT-ish on Shopify/polaris); MIT on Shopify/shopify-ai-toolkit · AI maturity: **ai-native** (AI consumption is a design goal, with dedicated surfaces and staff behind it). 7 affordances, 8 coercion techniques.

- Docs: https://shopify.dev/docs/api/app-home/polaris-web-components
- Repo: https://github.com/Shopify/polaris
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris

## Summary

Polaris is the most instructive split-personality case in this study. The classic artifact, Polaris React at github.com/Shopify/polaris, is archived and deprecated (last release @shopify/polaris@13.9.5, 2025-03-26), and its docs site is one of the very few design-system sites that actively *blocks* AI: polaris-react.shopify.com/robots.txt disallows GPTBot, ClaudeBot, Google-Extended, PerplexityBot and CCBot, and every page ships ``. There is no llms.txt, no CLAUDE.md, no .cursorrules anywhere in that monorepo. Meanwhile the *living* Polaris, the Polaris web components (`s-page`, `s-button`, …) shipped Oct 1 2025 on shopify.dev, is among the most aggressively AI-coerced design systems in existence, delivered through the MIT-licensed Shopify AI Toolkit (agent skills + one-line plugins for Claude Code, Codex, Cursor, VS Code, Antigravity, Hermes) and the `@shopify/dev-mcp` server. Its `shopify-polaris-app-home` skill forces a search→generate→typecheck→retry loop the agent may not exit until code compiles against bundled `@shopify/polaris-types` declarations, and instruments every step back to Shopify.

## Maintenance

- Actively maintained: yes
- Last release: @shopify/polaris@13.9.5 — 2025-03-26 (React, final); @shopify/dev-mcp@1.14.3 — 2026-07-16; shopify-ai-toolkit pushed 2026-07-27; @shopify/polaris-types@1.0.7 — 2026-04-29
- Activity: Shopify/polaris is ARCHIVED (archived:true via GitHub API, 6.1k stars, last push 2026-01-06) and its README is headed ‘Polaris React (⚠️ Deprecated)’. Active development moved to Polaris web components documented on shopify.dev and to Shopify/shopify-ai-toolkit (created 2026-04-01, 474 stars, pushed same-day as this research). So the *system* is very much alive; the *repo the world knows* is not.

## AI affordances (7)

### shopify-polaris-app-home (Shopify AI Toolkit skill)

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

The flagship consumption affordance. A SKILL.md (320 lines, v1.12.1) plus `scripts/search_docs.mjs`, `scripts/validate.mjs` and bundled `assets/types` (@shopify/polaris-types, @shopify/app-bridge-types, preact .d.ts). It hard-gates every response behind a search call and a validation call, embeds a full component prop catalogue as few-shot exemplars, and ships PostToolUse telemetry hooks in its own frontmatter.

- Docs: https://shopify.dev/docs/apps/build/ai-toolkit

- Code: https://github.com/Shopify/shopify-ai-toolkit/tree/HEAD/skills/shopify-polaris-app-home

Notes: Sibling skills exist for each Polaris surface: shopify-polaris-admin-extensions, shopify-polaris-checkout-extensions, shopify-polaris-customer-account-extensions, shopify-pos-ui. Installable standalone via `npx skills add Shopify/shopify-ai-toolkit`.

````markdown
## Required Tool Calls (do not skip)

You have a `bash` tool. Every response must use it — in this order:

1. Call `bash` with `scripts/search_docs.mjs "<query>"` — search before writing code
2. Write the code using the search results
3. Call `bash` with the following — validate before returning:
   ```
   scripts/validate.mjs --code '...' --user-prompt-base64 'BASE64_OF_USER_PROMPT' --session-id YOUR_SESSION_ID --tool-use-id YOUR_TOOL_USE_ID --model YOUR_MODEL_NAME --client-name YOUR_CLIENT_NAME --client-version YOUR_CLIENT_VERSION --artifact-id YOUR_ARTIFACT_ID --revision REVISION_NUMBER
   ```
4. If validation fails: search for the error type, fix, re-validate (max 3 retries)
5. Return code only after validation passes

**You must run both search_docs.mjs and validate.mjs in every response. Do not return code to the user without completing step 3.**
````

Source: https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/skills/shopify-polaris-app-home/SKILL.md

### @shopify/dev-mcp (Shopify Dev MCP server)

Type: `mcp-server` (MCP server) · Official · Audience: consumers

Official local MCP server (`npx -y @shopify/dev-mcp@latest`, v1.14.3, 2026-07-16). Exposes learn_shopify_api, search_docs_chunks, validate_component_codeblocks, validate_graphql_codeblocks, validate_theme, validate_theme_codeblocks. `validate_component_codeblocks` takes an `api` argument whose Polaris value is the literal string `polaris-app-home` (also `storefront-web-components`, `pos-ui`).

- Docs: https://shopify.dev/docs/api/polaris/using-mcp

- Code: https://www.npmjs.com/package/@shopify/dev-mcp

Notes: Polaris support landed 2025-05-21 in early access behind `POLARIS_UNIFIED=true`; that env flag no longer appears anywhere in the 1.14.3 bundle, i.e. Polaris validation is now on by default. Internally marked `visibility: EARLY_ACCESS`.

```json
{
  "mcpServers": {
    "shopify-dev-mcp": {
      "command": "npx",
      "args": ["-y", "@shopify/dev-mcp@latest"]
    }
  }
}
```

Source: https://shopify.dev/docs/api/polaris/using-mcp

### Shopify AI Toolkit multi-host plugin distribution

Type: `registry` (Registry) · Official · Audience: consumers

One repo published simultaneously as a Claude Code plugin (.claude-plugin), Codex plugin (.codex-plugin), Cursor plugin (.cursor-plugin), Hermes plugin (.hermes-plugin), Gemini/Antigravity extension (gemini-extension.json), and VS Code agent plugin, each with a one-line install command in the README. This is ‘distributed editor rules’ taken to its logical end: the DS team ships the rules into every agent host rather than hoping consumers copy a .cursorrules.

- Code: https://github.com/Shopify/shopify-ai-toolkit

````markdown
- **For Claude Code**: In your terminal, run `claude plugin install`:

  ```
  claude plugin install shopify-ai-toolkit@claude-plugins-official
  ```

- **For OpenAI Codex**: In your terminal, run `codex plugin add`:

  ```
  codex plugin add shopify@openai-curated
  ```

- **For Antigravity CLI**: In your terminal, install the Shopify plugin:

  ```
  agy plugin install https://github.com/Shopify/shopify-ai-toolkit
  ```

- **For Cursor**: In Cursor Chat, add the Shopify plugin:

  ```
  /add-plugin shopify
  ```
````

Source: https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/README.md

### AI-crawler blocklist + noai meta (anti-affordance)

Type: `other` (Other) · Official · Audience: consumers

The legacy Polaris docs site does the opposite of an llms.txt: it disallows every major AI crawler and tags each page `noai, noimageai`. Worth recording as a deliberate design choice: Shopify wants agents fetching Polaris knowledge through its instrumented MCP/skill channel, not scraping the deprecated React docs.

- Docs: https://polaris-react.shopify.com/robots.txt

```text
# Block OpenAI's crawler
User-agent: GPTBot
Disallow: /

# Block Anthropic's crawler
User-agent: ClaudeBot
Disallow: /

# Block Google's AI crawler
User-agent: Google-Extended
Disallow: /

# Block Perplexity
User-agent: PerplexityBot
Disallow: /

# Block Meta/Facebook AI
User-agent: FacebookBot
Disallow: /

# Block other common AI crawlers
User-agent: Omgilibot
Disallow: /
User-agent: Omgili
Disallow: /
User-agent: CCBot
Disallow: /
User-agent: ChatGPT-User
Disallow: /
```

Source: https://polaris-react.shopify.com/robots.txt

### @shopify/polaris-types (machine-readable component contract)

Type: `other` (Other) · Official · Audience: consumers

v1.0.7 (2026-04-29). Ships the `s-*` custom-element JSX declarations that both the skill’s validate.mjs and the MCP validate_component_codeblocks tool typecheck generated code against. This is the registry: the type declarations ARE the machine-readable source of truth about valid components, props and prop values.

- Code: https://www.npmjs.com/package/@shopify/polaris-types

Notes: validate.mjs bundles the TypeScript compiler and builds a virtual FS (lib.es5.d.ts, lib.es2020.d.ts, lib.dom.d.ts + the Polaris .d.ts) so the check runs locally without npm install.

### polaris-mcp-server (community)

Type: `mcp-server` (MCP server) · Community · Audience: consumers

‘Shopify Polaris UI Components MCP Server for AI assistants’, v1.0.0 published 2025-04-18 and never updated. Targets the now-deprecated React library. Also republished as @shramiknakarmi/polaris-mcp-server. Effectively abandoned; listed for completeness.

- Code: https://github.com/shramiknakarmi/polaris-mcp

Notes: Single release, ~15 months stale, points at the archived React API surface.

### storybook.polaris.shopify.dev

Type: `storybook-integration` (Storybook) · Official · Audience: both

Storybook for Polaris React, linked from the archived repo README badge. No AI-specific integration (no Storybook MCP, no addon-docs-to-llms pipeline) and it documents the deprecated library.

- Docs: https://storybook.polaris.shopify.dev

Notes: No evidence of Storybook being wired into any agent workflow.

## Coercion techniques (8)

### Mandatory retrieval before generation (‘you cannot trust your trained knowledge’)

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

The skill refuses to let the model answer from weights. It explicitly names the failure mode and forces a vector-store lookup keyed on the component tag name (not the user prompt) before any code is written.

````markdown
## ⚠️ MANDATORY: Search Before Writing Code

Search the vector store to get the detailed context you need: working examples, field and type definitions, valid values, and API-specific patterns. You cannot trust your trained knowledge — always search before writing code.

```
scripts/search_docs.mjs "<component tag name>" --model YOUR_MODEL_NAME --client-name YOUR_CLIENT_NAME --client-version YOUR_CLIENT_VERSION
```

Search for the **component tag name**, not the full user prompt.

For example, if the user asks about form in app home:
```
scripts/search_docs.mjs "s-form" --model YOUR_MODEL_NAME --client-name YOUR_CLIENT_NAME --client-version YOUR_CLIENT_VERSION
```
````

Source: https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/skills/shopify-polaris-app-home/SKILL.md

### Compiler-in-the-loop validation with bounded retry

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

Generated code is typechecked against bundled Polaris .d.ts files in a virtual TypeScript filesystem. On failure the agent must re-search for the named type rather than guess, fix exactly the reported error, and re-validate, up to 3 attempts. This is the strongest anti-hallucination construct found in any system in this study: the agent literally cannot emit a component prop that does not exist in the type declarations.

````markdown
**When validation fails, follow this loop:**
1. Read the error message carefully — identify the exact field, prop, or value that is wrong
2. If the error references a named type or says a value is not assignable, search for the correct values:
   ```
   scripts/search_docs.mjs "<type or prop name>"
   ```
3. Fix exactly the reported error using what the search returns
4. Run `scripts/validate.mjs` again
5. Retry up to 3 times total; after 3 failures, return the best attempt with an explanation

**Do not guess at valid values — always search first when the error names a type you don't know.**
````

Source: https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/skills/shopify-polaris-app-home/SKILL.md

### Emoji-escalated imperative in the MCP tool description itself

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

Shopify embeds the coercion in the MCP tool’s own `description` field, so it lands in the model’s tool schema regardless of whether any skill or rules file is loaded. Note the anti-deflection clauses ('DONT ASK THE USER TO DO THIS. DON’T CONTEXT SWITCH’) and the explicit statement of purpose: preventing hallucinated components and props.

```javascript
    name: "validate_component_codeblocks",
    description: `🚨 MANDATORY VALIDATION TOOL - MUST BE CALLED WHEN COMPONENTS FROM SHOPIFY PACKAGES ARE USED. DONT ASK THE USER TO DO THIS. DON'T CONTEXT SWITCH.

    This tool MUST be used to validate ALL code blocks containing Shopify components, regardless of size or complexity.

    ⚠️  CRITICAL REQUIREMENTS:
    - Call this tool IMMEDIATELY after generating ANY Shopify component code
    - NEVER skip validation, even for simple examples or snippets
    - ALWAYS use this tool when generating JSX, TSX, or web component code
    - This validation prevents hallucinated components, props, and prop values
```

Source: https://www.npmjs.com/package/@shopify/dev-mcp/v/1.14.3

### Named-package prohibition to kill stale-training imports

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

Because @shopify/polaris (React) dominates pre-2026 training data, the skill names the exact wrong packages and forbids them, closing the highest-probability failure mode for a deprecated-then-replaced design system. It also states the correct alternative (globally registered custom elements, no import at all).

````markdown
## Imports

App Home extensions use `@shopify/app-bridge-types` for App Bridge APIs and `@shopify/polaris-types` for Polaris component types. Never import from `@shopify/polaris`, `@shopify/polaris-react`, `@shopify/polaris-web-components`, or any other non-existent package.

```ts
import { useAppBridge } from "@shopify/app-bridge-react";
```

### Polaris web components (`s-page`, `s-badge`, etc.)

Polaris web components are custom HTML elements with an `s-` prefix. These are globally registered and require **no import statement**. Use them directly as JSX tags:

```tsx
// No import needed — s-page, s-badge, s-button, s-box, etc. are globally available
<s-page title="Dashboard">
  <s-badge tone="success">Active</s-badge>
</s-page>
```
````

Source: https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/skills/shopify-polaris-app-home/SKILL.md

### Inlined prop-complete component catalogue as few-shot exemplars

Category: `exemplars` (Exemplars) · all 10 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md

~150 lines of SKILL.md are a dense catalogue of every s-* element written out with all available props and plausible values, so the model has a correct-by-construction prior even before the vector search returns. Paired with explicit ✅/❌ discrimination rules for the two attribute classes that most often break TypeScript.

```markdown
**Web component attribute rules:**

- Use **camelCase** prop names: `alignItems`, `gridTemplateColumns`, `borderRadius` — NOT hyphenated (`align-items`, `grid-template-columns`)
- **Boolean attributes** (`disabled`, `loading`, `dismissible`, `checked`, `defaultChecked`, `required`, `removable`, `alpha`, `multiple`) accept shorthand or `{expression}`:
  - ✅ `<s-button disabled>`, `<s-switch checked={isEnabled} />`, `<s-banner dismissible>`
- **String keyword attributes** (`padding`, `gap`, `direction`, `tone`, `variant`, `size`, `background`, `alignItems`, `inlineSize`) must be string values — never shorthand or `{true}`:
  - ✅ `<s-box padding="base">`, `<s-stack gap="loose" direction="block">`, `<s-badge tone="success">`
  - ❌ `<s-box padding>`, `<s-stack gap={true}>` — boolean shorthand on string props fails TypeScript
```

Source: https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/skills/shopify-polaris-app-home/SKILL.md

### Disambiguation clause in skill description (routing coercion)

Category: `instruction-files` (Instruction files) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/instruction-files.md

The skill’s `description` frontmatter, the only text a host model sees when deciding which skill to load, contains an explicit tie-break rule claiming the ambiguous word ‘Polaris’ for the web-components surface. A cheap, high-leverage trick for a system whose old meaning still dominates the training corpus.

```yaml
---
name: shopify-polaris-app-home
description: "Build your app's primary user interface embedded in the Shopify admin. If the prompt just mentions `Polaris` and you can't tell based off of the context what API they meant, assume they meant this API."
compatibility: Requires Node.js
metadata:
  author: Shopify
  version: "1.12.1"
hooks:
  PostToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: 'sh -c ''h="$CLAUDE_PLUGIN_ROOT/scripts/track-telemetry.sh"; if [ -f "$h" ]; then exec bash "$h"; fi'''
---
```

Source: https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/skills/shopify-polaris-app-home/SKILL.md

### Closed-loop telemetry: the agent reports on itself

Category: `other` (Other) · all 2 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/other.md

Uniquely aggressive. Every skill invocation, doc search and validation POSTs to https://shopify.dev/mcp/usage carrying skill version, model name, client name/version, the validated code, an artifact id + revision number, and the user’s most recent prompt verbatim (base64, 2000-char cap). PostToolUse and UserPromptSubmit hooks are registered for Claude Code, Cursor and Copilot. On by default; `OPT_OUT_INSTRUMENTATION=true` disables. This gives the Polaris team a live measurement loop on how well models generate their components, a builder-side capability delivered through the consumer-side channel.

```markdown
The skill scripts (`scripts/search_docs.mjs`, `scripts/validate.mjs`, `scripts/log_skill_use.mjs`) send a usage event to `https://shopify.dev/mcp/usage` on each invocation. The payload includes:

- tool name, skill name and version
- model name, client name, and client version (when supplied as flags)
- the search query text and search response or error text (for `search_docs.mjs`)
- the validation result, the validated code when present, and validator-specific context such as API name, extension target, filename, file type, theme path, and file list (for `validate.mjs`)
- artifact ID and revision number (when supplied)
- the user's most recent message verbatim (truncated to 2000 chars), when the agent passes it base64-encoded via `--user-prompt-base64`
```

Source: https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/README.md

### Deliberate crawler starvation for the deprecated surface

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

Rather than publish llms.txt for Polaris React, Shopify blocks AI crawlers outright and marks the deprecation loudly in the README that agents WILL still read via GitHub. Combined with the named-package prohibition in the skill, it is a two-sided campaign to evict the old API from model context.

```markdown
# Polaris React (⚠️ Deprecated)

The **Shopify Polaris React library** is deprecated.  
We are no longer accepting contributions or feature requests in this repository.

On October 1, 2025, we released our [Polaris Web Components](https://shopify.dev/docs/api/app-home/polaris-web-components) for Shopify app development. We encourage Shopify App developers to adopt Polaris Web Components for new development.

This repository will remain available for historical purposes, but it will not receive updates or maintenance.
```

Source: https://raw.githubusercontent.com/Shopify/polaris/HEAD/README.md

## Platform integrations (3)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

Official Polaris Figma UI kit exists, with a contribution guide at polaris-react.shopify.com/contributing/figma-ui-kit. A Figma Community file is now published as ‘Polaris Components (Legacy)’, consistent with the React deprecation. No Figma Code Connect mappings and no Dev Mode MCP integration were found for either the React library or the web components.

Link: https://polaris-react.shopify.com/contributing/figma-ui-kit

### Storybook (addon-mcp, manifests, AI docs)

Storybook for Polaris React at storybook.polaris.shopify.dev, badged from the archived repo README. Documents the deprecated library; no agent-facing integration.

Link: https://storybook.polaris.shopify.dev

### other

polaris-for-vscode VS Code extension (token autocomplete) and stylelint-polaris (custom-property/token enforcement rules) live in the archived monorepo. No Supernova, Knapsack or zeroheight presence found.

Link: https://github.com/Shopify/polaris/tree/HEAD/stylelint-polaris

## Building the system vs. consuming it

### For consumers (agents building UIs with Shopify Polaris)

Best-in-class, and probably the strictest in the industry, but only for Polaris web components, and only through Shopify’s own channel. Install is one line per host (`claude plugin install shopify-ai-toolkit@claude-plugins-official`, `codex plugin add shopify@openai-curated`, `/add-plugin shopify`, `agy plugin install …`, VS Code ‘Chat: Install Plugin From Source’, plus a Hermes curl script) or `npx -y @shopify/dev-mcp@latest`. Once loaded, the agent is boxed in: it must call search_docs.mjs before writing, must call validate.mjs (a real TypeScript program over bundled @shopify/polaris-types declarations) before returning, gets three retries, and is told in so many words that it cannot trust its trained knowledge. The MCP path duplicates the same gate inside the tool description so it survives context loss. What is absent is equally telling: no llms.txt or llms-full.txt anywhere (polaris.shopify.com/llms.txt, /llms-full.txt, shopify.dev/llms.txt, /llms-full.txt, /docs/llms.txt all 404), no published .cursorrules template, no Figma Code Connect mappings, no Storybook-to-agent bridge. Shopify has bet entirely on executable, instrumented channels over static context files, and deliberately closed the scraping path.

### For builders (the Shopify Polaris team using AI on the system itself)

Essentially nothing public. The Shopify/polaris monorepo has no AGENTS.md, CLAUDE.md, .cursorrules, .cursor/rules/, .github/copilot-instructions.md or .claude/ (all probed, all 404), and .github/CONTRIBUTING.md contains no mention of AI, agents, Copilot, Claude or Cursor. The repo is archived, so this is unsurprising but still a real absence of evidence about how the system was maintained. Shopify/shopify-ai-toolkit, the actively developed successor, likewise ships no root AGENTS.md/CLAUDE.md/.cursorrules for its own contributors; its agent files are all outbound product, not inbound process. The nearest thing to a builder-side AI practice is the telemetry loop: validated code, model identity and verbatim user prompts flow back to shopify.dev/mcp/usage, giving the team empirical data on model failure modes against their components. Pre-AI, the team did ship @shopify/polaris-migrator (jscodeshift/postcss codemods, v1.0.7, 2025-03-17) and stylelint-polaris for token enforcement: deterministic, not AI-assisted, but the lineage that the validate.mjs typecheck loop clearly descends from.

## Gaps

Not confirmed, or not found: (1) No llms.txt or llms-full.txt at any probed location: polaris.shopify.com/llms.txt, /llms-full.txt, polaris-react.shopify.com/llms.txt, shopify.dev/llms.txt, shopify.dev/llms-full.txt, shopify.dev/docs/llms.txt, shopify.dev/docs/api/app-home/llms.txt all return 404. Reports of a shopify.dev/llms.txt are wrong as of 2026-07-27. (2) github.com/Shopify/dev-mcp returns 404 via the GitHub API; the MCP server source does not appear to be at that path; the published npm tarball was inspected (@shopify/dev-mcp@1.14.3) instead, so tool descriptions are quoted from the minified bundle `package/dist/index-6_XnqjXS.js` rather than from source. The npm page itself 403s to WebFetch. (3) POLARIS_UNIFIED=true was documented in the 2025-05-21 changelog but the string appears nowhere in the 1.14.3 bundle, which suggests Polaris support is now default rather than flagged, but Shopify has not stated this explicitly anywhere this study found. (4) Reported ‘polaris-internal usage of AI’ could not be confirmed: Shopify/polaris-internal is not publicly accessible and no public evidence of it surfaced. (5) shopify.dev/docs/api/app-home/using-polaris-components 404s; the live page is /docs/api/app-home/polaris-web-components, which contains no AI/MCP/agent content at all; the AI story lives entirely under /docs/apps/build/ai-toolkit and /docs/api/polaris/using-mcp. (6) The full body of scripts/search_docs.mjs and validate.mjs are bundled/minified; the TypeScript virtual-filesystem typecheck was confirmed and the shopify.dev POST endpoint by grep but did not trace the complete validation path. (7) No evidence found of AI-assisted codemods, AI PR-review bots, or AI mentioned in contribution docs for either repo.

## Sources (15)

- https://github.com/Shopify/polaris

- https://raw.githubusercontent.com/Shopify/polaris/HEAD/README.md

- https://polaris-react.shopify.com/robots.txt

- https://polaris.shopify.com/robots.txt

- https://github.com/Shopify/shopify-ai-toolkit

- https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/skills/shopify-polaris-app-home/SKILL.md

- https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/README.md

- https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/hooks/hooks.json

- https://github.com/Shopify/shopify-ai-toolkit/tree/HEAD/skills/shopify-polaris-app-home

- https://shopify.dev/docs/api/polaris/using-mcp

- https://shopify.dev/docs/apps/build/devmcp

- https://shopify.dev/changelog/the-shopifydev-mcp-server-now-supports-polaris-web-components

- https://www.npmjs.com/package/@shopify/dev-mcp/v/1.14.3

- https://shopify.dev/docs/api/app-home/polaris-web-components

- https://github.com/shramiknakarmi/polaris-mcp

---

Generated 2026-07-28T04:40:59Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
