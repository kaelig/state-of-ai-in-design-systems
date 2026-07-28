---
title: "The 148 coercion techniques"
description: "Every team here is solving the same problem: a model will happily write plausible code against a component API that doesn’t exist. The 148 techniques catalogued below…"
url: "https://state-of-ai-in-design-systems.netlify.app/techniques.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/techniques"
type: "view"
id: "techniques"
technique_count: 148
category_count: 11
data_collected: "2026-07-26/27"
generated: "2026-07-28T02:17:18Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/techniques.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Coercion techniques (148)

Every team here is solving the same problem: a model will happily write plausible code against a component API that doesn’t exist. The 148 techniques catalogued below are the industry’s answers, grouped into 11 categories, from blunt prohibition (“never invent components”) to setups where hallucination stops being possible because the agent has to fetch source it can’t fabricate.

Grouped into 11 categories. The category is the retrieval unit: each category file carries every technique in it, with the verbatim snippet and the source URL. This page is the index.

| Category | Techniques | Systems | File |
|---|---:|---:|---|

| Validation loop | 29 | 19 | https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md |

| Prohibition | 25 | 18 | https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md |

| Curated context | 21 | 17 | https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md |

| Tool-gating | 20 | 16 | https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md |

| Token enforcement | 13 | 11 | https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md |

| Exemplars | 10 | 10 | https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md |

| Registry metadata | 9 | 9 | https://state-of-ai-in-design-systems.netlify.app/techniques/registry-metadata.md |

| Instruction files | 9 | 9 | https://state-of-ai-in-design-systems.netlify.app/techniques/instruction-files.md |

| Scaffolding | 7 | 7 | https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md |

| Design–code mapping | 3 | 3 | https://state-of-ai-in-design-systems.netlify.app/techniques/design-code-mapping.md |

| Other | 2 | 2 | https://state-of-ai-in-design-systems.netlify.app/techniques/other.md |

## Validation loop (29)

Linters, type checks and audit tools the agent is told to run, turning “follow the system” into a feedback loop with failures it has to fix. Read when asked how to make a design system's rules enforceable.

Full text: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

- Mandatory post-edit lint loop (`antd lint`) — Ant Design (https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md)

- axe-core validation loop with capability-scoped tools — Atlassian Design System (https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md)

- Published head-to-head context-delivery evals — Atlassian Design System (https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md)

- Self-check validation list of known silent failures — Carbon Design System (https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md)

- Migration validation loop: codemod dry-run → typecheck → lint → build → grep for leftovers — Chakra UI (https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md)

- Named the failure mode: “Your LLM ignores the instructions and skills” — daisyUI (https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md)

- Builder-side: mandate an external MCP as the anti-hallucination source of truth — daisyUI (https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md)

- Hook-enforced validation loop on every edit — HeroUI (https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md)

- Scaffolding-first + validation-loop checklist for contributor agents — Nuxt UI (https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md)

- Eval-gated skills with a 1.0 no-false-positive gate — PatternFly (https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md)

- Deterministic grep commands instead of model judgment — PatternFly (https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md)

- ERROR/WARN severity report contract with fix strings — PatternFly (https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md)

- Hard tool-gated validation loop (“REQUIRED FINAL STEP”) — Primer (https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md)

- Build-toolchain validation loop before declaring done — React Spectrum / Spectrum 2 (S2) (https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md)

- Deterministic scoring rubric with anti-vibe language — React Spectrum / Spectrum 2 (S2) (https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md)

- Verify Before You Use — no artifact without a registry lookup — Salesforce Lightning Design System (https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md)

- Mandatory linter-first migration workflow — Salesforce Lightning Design System (https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md)

- Scored compliance gate with an explicit degradation formula — Salesforce Lightning Design System (https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md)

- MCP-side audit checklist as a post-generation validation loop — shadcn/ui (https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md)

- Committed eval suite for the skill (rule-level assertions) — shadcn/ui (https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md)

- Compiler-in-the-loop validation with bounded retry — Shopify Polaris (https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md)

- Teaching the agent the CI check it will otherwise fail — Cloudscape Design System (https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md)

- Mandatory verification loop + cross-vendor agent-reviews-agent handoff — Mantine (https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md)

- Mandatory contributor validation loop (7-step pre-PR checklist incl. a prose linter) — Material UI (MUI) (https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md)

- Effort-tiered review skill with precision/recall bias switching — Material UI (MUI) (https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md)

- Lint-rule → fix-recipe table, with re-run verification per file — Microsoft Fluent UI (https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md)

- Visual verification loop: per-component Storybook + Playwright screenshot — Microsoft Fluent UI (https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md)

