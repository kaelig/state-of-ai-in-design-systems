---
title: "Methodology and caveats"
description: "How the systems were picked, what counted as an affordance or a technique, and what the numbers do and do not support."
url: "https://state-of-ai-in-design-systems.netlify.app/methodology.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/methodology"
type: "view"
id: "methodology"
caveat_count: 5
data_collected: "2026-07-26/27"
generated: "2026-07-28T04:40:59Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/methodology.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Methodology

How the set was picked and what counted as an affordance or a technique. Every number on this site is computed from the records, not typed in.

Research agents (Claude Opus 5) gathered the data on 26–27 July 2026, coordinated by a lead model (Claude Fable 5). Scouts mapped the territory, then one researcher per system catalogued affordances and coercion techniques against a fixed schema, quoting files verbatim and linking every claim to its source. Every claim was checked against its primary source before publication.

Inclusion criteria: open source, active within the last six months, and enough public surface to study. The set spans AI-native leaders, large corporate systems and one deliberate public-sector contrast case. Where monorepos are private (Atlassian, Nord, SLDS internals), records rely on published packages and docs, and say so.

AI maturity is a four-step editorial rating applied with one rubric across all systems: **none** (no AI affordances found), **emerging** (llms.txt or an AI docs page, little more), **invested** (official MCP, skills or rules with real engineering behind them), **ai-native** (AI consumption is a core design goal).

The full dataset ships alongside this report as JSON records and a relational SQLite database: systems, affordances, techniques, platform capabilities and sources.

## Provenance

Every affordance, technique and capability in the dataset carries the URL of the file it was taken from, and every snippet is a verbatim excerpt of that file. That URL is the provenance: open it and you can check the claim yourself. Records list their sources at the foot of each page, and the relational export (https://state-of-ai-in-design-systems.netlify.app/data/state-of-ai.sqlite) keeps the same URLs in `affordances.snippet_source_url`, `techniques.snippet_source_url` and `sources.url`.

## Caveats (5)

- A snapshot taken 26–27 July 2026. The systems described here ship weekly, so expect drift within weeks.

- Snippets are excerpts, capped at 40 lines and sometimes abridged mid-list. Follow the source link before quoting further.

- Builder-side findings cover public evidence only. Private monorepos may hold agent tooling this study can’t see; “no public agent files” is not “no AI usage”.

- Community tools were checked for existence, not audited for quality or maintenance.

- Maturity ratings are our judgment against one rubric, not vendor self-reports.

## Counts

- Design systems: 19
- Platforms: 5
- AI affordances: 168
- Coercion techniques: 148
- Systems with an official MCP server: 16
- Systems with official agent skills: 17
- Systems publishing llms.txt: 14

The counts above are computed from the published dataset at build time. Recount them yourself: https://state-of-ai-in-design-systems.netlify.app/data/design-systems.json or https://state-of-ai-in-design-systems.netlify.app/data/state-of-ai.sqlite.

---

Generated 2026-07-28T04:40:59Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
