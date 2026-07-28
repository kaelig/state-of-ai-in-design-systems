---
title: "Insights: findings, convergence, divergence, essay"
description: "The 9 findings, where the 19 systems agree, where they split, and the long-form argument."
url: "https://state-of-ai-in-design-systems.netlify.app/insights.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/insights"
type: "view"
id: "insights"
finding_count: 9
data_collected: "2026-07-26/27"
generated: "2026-07-28T04:48:05Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/insights.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Insights

Nineteen records read together: what nearly every team now ships, and what the leading systems do that the rest haven’t started.

## Findings (9)

### 1. The machine interface is table stakes: 16 of 19 ship an official MCP server

Only Cloudscape, Nord and USWDS lack one, and Cloudscape makes up for it with the most engineered docs pipeline in the study. Nobody is still arguing about whether to ship a machine interface. The arguments now are about how the context gets sliced, how generation gets gated, and how the whole thing is kept from rotting.

### 2. 2026 is the year of the agent skill

Seventeen of nineteen ship official agent skills (Cloudscape has none; USWDS has an open issue). Distribution has settled on `npx skills add`, and Nord, React Spectrum, Nuxt UI and Atlassian serve skills from well-known discovery endpoints, a pattern that didn’t exist a year ago. PatternFly ships 32 consumer skills across 8 plugins. daisyUI sells paid Dashboard and Charts skills next to its free one.

### 3. The frontier: portable design context and published evals

Atlassian ships DESIGN.md, an 80KB token-first manifest (RFC 2119 rules over roughly a thousand lines of YAML tokens) for generating on-brand UI anywhere, and routes production work to the MCP server instead. It also published head-to-head evals of its own affordances: MCP vs skill vs DESIGN.md vs no context, with token, time and turn counts. shadcn regression-tests its skill’s rules with an evals.json. Agent-facing artifacts are becoming measured, versioned software.

### 4. Tool-gating beats prohibition

The strongest systems restructure the task so hallucination can’t happen, rather than asking nicely. Shopify’s Polaris skill tells the model “you cannot trust your trained knowledge” and gates every answer behind a docs search plus a validator run. Primer writes “CRITICAL: CALL THIS FIRST” into its MCP tool descriptions, and “you cannot complete a task involving CSS without a successful run of this tool”. shadcn’s skill bans fetching raw files outright: “NEVER fetch raw files from GitHub manually — always use the CLI.”

### 5. The best context files are compiled, not written

Mantine regenerates llms.txt, a 4.2MB llms-full.txt and mcp/index.json from the same MDX and docgen data as the human docs, on every release. Cloudscape mirrors every docs page as markdown, exposes typed JSON API definitions per component and regenerates llms.txt daily. HeroUI refreshes its MCP server from docs deploys via repository_dispatch. Hand-written agent docs rot. These can’t.

### 6. Consumer-side and builder-side investment barely track each other

Fluent UI has the deepest builder-side agent stack in the study (nine executable skills, never-violate rules, lint auto-fix loops, visual verification) and almost nothing for consumers. React Spectrum, shadcn, Polaris and SLDS are the mirror image: heavy consumer investment, no public agent files for contributors. Carbon, HeroUI, Ant Design and Chakra are the few investing seriously on both sides.

### 7. A walled-garden pattern is emerging alongside the open one

Polaris blocks GPTBot, ClaudeBot and friends in robots.txt and puts `noai` meta tags on every docs page, while funneling all AI consumption through Shopify’s own tightly gated toolkit. Nuxt UI bets the other way: RFC 9727 api-catalog, Link headers, markdown content negotiation, maximum discoverability for any agent. Both are deliberate. They can’t both be the future.

### 8. Validation loops turn guidelines into gates

SLDS ships a dedicated validate skill plus slds-linter. Fluent’s skills wrap lint auto-fix loops with Storybook and Playwright visual checks. shadcn exposes an audit checklist as an MCP tool. Polaris bundles a validate.mjs the agent must run. None of them trust generation. They check it mechanically and make the agent fix what fails.

### 9. The public sector is sitting this out, so far

USWDS ships zero consumer-facing AI affordances: no llms.txt, no MCP, no AI docs. Three weeks before this study it merged a single deliberately vendor-neutral AGENTS.md for contributors, on 2026-07-06. That is the entire federal contribution to date. The AI-affordance race is a private-sector phenomenon for now.

## Convergence (5)

### llms.txt plus markdown twins of every docs page

The near-universal baseline: 14 of 19 systems publish llms.txt. The refinement war is over context budgets. Chakra slices llms.txt six ways by concern, HeroUI four ways by platform, Atlassian six ways by topic, Nuxt UI serves section-scoped variants, and Cloudscape regenerates daily with typed JSON API definitions per component.

### Official MCP servers, converging on read-only retrieval

Sixteen of nineteen systems have an official MCP channel, and nearly all expose the same core shape: search docs, get component docs and examples, list tokens. The variance is in delivery. Bundled in the CLI (shadcn), npm stdio (MUI, Chakra, Mantine, HeroUI, Spectrum, Primer, PatternFly, daisyUI), hosted remote with auth (Carbon, Nuxt UI, Atlassian), or owned by the platform org rather than the DS team (SLDS via @salesforce/mcp, Polaris via Shopify’s dev MCP).

