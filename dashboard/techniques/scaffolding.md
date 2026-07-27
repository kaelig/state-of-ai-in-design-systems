---
title: "Scaffolding — 7 techniques"
description: "CLIs generate the canonical code; the agent runs commands instead of writing component source from scratch."
url: "https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md"
type: "technique-category"
id: "scaffolding"
technique_count: 7
system_count: 7
data_collected: "2026-07-26/27"
generated: "2026-07-27T22:05:57Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/techniques/scaffolding.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Scaffolding

7 of the 148 techniques in this study, across 7 of the 19 design systems. Read when a CLI could generate the code instead of the model.

CLIs generate the canonical code; the agent runs commands instead of writing component source from scratch.

Systems represented here: [Chakra UI](https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md), [Fluent UI (Fluent 2)](https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md), [HeroUI](https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md), [Mantine](https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md), [Primer](https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md), [React Spectrum / Spectrum 2 (S2)](https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md), [Lightning Design System (SLDS)](https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md)

## Read-the-project-first ordering (inspect before generate)

Chakra UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md

All three skills open with a mandatory context-reading step before any output, targeting the classic failure of emitting v2 code into a v3 project or Vite conventions into a Next.js App Router repo. The migrate skill states it as a hard prohibition: ‘Inspect the project first — never guess the package versions or framework.’ The builder skill adds a defer-or-assume rule: ask when the data shape or design choice materially changes the output, otherwise state assumptions at the top and build.

```markdown
## Step 1 — Read the project context

Check `package.json` if available. Look for:

- Chakra UI version (use v3 patterns by default; only use v2 if explicitly on
  v2)
- Framework: Next.js App Router, Pages Router, Vite, plain React
- TypeScript or JavaScript
- Package manager (from lockfile: `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`,
  `package-lock.json`)

Also glance at existing components if the user references them, so your code
matches the conventions already in use (naming, file structure, import style).

If the requirements are vague or the component is complex enough that choices
matter (layout direction, data shape, color palette), ask
before building rather than generating something that needs to be thrown away.
```

Source: https://raw.githubusercontent.com/chakra-ui/chakra-ui/HEAD/skills/chakra-ui-builder/SKILL.md

## Scaffold-only component creation (builders)

HeroUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md

Contributor agents are forbidden from hand-rolling a new component directory; AGENTS.md mandates `pnpm add:component ComponentName` then a build to regenerate package.json exports. Combined with the enumerated prohibitions (never twMerge, never styles in .tsx, never import tv from @heroui/standard) this narrows the agent to filling in a generated skeleton.

````markdown
### Creating a New Component

Always use the scaffold script:

```bash
cd packages/react
pnpm add:component ComponentName
```

Then build to update package.json exports:

```bash
pnpm build
```
````

Source: https://raw.githubusercontent.com/heroui-inc/heroui/HEAD/AGENTS.md

## Ordered escalation ladder (LBC → Blueprint → Hook → Custom CSS)

Lightning Design System (SLDS) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/salesforce-slds.md

The same four-rung ladder is restated in three independent places — SKILL.md ‘Component Selection Hierarchy’, .builderrules ‘UI CODE CHECKLIST’ (as a 5-step checkbox list with If YES/If NO branches), and AGENTS.md ‘Engineering habits’. Redundancy across rules file, skill, and MCP tool descriptions is the coercion strategy: whichever context the agent loads, it meets the same ordering.

```markdown
1. **[ ] Search Lightning Base Components index** – Does a component exist for this?
          **If YES** → Use it.
          **If NO** → Proceed to step 2.

2. **[ ] Search SLDS Component Blueprints** – Does a blueprint exist for this?
          - **Use the MCP tool `explore_slds_blueprints`** to search by name, category, or keyword.
          **If YES** → Create a new LWC that implements this component blueprint.
```

Source: https://raw.githubusercontent.com/salesforce-ux/design-system-2-starter-kit/HEAD/.builderrules

## Agent self-propagation via the `init` tool

Primer · full record: https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md

Primer’s `init` MCP tool does not just scaffold a project — its final bullet instructs the agent to write agent instructions into the consumer’s repo, so future sessions stay on-system even without the MCP server attached. The design system asks the agent to install the design system’s own guardrails.

```typescript
          text: `The getting started documentation for Primer React is included below. It's important that the project:

