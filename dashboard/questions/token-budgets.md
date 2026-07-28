---
title: "How do design systems keep their docs inside a context window?"
description: "By slicing them: 21 of 148 techniques are curated-context work."
url: "https://state-of-ai-in-design-systems.netlify.app/questions/token-budgets.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/questions/token-budgets.md"
type: "question"
id: "token-budgets"
data_collected: "2026-07-26/27"
generated: "2026-07-28T02:17:18Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/questions/token-budgets.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# How do design systems keep their docs inside a context window?

By slicing them: 21 of the 148 techniques here are
curated-context work, across 17 systems, and 4 records talk about
context budgets in so many words — [Atlassian Design System](https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md), [Chakra UI](https://state-of-ai-in-design-systems.netlify.app/systems/chakra-ui.md), [HeroUI](https://state-of-ai-in-design-systems.netlify.app/systems/heroui.md), [Nord Design System](https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md).

The patterns that recur: multiple llms.txt files split by concern or by platform, a condensed
component index separate from full docs, per-page markdown twins so an agent fetches one page
instead of a site, and read triggers that tell a model when a file is worth loading. Nobody in the
study reports a single file that works for every context size. Full text at
https://state-of-ai-in-design-systems.netlify.app/techniques/curated-context.md.


Other questions this report answers, and the index of every file: https://state-of-ai-in-design-systems.netlify.app/llms.txt

---

Generated 2026-07-28T02:17:18Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
