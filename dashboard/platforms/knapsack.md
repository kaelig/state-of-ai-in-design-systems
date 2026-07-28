---
title: "Knapsack.cloud — AI capabilities"
description: "Knapsack runs TWO distinct MCP servers and is explicit about the difference. (1) The Knapsack MCP: a per-workspace endpoint at https://mcp.knapsack.cloud/mcp/ exposing…"
url: "https://state-of-ai-in-design-systems.netlify.app/platforms/knapsack.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/platforms#knapsack"
type: "platform-record"
json: "https://state-of-ai-in-design-systems.netlify.app/platforms/knapsack.json"
id: "knapsack"
capability_count: 7
design_systems_with_integration_records: 0
data_collected: "2026-07-26/27"
generated: "2026-07-28T05:02:05Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/platforms/knapsack.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Knapsack.cloud — AI capabilities

7 capabilities recorded. 0 of the 19 design systems in this study carry an integration record for this platform.

- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/platforms/knapsack.json
- Platforms view: https://state-of-ai-in-design-systems.netlify.app/platforms.md

## Summary

Knapsack runs TWO distinct MCP servers and is explicit about the difference. (1) The Knapsack MCP: a per-workspace endpoint at https://mcp.knapsack.cloud/mcp/ exposing your own workspace’s tokens, components, patterns and docs to any MCP client; setup is via the mcp-remote npx shim (requires Node 20+) and browser OAuth; gated behind an “Early Access” workspace flag. (2) A docs-site MCP at https://docs.knapsack.cloud/_mcp/server serving Knapsack’s own product documentation, with one-click “Connect to Claude Code” / “Connect to Cursor” page-action buttons. Knapsack’s docs site (built on Fern) also ships a full llms.txt with an explicit “Instructions for AI Agents” preamble, section-scoped llms.txt (append /llms.txt to any section URL), and per-page Markdown via appending .md: a three-tier retrieval design (llms.txt for whole-site, .md for single page, MCP for interactive). The differentiating builder feature is Data Sources: a contextual data layer wiring Storybook (live component implementation), the Knapsack workspace (tokens/docs/patterns) and Markdown files into MCP, pitched as letting AI “surface inconsistencies, flag drift”. PRICING/AVAILABILITY: Knapsack MCP requires an Early Access flag on the workspace or connection fails; Data Sources is explicitly gated: “Contact your sales partner to discuss unlocking data sources.” Knapsack is enterprise/sales-led with no self-serve public pricing; it raised a $10M Series A (Oct 2025) and positions the “Intelligent Product Engine” with limited beta and GA targeted March 2026. GAPS: no published list of Knapsack MCP tool names (unlike zeroheight and Supernova); no Code Connect-style mapping file; no public AGENTS.md/CLAUDE.md conventions; no customer-named adoption.

## Capabilities (7)

### Knapsack MCP — per-workspace endpoint, bring-your-own-model

Audience: consumers

A secure MCP server endpoint per workspace at https://mcp.knapsack.cloud/mcp/, giving MCP-compatible clients read access to workspace design system content and metadata (tokens, components, docs). Knapsack explicitly frames this as “bring-your-own-model”, with no lock-in to a single LLM provider. Workspace ID is the path segment between /site/ and /latest in your Knapsack site URL. Note the docs also flag it for enterprise MCP allowlists/registries.

Link: https://docs.knapsack.cloud/intelligent-tools

```markdown
**Knapsack MCP exposes a secure MCP server endpoint per workspace.** The endpoint conforms to the Model Context Protocol specification, enabling compliant clients (such as Claude Desktop) to register a Knapsack workspace as a source. Each MCP server instance is identified by a workspace-specific endpoint, typically:

`https://mcp.knapsack.cloud/mcp/<workspace-id>`

The client authenticates and maintains a session via this endpoint to retrieve context-aware resources.
```

Source: https://docs.knapsack.cloud/intelligent-tools.md

### Claude Desktop config via mcp-remote (Node 20+ required)

Audience: consumers

Official setup snippet. Knapsack MCP is a remote HTTP server proxied through the mcp-remote npx shim; auth happens in the browser on first connect. Docs call out Node 20 as a hard prerequisite and list “Early Access not enabled” as the top connection-failure cause.

Link: https://docs.knapsack.cloud/intelligent-tools/configure-with-claude

```json
{
  "mcpServers": {
    "knapsack-mcp-toby": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.knapsack.cloud/mcp/toby"
      ]
    }
  }
}
```

Source: https://docs.knapsack.cloud/intelligent-tools/configure-with-claude.md

### Data Sources — Storybook + workspace + Markdown as a grounded context layer

Audience: both

Sales-gated feature that turns MCP from a docs lookup into a grounded, multi-source context layer. Three source types at launch: Storybook (live component implementation), the Knapsack workspace (tokens, documentation, patterns), and Markdown files (any additional guidelines). Framed as enabling drift detection: “AI that can surface inconsistencies, flag drift, and generate outputs that stay true to your design standards at every layer.” The Storybook source is the closest thing Knapsack has to forcing the agent onto real component source rather than trained-in approximations.

Link: https://docs.knapsack.cloud/intelligent-tools

```markdown
#### Unlock the power of Data Sources

For teams who want more, Intelligent Tools allows you to create a contextual data layer to empower MCP workflows. In this release, you can connect three source types: **Storybook**, for live component implementation; your **Knapsack workspace**, for tokens, documentation, and patterns; and **Markdown files**, for any additional guidelines or reference content. Together, these give your AI a complete, grounded view of your design system.

