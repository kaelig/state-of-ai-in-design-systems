#!/usr/bin/env python3
"""Invariants that always hold, and norms measured from the corpus.

Two different things live here, and they are graded differently.

INVARIANTS are mechanical and always fail: every affordance carries a URL or is
marked as documenting an absence, a technique's only source is its snippet, no
snippet is over the budget the schema documents, no duplicate ids, and the
cohort blocks run in the order dashboard/template.html renders them. These run
in `npm run check`.

NORMS are measured from the other records and are judgment calls. Nothing here
hard-codes a threshold, so the shape of the study defines the shape of a new
entry. A deviation is a decision to write down, not an error, which is why norms
are not in the gate.

    python3 scripts/check_house_norms.py                 # invariants + corpus profile
    python3 scripts/check_house_norms.py --invariants    # invariants only (the gate)
    python3 scripts/check_house_norms.py --target astryx # judge one record
    python3 scripts/check_house_norms.py --json out.json

Exit status is 1 if an invariant fails, or if a target deviates and --warn-only
was not passed.
"""

import argparse
import json
import re
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "design-systems.json"
SCHEMA = ROOT / "schema" / "design-system.schema.json"
TEMPLATE = ROOT / "dashboard" / "template.html"

# Deviations that were argued and accepted, plus deviations that shipped without
# being argued. Both leave the reference set: a number that got in once must not
# become the norm the next record is measured against. Removing an entry is a
# claim that the record now sits inside the corpus; adding one needs a reason a
# reviewer can disagree with, in the string.
EXCEPTIONS = {
    ("astryx", "techniques"): (
        "shipped with 9 where every other ai-native record has 8, without an argued "
        "exception. Excluded so 9 cannot become the norm. Resolve it by dropping the "
        "weakest technique or by writing the argument here."
    ),
    ("astryx", "summary_sentences"): (
        "8 sentences against a corpus of 3 to 7, same contribution, same problem."
    ),
}


def sentences(text):
    return [s for s in re.split(r"(?<=[.!?])\s+", (text or "").strip()) if s]


def mat_order():
    """Cohort order, read from the template rather than retyped here. The site
    filters the record list by ai_maturity in this order and draws a divider at
    each change, which is what makes array position load-bearing."""
    m = re.search(r"const MAT_ORDER = \[([^\]]+)\]", TEMPLATE.read_text(encoding="utf-8"))
    if not m:
        raise SystemExit("could not find MAT_ORDER in dashboard/template.html")
    return re.findall(r"'([^']+)'", m.group(1))


def budget_from_schema():
    """The snippet budget the schema documents, read from the schema, not typed."""
    m = re.search(
        r"verbatim excerpt, <= (\d+) lines / (\d+) chars", SCHEMA.read_text(encoding="utf-8")
    )
    return (int(m.group(1)), int(m.group(2))) if m else (None, None)


def item_source(item):
    snippet = item.get("snippet") or {}
    return item.get("docs_url") or item.get("code_url") or snippet.get("source_url")


def record_metrics(record):
    techniques = record.get("techniques", [])
    cats = [t.get("category") for t in techniques]
    return {
        "sources": len(record.get("sources", [])),
        "affordances": len(record.get("affordances", [])),
        "techniques": len(techniques),
        "platform_integrations": len(record.get("platform_integrations", [])),
        "distinct_technique_categories": len(set(cats)),
        "max_uses_of_one_technique_category": max((cats.count(c) for c in set(cats)), default=0),
        "summary_chars": len(record.get("summary", "")),
        "summary_sentences": len(sentences(record.get("summary", ""))),
        "gaps_chars": len(record.get("gaps", "")),
        "affordances_with_snippet": sum(
            1 for a in record.get("affordances", []) if (a.get("snippet") or {}).get("content")
        ),
        "techniques_with_snippet": sum(
            1 for t in techniques if (t.get("snippet") or {}).get("content")
        ),
    }


def item_metrics(record):
    rows = []
    for kind in ("affordances", "techniques"):
        for item in record.get(kind, []):
            snippet = item.get("snippet") or {}
            content = snippet.get("content") or ""
            rows.append(
                {
                    "kind": kind[:-1],
                    "name": item.get("name", "?"),
                    "description_chars": len(item.get("description", "")),
                    "snippet_chars": len(content),
                    "snippet_lines": len(content.split("\n")) if content else 0,
                    "language": snippet.get("language"),
                }
            )
    return rows


def stat(values):
    return {
        "min": min(values),
        "median": round(statistics.median(values), 1),
        "max": max(values),
        "exact": min(values) if min(values) == max(values) else None,
        "n": len(values),
    }


def profile(records, metric_key=None):
    """min / median / max per metric, over records with no exception for it."""
    out: dict[str, dict] = {}
    if not records:
        return out
    for key in record_metrics(records[0]):
        pool = [r for r in records if (r["id"], key) not in EXCEPTIONS]
        if not pool:
            pool = records
        out[key] = stat([record_metrics(r)[key] for r in pool])
    return out if metric_key is None else out[metric_key]


