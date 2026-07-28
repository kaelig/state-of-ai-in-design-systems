---
title: "Salesforce Lightning Design System — AI affordances"
description: "SLDS is one of the most aggressively AI-instrumented design systems in the study, but almost none of that instrumentation lives in the design system’s own repo…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.json"
id: "salesforce-slds"
category: "design-system"
ai_maturity: "ai-native"
affordance_count: 10
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-28T03:38:29Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Salesforce Lightning Design System — AI affordances

Salesforce · design-system · NOASSERTION (BSD-3-Clause style Salesforce license); slds-linter ISC; starter kit + sf-skills Apache-2.0 · AI maturity: **ai-native** (AI consumption is a design goal, with dedicated surfaces and staff behind it). 10 affordances, 8 coercion techniques.

- Docs: https://www.lightningdesignsystem.com
- Repo: https://github.com/salesforce-ux/design-system
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds

## Summary

SLDS is one of the most aggressively AI-instrumented design systems in the study, but almost none of that instrumentation lives in the design system’s own repo. Salesforce moved AI affordances into the platform tooling layer: the Salesforce DX MCP server (`@salesforce/mcp`) ships an `lwc-experts` toolset with dedicated SLDS tools (`explore_slds_blueprints`, `guide_slds_blueprints`, `explore_slds_styling`, `guide_slds_styling`, `guide_design_general`, `guide_figma_to_lwc_conversion`), and `@salesforce/afv-skills` ships three first-party Agent Skills (`design-systems-slds-apply`, `-validate`, `-slds2-migrate`) with bundled JSON registries of 523 styling hooks / 1,147 utilities / 85 blueprints / 1,732 icons plus `search-*.cjs` scripts the agent is ordered to run before emitting any SLDS artifact. The `@salesforce-ux/slds-linter` CLI closes a real validation loop that skills and rules files mandate. The reference consumer surface is `salesforce-ux/design-system-2-starter-kit`, which carries `.builderrules`, `AGENTS.md`, `CLAUDE.md`, `mcp.json` and local `.agent/skills/`. The gap is the builder side: the public SLDS repos contain zero CLAUDE.md/AGENTS.md/.cursorrules, and SLDS 2 itself is not open source (`design-system-2` is a DOCS_ONLY placeholder), so how the team maintains the system with AI is invisible.

## Maintenance

- Actively maintained: yes
- Last release: salesforce-ux/design-system (SLDS 1) v2.27.2 — 2025-07-10 (last GitHub release); repo pushed 2026-06-02. @salesforce-ux/slds-linter 1.2.1 — 2026-03-05. @salesforce/afv-skills 1.32.0 — 2026-07-24. design-system-2-starter-kit pushed 2026-07-23.
- Activity: Two-speed maintenance. The open-source SLDS 1 repo (salesforce-ux/design-system, 3.7k stars) is in maintenance: last tagged release July 2025, repo touched June 2026. All active investment has moved to SLDS 2, whose source is NOT public: salesforce-ux/design-system-2 and salesforce-ux/design-tokens contain only a DOCS_ONLY.md placeholder plus license files. The living, frequently-updated artifacts are the tooling repos: slds-linter, design-system-2-starter-kit (July 2026), and forcedotcom/sf-skills (761 stars, pushed 2026-07-24), which is where the SLDS agent skills are authored.

## AI affordances (10)

### Salesforce DX MCP Server — SLDS tools (`lwc-experts` toolset)

Type: `mcp-server` (MCP server) · Official · Audience: consumers

@salesforce/mcp ships SLDS-specific tools inside the `lwc-experts` toolset: `explore_slds_blueprints` (retrieve blueprint specs by name, category, Lightning component, CSS class, or styling hook), `guide_slds_blueprints` (index of all 85 blueprints), `explore_slds_styling` (search styling hooks with exact/fuzzy/prefix/wildcard), `guide_slds_styling`, `guide_design_general` (GA), and `guide_figma_to_lwc_conversion`. Blueprint and styling tools are marked NON-GA and require `--allow-non-ga-tools`.

