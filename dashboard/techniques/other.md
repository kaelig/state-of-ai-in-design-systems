---
title: "Other — 2 techniques"
description: "Techniques that don't fit the taxonomy, often the most interesting ones."
url: "https://state-of-ai-in-design-systems.netlify.app/techniques/other.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/techniques/other.md"
type: "technique-category"
id: "other"
technique_count: 2
system_count: 2
data_collected: "2026-07-26/27"
generated: "2026-07-27T22:05:57Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/techniques/other.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Other

2 of the 148 techniques in this study, across 2 of the 19 design systems. Read when looking for approaches outside the ten main categories.

Techniques that don't fit the taxonomy, often the most interesting ones.

Systems represented here: [Polaris (Shopify)](https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md), [U.S. Web Design System (USWDS)](https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md)

## Closed-loop telemetry: the agent reports on itself

Polaris (Shopify) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md

Uniquely aggressive. Every skill invocation, doc search and validation POSTs to https://shopify.dev/mcp/usage carrying skill version, model name, client name/version, the validated code, an artifact id + revision number, and the user’s most recent prompt verbatim (base64, 2000-char cap). PostToolUse and UserPromptSubmit hooks are registered for Claude Code, Cursor and Copilot. On by default; `OPT_OUT_INSTRUMENTATION=true` disables. This gives the Polaris team a live measurement loop on how well models generate their components — a builder-side capability delivered through the consumer-side channel.

```markdown
The skill scripts (`scripts/search_docs.mjs`, `scripts/validate.mjs`, `scripts/log_skill_use.mjs`) send a usage event to `https://shopify.dev/mcp/usage` on each invocation. The payload includes:

- tool name, skill name and version
- model name, client name, and client version (when supplied as flags)
- the search query text and search response or error text (for `search_docs.mjs`)
- the validation result, the validated code when present, and validator-specific context such as API name, extension target, filename, file type, theme path, and file list (for `validate.mjs`)
- artifact ID and revision number (when supplied)
- the user's most recent message verbatim (truncated to 2000 chars), when the agent passes it base64-encoded via `--user-prompt-base64`
```

Source: https://raw.githubusercontent.com/Shopify/shopify-ai-toolkit/HEAD/README.md

## Human-review-preserving framing (opt-in, non-replacing)

U.S. Web Design System (USWDS) · full record: https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md

The governance language around adopting agent files in a federal repo is itself the finding. Issue #6711’s Notes section explicitly firewalls the agent file from the review process — a formulation that lets an AI-tooling change clear a public-sector approval bar. Note also that the acceptance criterion for a `.agents/skills/` directory was silently dropped between the issue and the merged PR: only the vendor-agnostic prose file shipped.

```markdown
Create an `AGENTS.md` file and a `.agents/skills/` directory with basic skills to help contributors and maintainers using agents work more effectively with USWDS.

## Acceptance Criteria

- [x] A vendor agnostic `AGENTS.md` is created with comprehensive project context

## Notes

- This is opt-in for contributors who use agents
- This does not replace human code review or existing CI/CD.
```

Source: https://github.com/uswds/uswds/issues/6711

All categories: https://state-of-ai-in-design-systems.netlify.app/techniques.md

---

Generated 2026-07-27T22:05:57Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
