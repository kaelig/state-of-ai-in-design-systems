---
title: "Use this report with AI tools"
description: "Read this report with an AI assistant: the markdown twins, a prompt to paste, the MCP server, the raw data, and the tools this page registers itself."
url: "https://state-of-ai-in-design-systems.netlify.app/ai.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/ai"
type: "view"
id: "ai"
data_collected: "2026-07-26/27"
generated: "2026-07-28T02:39:42Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/ai.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Use this report with AI tools

## What this is

This report is published twice: once as pages for you, once as plain text for models. Same data, different shape. If you work with an AI assistant, you can point it at the text version and get answers grounded in the 19 records here instead of whatever it half-remembers about design systems.

There are three ways to do that, in rising order of effort. Paste a link and a prompt into a chat window. Connect the report to your assistant as something it can query, which is one line of setup. Or download the data and work on it yourself.

Nothing below needs a login or an API key. Everything is a URL you can open.

## Point your AI at the markdown

Every page on this site has a markdown twin: add .md to the address. The /systems and /platforms records also have .json twins. There are 60 markdown files in total, and one file that indexes them all.

- [llms.txt — the index](https://state-of-ai-in-design-systems.netlify.app/llms.txt): Start here. One page listing every other file, with sizes.

- [Report overview](https://state-of-ai-in-design-systems.netlify.app/index.md): The lede and the 9 findings.

- [One file per design system](https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md): Swap the last part for any of the 19 record ids. Add .json instead of .md for the typed version.

- [One file per technique category](https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md): 11 categories covering all 148 techniques.

- [The affordance matrix](https://state-of-ai-in-design-systems.netlify.app/matrix.md): Who ships what, as a plain table.

- [Everything in one file](https://state-of-ai-in-design-systems.netlify.app/llms-full.txt): Only if you have the context window for it.

You can also skip the .md: if your tool asks for text/markdown in its Accept header, this site answers with the markdown twin automatically. Claude Code, Cursor and OpenCode already do.

To use any of this in a chat, paste the prompt below and put your question at the end. It works in Claude, ChatGPT, Gemini, Cursor — anything that can fetch a URL.

```text
Read https://state-of-ai-in-design-systems.netlify.app/llms.txt. It indexes a July 2026 field study of 19 open-source design systems and 5 platforms: what each one ships so coding agents can build with it, and the 148 techniques teams use to keep models on real components and tokens.

Then answer using only what you read there, and cite the source URL on each record rather than the page you found it on. The data is a snapshot of 2026-07-27; if anything you remember contradicts it, say so instead of quietly picking one.

My question: 
```

## Connect the MCP server

An MCP server lets an assistant query this dataset directly — search it, pull one system’s record, count things — instead of fetching files and guessing. It lives at https://state-of-ai-in-design-systems.netlify.app/mcp. It is public, read-only, unauthenticated, and built from the same 2026-07-27 snapshot as everything else. Pick your client:

### Claude Code

Adds it for every project on your machine.

```bash
claude mcp add --transport http --scope user state-of-ai https://state-of-ai-in-design-systems.netlify.app/mcp
```

### Any project, checked into the repo

Save as .mcp.json at the root. The type field is required — a url without a type is read as a local command and skipped.

```json
{
  "mcpServers": {
    "state-of-ai": {
      "type": "http",
      "url": "https://state-of-ai-in-design-systems.netlify.app/mcp"
    }
  }
}
```

### Claude Desktop and claude.ai

No config file needed.

```text
Settings → Connectors → Add custom connector → paste https://state-of-ai-in-design-systems.netlify.app/mcp
```

### Cursor

~/.cursor/mcp.json for all projects, or .cursor/mcp.json for one.

```json
{
  "mcpServers": {
    "state-of-ai": {
      "url": "https://state-of-ai-in-design-systems.netlify.app/mcp"
    }
  }
}
```

### VS Code (Copilot agent mode)

Save as .vscode/mcp.json. The top-level key is servers here, not mcpServers.

```json
{
  "servers": {
    "state-of-ai": {
      "type": "http",
      "url": "https://state-of-ai-in-design-systems.netlify.app/mcp"
    }
  }
}
```

### Anything else

Windsurf, Zed, LangChain, Semantic Kernel and most frameworks take this shape.

```json
{
  "state-of-ai": {
    "type": "http",
    "url": "https://state-of-ai-in-design-systems.netlify.app/mcp"
  }
}
```

The tools may change as the report is maintained. Treat it as a way to read this study, not as a stable API.

## Download the data

The whole dataset, in the shapes people usually want it. CC BY 4.0: use it, credit “State of AI in Design Systems — July 2026, Kaelig Deloumeau-Prigent”.

- [design-systems.json](https://state-of-ai-in-design-systems.netlify.app/data/design-systems.json): All 19 records, merged.

- [platforms.json](https://state-of-ai-in-design-systems.netlify.app/data/platforms.json): The 5 platform records.

- [insights.json](https://state-of-ai-in-design-systems.netlify.app/data/insights.json): Findings, convergence, divergence, essay, methodology, caveats.

- [design-system.schema.json](https://state-of-ai-in-design-systems.netlify.app/data/design-system.schema.json): The record shape, including the technique taxonomy.

- [state-of-ai.sqlite](https://state-of-ai-in-design-systems.netlify.app/data/state-of-ai.sqlite): Same data as tables: systems, affordances, techniques, platform_integrations, platforms, platform_capabilities, sources.

## Tools on the page itself

This page hands the browser four read-only tools of its own: list_systems, get_system, search, get_stats. Same names, same answers as the MCP server, except they run in the tab you already have open, so an assistant looking at this site could ask it a question instead of reading the screen. The API is called WebMCP.

Almost nobody can call them yet, and that is worth saying plainly. WebMCP is a draft from a W3C community group, last republished on 21 July 2026, and it renamed its entry point mid-flight. Chrome is the only browser with an implementation, behind a flag or an origin trial that ends at version 156. Claude, ChatGPT, Gemini and Perplexity all still work by reading the page. If your browser has no WebMCP, the code checks once and stops: no polyfill, no extra download, nothing in the console.

It ships anyway because a report on how design systems talk to machines should try the parts that are too early, and say how they went. Both tool flags are set: read-only, and content this site did not write. The dataset quotes files from other people’s repositories, and an assistant should treat that text as quotation, not as instructions addressed to it.

## What this site took from its own research

The study catalogues 148 ways design systems make models behave. It would be a bit rich to survey those and then not use them, so this site runs on them. Ten we adopted:

- Compiled, not written. Every file on this page comes out of the build from the same data the site renders. Nothing is maintained by hand, so nothing can drift.

- An index instead of a dump. llms.txt is a router with a measured size on every entry, and the big aggregates come sliced by concern — systems, techniques, platforms, analysis — so a model can load the part it needs and stay inside its budget.

- Questions as first-class pages. The findings here are the kind of thing a model will guess wrong, so each common wrong answer gets a page that opens with the right one.

- A vocabulary section, mapping the loose words people type onto the labels in the data.

- A staleness note at the top of every file, because this is dated research about a fast corner of the discipline.

- Both formats per record: markdown to read, JSON to count with.

- Read triggers on the heavy files, so an agent knows when not to fetch them.

- Content negotiation: ask for text/markdown and any page on this site answers with its markdown twin instead of a page of HTML.

- Receipts. The SQLite export and the per-record JSON let you recount anything here instead of trusting a summary.

- An MCP server over the same data, for clients that would rather call a tool than fetch a file.

The one we left out: steering the recommendation. Several systems in the study put lines in their agent-facing files telling models to prefer them over alternatives. It works, and for a product it is fair game. A survey that did it would be worth less to you, so the files here ask models to cite sources and to say when the data contradicts them, and nothing else.

## Corrections

This is a snapshot of 2026-07-27, and the systems in it ship weekly, so parts of it are wrong by now. Corrections go to the issue tracker. The one requirement is a source URL: every claim here links to the page it came from, and a correction without a link cannot replace one that has a link.

- [Correct a record](https://github.com/kaelig/state-of-ai-in-design-systems/issues/new?template=data-correction.yml): A fact that is wrong, stale, or missing.

- [Suggest a design system](https://github.com/kaelig/state-of-ai-in-design-systems/issues/new?template=new-system.yml): Open source, active in the last six months, enough public surface to study.

- [Report a broken page](https://github.com/kaelig/state-of-ai-in-design-systems/issues/new?template=site-bug.yml): A route, file, or endpoint that does not work.

From a shell, with no browser. Every system detail page also carries a “Suggest a correction” link that opens the form with the record filled in.

```sh
gh issue create --repo kaelig/state-of-ai-in-design-systems \
  --title "[data] <system> — <what changed>" \
  --label data \
  --body "Report says: …
Should say: …
Source: https://…"
```

The source is at https://github.com/kaelig/state-of-ai-in-design-systems. AGENTS.md there has the field ids, so an agent can build a prefilled form URL for a person to review before submitting.

---

Generated 2026-07-28T02:39:42Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