- Docs: https://developer.salesforce.com/docs/platform/lwc/guide/mcp-slds.html

- Code: https://github.com/salesforcecli/mcp

Notes: This is the primary SLDS-for-agents surface. Note it is owned by the CLI/platform org (salesforcecli/forcedotcom), not by salesforce-ux. The design system team does not ship its own MCP server.

```markdown
    - `explore_slds_styling`  (NON-GA): Searches for SLDS styling hooks with support for exact lookup, fuzzy matching, prefix search, and wildcard patterns.
    - `guide_slds_styling`(NON-GA): Retrieves SLDS styling hooks guidance and reference documentation.
  - FIX: The `guide_slds_blueprints` and `explore_slds_blueprints` tools are NON-GA.
...
  - `explore_slds_blueprints`: Retrieves SLDS blueprint specifications by name, category, Lightning component, CSS class, or styling hook.
  - `guide_slds_blueprints`: Retrieves guidance and reference documentation for SLDS blueprints, as well as a complete index of all available blueprints by category.
...
    - `guide_design_general` (GA): Provide comprehensive Salesforce Lightning Design System (SLDS) guidelines and best practices for Lightning Web Components with accessibility, responsive design, and component usage patterns.
```

Source: https://raw.githubusercontent.com/forcedotcom/mcp/main/releasenotes/README.md

### @salesforce/afv-skills — design-systems-slds-apply / -validate / -slds2-migrate

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

Three first-party Agent Skills for SLDS, shipped as an npm dependency and authored in forcedotcom/sf-skills (Apache-2.0, 761 stars). `design-systems-slds-apply` is the default for any SLDS UI work; `design-systems-slds-validate` produces a scored compliance scorecard; `design-systems-slds2-migrate` drives SLDS 1→2 uplift off linter violations. Each bundles machine-readable registries (`assets/hooks-index.json`, `utilities-index.json`, `blueprints/components/*.yaml`, `icon-metadata.json`) and Node search scripts. Installable into any skills-aware agent via `npx skills add forcedotcom/sf-skills`; auto-installed in Agentforce Vibes.

- Docs: https://www.npmjs.com/package/@salesforce/afv-skills

- Code: https://github.com/forcedotcom/sf-skills/tree/main/skills

Notes: v1.32.0, published 2026-07-24. README explicitly warns skills ‘may be renamed, restructured, or removed between releases’. Skills are framework-aware: the validate analyzer only scans .css/.html/.js and is flagged as a partial signal for JSX/TSX.

````markdown
| Artifact | Count | Description |
|----------|-------|-------------|
| **Lightning Base Components** | ~70 | Pre-built LWC components (LWC only) |
| **SLDS Blueprints** | 85 | CSS/HTML patterns for any framework |
| **Styling Hooks** | 523 | CSS custom properties (`--slds-g-*`) for theming |
| **Utility Classes** | 1,147 | Rapid styling classes for spacing, layout, visibility |
| **Icons** | 1,732 | SVG icons across 5 categories |

## Component Selection Hierarchy

Always follow this order:

```
1. Lightning Base Components (LWC only)    ← Check first
2. SLDS Blueprints (any framework)         ← Use exact SLDS classes
3. Custom with Styling Hooks               ← Use var(--slds-g-*)
4. Custom CSS (last resort)                ← Still use hooks for values
```
````

Source: https://www.npmjs.com/package/@salesforce/afv-skills — Path in tarball: package/skills/design-systems-slds-apply/SKILL.md

### @salesforce-ux/slds-linter

Type: `cli-scaffolding` (CLI scaffolding) · Official · Audience: consumers

