---
title: "How do teams stop agents writing raw hex values instead of design tokens?"
description: "With types and lint rules: 13 token-enforcement techniques make the raw value fail."
url: "https://state-of-ai-in-design-systems.netlify.app/questions/design-tokens.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/questions/design-tokens.md"
type: "question"
id: "design-tokens"
data_collected: "2026-07-26/27"
generated: "2026-07-28T02:39:42Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/questions/design-tokens.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# How do teams stop agents writing raw hex values instead of design tokens?

With types and lint rules more than with instructions: 13
techniques across 11 systems are token enforcement, and they mostly work by making
the raw value fail rather than by asking the model not to write it.

The recurring moves are a typed token vocabulary the compiler checks, a lint rule that rejects
literal colours and spacing, and a token lookup exposed as a tool so the agent has to ask what
“danger red” is called instead of guessing. Design-to-code adds a second path:
3 design-code-mapping techniques across
3 systems tie Figma nodes to real components with real props. See
https://state-of-ai-in-design-systems.netlify.app/techniques/token-enforcement.md and https://state-of-ai-in-design-systems.netlify.app/techniques/design-code-mapping.md.


Other questions this report answers, and the index of every file: https://state-of-ai-in-design-systems.netlify.app/llms.txt

---

Generated 2026-07-28T02:39:42Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