Contact your sales partner to discuss unlocking data sources.

### Data Sources Available

Data Sources takes your MCP connection further. By linking external content — like your product codebase, brand guidelines, or Figma libraries — you give Knapsack a richer view of how your design system is actually built and used. The result: AI that can surface inconsistencies, flag drift, and generate outputs that stay true to your design standards at every layer.
```

Source: https://docs.knapsack.cloud/intelligent-tools.md

### Docs-site llms.txt with an explicit “Instructions for AI Agents” preamble

Audience: consumers

Knapsack’s product docs publish an llms.txt that opens by telling agents exactly how to retrieve content in three modalities: .md suffix per page, section-scoped /llms.txt, and the docs MCP server. Every .md page also repeats the same three-line preamble at the top, so any agent that fetches a single page is immediately told about the other two retrieval paths. This is a clean, copyable pattern for a DS docs site.

Link: https://docs.knapsack.cloud/llms.txt

```markdown
# Knapsack Documentation

> Documentation for Knapsack, the design system platform that unifies design tokens, components, and docs so teams design, build, and ship consistent products.

## Instructions for AI Agents

- For clean Markdown of any page, append `.md` to the page URL
- For section-specific indexes, append `/llms.txt` to any section URL
- For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.knapsack.cloud/_mcp/server
```

Source: https://docs.knapsack.cloud/llms.txt

### Docs MCP server + one-click client install (separate from workspace MCP)

Audience: both

A second, distinct MCP server that exposes Knapsack’s own documentation so agents stop “guessing from stale training data”. Page-action buttons at the top of every docs page copy a `claude mcp add` command or deep-link into Cursor with the URL pre-filled. Knapsack explicitly disambiguates it from the workspace MCP.

Link: https://docs.knapsack.cloud/intelligent-tools/mcp-server

````markdown
This documentation site runs its own Model Context Protocol (MCP) server, so an AI coding assistant can query these docs directly instead of guessing from stale training data. Ask it how to configure SSO, wire up a Git provider, or troubleshoot a deploy preview, and it can pull the answer straight from these pages.

The server is available at:

`https://docs.knapsack.cloud/_mcp/server`

This MCP server exposes the content of *this documentation site*. It's a different thing from the [Knapsack MCP](/intelligent-tools), which connects AI tools to your own workspace's design tokens, components, and docs.

[...]

For a CLI client like Claude Code:

```bash title="Terminal"
claude mcp add --transport http knapsack-docs https://docs.knapsack.cloud/_mcp/server
```
````

Source: https://docs.knapsack.cloud/intelligent-tools/mcp-server.md

### Three-tier retrieval guidance: llms.txt vs .md vs MCP

Audience: builders

Knapsack documents when to use each retrieval channel, a rare piece of explicit guidance on machine-readable docs architecture. Also documents provenance: the one-line description in llms.txt comes from each page’s frontmatter `description`, falling back to `subtitle`. Useful precedent for DS teams generating their own llms.txt.

Link: https://docs.knapsack.cloud/intelligent-tools/llms-txt

```markdown
## When to use which

* Pointing an agent at the whole site, or one section of it: `llms.txt`.
* Pointing it at a single page, or copying a page for your own agent: the `.md` URL or the page-action buttons.
* Interactive, conversational access from an AI coding tool: the [MCP server](/intelligent-tools/mcp-server).
```

Source: https://docs.knapsack.cloud/intelligent-tools/llms-txt.md

### Framing: AI output vs actual standards

Audience: both

Knapsack’s stated thesis for Intelligent Tools, useful as a quotable position statement on why MCP beats prompt-pasting.

Link: https://docs.knapsack.cloud/intelligent-tools

```markdown
AI tools are only as good as the context they're given. Knapsack's Intelligent Tools connect your AI assistant directly to your workspace — giving it live access to your design tokens, components, and documentation, so every output reflects your actual standards, not a generic approximation.
```

Source: https://docs.knapsack.cloud/intelligent-tools.md

## Adoption by design systems

No named design system publicly documents using the Knapsack MCP. Knapsack’s own docs site (docs.knapsack.cloud, Fern-hosted) dogfoods the llms.txt + .md + docs-MCP pattern, and the docs use workspace ID `toby` as the worked example (Knapsack’s own workspace). Press coverage around the Oct 2025 $10M Series A cites anonymized results: a Fortune 500 retailer at ~20% efficiency gain / ~$1M projected annual savings, and a global pharmaceutical company at 30% QA-time reduction / >$10M projected annual savings, but names no design system. Adoption evidence is vendor-side only.

## Sources (8)

- https://docs.knapsack.cloud/llms.txt

- https://docs.knapsack.cloud/intelligent-tools.md

- https://docs.knapsack.cloud/intelligent-tools/mcp-server.md

- https://docs.knapsack.cloud/intelligent-tools/configure-with-claude.md

- https://docs.knapsack.cloud/intelligent-tools/configure-with-vs-code.md

- https://docs.knapsack.cloud/intelligent-tools/llms-txt.md

- https://www.knapsack.cloud/

- https://techcrunch.com/2025/10/09/knapsack-picks-up-10m-to-help-bridge-the-gap-between-design-and-engineering-teams/

---

Generated 2026-07-28T05:02:05Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
