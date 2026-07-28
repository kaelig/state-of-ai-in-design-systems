---
title: "How to read this dataset"
description: "Entity model, the affordance-type and technique-category taxonomies, provenance, and the SQLite tables."
url: "https://state-of-ai-in-design-systems.netlify.app/about/schema.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/about/schema.md"
type: "schema"
id: "schema"
affordance_type_count: 15
technique_category_count: 11
data_collected: "2026-07-26/27"
generated: "2026-07-28T03:38:29Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/about/schema.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# How to read this dataset

Read this before querying or quoting counts. It defines the entities, the two controlled vocabularies, and where provenance lives. Labels here are the only ones in the data — if you need a category that is not listed, the answer is `other`, not a new label.

## Entities

- **system** — one design system or component library. Keyed by `id` (the same slug used in every URL). Fields: `name`, `org`, `category`, `repo_url`, `docs_url`, `license`, `ai_maturity`, `summary`, `maintenance`, `building_vs_consumption`, `gaps`, `sources`, plus nested `affordances`, `techniques` and `platform_integrations`.
- **affordance** — one thing a system ships for AI consumption or for AI-assisted maintenance. Fields: `type`, `name`, `official`, `audience`, `description`, `docs_url`, `code_url`, `notes`, `snippet`.
- **technique** — one way a system coerces a model into staying on-system. Fields: `name`, `category`, `description`, `snippet`.
- **platform_integration** — a system's recorded relationship with one of the 5 platforms. Fields: `platform`, `description`, `url`.
- **platform** — one design-system platform. Fields: `name`, `summary`, `capabilities`, `adoption_by_design_systems`, `sources`.
- **snippet** — a verbatim excerpt of a real file: `language`, `content`, `source_url`.

## Provenance

There is no confidence field and no rating of evidence in this dataset. Provenance is the `source_url` on each snippet plus the `sources` list on each record: they point at the file the text was taken from, so any single claim can be rechecked with one fetch. Snippets are excerpts, capped and sometimes abridged mid-list — follow the source URL before quoting further. How the data was gathered is at https://state-of-ai-in-design-systems.netlify.app/methodology.md.

## Affordance types (15)

| `type` | Label | Records |
|---|---|---:|

| `agents-md` | AGENTS.md | 13 |

| `ai-docs-page` | AI docs page | 13 |

| `claude-md` | CLAUDE.md | 4 |

| `claude-skill` | Agent skill | 29 |

| `cli-scaffolding` | CLI scaffolding | 9 |

| `codemod-ai` | AI codemod | 2 |

| `copilot-instructions` | Copilot instructions | 5 |

| `cursor-rules` | Cursor rules | 4 |

| `figma-code-connect` | Code Connect | 4 |

| `llms-txt` | llms.txt | 14 |

| `mcp-server` | MCP server | 35 |

| `other` | Other | 19 |

| `prompt-library` | Prompt library | 2 |

| `registry` | Registry | 12 |

| `storybook-integration` | Storybook | 3 |

## Technique categories (11)

| `category` | Label | Techniques | Definition |
|---|---|---:|---|

| `validation-loop` | Validation loop | 29 | Linters, type checks and audit tools the agent is told to run, turning “follow the system” into a feedback loop with failures it has to fix. |

| `prohibition` | Prohibition | 25 | Explicit negative rules aimed at the model: never invent components, no raw colour values, no inline styles. |

| `curated-context` | Curated context | 21 | Docs condensed and structured for context windows: llms.txt, llms-full.txt, per-page markdown mirrors, machine-readable component indexes. |

| `tool-gating` | Tool-gating | 20 | The agent has to call a tool — MCP, CLI, search script — to get component source or docs. It cannot answer from its weights, so it cannot hallucinate the API. |

| `token-enforcement` | Token enforcement | 13 | Rules and types that force design tokens over raw values, so the token vocabulary is the only sanctioned styling channel. |

| `exemplars` | Exemplars | 10 | Few-shot incorrect/correct pairs, templates and demo blocks placed where the model will read them. |

| `registry-metadata` | Registry metadata | 9 | Machine-readable registries describing components, dependencies and files, so agents resolve real artifacts instead of inventing them. |

| `instruction-files` | Instruction files | 9 | CLAUDE.md, AGENTS.md and editor rules distributed in repos or to consumers, loaded into agent context automatically. |

| `scaffolding` | Scaffolding | 7 | CLIs generate the canonical code; the agent runs commands instead of writing component source from scratch. |

| `design-code-mapping` | Design–code mapping | 3 | Code Connect-style node-to-component mappings, so design-to-code generation lands on real components with real props. |

| `other` | Other | 2 | Techniques that don't fit the taxonomy, often the most interesting ones. |

## Enumerated values

- `ai_maturity`: `ai-native` (13 systems — AI consumption is a design goal, with dedicated surfaces and staff behind it), `invested` (5 systems — official MCP, skills or rules with real engineering behind them), `emerging` (1 systems — llms.txt or an AI docs page, little more), `none` (0 systems — no AI affordances found)

- `category` on a system: `component-library`, `design-system`

- `audience` on an affordance: `both`, `builders`, `consumers`

- `platform` on an integration: `figma`, `other`, `storybook`, `zeroheight`

- `official` on an affordance: `true` when maintained by the system's own team, `false` for community work.

## Record ids (19 systems, 5 platforms)

Ids are stable and are the same in the URLs, the JSON, the SQLite export and the MCP server. They are never renamed.

`ant-design`, `atlassian-design-system`, `carbon-design-system`, `chakra-ui`, `daisyui`, `heroui`, `nuxt-ui`, `patternfly`, `primer-github`, `react-spectrum-s2`, `salesforce-slds`, `shadcn-ui`, `shopify-polaris`, `cloudscape-design-system`, `mantine`, `material-ui`, `fluent-ui-microsoft`, `nord-design-system`, `uswds`

`figma`, `storybook`, `supernova`, `knapsack`, `zeroheight`

## SQLite

https://state-of-ai-in-design-systems.netlify.app/data/state-of-ai.sqlite holds the same records as tables: `systems`, `affordances`, `techniques`, `platform_integrations`, `platforms`, `platform_capabilities`, `sources`. Query it rather than counting by hand.

```sql
-- Who ships official MCP servers?
SELECT s.name, a.name FROM affordances a JOIN systems s ON s.id = a.system_id
WHERE a.type = 'mcp-server' AND a.official = 1;

-- All tool-gating tricks, with receipts
SELECT s.name, t.name, t.snippet_source_url FROM techniques t
JOIN systems s ON s.id = t.system_id WHERE t.category = 'tool-gating';
```

JSON Schema for one system record: https://state-of-ai-in-design-systems.netlify.app/data/design-system.schema.json

---

Generated 2026-07-28T03:38:29Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
