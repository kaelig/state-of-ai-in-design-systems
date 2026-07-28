---
title: "Do prohibitions like “never invent components” actually work?"
description: "They help, but tool-gating works better: 25 prohibition techniques vs 20 that make hallucination impossible."
url: "https://state-of-ai-in-design-systems.netlify.app/questions/prohibition-vs-tool-gating.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/questions/prohibition-vs-tool-gating.md"
type: "question"
id: "prohibition-vs-tool-gating"
data_collected: "2026-07-26/27"
generated: "2026-07-28T04:48:05Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/questions/prohibition-vs-tool-gating.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Do prohibitions like “never invent components” actually work?

They help, and the systems that rely on them least are the ones with the strongest results.
The dataset holds 25 prohibition techniques across
18 systems, and
20 tool-gating techniques across 16 systems.

The difference is worth keeping straight, because people call both of them guardrails. A prohibition
asks the model not to do something. Tool-gating restructures the task so the model cannot do it: the
component source has to come back from a tool call, so there is nothing to fabricate. The strongest
records pair them — a short allow-list of real exports naming the components models are known to
invent, plus a tool that has to be called for anything else.

Read both: https://state-of-ai-in-design-systems.netlify.app/techniques/prohibition.md and https://state-of-ai-in-design-systems.netlify.app/techniques/tool-gating.md.


Other questions this report answers, and the index of every file: https://state-of-ai-in-design-systems.netlify.app/llms.txt

---

Generated 2026-07-28T04:48:05Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