### Agent skills with progressive disclosure

The dominant skill architecture is a compact SKILL.md router plus lazy-loaded reference files. Carbon: a 24KB SKILL.md with 12 reference files. Nuxt UI: a routing table with 15. Chakra: a decision tree over its ~114 components. Everyone landed on the same trick independently: keep the always-loaded surface small and gate the detail behind explicit reads.

### Prohibition language that names the hallucination

The most effective negative rules name the exact failure. Ant Design’s allow-list exists to stop models hallucinating `Box`/`Stack`/`Container`. shadcn bans raw divs with `space-y-*` and manual `dark:` overrides. Carbon and SLDS both enumerate the components that exist, so anything else is provably invented.

### Design-to-code grounding via Figma Code Connect

248 public repos carry @figma/code-connect in package.json. For the systems that invest (Carbon, Primer, Fluent and Spectrum among them), it is the only mechanism in the stack that grounds design-to-code generation in real component imports rather than pixel reconstruction.

## Divergence (5)

### Open discovery vs. walled garden

Nuxt UI publishes an RFC 9727 api-catalog, Link headers and markdown content negotiation so any agent can find everything. Polaris blocks AI crawlers outright and routes all consumption through Shopify’s own toolkit, where it enforces the strictest ruleset in the study. The industry hasn’t decided whether the machine interface is a public good or a controlled channel.

### Where the affordances live

In the DS repo itself, with skills and MCP developed in-tree (shadcn, HeroUI, Chakra). In the platform tooling layer, invisible from the DS repo (SLDS inside @salesforce/mcp, Polaris inside shopify-ai-toolkit). Or in the docs-site infrastructure (Cloudscape, Nord). Where it lives predicts who maintains it and how fast it ships.

### Vendor-neutral vs. harness-specific

USWDS wrote one deliberately vendor-neutral AGENTS.md. Primer went all-in on GitHub-native formats: copilot-instructions.md plus path-scoped *.instructions.md. HeroUI ships system prompts tuned per vendor (v0.dev, bolt.new, universal). Most hedge by shipping the same content through every channel at once.

### Builder-side philosophy: rulebook vs. router

Fluent UI’s contributor stack is a rulebook: numbered never-violate rules and nine operational skills. Carbon and Cloudscape bet on routers, keeping AGENTS.md deliberately tiny (Carbon’s opens by telling maintainers to keep it short; Cloudscape’s ~20 lines point into a 12-file docs index) and trusting retrieval over resident context.

### Paid AI surfaces are appearing inside open systems

MUI’s MCP includes generateReactCode, a paid service that can ground generation in a Figma frame. Chakra’s MCP unlocks Pro templates with an API key. daisyUI sells Dashboard and Charts skills. The open-source design system with a commercial AI tier is now a live business model, and it changes the incentives around how good the free machine interface is allowed to be.

## Essay

Two years ago the question was whether design systems should care about AI consumption at all. That debate is over: of the nineteen systems here, all but one ship official machine-facing affordances, and thirteen treat AI consumption as a core design goal. What’s still contested, and what this study set out to map, is how you make a probabilistic text generator reliably use *your* components and *your* tokens rather than a statistically plausible imitation of them.

The answers cluster into three generations. The first is documentation reshaped for machines: llms.txt, markdown twins of docs pages, condensed component indexes. Nearly everyone does this now, and the state of the art is no longer writing these files but compiling them from the same sources as the human docs so they can’t drift. The second is instruction: rules files and skills that tell the model what to do and, mostly, what never to do. The best instruction writing reads like policy rather than documentation: numbered never-violate rules, allow-lists of exported components written to stop models hallucinating `Box`/`Stack`/`Container` (Ant Design), Incorrect/Correct exemplar pairs (shadcn).

The third generation, and the clearest line between the leaders and the pack, is structural coercion: redesigning the task so the model can’t go off-system even if it wants to. Tool-gating makes the agent call an MCP tool or CLI to get component source; Primer writes “CRITICAL: CALL THIS FIRST” straight into its tool descriptions. Scaffolding has the CLI generate canonical code while the agent merely orchestrates (shadcn). Registries resolve real artifacts instead of imagined ones. Validation loops make the agent run linters and audits until they pass (SLDS, Fluent, Polaris). Instruction hopes the model complies. Structure checks.

The design-system team’s own repo is a different battlefield from the consumer’s repo, and investment on the two sides barely correlates. Some of the most consumer-invested systems (React Spectrum, shadcn, SLDS) show no public builder-side agent files at all, while Fluent UI runs the deepest contributor stack in the study behind a thin consumer surface. A quieter trend connects the leaders: they have started treating agent files as versioned, evaluated software. shadcn ships evals for its skill. Mantine version-locks its MCP server to each release. Atlassian published benchmark numbers. Carbon’s AGENTS.md opens by telling maintainers to keep it short because it’s loaded into every agent’s context. Give the machine interface the care you already give the component API. That is the part of this worth copying.

---

Generated 2026-07-28T04:48:05Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
