---
title: "zeroheight — AI capabilities"
description: "zeroheight has the most thoroughly documented MCP surface of the three. Remote MCP lives at a single endpoint, https://mcp.zeroheight.com/mcp, with two access modes…"
url: "https://state-of-ai-in-design-systems.netlify.app/platforms/zeroheight.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/platforms#zeroheight"
type: "platform-record"
json: "https://state-of-ai-in-design-systems.netlify.app/platforms/zeroheight.json"
id: "zeroheight"
capability_count: 8
design_systems_with_integration_records: 1
data_collected: "2026-07-26/27"
generated: "2026-07-28T05:02:05Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/platforms/zeroheight.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# zeroheight — AI capabilities

8 capabilities recorded. 1 of the 19 design systems in this study carry an integration record for this platform.

- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/platforms/zeroheight.json
- Platforms view: https://state-of-ai-in-design-systems.netlify.app/platforms.md

## Summary

zeroheight has the most thoroughly documented MCP surface of the three. Remote MCP lives at a single endpoint, https://mcp.zeroheight.com/mcp, with two access modes: MCP via login (OAuth/SSO, recommended, can span multiple styleguides, CAN read private pages) and MCP via link (unique per-viewer URL, no auth, scoped to a single styleguide, CANNOT read private pages). A local MCP also ships as the npm package @zeroheight/mcp-server (Node 22+, browser OAuth by default with tokens at ~/.zeroheight/mcp-oauth.json, or ZEROHEIGHT_CLIENT_ID/ZEROHEIGHT_ACCESS_TOKEN sent as X-API-CLIENT / X-API-KEY headers); local MCP is for orgs blocking remote MCP, token-based auth, or CI/CD pipelines, and it too can read private pages. Five documented tools: list-styleguides, search-pages, list-pages, get-page, get-page-asset (plus list-releases for versioned content). zeroheight also publishes an “Optimising your styleguide for consumption via MCP” guide, the clearest vendor articulation anywhere of how to write DS docs FOR retrieval, including “Write content as rules, not descriptions”. A Markdown Export feature turns any page into AI-ready context with a pre-filled prompt, for teams who cannot enable MCP. On the builder side: Build with AI / Write with AI / Improve with AI, AI tone-of-voice instructions, AI-generated release notes, an Assistant for editors/viewers/Figma/Slack/Teams, and a Docs Agent closed beta that watches Figma for component/token changes and proposes documentation updates (suggestions only; Enterprise-only; OpenAI is the sub-processor; no customer data used for training). PRICING/AVAILABILITY: MCP, Markdown Export and the MCP optimisation features are all headed “This feature is not available for Free or Starter plans.” search-pages additionally requires the org-level “Allow use of AI features in styleguides” setting; without it the agent falls back to list-pages/get-page navigation only. Docs Agent beta requires Enterprise + AI features enabled + a styleguide mapped to Figma files. Public list pricing is roughly $39–49 per editor/month annually (third-party sources; treat as approximate). GAPS: no Code Connect-style mapping; zeroheight.com/llms.txt returns 404, so machine-readable access is Markdown Export + MCP, not llms.txt; the frequently cited claim about “llms.txt generation for DS docs sites” is NOT confirmed for zeroheight (it IS confirmed for Knapsack).

## Capabilities (8)

### Remote MCP at a single shared endpoint, two access modes

Audience: consumers

One endpoint for everyone: https://mcp.zeroheight.com/mcp. “Access via login” is on by default at org and styleguide level (off by default for private/password-protected styleguides) and also governs partner connectors like Figma Make. “Access via link” gives each viewer a unique URL scoped to one styleguide, for consumers who don’t have SSO. One-click and copy-paste install commands for Cursor, VS Code, Claude Code and Codex live in styleguide settings; ChatGPT/Codex, Claude and Figma connect via partner connectors.

Link: https://help.zeroheight.com/hc/en-us/articles/43780251357979-Using-the-remote-zeroheight-MCP-server

