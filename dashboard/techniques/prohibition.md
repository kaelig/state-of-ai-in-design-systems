---
title: "Prohibition — 25 techniques"
description: "Explicit negative rules aimed at the model: never invent components, no raw colour values, no inline styles."
url: "https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md"
type: "technique-category"
id: "prohibition"
technique_count: 25
system_count: 18
data_collected: "2026-07-26/27"
generated: "2026-07-27T21:54:17Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Prohibition

25 of the 148 techniques in this study, across 18 of the 19 design systems. Read when writing SKILL.md or rules-file language.

Explicit negative rules aimed at the model: never invent components, no raw colour values, no inline styles.

Systems represented here: [Ant Design](https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md), [Atlassian Design System (ADS / Atlaskit)](https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md), [Carbon Design System](https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md), [Chakra UI](https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md), [Cloudscape Design System](https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md), [daisyUI](https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md), [Fluent UI (Fluent 2)](https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md), [HeroUI](https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md), [Mantine](https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md), [Material UI (MUI)](https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md), [Nord Design System](https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md), [PatternFly](https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md), [Primer](https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md), [React Spectrum / Spectrum 2 (S2)](https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md), [Lightning Design System (SLDS)](https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md), [shadcn/ui](https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md), [Polaris (Shopify)](https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md), [U.S. Web Design System (USWDS)](https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Authoritative export allow-list with named anti-examples

Ant Design · full record: https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md

Rather than describing components, copilot-instructions.md enumerates the complete set of legal top-level exports and then names the specific components models are known to invent — Container, Stack, Heading, Box, Sidebar, Navbar, IconButton — as explicitly non-existent. It also points at `components/index.ts` as the machine-checkable source of truth and bans importing icons from `antd`. The single most transferable trick in the system.

```markdown
The following are the **only** top-level exports of `antd`. Do **not** invent components outside this list (e.g. `antd` does not export `Container`, `Stack`, `Heading`, `Box`, `Sidebar`, `Navbar`, `IconButton`, etc.).

When in doubt, verify against `components/index.ts` (the source of truth for public exports). Icons live in a **separate** package: `@ant-design/icons` — never import icons from `antd`.
```

Source: https://raw.githubusercontent.com/ant-design/ant-design/HEAD/.github/copilot-instructions.md

## Directory-scoped import prohibitions for contributor agents

Ant Design · full record: https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md

CLAUDE.md splits the repo into two opposing import regimes and states each as a ban rather than a preference: demos must use absolute/alias imports (`antd`, `antd/es/*`, `@@/*`) and are forbidden from `..`/`../xxx`/`./xxx` references to component internals; `components/**/__tests__/` must use relative imports and are forbidden from `antd`, `antd/es/*`, `.dumi/*`, `@@/*`. Mechanically checkable, unambiguous for an agent.

```markdown
- 常规 demo 文件中，禁止使用 `..`、`../xxx`、`../../xxx`、`./xxx` 这类相对路径去引用组件实现、内部模块、方法、变量、类型，包含跨 demo、跨目录复用的场景。

## Test 导入规范

- 本规范适用于 `components/**/__tests__/` 下的测试文件。
- 在这些目录下引入 Ant Design 组件，或引入组件内部模块、工具方法、变量、类型定义时，一律使用相对路径导入，不使用绝对路径导入。
- 禁止在 `__tests__` 目录下使用 `antd`、`antd/es/*`、`antd/lib/*`、`antd/locale/*`、`.dumi/*`、`@@/*` 这类绝对路径或别名路径去引用仓库内代码。
```

Source: https://raw.githubusercontent.com/ant-design/ant-design/HEAD/CLAUDE.md

## Mandatory accessibility gate ('You MUST call this')

Atlassian Design System (ADS / Atlaskit) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md

`ads_get_a11y_guidelines` is the only tool in the set written as an obligation rather than an affordance, and it pre-empts the model’s parametric knowledge: ‘DO NOT rely on generic web accessibility advice alone—ADS conventions may differ.’ It also splits jurisdiction between org-wide standards (Context Engine `get_accessibility_docs`) and ADS-specific patterns.

```text
Returns Atlassian Design System (ADS) accessibility guidance: best practices and patterns for buttons, interactions, color contrast, forms, and other design-system topics shipped in this tool.

Use this alongside the Context Engine MCP tool `get_accessibility_docs` for Atlassian-wide accessibility standards (e.g. A11YKB); this tool supplies ADS-specific component and pattern guidance.

WHEN TO USE:
You MUST call this when generating or substantially changing a new interactive or visual user interface built with ADS, or when you need topic-specific ADS guidance (e.g. focus, forms, motion).

DO NOT rely on generic web accessibility advice alone—ADS conventions may differ. Use `get_accessibility_docs` for org-wide standards and this tool for ADS-topic guidance.
```

Source: https://mcp.atlassian.com/v1/ads/public/mcp

## DESIGN.md 'drift pattern' table — an explicit anti-AI-slop prohibition list

Atlassian Design System (ADS / Atlaskit) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md

The most quotable artifact in the whole system: a two-column Do/Don’t table introduced as ‘Each line is a drift pattern to correct on sight’. It targets the exact failure modes of unguided LLM UI generation by name — gradient-filled text via `background-clip: text`, glass cards and `backdrop-filter` blur stacks ‘as generic polish’, the ‘Default “hero metric” template’, ‘Repeated identical tiles (icon + heading + body + CTA × N) as the only layout’, Unicode/emoji glyphs standing in for icons, and even competitor default fonts (‘Inter / Geist / SF Pro / Roboto in product’). It also disambiguates accent vs semantic token misuse, which is the classic token-drift error.

```markdown
## Do's and Don'ts

The scan-friendly TL;DR. Each line is a drift pattern to correct on sight. Tokens are referenced by
their YAML key; hex values resolve from the frontmatter.

| Do | Don't |
| Hex anchored to a token (`text` → `#292A2E`) | Arbitrary one-off hex (`color: '#172B4D'`) with no token mapping |
| Padding / margin / gap on a `space-*` step | `padding: 13px` or any off-rail value |
| `background-danger-bold` for destructive CTAs | `background-accent-red-bolder` for destructive CTAs (accent ≠ semantic) |
| Sentence case ("Create work item") | Title Case ("Create Work Item"); ALL CAPS / letter-spaced "EYEBROW" labels |
| Atlassian core icon at 16px for chevrons, checks, arrows | Unicode / emoji / HTML-entity glyphs (`›` `→` `▶` `✓` `✕` `…` `⚠`) as icons |
| Atlassian Sans in product; Charlie only on marketing | Inter / Geist / SF Pro / Roboto in product; Charlie in settings pages |
| Solid `text-*` tokens + `weight-*` for hierarchy | Gradient-filled text (`background-clip: text` + `linear-gradient`) |
| Restrained metrics: `metric-*` surface per [Components](#components), no decoration | Default "hero metric" template (oversized number + tiny label + stat row + decorative gradient) |
| Borders and whitespace for depth; `backdrop-filter` only when ADS specifies it | Glass cards, glow borders, or `backdrop-filter` blur stacks as generic polish |
```

Source: https://atlassian.design/DESIGN.md

## Numbered implementation guardrails: hard prohibitions on styling escape hatches

Carbon Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md

Thirteen numbered ‘Hard rules — apply during code generation’. The interesting ones are the escape-hatch bans: never target internal `.bx--`/`.cds--` class names, IBM CDN only (never Google Fonts/jsDelivr/unpkg), never use compile-time SCSS variables in Web Components (use CSS custom properties), never colored Tags for status (use IconIndicator/ShapeIndicator), never mix Tabs and TabsVertical containers. These encode the specific ways teams have historically drifted off-system.

```markdown
8. **CDN** — IBM CDN only (`1.www.s81c.com`). Never Google Fonts, jsDelivr, or unpkg.
9. **Styling discipline** — never target `.bx--` / `.cds--` internal class names unless the user explicitly confirms. Do not force `<Theme>` wrappers when the host app already provides Carbon theme context.
10. **Layout** — keep modals, side panels, tooltips, and toasts outside Grid flow. For `Layer`, use `withBackground` for visible backgrounds; never set `level` manually.
11. **Composition** — `Breadcrumb` current item: use `isCurrentPage`, no `href`. Icon-only interactive controls must include `iconDescription`. **Status indicators:** use `IconIndicator`/`ShapeIndicator` — never colored Tags or icon queries; use the `kind` prop (`failed`, `warning`, `succeeded`, `in-progress`, etc.). **Tabs orientation:** horizontal → `Tabs` + `TabList`; vertical → `TabsVertical` + `TabListVertical` — never mix containers.
```

Source: https://carbondesignsystem.com/developing/carbon-mcp/files/carbon-builder.zip

## Prohibition list on v2 API surface (prop-name blacklist)

Chakra UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md

Both the refactor and migrate skills carry an explicit rename blacklist so v2-heavy training data cannot leak through. The refactor skill turns it into a review checklist with exact wrong→right pairs and names the v2 patterns that must not appear at all (extendTheme, ColorModeScript, useColorModeValue, sx).

```markdown
**Chakra API correctness**

- Are v3 prop names used? (`disabled` not `isDisabled`, `colorPalette` not
  `colorScheme`, `gap` not `spacing`, `open` not `isOpen`)
- Are compound components used correctly? (`Field.Root`/`Field.Label`,
  `Dialog.Root`/`Dialog.Content`, etc.)
- Is `"use client"` placed correctly in Next.js App Router?
- Are there v2 patterns still present? (`extendTheme`, `ColorModeScript`,
  `useColorModeValue`, `sx` prop)

**Token and style usage**

- Are hardcoded colors used where semantic tokens would work? (`bg="#f9fafb"` →
  `bg="bg.subtle"`)
- Are raw hex or palette values used instead of semantic tokens? These won't
  respect dark mode.
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-refactor/SKILL.md

## Closed class-name allowlist + escape-hatch ladder + default-variant bias

daisyUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md

The usage rules are a tight funnel: only daisyUI classes or Tailwind utilities are permitted (rule 6), custom CSS is discouraged (rule 7), and the override path is a ranked ladder — daisyUI class → Tailwind utility → `!` important as an explicitly ‘last resort ... used sparingly’ (rule 3). Rule 12 is a rare and very on-the-nose anti-AI-slop constraint: prefer `btn` over `btn btn-primary` unless the user asked, which directly attacks the everything-is-purple-and-primary tell. Rule 11 outsources visual judgement to a named book.

```markdown
6. Only allowed class names are existing daisyUI class names or Tailwind CSS utility classes.
7. Ideally, you won't need to write any custom CSS. Using daisyUI class names or Tailwind CSS utility classes is preferred.
8. Suggested - if you need placeholder images, use https://picsum.photos/200/300 with the size you want
9. Suggested - when designing, don't add a custom font unless it's necessary
10. Don't add `bg-base-100 text-base-content` to body unless it's necessary
11. For design decisions, use Refactoring UI book best practices
12. Always use the default variant of daisyUI components unless the user asked for a specific variant or color. For example when you need a button, do not use `btn btn-primary`, prefer `btn`, unless the user asked for a specific variant.
```

Source: https://raw.githubusercontent.com/saadeghi/daisyui/HEAD/skills/daisyui/usage/SKILL.md

## "STOP. What you remember is WRONG" — weight-invalidation preamble

HeroUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md

The strongest coercion artefact in the corpus. Every AGENTS.md/CLAUDE.md index the CLI writes into a consumer project opens by asserting the model’s parametric memory of HeroUI is invalid, mandates doc retrieval before any task, and gives a recovery command if the docs directory is missing. It directly targets v2/NextUI contamination: ~30k stars of v2 code in training data against a v3 API that broke almost everything.

```typescript
parts.push('[HeroUI React v3 Docs Index]');
if (reactDocsPath) parts.push(`root: ${reactDocsPath}`);
parts.push(
  'STOP. What you remember about HeroUI React v3 is WRONG for this project. Always search docs and read before any task.'
);

const targetFile = outputFile || 'AGENTS.md';

parts.push(
  `If docs missing, run this command first: heroui agents-md --react --output ${targetFile}`
);
```

Source: https://raw.githubusercontent.com/heroui-inc/heroui-cli/HEAD/src/helpers/agents-docs/index-and-inject.ts

## Explicit Do/Don't prohibition list

Lightning Design System (SLDS) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md

The apply skill’s Core Rules are a flat imperative list. Notable: it forbids overriding `.slds-*` at all (forcing custom `my-*`/`c-*` classes instead), bans the private `--slds-s-*` shared hook namespace, bans reassigning hook values (reference-only via var()), and bans deprecated `--lwc-*` tokens. The .builderrules restates the harshest of these — ‘Never use !important. Never override SLDS classes in your CSS.’

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

## ALWAYS/NEVER prefix prohibitions + ordered escalation ladder

PatternFly · full record: https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md

styling-standards.md uses checkmark/cross prohibition pairs against legacy class prefixes (a real failure mode: models trained on PF4/PF5 emit `pf-c-*`), then imposes a strict preference order — component composition first, component props second, utility classes only as a last resort — with wrong-answer examples inline so the model sees the anti-pattern it is likely to produce.

````markdown
### PatternFly v6 Requirements
- ✅ **ALWAYS use `pf-v6-` prefix** - All PatternFly v6 classes
- ❌ **NEVER use legacy prefixes** - No `pf-v5-`, `pf-v4-`, `pf-u` or `pf-c-`

```css
/* ✅ Correct v6 classes */
.pf-v6-c-button          /* Components */
.pf-v6-u-m-md            /* Utilities */
.pf-v6-l-grid            /* Layouts */

/* ❌ Wrong - Don't use these */
.pf-v5-c-button
.pf-u-m-md
.pf-c-button
```
...
> **Component-first approach:** Use proper PatternFly component composition for layout and spacing. Components should be children of appropriate containers like PageSection, ActionGroup, Stack, etc.
````

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/docs/guidelines/styling-standards.md

## Allowlisted design sources

PatternFly · full record: https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md

`pf-figma-design-mode` ships a one-page `references/approved-sources.md` that hard-restricts the agent to exactly two Figma files, preventing it from pulling components from random or forked libraries when composing designs.

```markdown
# Approved Figma Sources

Use components and patterns only from these two Figma files:

- [PatternFly 6 – Components](https://www.figma.com/design/VMEX8Xg2nzhBX8rfBx53jp/PatternFly-6--Components?m=auto)
- [PatternFly 6 – Patterns & Extensions](https://www.figma.com/design/MSr6kVEOuAxmPOkjg7x8PO/PatternFly-6--Patterns---Extensions?m=auto)
```

Source: https://raw.githubusercontent.com/patternfly/ai-helpers/main/plugins/design-guide/skills/pf-figma-design-mode/references/approved-sources.md

## Named-package prohibition to kill stale-training imports

Polaris (Shopify) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md

Because @shopify/polaris (React) dominates pre-2026 training data, the skill names the exact wrong packages and forbids them — closing the highest-probability failure mode for a deprecated-then-replaced design system. It also states the correct alternative (globally registered custom elements, no import at all).

````markdown
## Imports

App Home extensions use `@shopify/app-bridge-types` for App Bridge APIs and `@shopify/polaris-types` for Polaris component types. Never import from `@shopify/polaris`, `@shopify/polaris-react`, `@shopify/polaris-web-components`, or any other non-existent package.

```ts
import { useAppBridge } from "@shopify/app-bridge-react";
```

### Polaris web components (`s-page`, `s-badge`, etc.)

Polaris web components are custom HTML elements with an `s-` prefix. These are globally registered and require **no import statement**. Use them directly as JSX tags:

```tsx
// No import needed — s-page, s-badge, s-button, s-box, etc. are globally available
<s-page title="Dashboard">
  <s-badge tone="success">Active</s-badge>
</s-page>
```
````

Source: https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/skills/shopify-polaris-app-home/SKILL.md

## Deliberate crawler starvation for the deprecated surface

Polaris (Shopify) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md

Rather than publish llms.txt for Polaris React, Shopify blocks AI crawlers outright and marks the deprecation loudly in the README that agents WILL still read via GitHub. Combined with the named-package prohibition in the skill, it is a two-sided campaign to evict the old API from model context.

```markdown
# Polaris React (⚠️ Deprecated)

The **Shopify Polaris React library** is deprecated.  
We are no longer accepting contributions or feature requests in this repository.

On October 1, 2025, we released our [Polaris Web Components](https://shopify.dev/docs/api/app-home/polaris-web-components) for Shopify app development. We encourage Shopify App developers to adopt Polaris Web Components for new development.

This repository will remain available for historical purposes, but it will not receive updates or maintenance.
```

Source: https://raw.githubusercontent.com/Shopify/polaris/HEAD/README.md

## Named-API prohibitions served over MCP

Primer · full record: https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md

`primer_coding_guidelines` is a tool that exists solely to inject house rules into the consumer’s agent session. It combines soft ‘Prefer…’ guidance (reuse a Primer component over writing a new one; use existing props over adding styles; use Primer icons over inventing icons) with a hard, named-API blocklist encoding Primer’s live internal migration away from `sx` and `Box` — the exact two APIs a model trained on older Primer code reaches for by default.

```typescript
## Authoring & Using Components

- Prefer re-using a component from Primer when possible over writing a new component.
- Prefer using existing props for a component for styling instead of adding styling to a component
- Prefer using icons from Primer instead of creating new icons. Use the `list_icons` tool to find the icon you need.
- Follow patterns from Primer when creating new components. Use the `list_patterns` tool to find the pattern you need, if one exists
- When using a component from Primer, make sure to follow the component's usage and accessibility guidelines

## Coding guidelines

The following list of coding guidelines must be followed:

- Do not use the sx prop for styling components. Instead, use CSS Modules.
- Do not use the Box component for styling components. Instead, use CSS Modules.
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/packages/mcp/src/server.ts

## Anti-invention clauses backed by platform-level output caps

Primer · full record: https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md

Across contributor agent files and the CI triage agent, Primer repeatedly writes negative constraints against the model’s strongest failure mode — fabricating structure. The triage bot may only apply labels that already exist and may never close an issue; the implementer agent may not invent visual styling without a design reference and may not add slot machinery ‘by default’. Crucially the prohibition is also enforced at the platform layer via gh-aw `safe-outputs` maxima, not just in the prompt.

```markdown
Base every decision only on what the issue and its comments actually say. Do not invent
missing context or guess beyond the evidence. Keep the issue's existing labels; only add
labels. Never close the issue.

- **Classify the issue type.** If the issue already has a type, leave it. Otherwise set the
  single best-fitting type from those this repository offers. If it is too ambiguous to
  type confidently, leave it untyped.
- **Add relevant labels.** Apply existing repository labels that describe the issue's nature
  and area. Only use labels that already exist; never invent labels, and do not re-add
  labels the issue already has. If nothing fits, add none.
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/.github/workflows/issue-triage.md

## Named-competitor prohibition + escape-hatch ban

React Spectrum / Spectrum 2 (S2) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md

The skill names competing libraries explicitly rather than saying ‘stay on-system’, and shouts the S2 escape hatches. Reinforced downstream: spectrum-audit assigns Severity: High to UNSAFE_style|UNSAFE_className and to Tailwind/clsx usage, with literal grep patterns to detect them.

```markdown
- Avoid using Tailwind, `radix-ui`, `shadcn/ui`, or any other third-party design system in S2 implementations.
- IMPORTANT: avoid using `UNSAFE_style` and `UNSAFE_className`.

### No `UNSAFE_style` / `UNSAFE_className`
- **Rule:** Avoid `UNSAFE_style` and `UNSAFE_className`; they bypass tokens and the style layer ordering.
- **Detect:** grep `UNSAFE_style|UNSAFE_className`.
- **Severity:** High.

### No concatenation of macro output
- **Rule:** `style()` results encode style precedence; concatenating them with template literals, `clsx`, `classnames`, or string spaces breaks ordering.
- **Severity:** High.
```

Source: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/SKILL.md

## Anti-"reinvent the component" clauses with named failure modes

React Spectrum / Spectrum 2 (S2) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md

Instead of a generic ‘reuse components’, the skill enumerates the exact hand-rolled shapes LLMs produce — card divs, wrapper spans around collection items, an overflow div around a virtualized list, a custom empty-state div, a separate spinner — and forbids each with the mechanical reason it breaks.

```markdown
### Don't reinvent `Card` / `CardView`

For grids of objects/files/products/people, use `CardView` plus a prescribed variant (`AssetCard`, `UserCard`, `ProductCard`) or `Card` composed with `CardPreview`/`Content`/`Text`/`Footer`. Don't emit hand-rolled card divs or `<article>` wrappers.

`TableView`, `ListView`, `TreeView`, `CardView`, `Menu`, and `ListBox` virtualize and scroll internally. Don't wrap them in an `overflow`/`overflowY`/`overflowX` container — that produces a nested scroller and breaks keyboard navigation.

- Empty state: pass `renderEmptyState` returning an `IllustratedMessage`. Don't conditionally swap the whole collection for a custom empty `div`.
- Async data: use `useAsyncList` (or the user's preferred data fetching library) plus the collection's `loadingState`/`onLoadMore` props. Don't render a separate spinner.
```

Source: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/SKILL.md

## Hard prohibition list ('Critical Rules … always enforced')

shadcn/ui · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md

The skill front-loads a list of negative constraints in bold imperative form, each linked to a rule file with Incorrect/Correct code pairs. Notably it bans generic markup in favour of system components ('Callouts use Alert. Don’t build custom styled divs’), bans raw Tailwind color values in favour of semantic tokens, and bans layout primitives the system doesn’t use (space-x/space-y).

```markdown
## Critical Rules

These rules are **always enforced**. Each links to a file with Incorrect/Correct code pairs.

### Styling & Tailwind → [styling.md](./rules/styling.md)

- **`className` for layout, not styling.** Never override component colors or typography.
- **No `space-x-*` or `space-y-*`.** Use `flex` with `gap-*`. For vertical stacks, `flex flex-col gap-*`.
- **Use `size-*` when width and height are equal.** `size-10` not `w-10 h-10`.
- **No manual `dark:` color overrides.** Use semantic tokens (`bg-background`, `text-muted-foreground`).
- **No manual `z-index` on overlay components.** Dialog, Sheet, Popover, etc. handle their own stacking.

### Forms & Inputs → [forms.md](./rules/forms.md)

- **Forms use `FieldGroup` + `Field`.** Never use raw `div` with `space-y-*` or `grid gap-*` for form layout.
- **`InputGroup` uses `InputGroupInput`/`InputGroupTextarea`.** Never raw `Input`/`Textarea` inside `InputGroup`.

### Use Components, Not Custom Markup → [composition.md](./rules/composition.md)

- **Use existing components before custom markup.** Check if a component exists before writing a styled `div`.
- **Callouts use `Alert`.** Don't build custom styled divs.
- **Empty states use `Empty`.** Don't build custom empty state markup.
- **Use `Separator`** instead of `<hr>` or `<div className="border-t">`.
- **Use `Skeleton`** for loading placeholders. No custom `animate-pulse` divs.
- **Use `Badge`** instead of custom styled spans.
```

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/shadcn/SKILL.md

## Hard CSS prohibitions in contributor docs (builder-side)

Cloudscape Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md

docs/STYLING.md is written as absolute negative rules with the reason attached — the shape that survives an LLM’s summarization. ‘Use logical properties only — no left/right/top/bottom/width/height’, ‘No descendant combinators’, ‘Root elements must not have outer margins’. This is the real rulebook AGENTS.md routes agents to, rather than being inlined in AGENTS.md itself.

```markdown
# Styling

Prefer design tokens and custom CSS properties over hardcoded values (colors, spacing, font sizes, etc.). This keeps styles consistent across themes and modes.

## Rules

- Root elements must not have outer margins — spacing is managed by parent components
- No descendant combinators (`.a .b` with a space) — breaks CSS scoping because it applies to all `.class-b` elements at unlimited depth
- Wrap animations in the `with-motion` mixin to ensure motion can be toggled on and off
- Use logical properties only — no `left`/`right`/`top`/`bottom`/`width`/`height` in CSS. Use `inline-start`/`inline-end`/`block-start`/`block-end`/`inline-size`/`block-size` instead. Required for RTL support.
```

Source: https://raw.githubusercontent.com/cloudscape-design/components/HEAD/docs/STYLING.md

## 'Never X — use Y' escape-hatch closing in satellite repos

Cloudscape Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md

The chart-components AGENTS.md spends its single content bullet on one absolute prohibition with a named replacement — the classic pattern for keeping a model off an API it will otherwise reach for by habit (Highcharts’ well-documented `series.data`). Everything else is delegated upward to the main repo’s guide.

```markdown
## Conventions

This repository follows the same conventions as the [main Cloudscape components library](https://github.com/cloudscape-design/components). Refer to the [Cloudscape Components Guide](https://github.com/cloudscape-design/components/blob/main/docs/CLOUDSCAPE_COMPONENTS_GUIDE.md) for details on component structure, props, events, styling, testing, code style, dev pages, and API docs.

## Highcharts

Never access `series.data` directly — use `getSeriesData()` from `src/internal/utils/highcharts`. See the [Highcharts pitfalls section in CONTRIBUTING.md](CONTRIBUTING.md#highcharts-pitfalls) for details.
```

Source: https://raw.githubusercontent.com/cloudscape-design/chart-components/HEAD/AGENTS.md

## "Source of truth, not existing code" — overriding the repo itself

Fluent UI (Fluent 2) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md

The single most transferable trick in the file. Fluent UI’s monorepo is 74+ v9 packages sitting next to a large v8 legacy tree, so RAG-over-the-repo and pattern-matching from neighbours actively produce wrong output. AGENTS.md pre-empts that by ranking the instruction file ABOVE the codebase, then names the contaminated directories explicitly so the agent can’t rationalize its way back in.

```markdown
**Instructions in this file are the source of truth, not existing code.** This repo contains
legacy patterns (especially in v8 packages) that predate current standards. Never copy patterns
from existing code without verifying they match these instructions.

## Legacy Anti-Patterns (never copy these)

- **DO NOT copy patterns from `packages/react/` (v8).** That's maintenance-only legacy code using runtime styling, class components, and different APIs.
- **DO NOT use `@fluentui/react` imports for new v9 work.** Use `@fluentui/react-components`.
- **DO NOT use `mergeStyles` or `mergeStyleSets`.** Use Griffel `makeStyles` with design tokens.
- **DO NOT use `IStyle` or `IStyleFunctionOrObject`.** Use Griffel's `GriffelStyle` type.
- **DO NOT use `initializeIcons()`.** V9 uses `@fluentui/react-icons` with tree-shaking.
```

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/AGENTS.md

## FAQ-as-prohibition: negative answers hoisted to the top of llms.txt

Mantine · full record: https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md

Instead of writing rules about what agents must not do, Mantine front-loads llms.txt with a large FAQ block (sourced from help.mantine.dev) whose entries are literally refusals — and the verdict sits in the link description, so a model that only reads the index and never fetches the linked .md still absorbs the constraint: “No, Astro does not support React context”; “No, Mantine is a React library and does not support other frameworks/libraries”; “No, it is not safe and will not work with future versions of Mantine” (private CSS variables); “Nested styles are supported only in CSS files”; “SegmentedControl cannot be used without a value”. Prohibition smuggled into an index of URLs, targeting exactly the hallucinations LLMs make about Mantine.

```markdown
- [Can I use Mantine with Astro?](https://mantine.dev/llms/q-can-i-use-mantine-with-astro.md): No, Astro does not support React context
- [Can I use Mantine with Vue/Svelte/Angular/etc.?](https://mantine.dev/llms/q-vue-svelte-angular.md): No, Mantine is a React library and does not support other frameworks/libraries
- [Can I use nested inline styles with Mantine components?](https://mantine.dev/llms/q-nested-inline-styles.md): Nested styles are supported only in CSS files
- [Can I use private CSS variables to style components?](https://mantine.dev/llms/q-private-css-variables.md): No, it is not safe and will not work with future versions of Mantine.
- [Can I use SegmentedControl with empty value?](https://mantine.dev/llms/q-segmented-control-no-value.md): SegmentedControl cannot be used without a value
- [Can I use Mantine with Emotion/styled-components/tailwindcss?](https://mantine.dev/llms/q-third-party-styles.md): Learn about limitations of third-party styles
```

Source: https://mantine.dev/llms.txt

## "using ONLY the URLs present in the returned content" — closed-world retrieval rule

Material UI (MUI) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md

The docs page hands users a copy-paste rule file (suggested location `.github/instructions/mui.md`, explicitly reusable in any IDE) that forces a loop: call useMuiDocs, then fetchDocs restricted to URLs the previous tool returned, repeat until saturated, and only then answer. The capitalised ONLY is the coercive core — it forbids the agent from inventing or guessing doc URLs, which is the exact hallucination mode the page complains about.

```text
## Use the mui-mcp server to answer any MUI questions --

- 1. call the "useMuiDocs" tool to fetch the docs of the package relevant in the question
- 2. call the "fetchDocs" tool to fetch any additional docs if needed using ONLY the URLs present in the returned content.
- 3. repeat steps 1-2 until you have fetched all relevant docs for the given question
- 4. use the fetched content to answer the question
```

Source: https://mui.com/material-ui/getting-started/mcp.md

## Per-component Do/Don't blocks that route the model to the correct sibling component

Nord Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md

Every component reference file opens with a `> **Do:**` / `> **Don't:**` pair. The prohibitions are unusually well targeted at LLM failure modes: they name the component the model should have reached for instead ('Don’t use for a single disclosure of content, use Collapsible instead’; 'Don’t use when the value must be one of a fixed set of options, see Combobox instead’), and they call out the accessibility attribute an agent typically omits ('Don’t omit `label` — the rail button has no visible text, so the accessible name comes from this attribute’). This is the real coercion surface, and it ships verbatim into the skill.

```markdown
> **Do:** - Only use one primary button per section, as a main call-to-action.
- Use clear and accurate labels.
- Use established button colors appropriately. For example, only use a danger button style for an action that's difficult or impossible to undo.
- Prioritize the most important actions. Too many buttons will cause confusion.
- Be consistent with positioning of buttons in the user interface.
- Use strong, actionable verbs in labels such as "Add", "Close", "Cancel", or "Save".

> **Don't:** - Don't use a primary button in every row of a table.
- Don't use buttons to link to other pages. Use regular link or a plain style instead where necessary.
- Don't use buttons for navigation where the link appears within or following a sentence.
- Don't use labels such as "Read more", "Click here" or "More".
```

Source: https://nordhealth.design/.well-known/skills/nord/references/components/button.md

## Absolute prohibition on inventing UI

U.S. Web Design System (USWDS) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md

The emilycryan Claude skill opens with a four-line Core Behavior block using the strongest available form — ‘Always’ / ‘Do not invent’. Contrast with uswds-mcp’s graduated preference language. Both are community-authored; USWDS itself publishes no such constraint anywhere.

```markdown
## Core Behavior
- Always use USWDS components and patterns
- Do not invent custom UI if a USWDS pattern exists
- Follow standard government UX conventions
- Prioritize clarity, accessibility, and simplicity
```

Source: https://raw.githubusercontent.com/emilycryan/USWDS-design/main/plugins/uswds-prototype/skills/USWDS-prototype/SKILL.md

All categories: https://state-of-ai-in-design-systems.netlify.app/techniques.md

---

Generated 2026-07-27T21:54:17Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
