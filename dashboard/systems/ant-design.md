---
title: "Ant Design — AI affordances"
description: "Ant Design is one of the most AI-invested open-source design systems as of mid-2026. It ships a dedicated “AI” documentation group (For Agents / design.md / LLMs.txt…"
url: "https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/systems/ant-design"
type: "design-system-record"
json: "https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.json"
id: "ant-design"
category: "component-library"
ai_maturity: "ai-native"
affordance_count: 10
technique_count: 8
data_collected: "2026-07-26/27"
generated: "2026-07-27T22:05:57Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Ant Design — AI affordances

Ant Group · component-library · MIT · AI maturity: **ai-native** (AI consumption is a design goal, with dedicated surfaces and staff behind it). 10 affordances, 8 coercion techniques.

- Docs: https://ant.design
- Repo: https://github.com/ant-design/ant-design
- This record as JSON: https://state-of-ai-in-design-systems.netlify.app/systems/ant-design.json
- This record on the site: https://state-of-ai-in-design-systems.netlify.app/systems/ant-design

## Summary

Ant Design is one of the most AI-invested open-source design systems as of mid-2026. It ships a dedicated “AI” documentation group (For Agents / design.md / LLMs.txt / MCP Server / CLI), an official offline CLI (`@ant-design/cli`, first published 2026-03-17) that doubles as an MCP server with 8 tools and 2 prompts and as an installable Claude/Codex/Cursor skill, and a `.github/copilot-instructions.md` whose central trick is an authoritative allow-list of exported components written specifically to stop models hallucinating `Box`/`Stack`/`Container`. On the building side the team runs a 291-line bilingual root `CLAUDE.md` (with `AGENTS.md` symlinked to it) plus six repo-local agent skills under `.agents/skills/` — symlinked to both `.claude/skills` and `.cursor/skills`. The dominant coercion pattern is “never answer from memory: query the offline CLI/MCP for your exact antd version first, then lint after writing.”

## Maintenance

- Actively maintained: yes
- Last release: antd v6.5.2 — 2026-07-24; @ant-design/cli v6.5.2 — 2026-07-24
- Activity: ant-design/ant-design last pushed 2026-07-27, ~98.8k stars, 1120 open issues; releases 6.5.0 (2026-06-27), 6.5.1 (2026-07-13), 6.5.2 (2026-07-24). Maintained trains for 4.24.16 / 5.29.3 / 6.5.2. ant-design/ant-design-cli last pushed 2026-07-26, versioned in lockstep with antd.

## AI affordances (10)

### @ant-design/cli mcp (official antd MCP server)

Type: `mcp-server` (MCP server) · Official · Audience: consumers

Since @ant-design/cli v6.3.5, `antd mcp` starts an official stdio MCP server exposing 8 tools (antd_list, antd_info, antd_doc, antd_demo, antd_token, antd_design_md, antd_semantic, antd_changelog) and 2 prompts (antd-expert, antd-page-generator). All metadata is bundled offline — 55+ per-minor snapshots across antd v3/v4/v5/v6 — so the agent can be pinned to the project’s exact antd version via `--version 5.20.0`. Documented configs for Cursor, Windsurf, Claude Code, VS Code, Codex, Gemini CLI, Trae, Qoder, Neovate.

- Docs: https://ant.design/docs/react/mcp

- Code: https://github.com/ant-design/ant-design-cli

Notes: Version-pinning is the notable design decision: the agent is served the API surface of the user’s installed antd rather than ‘latest’.

```markdown
## Official MCP Server

Starting from [`@ant-design/cli`](https://github.com/ant-design/ant-design-cli) v6.3.5, you can launch an official MCP server with the `antd mcp` command, providing 8 tools and 2 prompts for IDE integration.

### Tools

| Tool             | Description                                |
| ---------------- | ------------------------------------------ |
| `antd_list`      | Enumerate available components             |
| `antd_info`      | Retrieve component property specifications |
| `antd_doc`       | Fetch complete documentation               |
| `antd_demo`      | Access runnable code examples              |
| `antd_token`     | Query design token values                  |
| `antd_design_md` | Fetch the design-language document         |
| `antd_semantic`  | Inspect DOM structure and styling hooks    |
| `antd_changelog` | Analyze API changes across versions        |

### Prompts

| Prompt                | Description                                     |
| --------------------- | ----------------------------------------------- |
| `antd-expert`         | Positions the agent as an Ant Design specialist |
| `antd-page-generator` | Assists with component-based page creation      |
```