```text
The connection details for MCP via login are identical for all your viewers: https://mcp.zeroheight.com/mcp

But to make sharing access easier, you can add the details to your styleguide using the Remote MCP details block.
You can add a Remote MCP details block to a page in your styleguide so that viewers are able to see instructions for connecting to the MCP from the styleguide.

Open the slash inserter on any page, select Remote MCP details and select MCP via login

Optionally configure which client tabs are visible using the block's settings

Optionally turn off Display help message if you're providing your own setup guidance
```

Source: https://help.zeroheight.com/hc/en-us/articles/43780251357979-Using-the-remote-zeroheight-MCP-server

### Explicit prompt-level coercion: “Follow the design system guidelines available via the zeroheight MCP”

Audience: consumers

zeroheight’s own recommended prompt boilerplate for keeping an agent on-system, straight from the MCP overview. Also documents the three target workflows (traditional handoff, AI-accelerated prototyping in Figma Make, full AI-driven development) with the compliance framing: “The coding agent reads your design system documentation as it generates code, so compliance is baked in rather than checked afterwards.”

Link: https://help.zeroheight.com/hc/en-us/articles/48004395674011-zeroheight-MCP-overview

```text
The zeroheight MCP server gives AI tools like Claude, Cursor, and GitHub Copilot direct read access to your design system documentation. Instead of copying and pasting guidelines into every prompt, your AI tool can look them up itself — so the answers it gives, and the code it writes, stay aligned with your design system.

[...]

To keep your AI tool grounded in your design system as it works, add something like this to your prompts: "Follow the design system guidelines available via the zeroheight MCP".
```

Source: https://help.zeroheight.com/hc/en-us/articles/48004395674011-zeroheight-MCP-overview

### Five MCP tools with a documented call sequence (and an AI-features gate)

Audience: consumers

list-styleguides → search-pages → get-page → get-page-asset, with list-pages as fallback navigation and list-releases for versioned content. The important nuance: search-pages (semantic chunk retrieval) is ONLY available to teams who have enabled AI features; without it agents degrade to title-based navigation via list-pages. get-page returns Markdown and is described as “the source of truth for what the agent uses when applying your design system”. get-page-asset handles images reliably; PDFs/Word/Excel/ZIP are inconsistent across agents and fall back to returning a source URL.

Link: https://help.zeroheight.com/hc/en-us/articles/51478956166939-zeroheight-MCP-tools-reference

```text
The zeroheight MCP exposes five tools. AI agents call these automatically as they work through your prompt — you don't invoke them directly.

list-styleguides
Discovers all zeroheight styleguides accessible via the connected MCP. Returns a list of styleguide IDs and names. This is typically the first call an agent makes.
Not called when using MCP via Link — the connection is already scoped to a single styleguide.

search-pages
Searches the styleguide for pages matching a keyword or topic and returns a list of relevant chunks from the styleguide. The agent will likely use this tool first and may fetch further content if the chunks are insufficient.
Note: only available for teams who have enabled AI features in zeroheight.

list-pages
Returns the full navigation tree for a styleguide — sections, categories, pages, and tabs.

get-page
Fetches the content of a specific page as Markdown, including usage notes, guidance, and any embedded assets. This is the source of truth for what the agent uses when applying your design system.

get-page-asset
Fetches images or file attachments referenced in a get-page response. Accepts multiple URIs in a single call.
```

Source: https://help.zeroheight.com/hc/en-us/articles/51478956166939-zeroheight-MCP-tools-reference

### “Write content as rules, not descriptions” — optimising docs for retrieval

Audience: builders

The single best vendor guidance on authoring DS docs for agent consumption. Key mechanism disclosed: the agent selects pages by title and navigation structure, not by reading everything, so information architecture is the retrieval index. Five rules: descriptive page titles, one topic per page, flat navigation, meaningful section/category names, and rules-not-prose. Also candid about model variance: smaller/older models struggle; ChatGPT and Codex “occasionally need explicit instruction to use the MCP”.

Link: https://help.zeroheight.com/hc/en-us/articles/50270875184795-Optimising-your-styleguide-for-consumption-via-MCP