The SLDS team’s own CLI (ISC, v1.2.1, 2026-03-05) wrapping custom ESLint + Stylelint rules for SLDS 2: `slds/class-override`, `slds/lwc-token-to-slds-hook`, `slds/no-hardcoded-values`, `slds/no-deprecated-tokens-slds1`. Supports `--fix` for bulk autofix and SARIF report output. This is the deterministic verifier that both the agent skills and the starter kit’s AGENTS.md force the agent to run after edits, the closest thing to a true validation loop in the SLDS ecosystem.

- Docs: https://developer.salesforce.com/docs/platform/slds-linter/overview

- Code: https://github.com/salesforce-ux/slds-linter

Notes: Owned by salesforce-ux (the DS team), unlike the MCP server. Companion package @salesforce-ux/metadata-slds carries the validation/autofix metadata.

````markdown
### SLDS linter

After you change any `.html` or `.css` file, run the SLDS linter on each file you touched before considering the task complete:

```bash
npx @salesforce-ux/slds-linter@latest lint <path-to-changed-file>
```

Fix reported issues where possible. If something cannot be fixed, say so briefly.
````

Source: https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/AGENTS.md

### design-system-2-starter-kit — AGENTS.md + CLAUDE.md

Type: `agents-md` (AGENTS.md) · Official · Audience: consumers

The SLDS team’s reference agent-facing scaffold (Apache-2.0, pushed 2026-07-23). AGENTS.md (5.4 KB) covers file placement, the linter loop, forbidden patterns, and a routing table pointing the agent at the afv-skills SKILL.md files by exact node_modules path. CLAUDE.md is a single line, `@AGENTS.md`, the import-pointer pattern, so Claude Code and other agents share one source of truth.

- Code: https://github.com/salesforce-ux/design-system-2-starter-kit/blob/main/AGENTS.md

```markdown
### Engineering habits

- For ALL UI work, **read `node_modules/@salesforce/afv-skills/skills/design-systems-slds-apply/SKILL.md` first**.
- **Prefer Lightning Base Components over hand-rolled SLDS markup.** When a `lightning-*` component exists for what you're building, use it instead of reconstructing the `slds-*` blueprint from memory (e.g. `lightning-card` not `slds-card`, `lightning-button` not `slds-button`, `lightning-icon` not `slds-icon`). Only hand-roll a blueprint when no base component covers the case, and say so when you do.
- Prefer small, single-responsibility LWCs and readable structure.
- Do not use `!important`.
- Do not use inline `style` attributes; use utility classes or the component's CSS file as appropriate.

### Forms

Use Lightning Base Component form elements (`lightning-input`, `lightning-combobox`, `lightning-radio-group`, `lightning-textarea`, `lightning-select`) for all form inputs. Do not use raw `<input>`, `<select>`, or `<textarea>`.
```

Source: https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/AGENTS.md

### design-system-2-starter-kit — .builderrules

Type: `cursor-rules` (Cursor rules) · Official · Audience: consumers

A 7.9 KB Agentforce Vibes / builder rules file titled ‘Salesforce UI Guidelines’. Contains the most explicit coercion language in the SLDS ecosystem: a mandatory ordered 5-step ‘UI CODE CHECKLIST’ to run before writing ANY UI code, with each step naming the MCP tool to call, plus hard prohibitions and correct/incorrect examples for semantic hook usage.

- Code: https://github.com/salesforce-ux/design-system-2-starter-kit/blob/main/.builderrules

```markdown
## UI CODE CHECKLIST

Before writing ANY UI code, complete this checklist **IN ORDER**:

1. **[ ] Search Lightning Base Components index** – Does a component exist for this?
          **If YES** → Use it.
          **If NO** → Proceed to step 2.

2. **[ ] Search SLDS Component Blueprints** – Does a blueprint exist for this?
          - **Use the MCP tool `explore_slds_blueprints`** to search by name, category, or keyword. Use `guide_slds_blueprints` for general blueprint guidance and a full index of all available blueprints.
          **If YES** → Create a new LWC that implements this component blueprint.
          **If NO** → Proceed to step 3.

3. **[ ] Check SLDS Utility Classes** – Does one exist for this styling need?
          **If YES** → Use it.
          **If NO** → Proceed to step 4.

4. **[ ] Use Custom CSS with Styling Hooks** - Does one exist for this CSS property?
          **If YES** → Use it (with fallback value).
          **If NO** → Proceed to step 5.

5. **[ ] Use a hard-coded CSS value** - Only when no component, utility class, or styling hook exists.
```

