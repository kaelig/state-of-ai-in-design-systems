---
title: "Exemplars — 10 techniques"
description: "Few-shot incorrect/correct pairs, templates and demo blocks placed where the model will read them."
url: "https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md"
type: "technique-category"
id: "exemplars"
technique_count: 10
system_count: 10
data_collected: "2026-07-26/27"
generated: "2026-07-28T04:48:05Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/techniques/exemplars.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Exemplars

10 of the 148 techniques in this study, across 10 of the 19 design systems. Read when deciding what examples to put in front of a model.

Few-shot incorrect/correct pairs, templates and demo blocks placed where the model will read them.

Systems represented here: [Carbon Design System](https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md), [Chakra UI](https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md), [Cloudscape Design System](https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md), [daisyUI](https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md), [HeroUI](https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md), [Mantine](https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md), [Salesforce Lightning Design System](https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md), [shadcn/ui](https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md), [Shopify Polaris](https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md), [U.S. Web Design System (USWDS)](https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Anti-hallucination proof-by-counterexample for icon names

Carbon Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md

Rather than just saying 'don’t guess icon names’, the skill proves the point with six verified slug→export-name pairs whose mapping is non-obvious, then prescribes the exact field to read (`import`, not `name`) and demands `import_stmt` be used verbatim. This is few-shot evidence deployed specifically to break the model’s confidence in its own priors.

```markdown
> **⚠ MANDATORY — Icon names cannot be assumed from training data.** The export name is not
> always predictable: slugs use `--` for variants, words flatten to PascalCase, and many
> intuitive names simply do not exist. Always query first.
> Verified examples: `add-comment` → `AddComment`, `arrows--horizontal` → `ArrowsHorizontal`,
> `chart--win-loss` → `ChartWinLoss`, `face--satisfied--filled` → `FaceSatisfiedFilled`,
> `airline--manage-gates` → `AirlineManageGates`, `character--whole-number` → `CharacterWholeNumber`.
> **Always query `code_search` with `filters: { asset_type: "icon" }` first.**
> Use the `import` field (not `name`) for the export name. Use `import_stmt` verbatim for the import line.
```

Source: https://carbondesignsystem.com/developing/carbon-mcp/files/carbon-builder.zip

## Output contract: no placeholders, minimum two breakpoints, bounded explanation

Chakra UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md

The builder skill pins the response shape so agent output is directly pasteable and consistently responsive. Two clauses do real work: banning ‘TODO’ / ‘...rest of component’ placeholders, and mandating base + md breakpoints as a floor unless the request is explicitly desktop-only, a responsive-by-default guarantee models otherwise skip. (Builder-side analogue: the github-issue-triage subagent may not declare a bug reproduced by reasoning alone; it must render the story and look at it via Chrome MCP.)

```markdown
## Output format

Produce:

1. **Complete, runnable code** — correct imports, no placeholders like `TODO` or
   `...rest of component`
2. **Proper import statements** — group Chakra imports, then local imports
3. **Component separation** — split into multiple components/files if the
   component is complex or contains clearly separable parts
4. **Responsive styles** — at minimum `base` and `md` breakpoints for layout
5. **Brief explanation after the code** — 2–4 sentences on the key decisions
   made (layout approach, accessibility choices, responsive strategy). Skip the
   explanation if the request was trivial.
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-builder/SKILL.md

## Exemplar library as coercion: 211 page architectures matched by intent

daisyUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md

Instead of asking the model to invent a layout, the Page Architect matches the prompt against a curated catalogue of 211 page architectures (purpose, sections, content order, actions, navigation, responsive behaviour, interaction states, edge cases) and hands back a plan before any markup is written. The Creative Director does the analogous thing for visual language via a ‘design trends catalog’. This is the study’s clearest case of replacing model taste with a retrieval-backed exemplar set.

```text
4. Page Architect
Provides a matching plan from 211 page architectures, including:
Page purpose, sections, content order, and user goals
Actions, navigation, and component composition
Responsive behavior, interaction states, and edge cases
This helps the LLM plan the full page before writing markup, including states a short prompt may leave out.

5. Component Syntax Expert
Provides current daisyUI resources for each required component:
Correct structure and class names
Variants, sizes, states, and modifiers
Rules, code snippets, and examples
This lets the LLM use maintained daisyUI syntax instead of recalling stale or invented classes from training data.
```

Source: https://daisyui.com/blueprint/workflow/

## Negative exemplars — a labelled “DO NOT DO THIS” code block

HeroUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md

The heroui-react skill pairs a v2/v3 contrast table with an explicitly labelled wrong-answer sample followed by the corrected one. Rather than only describing the target API, it shows the exact hallucination it expects (HeroUIProvider + framer-motion + flat Card props) and marks it forbidden.

````tsx
```tsx
// DO NOT DO THIS - v2 pattern
import { HeroUIProvider } from "@heroui/react";
import { motion } from "framer-motion";

<HeroUIProvider>
	<Card title="Product" description="A great product" />
</HeroUIProvider>;
```

### CORRECT (v3 patterns)

```tsx
// DO THIS - v3 pattern (no provider, compound components)
import { Card } from "@heroui/react";

<Card>
	<Card.Header>
		<Card.Title>Product</Card.Title>
		<Card.Description>A great product</Card.Description>
	</Card.Header>
</Card>;
```
````

Source: https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/skills/heroui-react/SKILL.md

## Canonical in-repo exemplar for the pattern models get wrong

Salesforce Lightning Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md

Rather than describing modal structure, both AGENTS.md and .builderrules point at a checked-in component and forbid the from-memory alternative. Modals are a known LLM failure case (models reconstruct `slds-modal` markup with wrong ARIA and focus handling), so the rule pins a real file as the template.

```markdown
### Modals

Extend `lightning/modal`, following `**src/modules/ui/demoModal/`** as the reference (header, body, footer slots; open via `MyModal.open({ size, label })`). Do not build modals from raw `slds-modal` markup.
```

Source: https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/AGENTS.md

## Incorrect/Correct exemplar pairs as the rule bodies

shadcn/ui · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md

Every Critical Rule links to a rules/*.md file (styling, forms, composition, icons, chat, base-vs-radix) built almost entirely out of minimal-pair code blocks labelled **Incorrect:** / **Correct:**. This is few-shot conditioning rather than prose policy: the model sees the exact wrong output it is likely to produce next to the sanctioned one.

````markdown
## Semantic colors

**Incorrect:**

```tsx
<div className="bg-blue-500 text-white">
  <p className="text-gray-600">Secondary text</p>
</div>
```

**Correct:**

```tsx
<div className="bg-primary text-primary-foreground">
  <p className="text-muted-foreground">Secondary text</p>
</div>
```

---

## No raw color values for status/state indicators

For positive, negative, or status indicators, use Badge variants, semantic tokens like `text-destructive`, or define custom CSS variables — don't reach for raw Tailwind colors.

**Incorrect:**

```tsx
<span className="text-emerald-600">+20.1%</span>
<span className="text-green-500">Active</span>
<span className="text-red-600">-3.2%</span>
```
````

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/rules/styling.md

## Inlined prop-complete component catalogue as few-shot exemplars

Shopify Polaris · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md

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

## 181 addressable few-shot exemplars at predictable URLs

Cloudscape Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md

Instead of hoping the model memorized idiomatic Cloudscape, the team publishes a whole corpus of correct pattern implementations as plain text with a deterministic URL template (`/snippets-content/{snippet-name}.txt`) plus a one-line-per-snippet index. An agent can scan the index semantically then pull exactly one exemplar. Coverage skews toward what models get wrong: empty states, server-driven collection hooks, unsaved-changes guards, three distinct form-validation states.

```markdown
Each entry below lists the snippet name and a short description of what it does.
To access any snippet's source code, use: `{domain}/snippets-content/{snippet-name}.txt`
For example: `{domain}/snippets-content/empty-states-table.txt`

Total snippets: 181
```

Source: https://cloudscape.design/snippets-content/index.md

## Progressive disclosure in skills: SKILL.md then references/api.md + references/patterns.md

Mantine · full record: https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md

Every Mantine skill uses the same three-file shape: a short SKILL.md whose YAML description is trigger-heavy (enumerated “Use this skill when: (1)...(6)” clauses naming exact API symbols (useCombobox, Combobox.Target, getInputProps, insertListItem, createVarsResolver), so the skill matcher fires on symbol names appearing in the prompt or the open file), a compact core workflow in the body, and two deep reference files loaded on demand (patterns.md runs 279/310/431 lines across the three skills). Always-on token cost stays tiny while a large exemplar bank sits one file-read away, and each SKILL.md ends with a pointer table telling the agent what each reference contains so it knows when the read is worth paying for.

```markdown
## References

- **[`references/api.md`](references/api.md)** — Full API: `useCombobox` options and store, all sub-component props, CSS variables, Styles API selectors
- **[`references/patterns.md`](references/patterns.md)** — Code examples: searchable select, multi-select with pills, groups, custom rendering, clear button, form integration
```

Source: https://raw.githubusercontent.com/mantinedev/skills/HEAD/skills/mantine-combobox/SKILL.md

## Version-pinned CDN exemplar shell

U.S. Web Design System (USWDS) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md

Because there is no official machine-readable registry, the community skill hard-codes a pinned CDN version and a mandatory HTML shell, then ships a full worked example page (`prototypes/doe-renewable-energy.html`) and `examples/starter.html` as few-shot grounding. Note ‘always use these exact versions’: pinning to 3.13.0 is a direct consequence of USWDS’s 14-month release gap making version drift a non-issue, but it will silently rot on the next release.

````markdown
### CDN links (always use these exact versions)

```html
<!-- In <head> — load init script first -->
<script src="https://unpkg.com/@uswds/uswds@3.13.0/dist/js/uswds-init.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@uswds/uswds@3.13.0/dist/css/uswds.min.css">

<!-- Before </body> — load full JS last -->
<script src="https://unpkg.com/@uswds/uswds@3.13.0/dist/js/uswds.min.js"></script>
```

### Required HTML shell

Every prototype must use this base structure:
````

Source: https://raw.githubusercontent.com/emilycryan/USWDS-design/main/plugins/uswds-prototype/skills/USWDS-prototype/SKILL.md

All categories: https://state-of-ai-in-design-systems.netlify.app/techniques.md

---

Generated 2026-07-28T04:48:05Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