def expected_order(records, order):
    return sorted(
        records,
        key=lambda r: (
            order.index(r["ai_maturity"]) if r["ai_maturity"] in order else len(order),
            r["name"].casefold(),
        ),
    )


def check_invariants(records):
    faults, notes = [], []
    order = mat_order()
    max_lines, max_chars = budget_from_schema()

    ids = [r.get("id") for r in records]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        faults.append(f"duplicate record ids: {sorted(dupes)}")

    for record in records:
        rid = record.get("id", "?")
        for affordance in record.get("affordances", []):
            name = affordance.get("name", "?")
            if item_source(affordance):
                continue
            if affordance.get("present") is False:
                notes.append(f"documents an absence, no URL by design: {rid} · {name}")
                continue
            faults.append(
                f"{rid} · affordance · {name}: no docs_url, code_url or snippet.source_url.\n"
                '    If it documents something that does not exist, set "present": false on it and\n'
                "    make sure compute_counts() excludes it. Never invent a URL to fill the gap."
            )
        for technique in record.get("techniques", []):
            name = technique.get("name", "?")
            snippet = technique.get("snippet") or {}
            stray = [k for k in ("docs_url", "code_url") if technique.get(k)]
            if stray:
                faults.append(
                    f"{rid} · technique · {name}: carries {stray}, which nothing renders and no "
                    "check fetches. A technique's source is its snippet."
                )
            if not snippet.get("source_url") or not (snippet.get("content") or "").strip():
                faults.append(
                    f"{rid} · technique · {name}: has no snippet with a source_url, so it has no "
                    "source at all. techniques[] carries no other URL."
                )
        for row in item_metrics(record):
            if max_chars and row["snippet_chars"] > max_chars:
                faults.append(
                    f"{rid} · {row['kind']} · {row['name']}: snippet is {row['snippet_chars']} chars, "
                    f"over the {max_chars} the schema documents. Shorten the quote or change the "
                    "documented budget, deliberately."
                )
            if max_lines and row["snippet_lines"] > max_lines:
                faults.append(
                    f"{rid} · {row['kind']} · {row['name']}: snippet is {row['snippet_lines']} lines, "
                    f"over the {max_lines} the schema documents."
                )

    # Cohort grouping is load-bearing: the site draws a divider when ai_maturity
    # changes, so a record filed out of its block splits the cohort in two.
    seen: list[str] = []
    for record in records:
        mat = record.get("ai_maturity")
        if not seen or seen[-1] != mat:
            if mat in seen:
                faults.append(
                    f"cohort {mat!r} appears in more than one block; the site renders the array in "
                    "file order and would draw the divider twice"
                )
            seen.append(mat)
    ranked = [m for m in seen if m in order]
    if ranked != sorted(ranked, key=order.index):
        faults.append(f"cohort blocks run {seen}, template.html renders them {order}")
    return faults, notes


def name_order_note(records, order):
    """Alphabetical order inside a cohort is a convention, not a rendering rule.
    It holds for every record today, so a break is worth saying out loud without
    being a failure."""
    actual = [r["id"] for r in records]
    wanted = [r["id"] for r in expected_order(records, order)]
    if actual == wanted:
        return None
    first = next(i for i, (a, b) in enumerate(zip(actual, wanted, strict=True)) if a != b)
    return (
        f"index {first} is {actual[first]!r}; cohort-then-case-insensitive-name order wants "
        f"{wanted[first]!r}. Every other record follows that convention."
    )


