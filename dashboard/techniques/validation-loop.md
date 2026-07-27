---
title: "Validation loop — 29 techniques"
description: "Linters, type checks and audit tools the agent is told to run, turning “follow the system” into a feedback loop with failures it has to fix."
url: "https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md"
type: "technique-category"
id: "validation-loop"
technique_count: 29
system_count: 19
data_collected: "2026-07-26/27"
generated: "2026-07-27T22:13:09Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Validation loop

29 of the 148 techniques in this study, across 19 of the 19 design systems. Read when asked how to make a design system's rules enforceable.

Linters, type checks and audit tools the agent is told to run, turning “follow the system” into a feedback loop with failures it has to fix.

Systems represented here: [Ant Design](https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md), [Atlassian Design System (ADS / Atlaskit)](https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md), [Carbon Design System](https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md), [Chakra UI](https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md), [Cloudscape Design System](https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md), [daisyUI](https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md), [Fluent UI (Fluent 2)](https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md), [HeroUI](https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md), [Mantine](https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md), [Material UI (MUI)](https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md), [Nord Design System](https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md), [Nuxt UI](https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md), [PatternFly](https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md), [Primer](https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md), [React Spectrum / Spectrum 2 (S2)](https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md), [Lightning Design System (SLDS)](https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md), [shadcn/ui](https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md), [Polaris (Shopify)](https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md), [U.S. Web Design System (USWDS)](https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Mandatory post-edit lint loop (`antd lint`)

Ant Design · full record: https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md

Key Rule 5 requires the agent to run `antd lint` on changed files after every write or modification, specifically to catch deprecated API usage. Combined with `antd doctor` (project config diagnosis) and `antd env` (environment snapshot), this gives the agent a closed verification loop that does not depend on the host project having any antd-aware linting configured.

```markdown
5. **Lint after changes** — After writing or modifying antd code, run `antd lint` on the changed files to catch deprecated or problematic usage.

**Workflow:** `antd env` → capture full environment → `antd doctor` → check configuration → `antd info --version X` → verify API against the user's exact version → `antd lint` → find deprecated or incorrect usage.
```

Source: https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md

## axe-core validation loop with capability-scoped tools

Atlassian Design System (ADS / Atlaskit) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md

A three-step loop is baked into the tool graph: `ads_analyze_a11y` (JSX string → heuristic/axe findings) → `ads_suggest_a11y_fixes` (violation string → ADS-biased ‘recipe map’ fixes) → `ads_get_a11y_guidelines` (topic guidance). The descriptions are unusually honest about their own limits — ‘not every finding maps to a specific ADS component fix’, ‘Does not replace testing in a real browser with assistive technologies’ — which reduces false confidence. Crucially, the live-browser variant `ads_analyze_localhost_a11y` is gated by deployment: ‘it is **only exposed when this MCP runs locally**, not in the remote MCP deployment.’ The package depends on axe-core, @axe-core/playwright and @axe-core/puppeteer to back this.

```text
### ads_analyze_a11y
Analyzes a **string of React/JSX** code for likely accessibility issues (heuristics and/or axe-related paths) and returns hints that often **point to** `ads_suggest_a11y_fixes` or generic axe/WCAG-style context—not every finding maps to a specific ADS component fix.

LIMITATIONS:
- Does not replace testing in a real browser with assistive technologies or full keyboard traversal.
- For rendered UI, `ads_analyze_localhost_a11y` (live URL + axe) is preferable when available—it is **only exposed when this MCP runs locally**, not in the remote MCP deployment.

### ads_suggest_a11y_fixes
WHAT YOU GET (varies by match):
- **Curated hit:** ADS-biased examples and patterns from this server's recipe map (components, tokens, common fixes).
- **No strong match:** Generic guidance (e.g. "use ADS components", labeling, testing)—still useful, but **not** guaranteed to be ADS-specific.
```

Source: https://mcp.atlassian.com/v1/ads/public/mcp

## Published head-to-head context-delivery evals

Atlassian Design System (ADS / Atlaskit) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md

Atlassian ran an eval (agents generating a login screen) comparing four context strategies and published token usage, wall time, and turn counts: no context ~5% tokens / 4m19s / 43 turns; ADS MCP ~80% / 5m01s / 35.1 turns; ADS Skill ~80% / 5m23s / 36 turns; DESIGN.md ~30% / 6m46s / 45.3 turns. They report DESIGN.md consumed ‘92% more tokens’ than MCP with ‘2.7x the variance in token consumption between runs’, and — the most useful negative finding in the study — that DESIGN.md ‘frequently caused agents to re-create components rather than use the existing system’, because it is ‘a guide on how to re-implement’ rather than ‘an instruction manual to using the existing design system’. Separate blog figures for the structured-content/MCP work: ‘52% accuracy improvement in AI calls’, ‘34% faster on average across ADS specific tasks’.

```text
However, DESIGN.md frequently caused agents to "re-create components rather than use the existing system," introducing technical debt by reimplementing instead of importing existing design system components.

DESIGN.md consumed approximately "92% more tokens" than the MCP approach and showed "2.7x the variance in token consumption between runs."
```

Source: https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice

## Self-check validation list of known silent failures

Carbon Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md

A ‘Result Validation — Critical Items’ checklist framed as ‘the non-obvious failures that slip through most often’ — a post-generation lint pass the model runs against itself. It names exact response fields (use `example_clean`, not `example`), forbids a specific wrong remediation (stub variant → use `requery_hint`, never increase `size`), and encodes silent-failure knowledge like IBM Products’ `pkg.component.X = true` flags and DataTable being absent from the code index.

```markdown
## Result Validation — Critical Items

The non-obvious failures that slip through most often:

- [ ] Use `example_clean` for component JSX — **not** `example`, not `example_text`; for icons use `example` verbatim
- [ ] Use `source.imports[]` verbatim — never construct import paths manually
- [ ] Stub variant (`example_omitted: true`) → use `requery_hint`, **never increase `size`**
- [ ] DataTable: not in code index — `docs_search` + generate from first principles
- [ ] Charts: `get_charts` only — no `code_search`; all four assembly fields verbatim
- [ ] Web Components tokens: never use `$spacing-*` / `$background` / `$layer-*` SCSS variables in component styles — they are compile-time only and produce no output at runtime; use `var(--cds-spacing-*)` / `var(--cds-background)` / `var(--cds-layer-*)` CSS custom properties instead
- [ ] Web Components grid: default to CSS classes (`cds--grid` / `cds--row` / `cds--col-lg-*` on `<div>` elements) — never use `<cds-row>` (does not exist)
- [ ] Accessibility: icon-only buttons have `iconDescription`; all inputs have `labelText`; no `tabIndex > 0`; no `div onClick` without `role` + keyboard handler
```

Source: https://carbondesignsystem.com/developing/carbon-mcp/files/carbon-builder.zip

## Migration validation loop: codemod dry-run → typecheck → lint → build → grep for leftovers

Chakra UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md

The strongest enforcement mechanism Chakra ships to consumers. The migrate skill ends with a checkbox list the agent must work through, closing with a literal grep it has to run to prove no v2 imports survive — converting ‘did the migration work’ from a model judgement into a shell command with an observable exit condition.

````markdown
## Step 10 — Validation checklist

Work through this after the migration is complete:

- [ ] Reinstall dependencies: `npm install` / `pnpm install`
- [ ] TypeScript: `npx tsc --noEmit` — resolve all type errors
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`
- [ ] Visually verify color mode toggle (light ↔ dark)
- [ ] Test interactive components: Dialog, Drawer, Menu, Tabs, Accordion
- [ ] Test form components: Checkbox, Select/NativeSelect, Input, Radio
- [ ] Check for visual regressions across key pages
- [ ] Search codebase for leftover v2 imports:
  ```bash
  grep -r "ColorModeScript\|useColorModeValue\|extendTheme\|styleConfig\|@chakra-ui/icons\|@chakra-ui/next-js" src/
  ```
````

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-migrate/SKILL.md

## Named the failure mode: "Your LLM ignores the instructions and skills"

daisyUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md

daisyUI’s marketing is an unusually explicit, receipts-first critique of the skill/rules paradigm every other system in this study relies on — complete with a mocked-up log of a model reading SKILL.md, truncating two reference files at ‘Lines 1 to 120’, partially ignoring four more and skipping quality-checks.md entirely. It is the clearest articulation in the dataset of *why* prohibition-style instruction files under-perform, and it is used to justify moving enforcement from prose into tool boundaries.

```text
TRYING TO FIX THE SLOP WITH INSTRUCTIONS?
Your LLM ignores the instructions and skills.
Agent skills are collections of instructions and rules. Check the logs and the pattern is familiar: the model reads a few files, skips the rest, ignores inconvenient rules, and moves on.
UI work needs more context than most tasks. Yet as the instruction set grows, the chance of selective reading grows with it.
Skill files inspected
Ignored 40% of the rules
Skipped 23 files due to overconfidence
Ignored the rules and treated them as suggestions only
SKILL.md read
references/components.md Lines 1 to 120
references/themes.md Lines 1 to 120
references/design.md partially ignored
references/anti-patterns.md partially ignored
references/accessibility.md partially ignored
references/responsive.md partially ignored
references/quality-checks.md skipped
! The model continued without following the rules it was expected to follow.
Wasted time, wasted effort, wasted tokens
```

Source: https://daisyui.com/blueprint/

## Builder-side: mandate an external MCP as the anti-hallucination source of truth

daisyUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md

On the maintainer side, daisyUI’s own Copilot instructions do not ask the model to be careful — they redirect it to a tool. Context7 MCP is named twice as the required lookup path for syntax and package information, paired with ‘do not make up answers’ and ‘Do not guess, do not hallucinate’. Workspace rules add hard directory prohibitions and a dependency-approval gate.

```markdown
- `packages/bundle`: This directory contains generated bundle files. Do not read nor write code here.
- `packages/logs`: This directory contains generated log files for performance analysis. Do not read nor write code here.

# Our Stack

- We use Bun.js as the runtime environment and package manager
- We use latest stable versions of all packages, languages, and libraries
- This project is a monorepo managed by Bun Workspaces
- Do not add any new package or dependency without asking first
```

Source: https://raw.githubusercontent.com/saadeghi/daisyui/HEAD/.github/instructions/workspace.instructions.md

## Hook-enforced validation loop on every edit

HeroUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md

Rather than asking the agent to remember to lint, .claude/hooks.mjs runs prettier check pre-edit and `pnpm lint --fix` + `tsc --noEmit --skipLibCheck` post-edit, feeding results back into the transcript; a denylist throws outright for protected files. Deterministic enforcement outside the model’s discretion.

```javascript
  // Run type checking on TypeScript files
  if (filePath.match(/\.(ts|tsx)$/)) {
    try {
      execSync(`npx tsc --noEmit --skipLibCheck "${filePath}"`, {stdio: "pipe"});
    } catch (e) {
      console.log("⚠️  TypeScript errors detected - please review");
    }
  }
```

Source: https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/.claude/hooks.mjs

## Verify Before You Use — no artifact without a registry lookup

Lightning Design System (SLDS) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md

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

## Mandatory linter-first migration workflow

Lightning Design System (SLDS) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md

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

## Scored compliance gate with an explicit degradation formula

Lightning Design System (SLDS) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md

The validate skill turns ‘is this on-system?’ into a number: Linter Compliance = 100 − (violations × 10), combined with Theming, Accessibility, Code Quality, and Component Usage. It even specifies a renormalized weighting for when the linter can’t run (no Node, CI sandbox), so the agent can’t silently skip verification and still claim a passing grade — it must mark ‘Linter not run’ in the report header. Step 3 is a ‘Required manual review gate’.

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

## Scaffolding-first + validation-loop checklist for contributor agents

Nuxt UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md

AGENTS.md hands the agent a copy-able progress checklist whose first step is the CLI scaffolder (so structure is generated, not invented) and whose last three steps are the three commands that must pass. The same triad is repeated in ‘Before Submitting’. Contributor agents therefore cannot declare done without running lint, typecheck and tests.

````markdown
## Component Creation Workflow

Copy this checklist and track progress when creating a new component:

```
Component: [name]
Progress:
- [ ] 1. Scaffold with CLI: nuxt-ui make component <name>
- [ ] 2. Implement component in src/runtime/components/
- [ ] 3. Create theme in src/theme/
- [ ] 4. Export types from src/runtime/types/index.ts
- [ ] 5. Register in ThemeDefaults interface (src/runtime/composables/useComponentProps.ts)
- [ ] 6. Write tests in test/components/
- [ ] 7. Create docs in docs/content/docs/2.components/
- [ ] 8. Add playground page
- [ ] 9. Run pnpm run lint
- [ ] 10. Run pnpm run typecheck
- [ ] 11. Run pnpm run test
```
````

Source: https://raw.githubusercontent.com/nuxt/ui/v4/AGENTS.md

## Eval-gated skills with a 1.0 no-false-positive gate

PatternFly · full record: https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md

The strongest technique found in this study so far: ai-helpers ships an eval harness (`eval//eval.yaml` + case workspaces with fixture .tsx/.scss files and `annotations.yaml`) run by the `Skill Evals` GitHub Action on any PR touching `plugins/*/skills/**`. Judges are Python `check` blocks; thresholds are explicit. Two judges demand a perfect 1.0 pass rate — `routes_to_subskills` and `gate_skip_non_pf`, the latter failing the build if the router mentions any `pf-*` skill inside a non-PatternFly project. MCP is explicitly denied during evals (`deny: mcp__*`) so the harness measures the prompt’s own influence, not retrieval.

```yaml
permissions:
  allow: []
  deny:
    - "mcp__*"
...
  - name: gate_skip_non_pf
    description: Non-PF project gets no PF-specific routing — generic advice only
    if: "annotations.get('expected_routing') == 'none'"
    check: |
      pf_subskills = [
          "pf-figma-check", "pf-color-scan", "pf-import-check",
          "pf-component-check", "pf-test-gen", "pf-figma-token-check",
          "pf-css-migration-scan", "pf-project-gen", "pf-icon-finder",
          "pf-figma-design-mode", "pf-design-comments-setup", "pf-ai-guide"
      ]
      found_pf = [s for s in pf_subskills if s in text_lower]
      if found_pf:
          return False, f"Non-PF project got PF-specific routing: {found_pf}"
      return True, "No PF sub-skill routing for non-PF project — gate check working"

thresholds:
  routes_to_subskills:
    min_pass_rate: 1.0
  gate_skip_non_pf:
    min_pass_rate: 1.0
  actionable_next_step:
    min_pass_rate: 0.67
```

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/eval/pf-assist/eval.yaml

## Deterministic grep commands instead of model judgment

PatternFly · full record: https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md

Audit skills hand the model exact regexes and ripgrep invocations rather than asking it to ‘look for problems’. pf-import-check ships three `rg` commands targeting the specific import mistakes PF’s packaging invites (charts must come from `/victory`, chatbot and component-groups from `dist/dynamic/*`), plus the corrected import lines verbatim. pf-color-scan specifies HEX/RGB/HSL regexes, the 148-name X11 list, a property filter, and an exception carve-out so token *definitions* are not flagged.

````markdown
Before proposing import fixes, use the PatternFly MCP server to confirm current package paths and examples from the latest docs.

## What to check

1. Charts imported from `@patternfly/react-charts` root (invalid for Victory components).
2. Chatbot imports not using `@patternfly/chatbot/dist/dynamic/*`.
3. Component-group imports not using `@patternfly/react-component-groups/dist/dynamic/*`.
4. Missing package CSS imports for features in use.

## Validation commands

```bash
rg "@patternfly/react-charts['\"]" src
rg "@patternfly/chatbot['\"]" src
rg "@patternfly/react-component-groups['\"]" src
```

## Correct import examples

```tsx
import { ChartDonut } from "@patternfly/react-charts/victory";
import { Chatbot } from "@patternfly/chatbot/dist/dynamic/Chatbot";
import { BulkSelect } from "@patternfly/react-component-groups/dist/dynamic/BulkSelect";
```
````

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/plugins/react/skills/pf-import-check/SKILL.md

## ERROR/WARN severity report contract with fix strings

PatternFly · full record: https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md

pf-component-check enumerates ~13 families of structural violations as a lookup table (e.g. `` direct under ``, `` without ``, `` without dataLabel = WARN) and pins the output to a lint-like format with severity, path:line, found, and fix. It also constrains autonomy: only unambiguous structural fixes may be applied; anything design-affecting must be reported and asked about.

````markdown
5. If the user requests fixes, apply them. Only fix unambiguous structural issues — if a fix would change behavior or needs a design decision, report it and ask.
...
### Report format

For each violation:

```
[ERROR|WARN] file/path.tsx:42 - <Toolbar> has direct children that are not <ToolbarContent>
  Found: <Button> as direct child of <Toolbar>
  Fix: Wrap children in <ToolbarContent><ToolbarItem>...</ToolbarItem></ToolbarContent>
```

Use `ERROR` for layout-breaking issues; `WARN` for best-practice gaps.
````

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/plugins/react/skills/pf-component-check/SKILL.md

## Compiler-in-the-loop validation with bounded retry

Polaris (Shopify) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md

Generated code is typechecked against bundled Polaris .d.ts files in a virtual TypeScript filesystem. On failure the agent must re-search for the named type rather than guess, fix exactly the reported error, and re-validate — max 3 attempts. This is the strongest anti-hallucination construct found in any system in this study: the agent literally cannot emit a component prop that does not exist in the type declarations.

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

## Hard tool-gated validation loop ("REQUIRED FINAL STEP")

Primer · full record: https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md

The Primer MCP server ships Stylelint as an MCP tool and writes the tool description as a completion precondition, not a suggestion: the agent is told it literally cannot finish a CSS task without a passing `lint_css` run. The server runs Stylelint with `--fix`, returning autofixed output on success and an explicit ‘❌ Errors without autofix remaining’ block on failure, giving the model a repair signal to loop on. `find_tokens` reinforces it from the other end: ‘After identifying tokens and writing CSS, you MUST validate the result using lint_css.’

```typescript
    description:
      'REQUIRED FINAL STEP. Use this to validate your CSS. You cannot complete a task involving CSS without a successful run of this tool.',
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/packages/mcp/src/server.ts

## Build-toolchain validation loop before declaring done

React Spectrum / Spectrum 2 (S2) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md

The S2 skill closes with a compulsory verification section that exploits the style macro being a build-time construct — so a typecheck/build run doubles as a design-system linter. Console warnings are promoted to hard failures. The migration skill repeats the pattern as its Step 7.

```markdown
## Verify before declaring done

Before reporting the task as complete, exercise the project's own toolchain. The `style` macro performs build-time checks that the editor alone won't show.

- **Typecheck.** Run the project's typecheck (`tsc --noEmit`, `tsc -b`, etc.). Fix everything — wrong `size` values, missing required props, raw CSS in the macro all surface here.
- **Build or dev server.** Run at least once. The macro's "cannot statically evaluate" error means a value inside `style({...})` depends on something non-literal; refactor to use runtime conditions or the runtime style function.
- **Runtime warnings.** If you can render the page, check the console for missing `aria-label`/`textValue`, deprecated props, etc. Treat these as failures.
```

Source: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/SKILL.md

## Deterministic scoring rubric with anti-vibe language

React Spectrum / Spectrum 2 (S2) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md

The audit skill removes model judgement from the final number: fixed severity weights, a closed-form per-category formula, fixed category weights, and an instruction forbidding estimation. Paired with a citation-integrity rule.

```markdown
The Spectrum Adherence Score is computed **deterministically** from the findings you recorded — never from a subjective sense of overall quality. The same set of findings must always produce the same score. Do not round, fudge, or "feel out" a number; run the arithmetic below.

[from SKILL.md Phase 1:]
For every violation, record a finding: `{file:line, rule, severity, category, fix}`. Cite only line numbers you actually read or grepped — never invent locations. Record **one finding per distinct root cause** at a `file:line`.
```

Source: https://react-spectrum.adobe.com/.well-known/skills/spectrum-audit/references/scoring-rubric.md

## MCP-side audit checklist as a post-generation validation loop

shadcn/ui · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md

The MCP server exposes a tool whose whole purpose is to make the agent self-review after generating code. The tool description is written as an instruction to the model (‘Make sure to run the tool after all required steps have been completed’), and the returned payload is a markdown checkbox list that pushes the agent into lint/typecheck/browser verification — including chaining to Playwright MCP.

```typescript
      {
        name: "get_audit_checklist",
        description:
          "After creating new components or generating new code files, use this tool for a quick checklist to verify that everything is working as expected. Make sure to run the tool after all required steps have been completed.",
        inputSchema: zodToJsonSchema(z.object({})),
      },

// ...

      case "get_audit_checklist": {
        return {
          content: [
            {
              type: "text",
              text: dedent`## Component Audit Checklist

              After adding or generating components, check the following common issues:

              - [ ] Ensure imports are correct i.e named vs default imports
              - [ ] If using next/image, ensure images.remotePatterns next.config.js is configured correctly.
              - [ ] Ensure all dependencies are installed.
              - [ ] Check for linting errors or warnings
              - [ ] Check for TypeScript errors
              - [ ] Use the Playwright MCP if available.
              `,
            },
          ],
        }
      }
```

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/packages/shadcn/src/mcp/index.ts

## Committed eval suite for the skill (rule-level assertions)

shadcn/ui · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md

skills/shadcn/evals/evals.json holds prompt → expectations pairs where each expectation is a restatement of a Critical Rule (‘Uses gap-* instead of space-y-*’, ‘No manual dark: color overrides’). This turns the coercion rules into a regression-testable contract on model output — rare among design systems.

```json
{
  "skill_name": "shadcn",
  "evals": [
    {
      "id": 1,
      "prompt": "I'm building a Next.js app with shadcn/ui (base-nova preset, lucide icons). Create a settings form component with fields for: full name, email address, and notification preferences (email, SMS, push notifications as toggle options). Add validation states for required fields.",
      "expected_output": "A React component using FieldGroup, Field, ToggleGroup, data-invalid/aria-invalid validation, gap-* spacing, and semantic colors.",
      "files": [],
      "expectations": [
        "Uses FieldGroup and Field components for form layout instead of raw div with space-y",
        "Uses Switch for independent on/off notification toggles (not looping Button with manual active state)",
        "Uses data-invalid on Field and aria-invalid on the input control for validation states",
        "Uses gap-* (e.g. gap-4, gap-6) instead of space-y-* or space-x-* for spacing",
        "Uses semantic color tokens (e.g. bg-background, text-muted-foreground, text-destructive) instead of raw colors like bg-red-500",
        "No manual dark: color overrides"
      ]
    }
```

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/evals/evals.json

## Teaching the agent the CI check it will otherwise fail

Cloudscape Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md

The only ‘Conventions to watch’ entry in the main AGENTS.md is the PR-title lint, spelled out with the exact allowlist, the exact workflow file that enforces it, an explicit failing example (`feat(table): …` fails), and a substitution rule (‘use chore: for documentation and tooling changes’). Pre-emptive loop-closing: rather than letting the agent discover the failure from CI, the enumerated grammar is stated up front. Weak form though — nothing instructs agents to run lint/tests themselves before proposing changes.

```markdown
## Conventions to watch

- **Commit and PR titles: `type: subject`, no scope.** The PR-title lint (`cloudscape-design/actions/.github/workflows/lint-pr.yml`) allows exactly these types: `chore`, `feat`, `fix`, `refactor`, `test`, `revert`. The title must start with `type:` followed by the subject (for example `feat: Add multi-column sort`). Scope parentheses are not supported (`feat(table): …` fails the check), and other Conventional Commits types such as `docs` or `style` are not allowed — use `chore:` for documentation and tooling changes.
```

Source: https://raw.githubusercontent.com/cloudscape-design/components/HEAD/AGENTS.md

## Lint-rule → fix-recipe table, with re-run verification per file

Fluent UI (Fluent 2) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md

The `/lint-check` skill turns the repo’s custom `@fluentui/*` ESLint rules into a machine-readable remediation table (rule name → what it catches → how to fix), then mandates a per-file verify step: apply the fix, re-run lint on that file, repeat. This is the enforcement arm behind AGENTS.md’s prohibitions — the prose bans `React.FC`, and `@fluentui/no-global-react` makes it fail CI, and the skill teaches the agent how to close the loop.

```markdown
2. **Parse the output** and categorize errors by the custom Fluent UI ESLint rules:

   | Rule                                    | What it catches                             | How to fix                                            |
   | `@fluentui/ban-context-export`          | Context exported from wrong layer           | Move to `react-shared-contexts` package               |
   | `@fluentui/ban-instanceof-html-element` | `instanceof HTMLElement` (breaks iframes)   | Use element.tagName or feature detection              |
   | `@fluentui/no-global-react`             | `React.FC`, `React.useState` etc.           | Use named imports: `import { useState } from 'react'` |
   | `@fluentui/no-restricted-imports`       | Banned import paths                         | Use the allowed import path from the error message    |
   | `@fluentui/no-context-default-value`    | Context created without `undefined` default | Use `createContext(undefined)` and add a guard hook   |

3. **Auto-fix** any issues found by editing the source files directly. For each fix:

   - Read the file
   - Apply the fix
   - Verify the fix by re-running lint on that specific file
```

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/lint-check/SKILL.md

## Visual verification loop: per-component Storybook + Playwright screenshot

Fluent UI (Fluent 2) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md

`/visual-test` closes the see-what-you-built loop. It pins an exact tool version (`npx -y @playwright/cli@0.1.1`) so nothing is installed globally, and hard-constrains the agent to boot only the per-component stories package via the nx `storybook` target — because the full Storybook would drag in 74 packages. It even encodes a temporal caveat about workspace snapshots older than April 2026, and an explicit stop-and-ask branch when the stories package doesn’t exist.

````markdown
## Critical: use the per-component Storybook only

Always boot the **per-component stories package** (`react-<component>-stories`) via nx `storybook` target, which only imports its own component's stories and dependencies.

1. **Find the component's stories package.**

   ```bash
   yarn nx show project react-<lowercase-component-name>-stories --json
   ```

   If nx returns nothing with output of `Could not find project react-<component>-stories`, the component doesn't have its own stories package — check for a preview package (`react-<component>-preview-stories`) or ask before proceeding.

2. **Start the component's Storybook dev server.** Use the `storybook` target on the stories project directly — it's the most portable, since library aliases like `react-<component>:start` were only added in April 2026 and may not exist in older workspace snapshots
````

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/visual-test/SKILL.md

## Mandatory verification loop + cross-vendor agent-reviews-agent handoff

Mantine · full record: https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md

AGENTS.md/CLAUDE.md gate “done” behind a fixed command sequence (typecheck, oxlint on changed files, format, build, targeted jest, conditional stylelint for CSS changes, conditional syncpack for dependency changes). The unusual part is the tail: the agent must shell out to detect a second AI tool and hand its own uncommitted diff over for review. A Claude session is instructed to route its work through OpenAI’s Codex CLI as reviewer before finalizing. Capability-probed with `command -v`, so it degrades gracefully when absent.

```markdown
After running the commands above, check if `codex` CLI is available (`command -v codex`). If it is, run `/codex-code-review` to get an automated code review of unstaged changes and apply fixes.
```

Source: https://raw.githubusercontent.com/mantinedev/mantine/master/AGENTS.md

## Mandatory contributor validation loop (7-step pre-PR checklist incl. a prose linter)

Material UI (MUI) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md

Builder-side. The root AGENTS.md ends with an ordered gauntlet the agent must run before proposing a PR: prettier, eslint, tsc, unit tests, then conditional regeneration steps — `pnpm proptypes && pnpm docs:api` if the API changed, `pnpm docs:typescript:formatted` if demos changed (demos must be authored in TypeScript, JS is generated), and `pnpm vale` for prose. CI independently fails if generated a11y JSON is stale (‘CI fails if any are stale’), so the loop is enforced, not advisory.

````markdown
### API Documentation

After changing component props or TypeScript declarations:

```bash
pnpm proptypes && pnpm docs:api
```

### Docs demos

Always author the TypeScript version of the demos. To generate the JavaScript variant, run:

```bash
pnpm docs:typescript:formatted
```
````

Source: https://raw.githubusercontent.com/mui/material-ui/HEAD/AGENTS.md

## Effort-tiered review skill with precision/recall bias switching

Material UI (MUI) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md

Builder-side. MUI’s shared pr-review skill does not just say ‘review the diff’ — it exposes five named effort levels that change subagent fan-out AND the model’s error preference: medium is a precision bias (‘every finding actionable’), high/xhigh/max deliberately flip to recall (‘missed bug ships’), with max adding verifier subagents for surviving candidates. It also instructs finders not to self-censor: ‘Finders that silently drop half-believed candidates bypass verify step — dominant cause of misses.’

```markdown
Medium effort = **precision** bias: every finding actionable. **high**, **xhigh**,
**max** shift to **recall**; missed bug ships. Surface uncertain findings when
mechanism realistic, label clearly.

## Effort levels

- **low** — fastest: bug-only hunk pass. Skip Tests, Simplifications, Docs,
  test/fixture hunks. Flag only high-confidence runtime-correctness bugs visible
  from hunk alone.
- **medium** (default) — one agent reviews Bugs, Tests, Simplifications, Docs, plus
  triggered API design/performance concerns, then verifies locally. Precision
  bias. Add one bug/regression subagent only for large, risky, fragile diffs.
- **max** — `xhigh` plus verifier subagents for surviving candidates. Highest cost,
  strongest recall bias.
```

Source: https://raw.githubusercontent.com/mui/mui-public/HEAD/.agents/skills/pr-review/SKILL.md

## Auto-fixable codemod rule as a migration lever (deterministic, not AI)

Nord Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md

`@nordhealth/no-legacy-classes` ships in the recommended config but disabled by default; consumers enable it, optionally scoped to categories, run `eslint --fix`, then turn it off. A genuine machine-checked convergence loop toward Tailwind v4 + Nord tokens — but framed as a human migration tool, never wired into the skill as something the agent must run.

````markdown
The migration rules are included in the recommended config but **off by default**. Enable them during migration:

```javascript
// eslint.config.mjs
import nordPlugin from '@nordhealth/eslint-plugin'

export default [
  nordPlugin.configs.recommended,
  {
    rules: {
      // Enable migration rules - disable after migration is complete
      '@nordhealth/no-legacy-classes': 'warn'
    }
  }
]
```

### Running the fix

Once configured, run ESLint with the `--fix` flag to automatically migrate classes:

```bash
pnpm eslint --fix "src/**/*.{ts,tsx,vue,html}"
```
````

Source: https://nordhealth.design/llms-full.txt

## Mandatory validator loop before finalizing output

U.S. Web Design System (USWDS) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md

Community uswds-mcp’s skill forbids the agent from declaring done until its own MCP validator tools return clean. This is the strongest coercion mechanism in the USWDS ecosystem — and it is unofficial. Two validators are gated: `validate_uswds_markup` (DOM/class/ARIA/token drift) and `validate_uswds_project_setup` (import paths, CDN usage, global CSS blast radius).

```markdown
8. Validate generated markup with `validate_uswds_markup` and validate project setup with `validate_uswds_project_setup` before finalizing.

- Do not finalize generated markup until the MCP validator reports no errors; if warnings remain, explain why they are acceptable or what the user should fix.
- Do not claim Section 508 compliance from component usage alone; USWDS guidance still requires project-specific accessibility testing.
```

Source: https://raw.githubusercontent.com/bibekpdl/uswds-mcp/HEAD/.agents/skills/uswds/SKILL.md

All categories: https://state-of-ai-in-design-systems.netlify.app/techniques.md

---

Generated 2026-07-27T22:13:09Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
