---
title: "Design–code mapping — 3 techniques"
description: "Code Connect-style node-to-component mappings, so design-to-code generation lands on real components with real props."
url: "https://state-of-ai-in-design-systems.netlify.app/techniques/design-code-mapping.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/techniques/design-code-mapping.md"
type: "technique-category"
id: "design-code-mapping"
technique_count: 3
system_count: 3
data_collected: "2026-07-26/27"
generated: "2026-07-28T05:02:05Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/techniques/design-code-mapping.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Design–code mapping

3 of the 148 techniques in this study, across 3 of the 19 design systems. Read when connecting Figma components to code.

Code Connect-style node-to-component mappings, so design-to-code generation lands on real components with real props.

Systems represented here: [Ant Design](https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md), [React Spectrum / Spectrum 2 (S2)](https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md), [shadcn/ui](https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md)

## Deprecated-to-current rename table (“Do Not Hallucinate the Old Names”)

Ant Design · full record: https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md

A table mapping every major v4/v5-era prop the model is likely to emit (`visible`, `destroyOnClose`, `Tabs.TabPane` children API, `dropdownClassName`, `bordered`, `maxCount`, `dateCellRender`) to its v6 replacement, plus the pointer that these are runtime-flagged via `warning.deprecated(...)` and `@deprecated` JSDoc so the agent can verify in `interface.ts` / `index.tsx`.

```markdown
## API Migration Notes (Do Not Hallucinate the Old Names)

The current major version uses these renames. Use the **new** API in suggestions:

| AutoComplete, Cascader, Select | `dropdownClassName`, `dropdownStyle`, `dropdownRender`, `dropdownMatchSelectWidth` | `classNames.popup.root`, `styles.popup.root`, `popupRender`, `popupMatchSelectWidth` |
| Card | `bordered` | `variant` |
| Avatar.Group | `maxCount`, `maxStyle`, `maxPopoverPlacement` | `max={{ count, style, popover }}` |
| BackTop | top-level `BackTop` | `FloatButton.BackTop` |

Internally these are flagged via `warning.deprecated(...)` and `@deprecated` JSDoc tags; check the component's `interface.ts` / `index.tsx` if unsure.
```

Source: https://raw.githubusercontent.com/ant-design/ant-design/HEAD/.github/copilot-instructions.md

## Demote the Figma MCP from generator to reference

React Spectrum / Spectrum 2 (S2) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md

Because Figma Dev Mode MCP emits React + Tailwind against raw CSS variables, Adobe’s guide reclassifies that output as untrusted reference material and prescribes a re-implementation workflow, plus a Figma-name → S2-props mapping table and disambiguation of mixed S1/S2/product libraries in one file. This substitutes for the Code Connect mappings Adobe has not published.

```markdown
When the user supplies a Figma frame, node, or URL and asks for an S2 implementation, treat the Figma MCP as a **reference**, not a code generator. The MCP returns React + Tailwind targeting raw CSS variables — it does **not** produce S2 output. Your job is to recognize what the design *is* (in Spectrum terms), then re-implement it with S2 components and the [`style` macro](style-macro.md).

5. **Re-implement with S2 + the `style` macro.** Drop the absolute positioning, the arbitrary pixel values, and the Tailwind classes.
6. **Verify against the screenshot.** Call `get_screenshot` on the same node when you're done and compare.

### Watch out for axis-order differences between S1 and S2

- S2: `Button (M, Accent)` — `(size, variant)`
- S1: `Button (Accent, M)` — `(variant, size)`
```

Source: https://react-spectrum.adobe.com/.well-known/skills/react-spectrum-s2/references/guides/figma-to-s2.md

## Registry-as-oracle AI codemod (golden-pair three-way merge)

shadcn/ui · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md

AI-driven codemod. The Radix→Base UI migration skill refuses to let the model invent transforms: it makes the agent diff the user’s file against the canonical registry payload for their exact style URL, then replay their diff onto the base variant with `git merge-file`, and finishes with a mandatory grep sweep because ‘A clean merge is NOT proof of a clean file.’ It also enforces a baseline typecheck before any dependency change and one commit per component.

```markdown
You migrate shadcn wrappers, hand-rolled radix compositions, and their
consumers to `@base-ui/react`, keeping the project buildable at every step.
Be precise; never guess a mapping. When a prop or part is not in these
reference files, check `node_modules/@base-ui/react/**/*.d.ts` before
transforming, and record gaps in the report.

## Preflight (always)

1. `npx shadcn@latest info --json` ... Trust it over inference.
3. Require a clean git tree; work on a branch; one commit per component.
4. Baseline check BEFORE touching dependencies: run the project's
   typecheck/build so pre-existing failures are never attributed to you.

## Strategy: golden pair first, transformation engine second

  1. Classify each ui wrapper FIRST: diff the user's file against its stock
     origin, using the components.json style VERBATIM in the URL
     (`https://ui.shadcn.com/r/styles/<style>/<component>.json`, files[0].content).
  4. CUSTOMIZED wrappers: fetch the base variant and replay the user's diff
     onto it ... `git merge-file user.tsx radix-golden.tsx base-golden.tsx`
  5. MANDATORY leftover sweep on EVERY golden-pair file, including ones that
     merged "clean": `grep -n "radix-ui\|@radix-ui\|IconPlaceholder"` per
     file. ... A clean merge is NOT proof of a clean file.
```

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/skills/migrate-radix-to-base/SKILL.md

All categories: https://state-of-ai-in-design-systems.netlify.app/techniques.md

---

Generated 2026-07-28T05:02:05Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