def judge(target, reference, records, order):
    deviations = []
    metrics = record_metrics(target)

    print(f"\n[norms] {target['id']} against {len(reference)} other records")
    for key, value in metrics.items():
        pool = [r for r in reference if (r["id"], key) not in EXCEPTIONS]
        excluded = len(reference) - len(pool)
        band = stat([record_metrics(r)[key] for r in pool or reference])
        if band["exact"] is not None and value != band["exact"]:
            verdict = f"OUT (every other record has {band['exact']})"
        elif value < band["min"] or value > band["max"]:
            verdict = f"OUT (corpus {band['min']}-{band['max']})"
        else:
            verdict = "ok"
        if verdict != "ok":
            deviations.append(f"{key}: {value} — {verdict}")
        tail = f"  [{excluded} excluded by EXCEPTIONS]" if excluded else ""
        print(
            f"  {key:38s} {value:>6}   corpus {band['min']}-{band['max']} "
            f"(median {band['median']})   {verdict}{tail}"
        )

    cohort = [r for r in reference if r.get("ai_maturity") == target.get("ai_maturity")]
    if cohort:
        print(f"\n[cohort norms] {target.get('ai_maturity')}, {len(cohort)} other records")
        for key in ("affordances", "techniques", "sources", "platform_integrations"):
            pool = [r for r in cohort if (r["id"], key) not in EXCEPTIONS] or cohort
            band = stat([record_metrics(r)[key] for r in pool])
            value = metrics[key]
            if band["exact"] is not None and value != band["exact"]:
                verdict = f"OUT (every {target['ai_maturity']} record has {band['exact']})"
                deviations.append(f"{key} within cohort: {value} — {verdict}")
            elif value < band["min"] or value > band["max"]:
                verdict = f"OUT (cohort {band['min']}-{band['max']})"
                deviations.append(f"{key} within cohort: {value} — {verdict}")
            else:
                verdict = "ok"
            print(f"  {key:38s} {value:>6}   cohort {band['min']}-{band['max']}   {verdict}")

    ref_items = [row for r in reference for row in item_metrics(r)]
    print("\n[item ranges] per-item measurements against the corpus")
    for field in ("description_chars", "snippet_chars", "snippet_lines"):
        for kind in ("affordance", "technique"):
            vals = [row[field] for row in ref_items if row["kind"] == kind and row[field]]
            if not vals:
                continue
            lo, hi = min(vals), max(vals)
            outliers = [
                row
                for row in item_metrics(target)
                if row["kind"] == kind and row[field] and not (lo <= row[field] <= hi)
            ]
            print(f"  {kind} {field:22s} corpus {lo}-{hi}   {len(outliers)} outside")
            for row in outliers:
                deviations.append(
                    f"{kind} {field} {row[field]} on {row['name']!r} (corpus {lo}-{hi})"
                )
                print(f"    {row['name']}: {row[field]}")

    ref_langs = {row["language"] for row in ref_items if row["language"]}
    new_langs = {row["language"] for row in item_metrics(target) if row["language"]} - ref_langs
    if new_langs:
        deviations.append(f"snippet languages not used anywhere else: {sorted(new_langs)}")
        print(f"\n  snippet languages new to the corpus: {sorted(new_langs)}")

    universal = set.intersection(*[set(r.keys()) for r in reference])
    missing = universal - set(target.keys())
    extra = set(target.keys()) - set.union(*[set(r.keys()) for r in reference])
    if missing:
        deviations.append(f"top-level keys every other record has: {sorted(missing)}")
    if extra:
        deviations.append(f"top-level keys no other record has: {sorted(extra)}")
    print(f"\n[keys] {len(target.keys())} on this record, {len(universal)} universal in the corpus")
    for key in sorted(missing):
        print(f"  MISSING: {key}")
    for key in sorted(extra):
        print(f"  UNKNOWN: {key}")

    note = name_order_note(records, order)
    idx = [r["id"] for r in records].index(target["id"])
    print(f"\n[position] {target['id']} is at index {idx}")
    if note:
        print(f"  convention: {note}")
    return deviations


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--target", help="record id to judge against the rest of the corpus")
    ap.add_argument("--invariants", action="store_true", help="invariants only, no profile")
    ap.add_argument("--warn-only", action="store_true", help="report deviations, exit 0")
    ap.add_argument("--json", dest="json_out", help="write the full report here")
    args = ap.parse_args()

    records = json.loads(DATA.read_text(encoding="utf-8"))
    order = mat_order()
    report = {"corpus": len(records)}

    faults, notes = check_invariants(records)
    print(f"[invariants] {len(records)} records, cohort order {order}")
    for note in notes:
        print(f"  note: {note}")
    for fault in faults:
        print(f"  FAIL: {fault}")
    if not faults:
        print("  every affordance is sourced or marked absent; every technique is sourced by its")
        print("  snippet; no snippet is over budget; cohort blocks are grouped and in order")
    convention = name_order_note(records, order)
    if convention:
        print(f"  convention (not a failure): {convention}")
    report["faults"] = faults

    if args.invariants:
        if args.json_out:
            Path(args.json_out).write_text(json.dumps(report, indent=2), encoding="utf-8")
        return 1 if faults else 0

    if not args.target:
        print("\n[corpus profile] measured across all records, EXCEPTIONS removed per metric")
        for key, band in profile(records).items():
            exact = "  (exact norm)" if band["exact"] is not None else ""
            print(
                f"  {key:38s} min {band['min']:>6} median {band['median']:>7} "
                f"max {band['max']:>6}   n={band['n']}{exact}"
            )
        langs = sorted(
            {row["language"] for r in records for row in item_metrics(r) if row["language"]}
        )
        print(f"  snippet languages in use: {', '.join(langs)}")
        for (rid, key), why in sorted(EXCEPTIONS.items()):
            print(f"  exception: {rid} · {key} — {why.splitlines()[0]}")
        report["profile"] = profile(records)
        if args.json_out:
            Path(args.json_out).write_text(json.dumps(report, indent=2), encoding="utf-8")
        return 1 if faults else 0

    target = next((r for r in records if r.get("id") == args.target), None)
    if target is None:
        print(f"no record with id {args.target!r}", file=sys.stderr)
        return 2
    reference = [r for r in records if r is not target]
    deviations = judge(target, reference, records, order)
    report["deviations"] = deviations

    print(f"\n{len(deviations)} deviation(s), {len(faults)} invariant failure(s)")
    for line in deviations:
        print(f"  - {line}")
    if args.json_out:
        Path(args.json_out).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"wrote {args.json_out}")
    if deviations:
        print("\nA deviation is not automatically wrong, but it has to be a decision. Bring the")
        print("record inside the measured range, or write down why it sits outside. If you keep")
        print("it, add it to EXCEPTIONS in this file so it does not become the norm.")
    if faults or (deviations and not args.warn_only):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