```text
So the AI selects pages by their titles and structure, not by reading everything. It doesn't read the whole styleguide to decide what's relevant — it makes a judgement call from the navigation layer. This means how you structure your styleguide directly affects what the AI finds and uses.

Structuring your styleguide for AI
Use clear, descriptive page titles — The AI navigates primarily by title.
One topic per page — The AI picks pages, not sections within pages. Avoid combining unrelated content on a single page.
Keep navigation flat where possible — Deeply nested structures are harder for an AI to traverse. Flatter hierarchies improve both discoverability and retrieval reliability.
Name sections and categories meaningfully — Section and category names are surfaced during MCP navigation. "Foundations > Colour" gives the AI a solid signal.
Write content as rules, not descriptions — Succinct, unambiguous language works better than detailed prose. State what to do, not just what exists.
```

Source: https://help.zeroheight.com/hc/en-us/articles/50270875184795-Optimising-your-styleguide-for-consumption-via-MCP

### Local MCP server (@zeroheight/mcp-server) with sequencing coercion in tool descriptions

Audience: consumers

npm package for orgs that block remote MCP, need token auth, or run in CI/CD. Note the imperative sequencing baked into the tool descriptions themselves (“Call this tool first”, “Call this tool immediately after list-styleguides”), which pushes the model into a discovery-before-generation loop rather than letting it improvise from training data. Also note the disambiguation prompt: “If multiple systems are available, confirm with the user which should be used.”

Link: https://www.npmjs.com/package/@zeroheight/mcp-server

```markdown
{
  "mcpServers": {
    "zeroheight-mcp": {
      "command": "npx",
      "args": ["-y", "@zeroheight/mcp-server@latest"],
      "env": {
        "ZEROHEIGHT_ACCESS_TOKEN": "zhat_abc123",
        "ZEROHEIGHT_CLIENT_ID": "zhci_abc123"
      }
    }
  }
}

### Available Tools

**list-styleguides**
Discover available design systems that provide documented guidance for components, patterns, and styles. Call this tool first. If multiple systems are available, confirm with the user which should be used.
_Helpful to reference before generating UI so decisions can reflect established design approaches._

**list-pages**
View the navigation hierarchy of a design system — including categories, pages, and tabs — to better understand how guidance is organized. Call this tool immediately after list-styleguides with the desired styleguide ID.
_Helpful when determining where to look for component or pattern documentation before generating UI._

**get-page**
Fetch guidance from a specific design system page, including usage notes, recommendations, and supporting context.
_Particularly helpful ahead of UI generation to increase the likelihood that outputs reflect the intent of the design system._
```

Source: https://registry.npmjs.org/@zeroheight%2Fmcp-server

### Markdown Export — one-click AI-ready page context with a pre-filled constraining prompt

Audience: consumers

Fallback for teams that can’t enable MCP: viewers get “Copy page MD link”, “Copy page MD”, and “Open page MD link in…” which launches a chosen AI tool with a pre-filled prompt. That prompt is itself a coercion device: it durably scopes the whole conversation to the design system page. Admins choose which AI tools appear. SSO/password-protected pages only get “Copy page MD” because LLMs can’t fetch them.

Link: https://help.zeroheight.com/hc/en-us/articles/47142563041819-Markdown-Export

```text
The Markdown Export feature allows teams to turn any styleguide page into AI-ready context in one click. Styleguide viewers (and editors) can access a clean Markdown version of the page and send it directly to AI tools.

[...]

Open page MD link in...: opens a new tab in the browser with the AI tool with a pre-filled prompt referring to the page that reads:

For the duration of this conversation, refer to my design system page: [Markdown link]

This supports workflows such as:
- Asking an AI to summarise guidelines before applying them
- Validating UI decisions against documented standards
- Providing structured context to a coding agent
- Generating implementation examples aligned with system rules

Note: if styleguide or page is SSO or Password protected, then only the Copy page MD will be available since LLMs cannot access SSO or Password protected pages.
```

Source: https://help.zeroheight.com/hc/en-us/articles/47142563041819-Markdown-Export

### Docs Agent (closed beta) — Figma-change-driven documentation proposals

Audience: builders

