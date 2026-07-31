---
title: Adding a platform record when the corpus tooling only knows system records
date: 2026-07-31
category: workflow-issues
module: contribution-pipeline
problem_type: workflow_issue
component: tooling
severity: medium
applies_when:
  - Adding or revising a record in data/platforms.json
  - Running the system:draft / system:verify / system:ship pipeline against a platform id
tags: [platform-records, corpus-tooling, verification, contribute-system]
---

# Adding a platform record when the corpus tooling only knows system records

## Context

The contribute-system pipeline (research, draft, verify, audit, ship) was
written for the 20 design-system records, and three of its check scripts read
`data/design-systems.json` by name. The first platform contribution to run
the full pipeline (Penpot, shipped on main in 5fa9eb3, 2026-07-31) hit each
gap at the phase that needed it. The workarounds all worked, but each one was
discovered late; this doc is so the next platform run budgets for them up
front.

## Guidance

Three scripts refuse a platform id, and each has a specific workaround:

1. **`check_house_norms.py --target <id>` exits 2 with "no record with id".**
   Its data path is hardcoded to the system records
   (`scripts/check_house_norms.py:34`). Measure the platform shape by hand
   against the five prior platform records and write the numbers into
   `.work/<id>/decisions.md`. The measured shape as of this writing:
   capabilities 7–8, snippets on most capabilities, sources 8–12, summary
   roughly 1,800–2,400 characters. Platform records have no `gaps` field;
   gaps go inline in the summary under a `GAPS:` marker (see the supernova
   and figma records).

2. **`verify_claims.py extract <id>` refuses platform ids** (same hardcoded
   path, `scripts/verify_claims.py:29`) — but `merge` never re-reads the
   record; it reads only `.work/<id>/claims.json` and the verdict files.
   So hand-build `claims.json` in the same shape (`rec-*`, `cap-*`, `src-*`
   ids keyed to items, batches of nine) and the entire refutation pipeline —
   batch agents, fit agent, `merge` — works unchanged.

3. **`check_snippets.py --links` iterates systems only**
   (`scripts/check_snippets.py:692` passes platforms to the snippet run but
   not the links run). Fetch the platform record's published URLs directly
   and record the statuses. The snippet (non-links) mode does cover
   platforms, so run it normally.

Two schema differences also bite if unnoticed:

- The platform snippet `language` enum is narrower than the system one:
  `json, markdown, shell, text, ts, tsx` (`schema/platform.schema.json:55`).
  A TypeScript quotation takes `ts`, not `typescript`.
- Platform records have exactly six keys (`id`, `name`, `summary`,
  `adoption_by_design_systems`, `capabilities`, `sources`) — no
  `ai_maturity`, no techniques, no `gaps`.

## Why This Matters

Each gap fails late, at the phase that calls the script, not at the start of
the run. Without knowing the workarounds, the natural readings are wrong in
both directions: an exit 2 from the norms script looks like a blocker (it is
a tooling gap), and a clean `--links` run looks like the links were checked
(none were). The second one is the dangerous reading — it manufactures a
false "all links verified" on a report whose whole premise is that every URL
loads.

## When to Apply

- Any addition or major revision to `data/platforms.json`
- Any /system:verify or /system:ship run whose target id is a platform

## Examples

The claims file that makes `verify_claims.py merge` work for a platform —
same structure `extract` would have produced, hand-built:

```json
{
  "system": "penpot",
  "batches": { "1": ["rec-summary", "rec-adoption", "cap-official-mcp-server-penpot-m", "..."] },
  "claims": [
    {
      "id": "cap-official-mcp-server-penpot-m",
      "kind": "cap",
      "name": "Official MCP server (@penpot/mcp) — read-write, drives a plugin over WebSocket",
      "text": "[audience: both] The server communicates with a dedicated Penpot MCP Plugin over WebSocket...",
      "urls": ["https://raw.githubusercontent.com/penpot/penpot/<sha>/mcp/README.md"],
      "snippet": { "source_url": "...", "content": "..." }
    }
  ]
}
```

The direct link check that substitutes for `--links` on a platform record:

```sh
python3 -c "
import json
p = [x for x in json.load(open('data/platforms.json')) if x['id'] == 'penpot'][0]
urls = set(p['sources']) | {c['url'] for c in p['capabilities']} \
     | {c['snippet']['source_url'] for c in p['capabilities'] if 'snippet' in c}
print('\n'.join(sorted(urls)))
" | while read -r u; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 30 "$u") $u"
done
```

## Related

- The lasting fix is to teach the three scripts about `data/platforms.json`;
  until then this doc is the workaround map.
- `.work/<id>/decisions.md` in a contribution run is where the hand-measured
  platform norms and any argued deviations live (gitignored working
  material, so the argument worth keeping should end up here or in a commit
  message, not only there).
