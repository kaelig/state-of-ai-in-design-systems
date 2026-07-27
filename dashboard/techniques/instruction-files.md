---
title: "Instruction files — 9 techniques"
description: "CLAUDE.md, AGENTS.md and editor rules distributed in repos or to consumers, loaded into agent context automatically."
url: "https://state-of-ai-in-design-systems.netlify.app/techniques/instruction-files.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/techniques/instruction-files.md"
type: "technique-category"
id: "instruction-files"
technique_count: 9
system_count: 9
data_collected: "2026-07-26/27"
generated: "2026-07-27T21:54:17Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/techniques/instruction-files.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Instruction files

9 of the 148 techniques in this study, across 9 of the 19 design systems. Read when writing AGENTS.md or CLAUDE.md for a component library.

CLAUDE.md, AGENTS.md and editor rules distributed in repos or to consumers, loaded into agent context automatically.

Systems represented here: [Ant Design](https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md), [Cloudscape Design System](https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md), [daisyUI](https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md), [Nord Design System](https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md), [Nuxt UI](https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md), [PatternFly](https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md), [shadcn/ui](https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md), [Polaris (Shopify)](https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md), [U.S. Web Design System (USWDS)](https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## One instruction set, many vendors (symlinked .claude / .cursor / AGENTS.md)

Ant Design · full record: https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md

.claude/skills and .cursor/skills are git symlinks to .agents/skills, and AGENTS.md is a symlink to CLAUDE.md. Maintainers author once; Claude Code, Cursor and Codex all resolve it. .github/copilot-instructions.md is the one genuinely separate file and it opens by deferring to CLAUDE.md for deep conventions while positioning itself as the anti-hallucination layer.

```markdown
> For deeper, project-wide conventions (demo/test import rules, documentation format, changelog rules, PR templates, etc.), see [`CLAUDE.md`](../CLAUDE.md) at the repository root. This file is a concise, suggestion-time reference designed to keep AI tools from hallucinating non-existent components or APIs.
```

Source: https://raw.githubusercontent.com/ant-design/ant-design/HEAD/.github/copilot-instructions.md

## One artifact, three delivery formats (llms.txt ≡ .mdc rule ≡ skill)

daisyUI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/daisyui.md

daisyUI ships a single canonical context file and lets the frontmatter do the format polymorphism: `alwaysApply: true` + `applyTo: "**"` mean the same 79 KB llms.txt is a valid Cursor rule when curl’d to `.cursor/rules/daisyui.mdc`, a valid skill when placed as SKILL.md, and a plain docs digest when fetched by a crawler. It removes the usual drift between a project’s llms.txt and its rules files, at the cost of a large always-on token footprint — which is precisely the cost Blueprint is sold to eliminate (‘90% lower token costs’).

```text
daisyui.com/llms.txt file is a compact, text version of daisyUI docs to help AI generate accurate daisyUI code based on your prompt.
Here's how to use daisyUI llms.txt in Cursor:
Quick use
In chat window type this and Cursor will use daisyUI's llms.txt file to generate code.
prompt
@web https://daisyui.com/llms.txt
Project-level permanent setup
You can setup daisyUI's llms.txt file to your workspace so Cursor can use it by default.
Run this command to save the llms.txt file to .cursor/rules/daisyui.mdc
```

Source: https://daisyui.com/docs/editor/cursor/

## False-positive suppression in AI PR review

Nuxt UI · full record: https://state-of-ai-in-design-systems.netlify.app/systems/nuxt-ui.md

A rarely-seen inverse technique: instead of telling the reviewing agent what to catch, AGENTS.md tells it what to stop catching, with the reasoning attached. The `Soon` badge is a legitimate artefact of docs deploying on merge while the feature ships on the next npm release; naive reviewers flag it as inconsistency every time, so the team encoded an explicit exemption in both the conventions section and the PR-review checklist.

```markdown
- **`Soon` badge on docs headings**: PRs that introduce a new feature or fix often add `:badge{label="Soon" class="align-text-top"}` to the relevant docs heading. This is intentional: the docs site redeploys on merge, but the feature only ships on the next npm release — the badge bridges that gap. Do NOT flag this as inconsistent in reviews. See [documentation.md](.github/contributing/documentation.md) for details.
```

Source: https://raw.githubusercontent.com/nuxt/ui/v4/AGENTS.md

## Role priming + processing-priority headers in builder guidelines

PatternFly · full record: https://state-of-ai-in-design-systems.netlify.app/systems/patternfly.md

Two distinct in-house conventions. Consumer skills open with a persona (“You are a Senior Design Systems Engineer specializing in CSS refactoring and Design Token implementation”) to bias the review. Builder guidelines in patternfly-mcp add machine-readable precedence metadata — a `## For Agents` block with `### Processing Priority: Critical - This document should be processed first` — plus behavior rules like sequential processing and mandatory architecture confirmation before implementing.

```markdown
## For Agents

### Processing Priority

Critical - This document should be processed first when working with agent guidelines in the repository.
...
## 2. Core Behavior Standards

- **Sequential Processing**: Ask questions one at a time; process requests in logical order; complete one task before starting another.
- **Architectural Alignment**: Always confirm changes against the [system architecture and roadmap](../docs/architecture.md) before proceeding with implementation.
- **Reference-Based Implementation**: Review git history; study existing patterns (e.g., "creator" pattern for tools/resources); maintain code style consistency
...
- **Validation Required**: Follow checklists; verify requirements; test thoroughly.
```

Source: https://raw.githubusercontent.com/patternfly/patternfly-mcp/main/guidelines/agent_behaviors.md

## Disambiguation clause in skill description (routing coercion)

Polaris (Shopify) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md

The skill’s `description` frontmatter — the only text a host model sees when deciding which skill to load — contains an explicit tie-break rule claiming the ambiguous word ‘Polaris’ for the web-components surface. A cheap, high-leverage trick for a system whose old meaning still dominates the training corpus.

```yaml
---
name: shopify-polaris-app-home
description: "Build your app's primary user interface embedded in the Shopify admin. If the prompt just mentions `Polaris` and you can't tell based off of the context what API they meant, assume they meant this API."
compatibility: Requires Node.js
metadata:
  author: Shopify
  version: "1.12.1"
hooks:
  PostToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: 'sh -c ''h="$CLAUDE_PLUGIN_ROOT/scripts/track-telemetry.sh"; if [ -f "$h" ]; then exec bash "$h"; fi'''
---
```

Source: https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/skills/shopify-polaris-app-home/SKILL.md

## Globbed parity rule for contributors' agents

shadcn/ui · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md

The single builder-facing rule file uses Cursor’s .mdc frontmatter (description + globs + alwaysApply:false) so it only fires when an agent touches the dual Base UI / Radix registry trees, then forbids one-sided edits and demands the agent report which trees it updated.

```markdown
---
description: Keep registry base and radix trees in sync when editing shared UI
globs: apps/v4/registry/bases/**/*
alwaysApply: false
---

# Registry bases: Base UI ↔ Radix parity

`apps/v4/registry/bases/base` and `apps/v4/registry/bases/radix` are **parallel registries**. Anything that exists in both trees for the same purpose (preview blocks, mirrored examples, shared card layouts, etc.) **must stay in sync**.

## When editing

- If you change a file under **`bases/base/...`**, apply the **same behavioral and visual change** to the matching path under **`bases/radix/...`** (and the reverse).
- Only diverge where APIs differ (e.g. import paths like `@/registry/bases/base/ui/*` vs `@/registry/bases/radix/ui/*`, or Base UI vs Radix component props).
- Do **not** update only one side unless the user explicitly asks for a single-base change.

After edits, briefly confirm both trees were updated (or state why one side is intentionally unchanged).
```

Source: https://raw.githubusercontent.com/shadcn-ui/ui/main/.cursor/rules/registry-bases-parity.mdc

## Docs shattered into an agent-routable index

Cloudscape Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md

Rather than one long CONTRIBUTING.md, docs/ was split into 12 single-topic files (SETUP, COMPONENT_CONVENTIONS, STYLING, WRITING_TESTS, RUNNING_TESTS, CODE_STYLE, TEST_PAGES, API_DOCS, INTERNALS, DIRECTORY_LAYOUT, GENERAL_GUIDE) fronted by CLOUDSCAPE_COMPONENTS_GUIDE.md, an index whose every line is ‘file — what it covers’. AGENTS.md points at the index; the index routes to the one file needed. All 14 repos’ AGENTS.md point at the same index, so the org shares one rulebook with no duplication drift.

```markdown
# Cloudscape Components Documentation

Reference docs for contributing to [cloudscape-design/components](https://github.com/cloudscape-design/components).

- [General Guide](https://github.com/cloudscape-design/components/blob/main/docs/GENERAL_GUIDE.md) — setup, building, running locally, frameworks, versioning
- [Component Conventions](https://github.com/cloudscape-design/components/blob/main/docs/COMPONENT_CONVENTIONS.md) — component structure, props, events, refs
- [Styling](https://github.com/cloudscape-design/components/blob/main/docs/STYLING.md) — design tokens, CSS rules, RTL support
- [Writing Tests](https://github.com/cloudscape-design/components/blob/main/docs/WRITING_TESTS.md) — test utils, unit and integration tests
- [Running Tests](https://github.com/cloudscape-design/components/blob/main/docs/RUNNING_TESTS.md) — test configs and commands
- [Code Style](https://github.com/cloudscape-design/components/blob/main/docs/CODE_STYLE.md) — prettier, stylelint, eslint
- [API Docs](https://github.com/cloudscape-design/components/blob/main/docs/API_DOCS.md)  — API documentation comments
- [Internals](https://github.com/cloudscape-design/components/blob/main/docs/INTERNALS.md) — internal shared utilities
```

Source: https://raw.githubusercontent.com/cloudscape-design/components/HEAD/docs/CLOUDSCAPE_COMPONENTS_GUIDE.md

## Host-served skill via well-known discovery instead of per-editor rule files

Nord Design System · full record: https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md

Rather than publishing .cursorrules / copilot-instructions.md / CLAUDE.md templates for consumers to copy (and let rot), Nord serves the skill from its own domain at /.well-known/skills/ and lets the `npx skills` CLI translate it into whatever format each agent expects. One install command covers ~40 agents, and Nord can update the skill server-side with no consumer action. The single most transferable technique in Nord’s setup.

````markdown
## Installation

Install the Nord skill using the `npx skills` CLI:

```bash
npx skills add https://nordhealth.design
```

This fetches the skill from our well-known discovery endpoint and adds it to your project.

## What the skill provides

The Nord skill gives your AI agent:

- **Component guidance** — how to use all 55+ `<nord-*>` web components correctly
- **Design tokens** — CSS custom property naming (`--n-color-*`, `--n-space-*`)
- **Styling approach** — Tailwind CSS v4 with `n:` variant prefix
- **Theming** — therapy/veterinary brands, dark mode, high contrast
- **Forms** — native form participation, validation patterns
- **Accessibility** — built-in ARIA, keyboard nav, screen reader support
- **Do/Don't rules** — common mistakes to avoid
- **Documentation index** — links to raw markdown for every component and guideline page
````

Source: https://nordhealth.design/raw/docs/developer/working-with-ai/skills.md

## Anti-hallucination gotcha list (build-system disambiguation)

U.S. Web Design System (USWDS) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md

The dominant technique in USWDS’s own AGENTS.md is not prohibiting design decisions — it is pre-empting the specific wrong assumptions an LLM makes about an unusual 2015-era-lineage build. Note the explicit negations: ‘Not direct npm scripts’, ‘Do not assume Vite builds the whole project’, ‘Generated; do not edit’, ‘not Jest/Vitest’. Each one is a correction of a plausible model prior. This is the cheapest, highest-yield agent-file pattern for legacy toolchains, and it costs the team nothing to maintain.

```markdown
- **Build**: Gulp 4 (`gulpfile.js`, `tasks/*.js`). Not direct npm scripts. Vite is only for web-components CDN banner (`vite.config.banner.cdn.js`); main lib uses Gulp/Browserify/Uglify. Do not assume Vite builds the whole project.

- **`dist/`**: Generated; do not edit. `gulp cleanDist` clears.
- **Project Focus**: US federal (GSA/TTS) open source project. Accessibility, performance, and security are critical. All updates must align with these requirements.

- **JS Unit Tests**: Mocha with `jsdom-global/register` (browser-ish env); not Jest/Vitest. `sinon` available.
```

Source: https://raw.githubusercontent.com/uswds/uswds/HEAD/AGENTS.md

All categories: https://state-of-ai-in-design-systems.netlify.app/techniques.md

---

Generated 2026-07-27T21:54:17Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