Builder-side agent that watches Figma via OAuth for component/token/rename changes, reads the existing documentation, and proposes doc updates in a dedicated Docs Agent area. Deliberately suggestion-only during beta: “approving a proposal is to signal intent rather than change any documentation directly.” Up to 30 minutes latency, no notifications. Enterprise-only, requires “Allow use of AI features in styleguides”, OpenAI is the sub-processor, and neither zeroheight nor OpenAI use customer data for training.

Link: https://help.zeroheight.com/hc/en-us/articles/51269532940059-zeroheight-Docs-Agent-Closed-Beta

```text
The Docs Agent watches for changes in Figma and proposes changes to your design system in zeroheight. This works by looking at changes to Figma like updates to components, the agent then identifies the change, reads your documentation and determines if anything needs to be changed so you can keep your docs up to date without manual work.

[...]

Are there any prerequisites for the Beta?
- You must be on an Enterprise plan
- Your organization must have "Allow use of AI features in styleguides" enabled
- You must have at least one styleguide setup that corresponds to one or more Figma files

[...]

Will you use our data for training purposes?
Neither zeroheight nor OpenAI will use customer data for model training purposes.
```

Source: https://help.zeroheight.com/hc/en-us/articles/51269532940059-zeroheight-Docs-Agent-Closed-Beta

### Authoring assistants: Build/Write/Improve with AI, tone-of-voice instructions, AI release notes, Assistants for editors/viewers/Figma/Slack/Teams

Audience: builders

Builder-side authoring stack documented as distinct help-centre features: “Build with AI” (blank page → structured first draft mirroring existing docs’ layout and tone), “Write with AI” (first-pass content), “Improve with AI” (tighten wording, formatting, standardise tone), “AI tone of voice instructions” (org-level style constraint applied to generated copy), “AI-generated release notes”, and the zeroheight Assistant in four surfaces: editors (flags gaps, recommendations in-editor), viewers, Figma plugin (canvas-aware component queries), and Slack/Teams. Note the important governance caveat from the MCP FAQ: styleguide-level security (password/SSO) has NO impact on MCP reachability; only page-level privacy does.

Link: https://help.zeroheight.com/hc/en-us/articles/35887017130651-AI-powered-features-in-zeroheight

## Adoption by design systems

zeroheight is the only one of the three with a documented mechanism for DS teams to publicise MCP access to consumers: the “Remote MCP details block”, a slash-inserter block that renders each viewer’s unique MCP URL and per-client setup tabs directly inside a public styleguide page. That makes public adoption in principle observable, but it was not possible to verify a specific named public styleguide carrying the block. Named zeroheight customers appear in vendor marketing (Uber, Salesforce, United Airlines, Compare The Market on zeroheight.com/ai; Decathlon, with a 5-person core team, 30 contributors, 17 products and 19 countries, in the Design Systems Report 2026), but none of these is documented as using MCP specifically. Treat all adoption evidence as vendor-side. zeroheight’s own Design Systems Report 2026 is the better third-party datapoint for sector-wide MCP uptake.

Design systems with a recorded integration: [Salesforce Lightning Design System](https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md)

## Sources (12)

- https://help.zeroheight.com/hc/en-us/articles/48004395674011-zeroheight-MCP-overview

- https://help.zeroheight.com/hc/en-us/articles/51478956166939-zeroheight-MCP-tools-reference

- https://help.zeroheight.com/hc/en-us/articles/50270875184795-Optimising-your-styleguide-for-consumption-via-MCP

- https://help.zeroheight.com/hc/en-us/articles/43780251357979-Using-the-remote-zeroheight-MCP-server

- https://help.zeroheight.com/hc/en-us/articles/47142563041819-Markdown-Export

- https://help.zeroheight.com/hc/en-us/articles/51269532940059-zeroheight-Docs-Agent-Closed-Beta

- https://help.zeroheight.com/hc/en-us/articles/39914754674843-Set-up-the-local-MCP-server

- https://help.zeroheight.com/hc/en-us/articles/51467311835803-Set-up-MCP-access-via-login

- https://help.zeroheight.com/hc/en-us/articles/43737291730331-Set-up-MCP-access-via-link

- https://www.npmjs.com/package/@zeroheight/mcp-server

- https://zeroheight.com/mcp/

- https://zeroheight.com/ai/

---

Generated 2026-07-28T05:02:05Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