Source: https://ant.design/docs/react/mcp.md

### antd skill (skills/antd/SKILL.md in ant-design-cli)

Type: `claude-skill` (Agent skill) · Official · Audience: consumers

An official Agent Skill installable with `npx skills add ant-design/ant-design-cli` or `antd setup --client claude --mode skill`. It declares `allowed-tools` restricted to `Bash(antd *)` variants, auto-installs the CLI (`which antd || npm install -g @ant-design/cli`), and enforces a query-write-lint loop across 12 scenarios (writing code, debugging, migration, usage analysis, bug reporting).

- Docs: https://ant.design/docs/react/for-agents

- Code: https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md

Notes: Tool-gating via YAML `allowed-tools` is unusually explicit for a design-system skill.

```markdown
## Key Rules

1. **Always query before writing** — Don't guess antd APIs from memory. Run `antd info` first.
2. **Match the user's version** — Knowledge queries (`list/info/doc/demo/token/semantic/changelog`) support antd v4+. If the project uses antd 4.x/5.x/6.x, pass `--version 4.24.0` / `5.24.0` / `6.x`. For antd v3 projects, use `antd migrate 3 4` first.
3. **Use `--format json`** — Every command supports it. Parse the JSON output rather than regex-matching text output.
4. **Check before suggesting migration** — Run `antd changelog <v1> <v2>` and `antd migrate` before advising on version upgrades.
5. **Lint after changes** — After writing or modifying antd code, run `antd lint` on the changed files to catch deprecated or problematic usage.
6. **Report antd bugs** — When the user asks to report an antd bug, use `antd bug`. Always preview first, get user confirmation, then submit.
```

Source: https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md

### docs/react/for-agents ("For Agents")

Type: `ai-docs-page` (AI docs page) · Official · Audience: consumers

A dedicated docs page in an “AI” group (order 0.9) that hands the user a copy-pasteable prompt to paste into any agent. The prompt explicitly warns the model that its training data is stale and instructs it to read two URLs before writing code. Siblings in the same group: design.md, LLMs.txt, MCP Server, CLI.

- Docs: https://ant.design/docs/react/for-agents

````markdown
## Copy this prompt

Copy into your agent conversation or automation runner.

```text
This version may contain breaking changes. The component APIs, conventions, and file structure may differ from what is included in your training data. Before writing any code, please read https://ant.design/docs/react/for-agents.md and https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md, pay attention to deprecation warnings, and follow the instructions to use Ant Design.

If you can install skills, run:
npx skills add ant-design/ant-design-cli
```
````

Source: https://ant.design/docs/react/for-agents.md

### .github/copilot-instructions.md

Type: `copilot-instructions` (Copilot instructions) · Official · Audience: both

Repo-level Copilot instructions explicitly framed as a “concise, suggestion-time reference designed to keep AI tools from hallucinating non-existent components or APIs.” Contains an authoritative allow-list of every top-level antd export with named counter-examples, plus an “API Migration Notes (Do Not Hallucinate the Old Names)” table of deprecated-to-current props, then TypeScript/React/naming/styling standards.

- Code: https://github.com/ant-design/ant-design/blob/master/.github/copilot-instructions.md

```markdown
## Authoritative Component List

The following are the **only** top-level exports of `antd`. Do **not** invent components outside this list (e.g. `antd` does not export `Container`, `Stack`, `Heading`, `Box`, `Sidebar`, `Navbar`, `IconButton`, etc.).

`Affix`, `Alert`, `Anchor`, `App`, `AutoComplete`, `Avatar`, `BackTop` (deprecated — use `FloatButton.BackTop`), `Badge`, ... `Upload`, `Watermark`.

Function exports (lowercase): `message`, `notification`, `theme`, `version`, `unstableSetRender`.

When in doubt, verify against `components/index.ts` (the source of truth for public exports). Icons live in a **separate** package: `@ant-design/icons` — never import icons from `antd`.
```