Source: https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/.builderrules

### Bundled SLDS artifact registries + search scripts (hooks/utilities/blueprints/icons)

Type: `registry` (Registry) · Official · Audience: consumers

design-systems-slds-apply ships offline machine-readable indexes: `assets/hooks-index.json` (523 hooks), `assets/utilities-index.json` (1,147 classes), `assets/blueprints/components/*.yaml` (85 blueprints), `assets/icon-metadata.json` (1,732 icons), each with a dedicated `scripts/search-*.cjs` lookup. This is the anti-hallucination substrate: the skill forbids emitting any SLDS artifact that a search script hasn’t confirmed exists.

- Code: https://github.com/forcedotcom/sf-skills/tree/main/skills/design-systems-slds-apply/assets

Notes: Works offline with no MCP server, which makes it the fallback path when the DX MCP server isn’t wired up.

### guide_figma_to_lwc_conversion (Figma → LWC, Beta)

Type: `mcp-server` (MCP server) · Official · Audience: consumers

An `lwc-experts` MCP tool that converts Figma frames to LWC specs with SLDS guidelines applied and automatic ‘SLDS design system compliance’ validation. It does NOT pair with Figma’s own Dev Mode MCP server in the docs. Salesforce points users at the third-party Framelink MCP server to read Figma files, then hands the result to the Salesforce tool for SLDS conformance.

- Docs: https://developer.salesforce.com/docs/platform/lwc/guide/mcp-design.html

Notes: No published Figma Code Connect repository for SLDS was found. The design→code bridge is asserted to work via consistent styling-hook naming between the Figma kit and code, not via Code Connect mappings.

### mcp.json — zero-config MCP wiring in the starter kit

Type: `other` (Other) · Official · Audience: consumers

The starter kit checks in an `mcp.json` so any MCP-aware editor (Claude Code, Cursor, VS Code + Copilot) auto-loads the Salesforce DX MCP server with the SLDS toolsets pre-selected and non-GA tools unlocked. This is the ‘add to Cursor’ pattern expressed as a committed repo file rather than a docs button.

- Code: https://github.com/salesforce-ux/design-system-2-starter-kit/blob/main/mcp.json

```json
{
  "mcpServers": {
    "SalesforceDX": {
      "type": "stdio",
      "command": "npx",
      "args": [ "-y", "@salesforce/mcp@latest", 
                "--orgs", "ALLOW_ALL_ORGS",
                "--toolsets", "code-analysis,lwc-experts",
                "--tools", "guide_design_general,guide_figma_to_lwc_conversion",
                "--allow-non-ga-tools"]
    }
  }
}
```

Source: https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/mcp.json

### design-system-2-starter-kit — local .agent/skills/

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

Project-local skills shipped alongside the vendored ones: `.agent/skills/repo-setup/SKILL.md` and `.agent/skills/first-time-deploy/SKILL.md`, routed from AGENTS.md’s skill table so the agent can take a prototype from local dev to a shareable GitHub Pages URL without human steps.

- Code: https://github.com/salesforce-ux/design-system-2-starter-kit/tree/main/.agent/skills

### AI and SLDS 2 (docs page)

Type: `ai-docs-page` (AI docs page) · Official · Audience: consumers

A dedicated ‘AI and SLDS 2’ page exists in the zeroheight-hosted docs at /2e1ef8501/v/60694/p/52a7c7-ai-and-slds-2, surfaced in search results. It is behind a client-rendered zeroheight SPA and could not be fetched as text, so its content is unverified here.

- Docs: https://www.lightningdesignsystem.com/2e1ef8501/p/52a7c7-ai-and-slds-2

