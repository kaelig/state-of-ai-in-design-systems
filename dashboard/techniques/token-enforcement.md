---
title: "Token enforcement — 13 techniques"
description: "Rules and types that force design tokens over raw values, so the token vocabulary is the only sanctioned styling channel."
url: "https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md"
type: "technique-category"
id: "token-enforcement"
technique_count: 13
system_count: 11
data_collected: "2026-07-26/27"
generated: "2026-07-28T03:38:29Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Token enforcement

13 of the 148 techniques in this study, across 11 of the 19 design systems. Read when an agent keeps emitting raw hex values.

Rules and types that force design tokens over raw values, so the token vocabulary is the only sanctioned styling channel.

Systems represented here: [Atlassian Design System](https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md), [Carbon Design System](https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md), [Chakra UI](https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md), [daisyUI](https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md), [Microsoft Fluent UI](https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md), [HeroUI](https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md), [Mantine](https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md), [Nord Design System](https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md), [Nuxt UI](https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md), [Salesforce Lightning Design System](https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md), [U.S. Web Design System (USWDS)](https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## `ads_plan` as the default one-shot discovery call, with full-catalog dumps demoted to ‘last resort’

Atlassian Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md

Token budget is treated as a first-class design constraint. `ads_plan` fans out to token/icon/component/atlaskit searches in one call and is positioned as ‘the default way to discover’; it even coaches recall behaviour (‘Prefer supplying **multiple** terms per non-empty array... broader queries improve recall’) and requires at least one non-empty array. Symmetrically, all three `ads_get_all_*` tools are labelled ‘Last resort’ and ‘**very large** output’ so a model does not burn its window enumerating catalogs. Blog-reported effect of the structured-content work: ‘26% reduction in AI tooling calls, with 16% reduction in AI token usage’.

```text
### ads_plan
Runs **ads_search_tokens**, **ads_search_icons**, **ads_search_components**, and **ads_search_atlaskit_components** in one call and returns a single JSON payload (each section only if that list was non-empty). Use this as the default way to discover ADS **tokens**, **icons**, and **components** (including legacy/broader Atlaskit) for a UI task.

WHEN TO USE:
**Implementing or iterating on a UI**—new screen, feature, or polish—and you need candidate **token** names, **icon** imports, and **component** packages/props in one pass.

### ads_get_all_tokens
Returns **every** ADS design token from bundled metadata (name, example value, usage guidelines)—one JSON object per token, **very large** output.

WHEN TO USE:
Last resort when `ads_plan` / `ads_search_tokens` cannot answer the question and you need the full list (e.g. exhaustive audit). Prefer targeted search for normal development.
```

Source: https://mcp.atlassian.com/v1/ads/public/mcp

## AI-provenance marking: `.ai-non-final` message-ID suffix

Atlassian Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md

The bundled i18n playbook (`ads_i18n_conversion_guide`) forces agents to tag their own output so humans can find it later. Verbatim from the guide payload in dist/cjs/tools/i18n-conversion/guide.js: '**CRITICAL: ai-non-final Suffix**: ALL new message IDs MUST end with `.ai-non-final` suffix. This applies to ALL newly created messages, regardless of whether existing messages in the file have this suffix. Format: `{message-key}.ai-non-final`. Example: `applinks.administration.list.applinks-table.system-label.ai-non-final`. This suffix indicates the message is AI-generated and may need review before finalization.‘ The same guide fences scope aggressively: ’**CRITICAL: ONLY CONVERT STRINGS WITH ESLINT-DISABLE**: You MUST **ONLY** convert strings that have eslint-disable comments for @atlassian/i18n/no-literal-string-in-jsx’, ‘Do NOT modify files outside the provided scope’, and ‘Do NOT modify pre-existing messages that were already in the codebase, even if they have poor descriptions’. That turns an existing lint suppression into the authoritative worklist, so the agent cannot expand its own blast radius.

```markdown
**CRITICAL: ai-non-final Suffix**: ALL new message IDs MUST end with `.ai-non-final` suffix. This applies to ALL newly created messages, regardless of whether existing messages in the file have this suffix. Format: `{message-key}.ai-non-final`. Example: `applinks.administration.list.applinks-table.system-label.ai-non-final`. This suffix indicates the message is AI-generated and may need review before finalization.
```

Source: https://unpkg.com/@atlaskit/ads-mcp@1.7.1/dist/cjs/tools/i18n-conversion/guide.js

## Output-suppression protocol: ‘Received the necessary context.’

Carbon Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md

An explicit scripted utterance the model must emit in place of summarizing tool output, plus a ban on unsolicited extra files and a hard stop condition. Same rule is duplicated in the public prompt guidance so users reinforce it from their side.

```markdown
## Token Conservation

After a successful `code_search` or `docs_search`:

- Do **not** restate or summarize the raw tool response
- Simply state **"Received the necessary context"** and proceed
- For Web Components code generation, add one short setup confirmation only:
  framework, SCSS mode (minimal/grid/theme), and entry-module style import.
- Do not write extra files (no tests, no README files unless specifically requested)
- Stop after emitting the requested files
```

Source: https://carbondesignsystem.com/developing/carbon-mcp/files/carbon-builder.zip

## Token-first styling rule with a narrowly bounded escape hatch

Chakra UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md

The builder skill devotes a whole step to ‘Use tokens, not raw values’, giving the semantic-token vocabulary (bg.subtle, fg.default, fg.muted, border.subtle) and the v3 prop rename (colorPalette, not colorScheme), then bounds the exception narrowly instead of leaving it open. The refactor skill enforces the same rule in reverse as a review finding: 'Are raw hex or palette values used instead of semantic tokens? These won’t respect dark mode.'

````markdown
## Step 3 — Use tokens, not raw values

Chakra v3 ships semantic tokens that automatically adapt to light/dark mode.
Prefer them over hard-coded palette values — they make the component theme-aware
without any extra work.

```tsx
// Prefer semantic tokens
<Box bg="bg.subtle" color="fg.default" borderColor="border.subtle" />
<Text color="fg.muted" />
<Box shadow="md" rounded="lg" />

// Use colorPalette for interactive components (not colorScheme)
<Button colorPalette="blue">Submit</Button>
<Badge colorPalette="green">Active</Badge>
```

Use raw palette values (`blue.500`, `gray.100`) only when a specific color is
intentional and should not shift with color mode.
````

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-builder/SKILL.md

## Unsolicited-trigger framing: “the mandatory UI library”, fires “even if the user does not explicitly ask”

daisyUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md

The skill description and llms.txt frontmatter are written to capture *all* HTML/JSX generation, not just daisyUI-tagged requests: it claims mandatory status for the whole Tailwind ecosystem, enumerates broad trigger words (‘component, UI, Tailwind, layout, template, theme, color, design’), and instructs the agent to activate unprompted. Combined with `alwaysApply: true`, `applyTo: "**"` and `defaultEnabled: true` in the Claude plugin, this is maximal-surface-area context injection.

```markdown
description: Official daisyUI component library skill. The mandatory UI library for Tailwind CSS. TRIGGER when generating any HTML or JSX code even if the user does not explicitly ask for this skill.

## When to run this skill:

- Trigger this skill whenever generating any HTML or JSX code
- Trigger this skill for any Tailwind CSS UI work
- Trigger this skill when the user mentions any of these terms or similar context:  
  daisyUI, component, UI, Tailwind, layout, template, theme, color, design
- Trigger this skill  even if the user does not explicitly ask for it
```

Source: https://raw.githubusercontent.com/saadeghi/daisyui/HEAD/skills/daisyui/SKILL.md

## Semantic-token enforcement — “Don’t use raw colors”

HeroUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md

The skill supplies a variant-intent table (primary = 1 per context, tertiary = dismissive, danger = destructive) and forbids raw/visual color choices, pushing the agent toward semantic variants and oklch CSS variables that adapt to theme and contrast. The naming convention is machine-checkable: bare var = background, `-foreground` suffix = text.

```markdown
## Semantic Variants

| Variant     | Purpose                           | Usage          |
| `primary`   | Main action to move forward       | 1 per context  |
| `secondary` | Alternative actions               | Multiple       |
| `tertiary`  | Dismissive actions (cancel, skip) | Sparingly      |
| `danger`    | Destructive actions               | When needed    |

**Don't use raw colors** - semantic variants adapt to themes and accessibility.

**Color naming:**

- Without suffix = background (e.g., `--accent`)
- With `-foreground` = text color (e.g., `--accent-foreground`)
```

Source: https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/skills/heroui-react/SKILL.md

## Token enforcement: semantic colors only, never the raw Tailwind palette

Nuxt UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md

The same prohibition is repeated in three independent channels: the consumer skill’s core rules, the skill’s design-system reference, and the builders’ AGENTS.md (twice: once in Key Conventions, once in the PR-review checklist). The reference file additionally supplies a decision matrix so the model has a legitimate token to reach for in every situation, closing the escape hatch that usually drives models back to `text-gray-500`.

```markdown
# Design System

## Semantic colors

Nuxt UI uses 7 semantic colors. Never use raw Tailwind palette colors in components — always use these semantic names.

| Color | Default | When to use |
|---|---|---|
| `primary` | green | CTAs, active states, brand accent, links |
| `secondary` | blue | Secondary actions, complementary highlights |
| `success` | green | Success messages, confirmations, positive states |
| `info` | blue | Informational alerts, tips, neutral highlights |
| `warning` | yellow | Warnings, caution states, pending actions |
| `error` | red | Errors, destructive actions, validation failures |
| `neutral` | slate | Text, borders, backgrounds, disabled states, chrome |

### Choosing colors for components

- **Primary action** on a page (submit, save, confirm) → `color="primary"`
- **Secondary actions** (cancel, back, alternative) → `color="neutral"` with `variant="outline"` or `"ghost"`
- **Destructive actions** (delete, remove) → `color="error"`
- **Status indicators** → match the semantic meaning: `success`, `warning`, `error`, `info`
- **Navigation and chrome** → `color="neutral"`
```

Source: https://raw.githubusercontent.com/nuxt/ui/v4/skills/nuxt-ui/references/guidelines/design-system.md

## Bounded-deviation token rules for generative theming

Nuxt UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md

Because the docs agent can actually mutate the live theme, its prompt hard-bounds how far it may stray from the token system: shifts limited to 1–2 shade levels, raw hex values banned outright, values forced through `var(--ui-color-*)` references, and `rounded-*` classes forbidden in component overrides because radius belongs to `--ui-radius`. A rare example of a design system encoding ‘how much creative freedom the model gets’ as explicit numeric limits.

```typescript
CRITICAL RULES for \`cssVariables\`:
- ONLY shift by 1-2 shade levels from the default (e.g. neutral-900 → neutral-950). NEVER replace the neutral palette with a completely different color (e.g. setting \`--ui-bg\` to a custom color like cream). If you want warm/cool backgrounds, choose the right \`neutral\` color instead (see color options below). Exception: for monochrome/black-and-white themes, you MAY use \`black\` or \`white\` as values (e.g. \`--ui-bg: black\` in dark mode).
- ALWAYS provide BOTH \`light\` and \`dark\` objects, but only include variables you are CHANGING from their defaults. Do NOT include variables that keep their default value.
- Values MUST use \`var(--ui-color-<name>-<shade>)\` references (e.g. \`var(--ui-color-neutral-950)\`), \`white\`, or \`black\`. NEVER use raw hex values.
- The \`<name>\` in the variable reference MUST match the current neutral color (which the user may have changed). Use \`neutral\` as the name since it maps to whatever neutral palette is active.
```

Source: https://raw.githubusercontent.com/nuxt/ui/v4/docs/server/api/ai.post.ts

## Semantic-token enforcement with wrong/right exemplars

Salesforce Lightning Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md

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

## Harness-level enforcement: formatting as a hook, not an instruction

Mantine · full record: https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md

Rather than trusting the model to run the formatter, .claude/settings.json makes it automatic: every Write or Edit fires a shell hook that extracts the touched file path and runs `npm run format:write:files` on it. Scoped (only the changed file), bounded (30s timeout) and non-blocking (`2>/dev/null || true`) so a formatter failure never derails the session. Combined with the AGENTS.md checklist this is belt-and-braces: the deterministic layer handles what must never be forgotten, the prose layer handles what needs judgement.

```json
"PostToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "jq -r '.tool_input.file_path' | { read -r f; npm run format:write:files \"$f\"; } 2>/dev/null || true",
        "timeout": 30
      }
    ]
  }
]
```

Source: https://raw.githubusercontent.com/mantinedev/mantine/master/.claude/settings.json

## Numbered “Critical Rules (never violate)” with token enforcement at #1

Microsoft Fluent UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md

Five hard prohibitions, each phrased as ‘Never X. Always Y.’ plus a link to the deep-dive doc. Rule 1 is the classic design-system coercion: no hardcoded colors, spacing or typography, always `tokens` from `@fluentui/react-theme`. Rule 4 encodes the package-layering invariant (‘react-button must not depend on react-menu’) that agents routinely violate. Rule 5 forces a release-process side effect (`yarn beachball change`) the model would otherwise skip.

```markdown
1. **Never hardcode colors, spacing, or typography values.** Always use design tokens from `@fluentui/react-theme`.
2. **Never use `React.FC`.** Always use `ForwardRefComponent` with `React.forwardRef`.
3. **Never access `window`, `document`, or `navigator` directly.** In v9 components, use `useFluent_unstable()` to get `targetDocument` and `targetDocument.defaultView` instead of `document`/`window`.
4. **Never add dependencies between component packages.** `react-button` must not depend on `react-menu`.
5. **Never skip beachball change files** for published package changes. Run `yarn beachball change`.
```

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/AGENTS.md

## Private-API prohibition: component properties over CSS custom properties, never `--_n-*`

Nord Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md

The strongest single constraint in the corpus, a WARNING callout in the Web Components guide (inherited by nord-full’s references/docs/developer/web-components.md). It establishes an API hierarchy the model must respect: component properties first, public custom properties second, the `--_n-` private tier explicitly off-limits. Transferable pattern: give the private tier a visually distinct prefix so a model can pattern-match the prohibition instead of memorising a list.

```markdown
> [!WARNING]
> Always use a component's properties over a CSS custom property wherever possible. CSS Custom properties are built with a counterpart "private" property, prefixed with 
> `
> --_n-
> `
> . Please refrain from using private properties as they are always subject to change and intended for internal component use only.
```

Source: https://nordhealth.design/raw/docs/developer/web-components.md

## Token-over-custom-CSS with an explicit escape hatch

U.S. Web Design System (USWDS) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md

Rather than an absolute ban on custom CSS (which models violate and then rationalize), uswds-mcp’s skill sets a preference order plus a bounded, named exception: ‘small, documented, and subordinate’. Worth contrasting with the community Claude skill, which uses the blunter absolute prohibition form.

```markdown
- Prefer USWDS design tokens, Sass settings, and utilities over custom CSS.
- Custom CSS is acceptable for application-specific layout and integration gaps, but keep it small, documented, and subordinate to USWDS tokens/utilities.
- Treat third-party framework implementations as optional adapters, not the source of truth.
```

Source: https://raw.githubusercontent.com/bibekpdl/uswds-mcp/HEAD/.agents/skills/uswds/SKILL.md

All categories: https://state-of-ai-in-design-systems.netlify.app/techniques.md

---

Generated 2026-07-28T03:38:29Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
