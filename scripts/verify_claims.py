#!/usr/bin/env python3
"""Extract a record's claims, then merge the refutation agents' verdicts back.

The expensive half of verification is a set of agents whose job is to refute the
record. That half is only worth anything if its output is theirs. If the agent
under audit types up the verdicts, the audit grades an exam the candidate wrote.

So: `extract` writes the claim list and splits it into batches, one per agent.
Each agent writes its own file into .work/<id>/verdicts/batch-<n>.json. `merge`
reads those files, checks that every batch produced one, that every claim in a
batch appears in its file and nowhere else, and that no claim was left out. A
missing file is a missing agent, and it fails.

    python3 scripts/verify_claims.py extract astryx
    python3 scripts/verify_claims.py merge astryx

Claim ids are keyed to the item, not to a running counter, so deleting a claim
during triage does not renumber the ones after it and re-dispatching hits the
claims you meant. Exit status is 1 unless every claim is covered and supported.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "design-systems.json"
VERDICTS = ("supported", "unsupported", "contradicted")


def slug(text, limit=28):
    out = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return (out[:limit].rstrip("-")) or "unnamed"


def work(sid):
    path = ROOT / ".work" / sid
    path.mkdir(parents=True, exist_ok=True)
    return path


def record(sid):
    systems = json.loads(DATA.read_text(encoding="utf-8"))
    found = next((s for s in systems if s.get("id") == sid), None)
    if found is None:
        raise SystemExit(f"no record with id {sid!r}")
    return found


def build_claims(rec):
    claims = []

    def add(kind, key, name, text, urls, snippet=None):
        claims.append(
            {
                "id": f"{kind}-{key}",
                "kind": kind,
                "name": name,
                "text": text,
                "urls": [u for u in urls if u],
                "snippet": snippet,
            }
        )

    add(
        "rec",
        "summary",
        rec["name"],
        rec.get("summary", ""),
        [rec.get("repo_url"), rec.get("docs_url")],
    )
    maintenance = rec.get("maintenance", {})
    add(
        "rec",
        "maintenance",
        rec["name"],
        f"last_release={maintenance.get('last_release')}; {maintenance.get('activity_note')}; "
        f"actively_maintained={maintenance.get('actively_maintained')}",
        [rec.get("repo_url")],
    )
    add(
        "rec",
        "maturity",
        rec["name"],
        f"ai_maturity={rec.get('ai_maturity')}",
        [rec.get("docs_url")],
    )
    for block in ("for_consumers", "for_builders"):
        text = (rec.get("building_vs_consumption") or {}).get(block)
        if text:
            add("rec", block.replace("_", "-"), rec["name"], text, [rec.get("docs_url")])
    for kind, items in (("aff", rec.get("affordances", [])), ("tec", rec.get("techniques", []))):
        for item in items:
            snippet = item.get("snippet") or {}
            add(
                kind,
                slug(item.get("name")),
                item.get("name", "?"),
                item.get("description", ""),
                [item.get("docs_url"), item.get("code_url"), snippet.get("source_url")],
                {"source_url": snippet.get("source_url"), "content": snippet.get("content")}
                if snippet.get("content")
                else None,
            )
    for item in rec.get("platform_integrations", []):
        add(
            "pla",
            slug(item.get("platform")),
            item.get("platform", "?"),
            item.get("description", ""),
            [item.get("url")],
        )
    for n, url in enumerate(rec.get("sources", [])):
        add("src", f"{n:02d}", url, "listed as a source for this record", [url])
    return claims


def do_extract(args):
    rec = record(args.system)
    claims = build_claims(rec)
    ids = [c["id"] for c in claims]
    if len(set(ids)) != len(ids):
        dupes = sorted({i for i in ids if ids.count(i) > 1})
        raise SystemExit(f"claim ids collide, rename the items or the slugs: {dupes}")
    batches = {}
    for n in range(0, len(claims), args.batch_size):
        batches[str(n // args.batch_size + 1)] = ids[n : n + args.batch_size]
    out = work(args.system) / "claims.json"
    out.write_text(
        json.dumps({"system": args.system, "batches": batches, "claims": claims}, indent=2),
        encoding="utf-8",
    )
    (work(args.system) / "verdicts").mkdir(exist_ok=True)
    print(f"{len(claims)} claims in {len(batches)} batches -> {out}")
    for name, members in batches.items():
        print(f"  batch {name}: {', '.join(members)}")
    print(f"\nEach agent writes .work/{args.system}/verdicts/batch-<n>.json and nothing else.")
    return 0


def do_merge(args):
    base = work(args.system)
    manifest = json.loads((base / "claims.json").read_text(encoding="utf-8"))
    batches, claims = manifest["batches"], {c["id"]: c for c in manifest["claims"]}
    faults, rows = [], {}

    for name, members in batches.items():
        path = base / "verdicts" / f"batch-{name}.json"
        if not path.is_file():
            faults.append(f"batch {name} produced no file at {path.relative_to(ROOT)}")
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            faults.append(f"{path.name} is not JSON: {exc}")
            continue
        if not isinstance(payload, list):
            faults.append(f"{path.name} is not a JSON array of verdicts")
            continue
        seen = set()
        for row in payload:
            cid = row.get("id")
            if cid not in claims:
                faults.append(f"{path.name} judges {cid!r}, which is not a claim id")
                continue
            if cid not in members:
                faults.append(f"{path.name} judges {cid!r}, which belongs to another batch")
                continue
            if row.get("verdict") not in VERDICTS:
                faults.append(f"{path.name} gives {cid} verdict {row.get('verdict')!r}")
            if row.get("verdict") == "supported" and not (row.get("quote") or "").strip():
                faults.append(f"{path.name} marks {cid} supported with no quote from the page")
            seen.add(cid)
            rows[cid] = dict(row, batch=name)
        for cid in members:
            if cid not in seen:
                faults.append(f"batch {name} did not judge {cid}")

    unjudged = [cid for cid in claims if cid not in rows]
    counts = {v: sum(1 for r in rows.values() if r.get("verdict") == v) for v in VERDICTS}

    print(f"{len(claims)} claims · {len(rows)} judged · {len(batches)} batches")
    for cid, row in sorted(rows.items()):
        if row.get("verdict") == "supported":
            continue
        print(f"  {row.get('verdict', '?'):>13}  {cid}  ({claims[cid]['name'][:50]})")
        print(f"                 {row.get('reason', '')[:150]}")
        if row.get("suggested_fix"):
            print(f"                 fix: {row['suggested_fix'][:120]}")
    print(
        f"\nsupported {counts['supported']} · unsupported {counts['unsupported']} · "
        f"contradicted {counts['contradicted']} · unjudged {len(unjudged)}"
    )
    for fault in faults:
        print(f"  FAULT: {fault}")
    for cid in unjudged:
        print(f"  FAULT: no verdict for {cid}")

    (base / "verdicts.json").write_text(
        json.dumps({"system": args.system, "counts": counts, "verdicts": rows}, indent=2),
        encoding="utf-8",
    )
    print(f"wrote {(base / 'verdicts.json').relative_to(ROOT)}")

    if faults or unjudged or counts["unsupported"] or counts["contradicted"]:
        print("\nEvery claim needs a page behind it. Fix what the page says, drop the claim, or")
        print("re-dispatch the batch. A verdict file the audited agent wrote is not a verdict.")
        return 1
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    ex = sub.add_parser("extract", help="write .work/<id>/claims.json")
    ex.add_argument("system")
    ex.add_argument("--batch-size", type=int, default=9)
    ex.set_defaults(fn=do_extract)
    mg = sub.add_parser("merge", help="merge .work/<id>/verdicts/batch-*.json")
    mg.add_argument("system")
    mg.set_defaults(fn=do_merge)
    args = ap.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