- Is using a tool like Vite, Next.js, etc that supports TypeScript and React. If the project does not have support for that, generate an appropriate project scaffold
- Installs the latest version of `@primer/react` from `npm`
- Correctly adds the `ThemeProvider` and `BaseStyles` components to the root of the application
- Includes an import to a theme from `@primer/primitives`
- If the project wants to use icons, also install the `@primer/octicons-react` from `npm`
- Add appropriate agent instructions (like for copilot) to the project to prefer using components, tokens, icons, and more from Primer packages
```

Source: https://raw.githubusercontent.com/primer/react/HEAD/packages/mcp/src/server.ts

## Layered skill handoff (build → audit → migrate)

React Spectrum / Spectrum 2 (S2) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md

The three skills cross-reference each other by name and hand off with literal install commands, forming a closed system: audit finds violations but refuses to edit, pointing to the build skill for fixes and to the migration skill if S1 packages are present; the Figma guide recommends the migration skill when it detects S1 Figma libraries.

````markdown
## Phase 4 — Hand off

This skill does not edit code. Recommend:

- The `react-spectrum-s2` skill to implement the fixes. If it is not installed:

  ```bash
  npx skills add https://react-spectrum.adobe.com --skill react-spectrum-s2
  ```

- The `migrate-react-spectrum-v3-to-s2` skill if Spectrum 1 packages (`@adobe/react-spectrum`, `@react-spectrum/*`, `@spectrum-icons/*`) are present.
````

Source: https://react-spectrum.adobe.com/.well-known/skills/spectrum-audit/SKILL.md

## Forcing the generator instead of free-hand scaffolding

Fluent UI (Fluent 2) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/fluent-ui-microsoft.md

`/v9-component` never tells the model which files to create. It routes every path through the repo’s own Nx generators (`yarn nx g @fluentui/workspace-plugin:react-component`, `yarn create-package`) and then hands the agent a post-generation checklist (fill in logic per component-patterns.md, add token-based styles, regenerate API docs via `yarn nx run :generate-api`). The generator is the spec; the agent is only allowed to fill the holes.

````markdown
Use the `react-component` generator:

```bash
yarn nx g @fluentui/workspace-plugin:react-component --name $ARGUMENTS --project <project-name>
```

Where `<project-name>` is the Nx project (e.g., `react-button`). This generates all required files: component, types, hook, styles, render, index barrel, and conformance test.

### After scaffolding

1. **Review generated files** against [docs/architecture/component-patterns.md]...
2. **Add styles** in `use${ARGUMENTS}Styles.styles.ts` using design tokens
4. **Update API docs** after adding exports:
   ```bash
   yarn nx run <project>:generate-api
   ```

## Critical Rules

- Always use `ForwardRefComponent` with `React.forwardRef` — never `React.FC`
````

Source: https://raw.githubusercontent.com/microsoft/fluentui/master/.agents/skills/v9-component/SKILL.md

## Paved-road escape hatch: a skill for "I need a component Mantine doesn't have"

Mantine · full record: https://state-of-ai-in-design-systems.netlify.app/systems/mantine.md

The moment an agent decides Mantine lacks a component is the moment it goes off-system. Rather than forbidding that, Mantine ships mantine-custom-components, a skill that intercepts exactly that intent and hands over a complete factory() template wiring Box, useProps, useStyles, createVarsResolver, StylesApiProps, ElementProps, displayName and Component.classes — so a “custom” component is still theme-aware, Styles-API-addressable and registerable via MantineProvider. It embeds a decision table (factory vs polymorphicFactory vs genericFactory) with one of the few directive constraints anywhere in Mantine’s AI surface: “Use polymorphicFactory sparingly — it adds TypeScript overhead and slows IDE autocomplete.”

````tsx
const varsResolver = createVarsResolver<MyComponentFactory>((_theme, { radius }) => ({
  root: { '--my-radius': getRadius(radius) },
}));

export const MyComponent = factory<MyComponentFactory>((_props) => {
  const props = useProps('MyComponent', defaultProps, _props);
  const { classNames, className, style, styles, unstyled, vars, attributes, radius, ...others } = props;

  const getStyles = useStyles<MyComponentFactory>({
    name: 'MyComponent', classes, props,
    className, style, classNames, styles, unstyled, vars, attributes, varsResolver,
  });

  return <Box {...getStyles('root')} {...others} />;
});

MyComponent.displayName = '@mantine/core/MyComponent';
MyComponent.classes = classes;
```

## Factory variant — which to use

| Scenario | Factory function | Type |
|---|---|---|
| Standard component | `factory()` | `Factory<{}>` |
| Supports `component` prop (polymorphic) | `polymorphicFactory()` | `PolymorphicFactory<{}>` — add `defaultComponent` and `defaultRef` |
| Props change based on a generic (e.g. `multiple`) | `genericFactory()` | `Factory<{ signature: ... }>` |

Use `polymorphicFactory` sparingly — it adds TypeScript overhead and slows IDE autocomplete.
````

Source: https://raw.githubusercontent.com/mantinedev/skills/HEAD/skills/mantine-custom-components/SKILL.md

All categories: https://state-of-ai-in-design-systems.netlify.app/techniques.md

---

Generated 2026-07-27T22:05:57Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