Notes: Unverified content, listed because the page’s existence is confirmed via search indexing, not because its text was read. The SPA also means the whole SLDS 2 docs site is largely opaque to naive agent fetching.

## Coercion techniques (8)

### Verify Before You Use — no artifact without a registry lookup

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

The single strongest anti-hallucination construct found in SLDS. The apply skill names the failure mode (agents inventing hook names by interpolating patterns), then bans emission of any hook, utility, blueprint class, or icon that a bundled search script hasn’t confirmed. A whole section, ‘Hook Naming Traps’, enumerates families where the numbering intuition breaks.

```markdown
## Verify Before You Use

> **Rule:** Never include an SLDS hook, utility class, blueprint class, or icon in generated code without first confirming it exists in the metadata. Guessing based on naming patterns is the primary source of invented artifacts.

Run the appropriate search command **before** emitting any SLDS artifact:

| Artifact | Verification command | Source of truth |
|----------|---------------------|-----------------|
| Styling hook (`--slds-g-*`) | `node scripts/search-hooks.cjs --prefix "<hook-name>"` | `assets/hooks-index.json` |
| Utility class (`slds-*`) | `node scripts/search-utilities.cjs --search "<class-name>"` | `assets/utilities-index.json` |
| Blueprint / CSS class | `node scripts/search-blueprints.cjs --search "<pattern>"` then read the YAML | `assets/blueprints/components/*.yaml` |
| Icon | `node scripts/search-icons.cjs --query "<description>"` | `assets/icon-metadata.json` |

If the search returns no match: **do not use the artifact.** Find an alternative from the search results or build custom with verified hooks.
```

Source: https://www.npmjs.com/package/@salesforce/afv-skills — Path in tarball: package/skills/design-systems-slds-apply/SKILL.md

### Explicit Do/Don’t prohibition list

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

The apply skill’s Core Rules are a flat imperative list. Notable: it forbids overriding `.slds-*` at all (forcing custom `my-*`/`c-*` classes instead), bans the private `--slds-s-*` shared hook namespace, bans reassigning hook values (reference-only via var()), and bans deprecated `--lwc-*` tokens. The .builderrules restates the harshest of these: ‘Never use !important. Never override SLDS classes in your CSS.’

```markdown
### Don't

- Hard-code colors, spacing, or typography values
- Override `.slds-*` classes directly
- Use deprecated `--lwc-*` tokens as primary values
- Use `--slds-s-*` (shared) hooks -- they are private/internal
- Reassign hook values -- only reference them with `var()`
- Use color alone to convey meaning
- Invent hook names by interpolating patterns from other families (see Naming Traps below)
```

Source: https://www.npmjs.com/package/@salesforce/afv-skills — Path in tarball: package/skills/design-systems-slds-apply/SKILL.md

### Mandatory linter-first migration workflow

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

The SLDS 1→2 migration skill opens with an all-caps non-negotiable: the agent must run `slds-linter --fix .` as step 1 before any reasoning, so deterministic autofix handles the mechanical cases and the model only spends judgment on the residue (mostly color-hook selection, which the skill explicitly flags as context-dependent).

````markdown
# Workflow

```
1. **REQUIRED — ALWAYS run first:** npx @salesforce-ux/slds-linter@latest lint --fix . — NEVER skip this step. This handles simple violations automatically.
2. Review linter output -> Identify remaining manual fixes needed
3. Fix by violation type -> Use per-rule reference guides
4. Choose the right hook -> Context-first, inspect HTML before deciding
````

Source: https://www.npmjs.com/package/@salesforce/afv-skills — Path in tarball: package/skills/design-systems-slds2-migrate/SKILL.md

### Scored compliance gate with an explicit degradation formula

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

The validate skill turns ‘is this on-system?’ into a number: Linter Compliance = 100 − (violations × 10), combined with Theming, Accessibility, Code Quality, and Component Usage. It even specifies a renormalized weighting for when the linter can’t run (no Node, CI sandbox), so the agent can’t silently skip verification and still claim a passing grade; it must mark ‘Linter not run’ in the report header. Step 3 is a ‘Required manual review gate’.

````markdown
## Quality Validation Process

```
1. Run SLDS Linter     → Collect violation counts (linter's job)
2. Run Analyze Script  → Check what linter doesn't cover (supplementary)
3. Agent Review        → Required manual review gate
4. Score & Grade       → Compute automated score + final recommendation
5. Generate Report     → Produce formatted scorecard
```

**Linter Compliance Score** = `100 - (total_violations × 10)`, minimum 0.

**If the linter is unavailable** (no Node.js, no network access, CI sandbox restrictions): skip this step, note "Linter not run" in the report header, mark Linter Compliance as N/A, and compute the Overall score using the remaining 4 categories renormalized to 100%:

```
Overall (linter unavailable) = (Theming × 0.29) + (Accessibility × 0.29)
                              + (CodeQuality × 0.21) + (ComponentUsage × 0.21)
```
````

Source: https://www.npmjs.com/package/@salesforce/afv-skills — Path in tarball: package/skills/design-systems-slds-validate/SKILL.md

### Ordered escalation ladder (LBC → Blueprint → Hook → Custom CSS)

Category: `scaffolding` (Scaffolding) · all 7 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md

The same four-rung ladder is restated in three independent places: SKILL.md ‘Component Selection Hierarchy’, .builderrules ‘UI CODE CHECKLIST’ (as a 5-step checkbox list with If YES/If NO branches), and AGENTS.md ‘Engineering habits’. Redundancy across rules file, skill, and MCP tool descriptions is the coercion strategy: whichever context the agent loads, it meets the same ordering.

```markdown
1. **[ ] Search Lightning Base Components index** – Does a component exist for this?
          **If YES** → Use it.
          **If NO** → Proceed to step 2.

2. **[ ] Search SLDS Component Blueprints** – Does a blueprint exist for this?
          - **Use the MCP tool `explore_slds_blueprints`** to search by name, category, or keyword.
          **If YES** → Create a new LWC that implements this component blueprint.
```

Source: https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/.builderrules

### Semantic-token enforcement with wrong/right exemplars

Category: `token-enforcement` (Token enforcement) · all 13 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md

Beyond ‘use tokens’, .builderrules polices *semantic correctness* of token usage (a hook must not be repurposed for an unintended CSS property) and demands a fallback value on every var() for backwards compatibility, specifying the Cosmos theme value as the fallback. The ❌/✅ pair is a compact few-shot correction.

```markdown
**Usage Guidelines:**
- Global styling hooks are CSS variables: `background: var(--slds-g-color-surface-1, #fff);`
- **Always provide a fallback value** for backwards compatibility
- Use the Cosmos theme value as the fallback (reference the token .mdx files)
- **Semantic Usage Only:** Never use a hook for an unintended purpose
  - ❌ WRONG: `width: var(--slds-g-radius-border-circle)`
  - ✅ CORRECT: `background-color: var(--slds-g-color-surface-1, #fff)`
```

Source: https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/.builderrules

### Skill routing table — ‘do not improvise from memory’

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

AGENTS.md refuses to inline SLDS knowledge. Instead it routes the agent to exact node_modules SKILL.md paths and states the failure mode it is preventing outright: ‘Do not improvise SLDS from memory when a skill exists. Re-read it when you iterate on presentation.’ Each skill is scoped to a narrow trigger so the agent can’t reach for the migration or audit skill during ordinary build work.

```markdown
### SLDS Agent Skills

SLDS skills ship in the **`@salesforce/afv-skills`** npm dependency.

- **For ALL UI work** (markup, CSS, layout, icons, LBC vs blueprint), **read and follow `node_modules/@salesforce/afv-skills/skills/design-systems-slds-apply/SKILL.md` first**. Do not improvise SLDS from memory when a skill exists. Re-read it when you iterate on presentation.
- **`design-systems-slds2-migrate`** — SLDS 1→2 / linter-driven uplift only.
- **`design-systems-slds-validate`** — audit or scorecard requests only.
```

Source: https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/AGENTS.md

### Canonical in-repo exemplar for the pattern models get wrong

Category: `exemplars` (Exemplars) · all 10 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md

Rather than describing modal structure, both AGENTS.md and .builderrules point at a checked-in component and forbid the from-memory alternative. Modals are a known LLM failure case (models reconstruct `slds-modal` markup with wrong ARIA and focus handling), so the rule pins a real file as the template.

```markdown
### Modals

Extend `lightning/modal`, following `**src/modules/ui/demoModal/`** as the reference (header, body, footer slots; open via `MyModal.open({ size, label })`). Do not build modals from raw `slds-modal` markup.
```

Source: https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/AGENTS.md

## Platform integrations (3)

### zeroheight

The entire lightningdesignsystem.com SLDS 2 documentation site is hosted on zeroheight; URLs follow the zeroheight pattern /2e1ef8501/p/- with versioned variants /v//p/.... Confirmed by URL structure and Rails-style response headers (x-request-id, x-runtime, x-rack-cors). Consequence for agents: the docs are client-rendered and return near-empty text to WebFetch, which is likely why the SLDS knowledge layer was relocated into npm-shipped skills and MCP tools.

Link: https://www.lightningdesignsystem.com/2e1ef8501

### Storybook (addon-mcp, manifests, AI docs)

The legacy SLDS 1 repo has a full .storybook/ config (addons.js, sldsTheme.js, inject-styling-hooks.js, custom webpack/postcss) used for component examples. No AI-facing Storybook integration (no Storybook MCP addon, no story-based registry for agents) was found. It predates the AI tooling and is part of the maintenance-mode SLDS 1 codebase.

Link: https://github.com/salesforce-ux/design-system/tree/master/.storybook

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

Salesforce publishes SLDS Figma libraries (SLDS Web Components v2 style guide, SLDS 2 Agentic Experience library for Agentforce UI patterns, RTL library) under the @salesforce Figma community profile. The design-to-code bridge is claimed to rest on styling-hook names being identical between the Figma kit and code. Machine-side, the path is guide_figma_to_lwc_conversion (Beta) in the DX MCP lwc-experts toolset, which Salesforce documents as pairing with the third-party Framelink MCP server to read Figma files, not Figma’s own Dev Mode MCP. No public SLDS Figma Code Connect repository or .figma.ts mappings were found.

Link: https://developer.salesforce.com/docs/platform/lwc/guide/mcp-design.html

## Building the system vs. consuming it

### For consumers (agents building UIs with Salesforce Lightning Design System)

Very strong and unusually layered, though the layers are owned by three different Salesforce orgs. A consuming agent gets: (1) live MCP tools for blueprint/hook lookup via @salesforce/mcp `lwc-experts`; (2) offline JSON/YAML registries + search scripts bundled in @salesforce/afv-skills, so verification works with no server; (3) a deterministic verifier in @salesforce-ux/slds-linter with --fix and SARIF; (4) a committed reference scaffold (design-system-2-starter-kit) that wires all three together via mcp.json, AGENTS.md, CLAUDE.md, .builderrules and local .agent/skills. Notably absent: no llms.txt or llms-full.txt (both 404), and the docs site is a zeroheight SPA that returns essentially nothing to a plain fetch, so the *documentation* is close to unreadable for agents. Salesforce compensated by moving the entire agent-facing knowledge layer out of the docs site and into npm packages and MCP tools. That is a deliberate architectural choice and arguably the most interesting thing about SLDS’s AI posture.

### For builders (the Salesforce Lightning Design System team using AI on the system itself)

Effectively invisible, and that’s a real finding rather than an oversight of the search. Direct probes of salesforce-ux/design-system for AGENTS.md, CLAUDE.md, .cursorrules, .cursor/rules/, .github/copilot-instructions.md and .claude/ all return 404; same for salesforce-ux/slds-linter and forcedotcom/sf-skills. CONTRIBUTING.md in the design system repo predates the AI era. The structural reason is that SLDS 2, the thing under active development, is closed source: salesforce-ux/design-system-2 and salesforce-ux/design-tokens are DOCS_ONLY.md stubs. So whatever AI-assisted maintenance, codemod, or review tooling the SLDS team runs internally happens in private repos. The one publicly visible builder-side AI artifact is indirect: the SLDS team authored the three design-systems-* skills that live in forcedotcom/sf-skills, which means the team’s system knowledge is now maintained as prompt artifacts on a weekly-ish release cadence rather than only as docs. There are no public AI bots, AI-assisted codemod tooling (the linter’s --fix is rule-based, not LLM-based), or AI-mentioning contribution guidelines.

## Gaps

Not confirmed, or not found: (1) No llms.txt or llms-full.txt: https://www.lightningdesignsystem.com/llms.txt, /llms-full.txt, /ai and /docs/mcp all returned HTTP 404. (2) The ‘AI and SLDS 2’ docs page exists (indexed at /2e1ef8501/v/60694/p/52a7c7-ai-and-slds-2) but the zeroheight SPA returned only the title ‘Lightning Design System 2’ to WebFetch, so its content is unread and none of its claims are represented here. (3) No SLDS-specific MCP server exists; all SLDS MCP tools live inside the general-purpose @salesforce/mcp (salesforcecli/mcp), whose src/ tree it was not possible to enumerate via the GitHub contents API (404 on src/tools), so tool descriptions come from the official release notes and developer docs rather than source. (4) No community SLDS MCP server was verified; rrubush/sldsx surfaced in a code search but was not examined. (5) Zero builder-side AI artifacts found in any public salesforce-ux repo: direct 404 probes for AGENTS.md, CLAUDE.md, .cursorrules, .github/copilot-instructions.md on both design-system and slds-linter; forcedotcom/sf-skills likewise has none. Since SLDS 2 source is closed (design-system-2 and design-tokens are DOCS_ONLY stubs), absence of public evidence is not evidence of absence internally. (6) No Figma Code Connect repo, no AI-facing Storybook integration, no Supernova or Knapsack presence found. (7) No AI-assisted codemod: slds-linter --fix is rule-based autofix, not model-driven. (8) The referenced a4d-lwc-rules-no-edit.md global rule (Agentforce Vibes) was named in a Salesforce blog post but its text was not retrieved. (9) .builderrules references ‘the token .mdx files’ and a ‘Lightning Base Components index’ that this study did not locate as standalone published artifacts. (10) Exact artifact counts (523 hooks / 1,147 utilities / 85 blueprints / 1,732 icons) are quoted from the skill’s own table, not independently counted; the bundled hooks-index.json and utilities-index.json are nested objects with 7 top-level keys each, so this study did not verify the leaf counts.

## Sources (15)

- https://github.com/salesforce-ux/design-system

- https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/.builderrules

- https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/AGENTS.md

- https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/mcp.json

- https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/README.md

- https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/CLAUDE.md

- https://www.npmjs.com/package/@salesforce/afv-skills

- https://github.com/forcedotcom/sf-skills

- https://raw.githubusercontent.com/forcedotcom/sf-skills/main/README.md

- https://raw.githubusercontent.com/forcedotcom/mcp/main/releasenotes/README.md

- https://developer.salesforce.com/docs/platform/lwc/guide/mcp-slds.html

- https://developer.salesforce.com/docs/platform/lwc/guide/mcp-design.html

- https://github.com/salesforce-ux/slds-linter

- https://www.npmjs.com/package/@salesforce-ux/slds-linter

- https://developer.salesforce.com/blogs/2025/10/vibe-code-lightning-web-components-with-salesforce-dx-mcp

---

Generated 2026-07-28T03:38:29Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