Source: https://raw.githubusercontent.com/ant-design/ant-design/HEAD/.github/copilot-instructions.md

### llms.txt / llms-full.txt / llms-semantic.md family

Type: `llms-txt` (llms.txt) · Official · Audience: consumers

Six aggregated files served at the docs root, all HTTP 200: llms.txt (34 KB navigation index, EN+CN, links every spec/blog/component doc), llms-full.txt (~2.0 MB, 74 components, EN), llms-full-cn.txt, llms-semantic.md / llms-semantic-cn.md (per-component DOM structure and classNames/styles hooks), plus design.md. Every doc page is also available as `.md` (https://ant.design/components/button.md) and every component has a `semantic.md` (https://ant.design/components/button/semantic.md).

- Docs: https://ant.design/docs/react/llms

Notes: The per-component `semantic.md` layer is distinctive: it exposes the machine-readable classNames/styles slot map so agents style via semantic hooks rather than inventing CSS overrides.

### design.md (google-labs-code/design.md format)

Type: `other` (Other) · Official · Audience: consumers

A ~21 KB machine-readable design-language file at https://ant.design/design.md conformant with the google-labs-code/design.md spec, aimed at AI *design* tools (Figma Make, Google Stitch) rather than coding agents. Front-matter enumerates the full palette, typography scale, radius, spacing and shadows as tokens, followed by component archetypes and — notably — “misuse patterns AI design tools should avoid when generating Ant Design interfaces.” Also retrievable offline via `antd design.md` and over MCP via `antd_design_md`.

- Docs: https://ant.design/docs/react/design-md

```yaml
---
version: alpha
name: Ant Design
description: Enterprise-grade React UI design system from Ant Group, built around the values Natural, Certain, Meaningful, and Growing.
colors:
  primary: '#1677FF'
  success: '#52C41A'
  warning: '#FAAD14'
  error: '#FF4D4F'
  info: '#1677FF'
  blue-7: '#0958D9'
  surface: '#FFFFFF'
  surface-container: '#FAFAFA'
  surface-layout: '#F5F5F5'
  on-surface: '#1F1F1F'
  on-surface-variant: '#595959'
  on-surface-disabled: '#BFBFBF'
  outline: '#D9D9D9'
  outline-variant: '#F0F0F0'
typography:
  display-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif"
    fontSize: 38px
    fontWeight: '600'
    lineHeight: 46px
```

Source: https://ant.design/design.md

### @ant-design/cli — `antd setup` / `antd lint` / `antd migrate --apply`

Type: `cli-scaffolding` (CLI scaffolding) · Official · Audience: consumers

18-command offline CLI (npm @ant-design/cli, MIT, first published 2026-03-17, v6.5.2 on 2026-07-24). `antd setup --client claude|cursor|vscode|codex --mode mcp|skill|both` writes the MCP config and/or installs the skill into the user’s project; `--write-instructions` emits editor instruction files; `--dry-run` / `--check` for CI. `antd lint ./src` is the validation loop the skill mandates after every edit; `antd migrate 4 5 --apply ./src` emits an agent-ready migration prompt without touching files; `antd doctor` / `antd env` / `antd usage` cover diagnostics.

- Docs: https://ant.design/docs/react/cli

- Code: https://github.com/ant-design/ant-design-cli

```bash
antd setup --client claude
antd setup --client cursor --mode both
antd setup --client vscode --write-instructions
antd setup --client codex
antd setup --client claude --dry-run
antd setup --client claude --check
```

Source: https://ant.design/docs/react/mcp.md

### .agents/skills/ — six maintainer skills (symlinked to .claude/skills and .cursor/skills)

Type: `claude-skill` (Agent skill) · Official · Audience: builders

The antd repo ships `.agents/skills/{changelog-collect, commit-msg, create-pr, issue-reply, test-review, version-release}`, each with SKILL.md and some with a `references/` sub-file. `.claude` and `.cursor` are git symlinks pointing at `.agents/skills`, so one skill set serves Claude Code and Cursor simultaneously. Skills are written mostly in Chinese and encode maintainer workflow policy (issue triage language policy, release-PR branch rules, test-quality review heuristics).

- Code: https://github.com/ant-design/ant-design/tree/master/.agents/skills

Notes: The symlink trick (.claude/skills -> .agents/skills, .cursor/skills -> .agents/skills) is a neat multi-vendor distribution pattern worth stealing.

```markdown
# Ant Design 测试用例审查

## 目标

一、只判断测试用例是否合理，不负责创建或补充测试。

二、优先识别“用 a 证明 a”、实现细节自证、重复覆盖这类低价值测试。

三、验证场景默认只做静态审查，不默认运行测试。

四、输出先给结论，再给最关键原因。

## 不做的事

- 不主动新增测试
- 不主动补回归测试
- 不主动修改生产代码
- 不默认执行 `npm test`、`npm run test:update`

如果用户明确要求“顺手给改写建议”，可以在结论后补一句改写方向；但主任务仍然是审查，不是落地实现。
```

Source: https://raw.githubusercontent.com/ant-design/ant-design/HEAD/.agents/skills/test-review/SKILL.md

### CLAUDE.md (root, 291 lines) with AGENTS.md symlinked to it

Type: `claude-md` (CLAUDE.md) · Official · Audience: builders

A 291-line / ~13.8 KB Chinese-language contributor agent guide at the repo root. `AGENTS.md` is a git symlink whose blob content is literally the string `CLAUDE.md`, so Codex/Cursor/Claude all read the same file. Covers project structure, mandated use of `components/_util/is.ts` type guards over inline `typeof`, the absolute-import rule for demos vs relative-import rule for `__tests__`, API table column semantics, doc anchor-ID regex, i18n rules, PR title/branch conventions, and a very prescriptive changelog spec (emoji table, one emoji per entry, no single-entry component grouping). Ends with a Karpathy-style “编码行为准则” section of general LLM guardrails.

- Code: https://github.com/ant-design/ant-design/blob/master/CLAUDE.md

```markdown
## 编码行为准则

旨在减少 LLM 编码中常见错误的行为准则，可与项目特定指令合并使用。

**权衡：** 本准则倾向于"谨慎优于速度"。对于简单任务，请自行判断。

### 1. 先思考再编码

**"不要假设。不要隐藏困惑。呈现权衡。"**

- 明确陈述假设；如果不确定，就提问。
- 当存在多种理解时，逐一列出而非默默选择。
- 如果存在更简单的方案，直接说明并在必要时提出异议。

### 3. 精准改动

**"只改必须改的。只清理自己制造的遗留。"**

- 不要"改善"相邻的代码、注释或格式。
- 不要重构没有问题的代码。
- 即使你习惯不同写法，也要与现有风格保持一致。
- 如果发现无关的废弃代码，提出来而不是直接删除。

检验标准："每一行改动都应该能追溯到用户的请求。"

### 4. 目标驱动执行

**"定义成功标准。循环验证直到通过。"**

- "添加校验" → 为无效输入编写测试，然后使其通过
- "修复 Bug" → 编写复现测试，然后使其通过
```

Source: https://raw.githubusercontent.com/ant-design/ant-design/HEAD/CLAUDE.md

### @jzone-mcp/antd-components-mcp (community)

Type: `mcp-server` (MCP server) · Community · Audience: consumers

Community MCP server explicitly linked from the official MCP docs page under a “Community MCP Server” heading. npm latest 2.0.17 (2026-07-13), with a separate `antdV5` dist-tag at 1.0.45. Self-described as “一个减少 Ant Design 组件代码生成幻觉的 MCP 服务” (an MCP service that reduces hallucination in Ant Design component code generation); ships a system prompt plus list-components, get-component-docs, list-component-examples and get-component-changelog tools.

- Docs: https://ant.design/docs/react/mcp

- Code: https://www.npmjs.com/package/@jzone-mcp/antd-components-mcp

Notes: Predates the official server; official docs still endorse it as an alternative.

## Coercion techniques (8)

### Authoritative export allow-list with named anti-examples

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

Rather than describing components, copilot-instructions.md enumerates the complete set of legal top-level exports and then names the specific components models are known to invent — Container, Stack, Heading, Box, Sidebar, Navbar, IconButton — as explicitly non-existent. It also points at `components/index.ts` as the machine-checkable source of truth and bans importing icons from `antd`. The single most transferable trick in the system.

```markdown
The following are the **only** top-level exports of `antd`. Do **not** invent components outside this list (e.g. `antd` does not export `Container`, `Stack`, `Heading`, `Box`, `Sidebar`, `Navbar`, `IconButton`, etc.).

When in doubt, verify against `components/index.ts` (the source of truth for public exports). Icons live in a **separate** package: `@ant-design/icons` — never import icons from `antd`.
```

Source: https://raw.githubusercontent.com/ant-design/ant-design/HEAD/.github/copilot-instructions.md

### "Always query before writing" — forced CLI lookup instead of recall

Category: `tool-gating` (Tool-gating) · all 20 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md

The official skill forbids writing antd code from memory and prescribes a fixed pipeline: `antd info` -> understand props -> `antd demo` -> grab a working example -> write code. The skill’s `allowed-tools` front-matter narrows the agent to `Bash(antd *)` invocations, and it self-bootstraps with `which antd || npm install -g @ant-design/cli` so the gate can never be skipped for lack of tooling.

````markdown
allowed-tools:
  - Bash(antd *)
  - Bash(antd bug*)
  - Bash(antd bug-cli*)
  - Bash(antd upgrade*)
  - Bash(npm install -g @ant-design/cli*)
  - Bash(which antd)
---

## Setup

Before first use, check if the CLI is installed. If not, install it automatically:

```bash
which antd || npm install -g @ant-design/cli
```

**Always use `--format json` for structured output you can parse programmatically.**

### 1. Writing antd component code

Before writing any antd component code, look up its API first — don't rely on memory.

**Workflow:** `antd info` → understand props → `antd demo` → grab a working example → write code.
````

Source: https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md

### Mandatory post-edit lint loop (`antd lint`)

Category: `validation-loop` (Validation loop) · all 29 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/validation-loop.md

Key Rule 5 requires the agent to run `antd lint` on changed files after every write or modification, specifically to catch deprecated API usage. Combined with `antd doctor` (project config diagnosis) and `antd env` (environment snapshot), this gives the agent a closed verification loop that does not depend on the host project having any antd-aware linting configured.

```markdown
5. **Lint after changes** — After writing or modifying antd code, run `antd lint` on the changed files to catch deprecated or problematic usage.

**Workflow:** `antd env` → capture full environment → `antd doctor` → check configuration → `antd info --version X` → verify API against the user's exact version → `antd lint` → find deprecated or incorrect usage.
```

Source: https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md

### Version-pinned knowledge (55+ per-minor offline snapshots)

Category: `registry-metadata` (Registry metadata) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/registry-metadata.md

The CLI/MCP ships pinned JSON snapshots for v3.26.20, v4.0.4 through v4.24.16, v5.0.7 through v5.29.x and v6.x (visible as `data/v*.json` in ant-design-cli). Every command and MCP tool accepts `--version`, and Key Rule 2 requires matching the project’s installed antd. This removes the classic failure mode where a model answers with v5 APIs for a v4 codebase, and makes `antd changelog 4.24.0 5.0.0 Select` a first-class agent tool for diffing an API surface across versions.

```json
{
  "mcpServers": {
    "antd": {
      "command": "npx",
      "args": ["-y", "@ant-design/cli", "mcp", "--version", "5.20.0"]
    }
  }
}
```

Source: https://ant.design/docs/react/mcp.md

### "Your training data is stale" preamble as a distributable prompt

Category: `curated-context` (Curated context) · all 21 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md

The For Agents page hands users a prompt whose first sentence tells the model its own training data is likely wrong about antd, then orders it to fetch two specific URLs before writing any code, and finally offers a one-liner (`npx skills add ant-design/ant-design-cli`) to upgrade from prompt-level to skill-level installation. A graceful-degradation ladder: prompt -> skill -> MCP.

```text
This version may contain breaking changes. The component APIs, conventions, and file structure may differ from what is included in your training data. Before writing any code, please read https://ant.design/docs/react/for-agents.md and https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md, pay attention to deprecation warnings, and follow the instructions to use Ant Design.

If you can install skills, run:
npx skills add ant-design/ant-design-cli
```

Source: https://ant.design/docs/react/for-agents.md

### Deprecated-to-current rename table ("Do Not Hallucinate the Old Names")

Category: `design-code-mapping` (Design–code mapping) · all 3 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/design-code-mapping.md

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

### One instruction set, many vendors (symlinked .claude / .cursor / AGENTS.md)

Category: `instruction-files` (Instruction files) · all 9 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/instruction-files.md

.claude/skills and .cursor/skills are git symlinks to .agents/skills, and AGENTS.md is a symlink to CLAUDE.md. Maintainers author once; Claude Code, Cursor and Codex all resolve it. .github/copilot-instructions.md is the one genuinely separate file and it opens by deferring to CLAUDE.md for deep conventions while positioning itself as the anti-hallucination layer.

```markdown
> For deeper, project-wide conventions (demo/test import rules, documentation format, changelog rules, PR templates, etc.), see [`CLAUDE.md`](../CLAUDE.md) at the repository root. This file is a concise, suggestion-time reference designed to keep AI tools from hallucinating non-existent components or APIs.
```

Source: https://raw.githubusercontent.com/ant-design/ant-design/HEAD/.github/copilot-instructions.md

### Directory-scoped import prohibitions for contributor agents

Category: `prohibition` (Prohibition) · all 25 in this category: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md

CLAUDE.md splits the repo into two opposing import regimes and states each as a ban rather than a preference: demos must use absolute/alias imports (`antd`, `antd/es/*`, `@@/*`) and are forbidden from `..`/`../xxx`/`./xxx` references to component internals; `components/**/__tests__/` must use relative imports and are forbidden from `antd`, `antd/es/*`, `.dumi/*`, `@@/*`. Mechanically checkable, unambiguous for an agent.

```markdown
- 常规 demo 文件中，禁止使用 `..`、`../xxx`、`../../xxx`、`./xxx` 这类相对路径去引用组件实现、内部模块、方法、变量、类型，包含跨 demo、跨目录复用的场景。

## Test 导入规范

- 本规范适用于 `components/**/__tests__/` 下的测试文件。
- 在这些目录下引入 Ant Design 组件，或引入组件内部模块、工具方法、变量、类型定义时，一律使用相对路径导入，不使用绝对路径导入。
- 禁止在 `__tests__` 目录下使用 `antd`、`antd/es/*`、`antd/lib/*`、`antd/locale/*`、`.dumi/*`、`@@/*` 这类绝对路径或别名路径去引用仓库内代码。
```

Source: https://raw.githubusercontent.com/ant-design/ant-design/HEAD/CLAUDE.md

## Platform integrations (2)

### Figma (Dev Mode MCP server, Code Connect, Figma Make)

No official Ant Group-maintained Figma library and no Figma Code Connect files were found in the repo or docs. The ecosystem is third-party: “Ant Design System” and “Ant Design System - v6” community files (antforfigma.com / Mateusz Wierzbicki), “Ant Design Open Source”, and Anima’s AntD Figma-to-code integration. Ant Design’s own Figma-facing move is design.md, targeted at generative design tools (Figma Make, Stitch) rather than component-library sync.

Link: https://ant.design/docs/resources/

### other

Docs are built on dumi (Ant Group’s own React docs framework) with an in-repo .dumi/ theme, not Storybook. No Supernova / Knapsack / zeroheight integration found. Visual regression is an in-house pipeline (visual-regression-diff-* and visual-regression-persist-* GitHub Actions) plus jest-puppeteer image snapshots.

Link: https://github.com/ant-design/ant-design/tree/master/.dumi

## Building the system vs. consuming it

### For consumers (agents building UIs with Ant Design)

Very strong and unusually layered — four escalating tiers. (1) Paste-a-prompt from /docs/react/for-agents. (2) `npx skills add ant-design/ant-design-cli` or `antd setup --client claude --mode skill` for an Agent Skill with `allowed-tools` gating. (3) `antd mcp` official MCP server, 8 tools + 2 prompts, version-pinnable to the project’s installed antd. (4) Raw context files: llms.txt, llms-full.txt (~2 MB), llms-semantic.md, per-component `.md` and `semantic.md`, plus design.md for AI design tools. The coercion story is coherent end to end: never recall, always query the offline snapshot for your exact version, then run `antd lint`. `antd setup --client cursor|vscode|codex --write-instructions` is effectively official distribution of editor rules, replacing the .cursorrules-template pattern.

### For builders (the Ant Design team using AI on the system itself)

Also strong, and notably bilingual. A 291-line root CLAUDE.md (AGENTS.md symlinked to it) encoding directory-scoped import regimes, API-table format, anchor-ID regex, PR/branch conventions and a highly prescriptive changelog spec, capped by a Karpathy-style “coding conduct” section of LLM guardrails. Six repo-local skills under .agents/skills/ (changelog-collect, commit-msg, create-pr, issue-reply, test-review, version-release) shared to Claude Code and Cursor by symlink; issue-reply even carries a strict language policy and dosubot-handling rules for AI-assisted triage. The sibling ant-design-cli repo runs the same playbook plus a docs/superpowers/{plans,specs}/ directory of AI-workflow design specs — including 2026-03-24-antd-mcp-server-design.md — showing the MCP server itself was spec-driven through an agent workflow.

## Gaps

Not confirmed, or not found: (a) no Figma Code Connect files, no Dev Mode MCP integration, no official Ant Group Figma library — the Figma kits are community/commercial; (b) no Storybook, Supernova, Knapsack or zeroheight integration; (c) no “Add to Cursor” / one-click install buttons on ant.design — installation is via `antd setup` or manual JSON; (d) no .cursorrules and no .cursor/rules/*.mdc — .cursor is a symlink to .agents/skills only; (e) no AI-bot GitHub Actions in .github/workflows (the issue-reply skill references dosubot, an AI issue bot, but it is a GitHub App, not an in-repo workflow); (f) no AI-assisted codemods shipped for consumers beyond `antd migrate --apply`, which emits a prompt rather than transforming files; (g) MCP behavior was read from official docs and SKILL.md, not verified against a live server handshake — the 8-tools/2-prompts count is documentation, not observed; (h) git history of .agents/skills was not checked, so how long these have been in place is unknown; (i) https://ant.design/docs/mcp and https://ant.design/ai return 404 — the real paths are /docs/react/mcp and the “AI” doc group.

## Sources (15)

- https://ant.design/llms.txt

- https://ant.design/llms-full.txt

- https://ant.design/design.md

- https://ant.design/docs/react/for-agents.md

- https://ant.design/docs/react/mcp.md

- https://ant.design/docs/react/llms.md

- https://ant.design/docs/react/design-md.md

- https://ant.design/docs/react/cli.md

- https://raw.githubusercontent.com/ant-design/ant-design/HEAD/CLAUDE.md

- https://raw.githubusercontent.com/ant-design/ant-design/HEAD/.github/copilot-instructions.md

- https://raw.githubusercontent.com/ant-design/ant-design/HEAD/.agents/skills/test-review/SKILL.md

- https://raw.githubusercontent.com/ant-design/ant-design/HEAD/.agents/skills/issue-reply/SKILL.md

- https://raw.githubusercontent.com/ant-design/ant-design/HEAD/.agents/skills/version-release/SKILL.md

- https://raw.githubusercontent.com/ant-design/ant-design-cli/main/skills/antd/SKILL.md

- https://registry.npmjs.org/@ant-design/cli

---

Generated 2026-07-27T22:05:57Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
