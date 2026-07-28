---
title: "Does every major design system ship an MCP server?"
description: "No, but almost: 16 of 19 ship an official MCP server; 3 do not."
url: "https://state-of-ai-in-design-systems.netlify.app/questions/mcp-server-adoption.md"
canonical: "https://state-of-ai-in-design-systems.netlify.app/questions/mcp-server-adoption.md"
type: "question"
id: "mcp-server-adoption"
data_collected: "2026-07-26/27"
generated: "2026-07-28T05:02:05Z"
report: "State of AI in Design Systems — July 2026"
author: "Kaelig Deloumeau-Prigent"
license: "CC-BY-4.0"
citation: "Deloumeau-Prigent, K. (2026). State of AI in Design Systems. https://state-of-ai-in-design-systems.netlify.app/questions/mcp-server-adoption.md"
---

> Snapshot of 2026-07-27. Every claim below links to the source URL it was taken from. Check the source before citing.

# Does every major design system ship an MCP server?

No, but almost: 16 of the 19 systems in this study ship an official MCP
server, and 3 do not — [Cloudscape Design System](https://state-of-ai-in-design-systems.netlify.app/systems/cloudscape-design-system.md), [Nord Design System](https://state-of-ai-in-design-systems.netlify.app/systems/nord-design-system.md), [U.S. Web Design System (USWDS)](https://state-of-ai-in-design-systems.netlify.app/systems/uswds.md).

Cloudscape covers the same ground with the most engineered docs pipeline in the study, regenerated
daily with typed JSON per component. Nord and USWDS route agents through published files instead of
a server. The shape of the 16 servers varies more than their existence does: bundled in a
CLI, published as an npm stdio binary, or hosted remotely behind auth. Per-system detail is in each
record; the delivery split is in https://state-of-ai-in-design-systems.netlify.app/insights.md.

Count it yourself: `SELECT count(DISTINCT system_id) FROM affordances WHERE type='mcp-server' AND official=1;`
against https://state-of-ai-in-design-systems.netlify.app/data/state-of-ai.sqlite.


Other questions this report answers, and the index of every file: https://state-of-ai-in-design-systems.netlify.app/llms.txt

---

Generated 2026-07-28T05:02:05Z from the State of AI in Design Systems — July 2026 dataset. Index of every machine-readable file: https://state-of-ai-in-design-systems.netlify.app/llms.txt. JSON, SQLite and the MCP endpoint: https://state-of-ai-in-design-systems.netlify.app/ai.md. Kaelig Deloumeau-Prigent, CC BY 4.0.