- Auto-fixable codemod rule as a migration lever (deterministic, not AI) — Nord Design System (https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md)

- Mandatory validator loop before finalizing output — U.S. Web Design System (USWDS) (https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Prohibition (25)

Explicit negative rules aimed at the model: never invent components, no raw colour values, no inline styles. Read when writing SKILL.md or rules-file language.

Full text: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

- Authoritative export allow-list with named anti-examples — Ant Design (https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md)

- Directory-scoped import prohibitions for contributor agents — Ant Design (https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md)

- Mandatory accessibility gate (‘You MUST call this’) — Atlassian Design System (https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md)

- DESIGN.md ‘drift pattern’ table — an explicit anti-AI-slop prohibition list — Atlassian Design System (https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md)

- Numbered implementation guardrails: hard prohibitions on styling escape hatches — Carbon Design System (https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md)

- Prohibition list on v2 API surface (prop-name blacklist) — Chakra UI (https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md)

- Closed class-name allowlist + escape-hatch ladder + default-variant bias — daisyUI (https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md)

- “STOP. What you remember is WRONG” — weight-invalidation preamble — HeroUI (https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md)

- ALWAYS/NEVER prefix prohibitions + ordered escalation ladder — PatternFly (https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md)

- Allowlisted design sources — PatternFly (https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md)

- Named-API prohibitions served over MCP — Primer (https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md)

- Anti-invention clauses backed by platform-level output caps — Primer (https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md)

- Named-competitor prohibition + escape-hatch ban — React Spectrum / Spectrum 2 (S2) (https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md)

- Anti-“reinvent the component” clauses with named failure modes — React Spectrum / Spectrum 2 (S2) (https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md)

- Explicit Do/Don’t prohibition list — Salesforce Lightning Design System (https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md)

- Hard prohibition list (‘Critical Rules … always enforced’) — shadcn/ui (https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md)

- Named-package prohibition to kill stale-training imports — Shopify Polaris (https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md)

- Deliberate crawler starvation for the deprecated surface — Shopify Polaris (https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md)

- Hard CSS prohibitions in contributor docs (builder-side) — Cloudscape Design System (https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md)

- ‘Never X — use Y’ escape-hatch closing in satellite repos — Cloudscape Design System (https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md)

- FAQ-as-prohibition: negative answers hoisted to the top of llms.txt — Mantine (https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md)

- “using ONLY the URLs present in the returned content” — closed-world retrieval rule — Material UI (MUI) (https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md)

- “Source of truth, not existing code” — overriding the repo itself — Microsoft Fluent UI (https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md)

- Per-component Do/Don’t blocks that route the model to the correct sibling component — Nord Design System (https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md)

- Absolute prohibition on inventing UI — U.S. Web Design System (USWDS) (https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Curated context (21)

Docs condensed and structured for context windows: llms.txt, llms-full.txt, per-page markdown mirrors, machine-readable component indexes. Read when designing an llms.txt or a skill routing table.

Full text: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

- “Your training data is stale” preamble as a distributable prompt — Ant Design (https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md)

- Server-level `instructions` string as a persona + routing table — Atlassian Design System (https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md)

- Conditional lazy-loading of reference files (‘→ Only read when …’) — Carbon Design System (https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md)

- Concern-sliced llms.txt as a context budget device — Chakra UI (https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md)

- Progressive disclosure — ‘read X before responding’ — Chakra UI (https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md)

- “Mandatory reference” routing table with per-file MANDATORY flags — daisyUI (https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md)

- Ground-truth-first subagents (“never assume, always verify”) — HeroUI (https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md)

- Adversarial recommendation steering inside llms.txt — Nuxt UI (https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md)

- Division of labour between skill and MCP (context-budget routing) — Nuxt UI (https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md)

- Two-step search→use retrieval contract with schema fusion — PatternFly (https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md)

- Semantic color remapping to defeat literal color prompts — Primer (https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md)

- Progressive disclosure over a generated 211-file reference tree — React Spectrum / Spectrum 2 (S2) (https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md)

- Skill routing table — ‘do not improvise from memory’ — Salesforce Lightning Design System (https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md)

- Live project-context injection at skill load (`info --json`) — shadcn/ui (https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md)

- Dual-format docs routing: .md for reasoning, .json for typing — Cloudscape Design System (https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md)

- Narrowest-scope-first decision ladder for styling — Material UI (MUI) (https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md)

- Two-tier skill layout: SKILL.md as router, AGENTS.md as payload — Material UI (MUI) (https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md)

- Token lookup as a search procedure + few-shot mapping table — Microsoft Fluent UI (https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md)

- SKILL.md as a pure routing table (progressive disclosure, no inlined rules) — Nord Design System (https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md)

- Two-tier skill packaging keyed to context budget — Nord Design System (https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md)

- De-facto registry via scrapeable Jekyll data files — U.S. Web Design System (USWDS) (https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Tool-gating (20)

The agent has to call a tool — MCP, CLI, search script — to get component source or docs. It cannot answer from its weights, so it cannot hallucinate the API. Read when designing an MCP server's tool surface.

Full text: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

- “Always query before writing” — forced CLI lookup instead of recall — Ant Design (https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md)

- Two-tier tool hierarchy: ads_* canonical, atlaskit_* fallback-only — Atlassian Design System (https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md)

- MCP-First Rule: ‘The MCP index is the authoritative source — not your weights’ — Carbon Design System (https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md)

- Least-privilege bot mode + prompt-injection quarantine (builder side) — Carbon Design System (https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md)

- Zod enum over the live component list (agent cannot hallucinate a component) — Chakra UI (https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md)

- “Mandatory MCP workflow” — tool-gated sequential pipeline with a terminal quality gate — daisyUI (https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md)

- Forced retrieval — the skill ships executable fetchers, not prose — HeroUI (https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md)

- Tool-gating: ban on pre-trained API knowledge — Nuxt UI (https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md)

- Router agent with an explicit opt-out gate — PatternFly (https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md)

- Forced tool ordering (“CRITICAL: CALL THIS FIRST”) — Primer (https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md)

- Mandatory local MCP before answering (Storybook as ground truth) — Primer (https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md)

- Catalog-as-source-of-truth: forbid grepping node_modules, force the MCP tool — React Spectrum / Spectrum 2 (S2) (https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md)

- Forcing the CLI as the only source of truth (no training-data guessing, no raw GitHub fetches) — shadcn/ui (https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md)

- Mandatory retrieval before generation (‘you cannot trust your trained knowledge’) — Shopify Polaris (https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md)

- Emoji-escalated imperative in the MCP tool description itself — Shopify Polaris (https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md)

- Redirectable context source (MANTINE_MCP_DATA_URL) — Mantine (https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md)

- “You must use this tool to answer any questions” — hard tool mandate in the tool description — Material UI (MUI) (https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md)

- Host allowlist enforced in code (agent physically cannot fetch off-system) — Material UI (MUI) (https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md)

- Recommend-then-apply gating on mutating skills — Microsoft Fluent UI (https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md)

- Query-the-server-before-you-choose (tool gating) — U.S. Web Design System (USWDS) (https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Token enforcement (13)

Rules and types that force design tokens over raw values, so the token vocabulary is the only sanctioned styling channel. Read when an agent keeps emitting raw hex values.

Full text: https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md

- `ads_plan` as the default one-shot discovery call, with full-catalog dumps demoted to ‘last resort’ — Atlassian Design System (https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md)

- AI-provenance marking: `.ai-non-final` message-ID suffix — Atlassian Design System (https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md)

- Output-suppression protocol: ‘Received the necessary context.’ — Carbon Design System (https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md)

- Token-first styling rule with a narrowly bounded escape hatch — Chakra UI (https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md)

- Unsolicited-trigger framing: “the mandatory UI library”, fires “even if the user does not explicitly ask” — daisyUI (https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md)

- Semantic-token enforcement — “Don’t use raw colors” — HeroUI (https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md)

- Token enforcement: semantic colors only, never the raw Tailwind palette — Nuxt UI (https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md)

- Bounded-deviation token rules for generative theming — Nuxt UI (https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md)

- Semantic-token enforcement with wrong/right exemplars — Salesforce Lightning Design System (https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md)

- Harness-level enforcement: formatting as a hook, not an instruction — Mantine (https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md)

- Numbered “Critical Rules (never violate)” with token enforcement at #1 — Microsoft Fluent UI (https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md)

- Private-API prohibition: component properties over CSS custom properties, never `--_n-*` — Nord Design System (https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md)

- Token-over-custom-CSS with an explicit escape hatch — U.S. Web Design System (USWDS) (https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Exemplars (10)

Few-shot incorrect/correct pairs, templates and demo blocks placed where the model will read them. Read when deciding what examples to put in front of a model.

Full text: https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md

- Anti-hallucination proof-by-counterexample for icon names — Carbon Design System (https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md)

- Output contract: no placeholders, minimum two breakpoints, bounded explanation — Chakra UI (https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md)

- Exemplar library as coercion: 211 page architectures matched by intent — daisyUI (https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md)

- Negative exemplars — a labelled “DO NOT DO THIS” code block — HeroUI (https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md)

- Canonical in-repo exemplar for the pattern models get wrong — Salesforce Lightning Design System (https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md)

- Incorrect/Correct exemplar pairs as the rule bodies — shadcn/ui (https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md)

- Inlined prop-complete component catalogue as few-shot exemplars — Shopify Polaris (https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md)

- 181 addressable few-shot exemplars at predictable URLs — Cloudscape Design System (https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md)

- Progressive disclosure in skills: SKILL.md then references/api.md + references/patterns.md — Mantine (https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md)

- Version-pinned CDN exemplar shell — U.S. Web Design System (USWDS) (https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Registry metadata (9)

Machine-readable registries describing components, dependencies and files, so agents resolve real artifacts instead of inventing them. Read when publishing machine-readable component metadata.

Full text: https://state-of-ai-in-design-systems.netlify.app/techniques/registry-metadata.md

- Version-pinned knowledge (55+ per-minor offline snapshots) — Ant Design (https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md)

- Capability Matrix as machine-readable routing table (with named failure modes) — Carbon Design System (https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md)

- Auto-refresh pipeline: docs deploy → MCP re-extraction — HeroUI (https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md)

- Standards-based machine discovery (server card + api-catalog + content negotiation) — Nuxt UI (https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md)

- Rule IDs with ADR authority citations — Primer (https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md)

- Constraint smuggled into the API schema itself — Cloudscape Design System (https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md)

- Version-locked AI surface — the MCP server ships with the release — Mantine (https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md)

- Version-fencing the skill so the agent self-invalidates on the wrong major — Material UI (MUI) (https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md)

- PR-type classification table that scopes which rules apply — Microsoft Fluent UI (https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md)

## Instruction files (9)

CLAUDE.md, AGENTS.md and editor rules distributed in repos or to consumers, loaded into agent context automatically. Read when writing AGENTS.md or CLAUDE.md for a component library.

Full text: https://state-of-ai-in-design-systems.netlify.app/techniques/instruction-files.md

- One instruction set, many vendors (symlinked .claude / .cursor / AGENTS.md) — Ant Design (https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md)

- One artifact, three delivery formats (llms.txt ≡ .mdc rule ≡ skill) — daisyUI (https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md)

- False-positive suppression in AI PR review — Nuxt UI (https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md)

- Role priming + processing-priority headers in builder guidelines — PatternFly (https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md)

- Globbed parity rule for contributors’ agents — shadcn/ui (https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md)

- Disambiguation clause in skill description (routing coercion) — Shopify Polaris (https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md)

- Docs shattered into an agent-routable index — Cloudscape Design System (https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md)

- Host-served skill via well-known discovery instead of per-editor rule files — Nord Design System (https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md)

- Anti-hallucination gotcha list (build-system disambiguation) — U.S. Web Design System (USWDS) (https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Scaffolding (7)

CLIs generate the canonical code; the agent runs commands instead of writing component source from scratch. Read when a CLI could generate the code instead of the model.

Full text: https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md

- Read-the-project-first ordering (inspect before generate) — Chakra UI (https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md)

- Scaffold-only component creation (builders) — HeroUI (https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md)

- Agent self-propagation via the `init` tool — Primer (https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md)

- Layered skill handoff (build → audit → migrate) — React Spectrum / Spectrum 2 (S2) (https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md)

- Ordered escalation ladder (LBC → Blueprint → Hook → Custom CSS) — Salesforce Lightning Design System (https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md)

- Paved-road escape hatch: a skill for “I need a component Mantine doesn’t have” — Mantine (https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md)

- Forcing the generator instead of free-hand scaffolding — Microsoft Fluent UI (https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md)

## Design–code mapping (3)

Code Connect-style node-to-component mappings, so design-to-code generation lands on real components with real props. Read when connecting Figma components to code.

Full text: https://state-of-ai-in-design-systems.netlify.app/techniques/design-code-mapping.md

- Deprecated-to-current rename table (“Do Not Hallucinate the Old Names”) — Ant Design (https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md)

- Demote the Figma MCP from generator to reference — React Spectrum / Spectrum 2 (S2) (https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md)

- Registry-as-oracle AI codemod (golden-pair three-way merge) — shadcn/ui (https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md)

## Other (2)

Techniques that don't fit the taxonomy, often the most interesting ones. Read when looking for approaches outside the ten main categories.

Full text: https://state-of-ai-in-design-systems.netlify.app/techniques/other.md

- Closed-loop telemetry: the agent reports on itself — Shopify Polaris (https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md)

- Human-review-preserving framing (opt-in, non-replacing) — U.S. Web Design System (USWDS) (https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

---

Generated 2026-07-28T02:17:18Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
