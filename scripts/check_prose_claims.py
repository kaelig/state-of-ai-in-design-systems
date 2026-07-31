#!/usr/bin/env python3
"""Find the published sentences whose truth depends on the record set.

`compute_counts()` keeps the numbers honest. Nothing keeps the enumerations and
the superlatives honest: "Only Cloudscape, Nord and USWDS lack one", "the deepest
in the study", "all but one ship official machine-facing affordances". A new
record falsifies sentences like those silently, and they are the report's oldest
lies by the time anyone notices.

This finds them across every file that carries published prose, prints the facts
they can be checked against, and records that they were checked against a
specific state of the data. Adding or revising a record moves the fingerprint,
which invalidates every acknowledgement, which is the point: the sentences were
true about the old corpus.

    python3 scripts/check_prose_claims.py                       # list them, with the facts
    python3 scripts/check_prose_claims.py --facts               # just the fact tables
    python3 scripts/check_prose_claims.py --stamp S.json        # record that they were checked
    python3 scripts/check_prose_claims.py --verify-stamp S.json # were they, against this data?

Exit status is 1 when a stamp is missing, stale, or does not cover every claim.
Without a stamp argument this only reports, because which sentences are worth
rewriting is a judgment and a checker cannot make it.
"""

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "design-systems.json"

# Where published prose lives. docs/ is an internal worklist and is not published,
# so it is out by default; pass --include to add a path.
FILES = [
    "data/insights.json",
    "scripts/build_md.py",
    "scripts/build_dashboard.py",
    "dashboard/template.html",
    "netlify/functions/mcp.mjs",
    "README.md",
]

# The shapes a claim about the record set takes. Wider than an eye can hold, and
# narrowed afterwards by requiring the sentence to be about the corpus at all.
PATTERNS = [
    r"\bonly\b",
    r"\ball but\b",
    r"\bnone of\b",
    r"\bno other\b",
    r"\bnobody else\b",
    r"\bthe (?:only|largest|deepest|widest|richest|fewest|most|rarest|single)\b",
    r"\b(?:deepest|largest|widest|richest|smallest)\b",
    r"\bone of the (?:two|three|four|five)\b",
    r"\ba (?:third|quarter|half|fifth) of\b",
    r"\bevery other\b",
    r"\bunique(?:ly)?\b",
    r"\balone\b",
    r"\bunlike\b",
    r"\bexcept\b",
    r"\b(?:more|fewer|further) than any\b",
    r"\bthe exception\b",
    r"\bfirst to\b",
    r"\bneither\b",
    r"\b\d+ of (?:the )?\d+\b",
]
CLAIM = re.compile("|".join(PATTERNS), re.IGNORECASE)

# A comparative word only matters if the sentence is about this corpus. "the only
# browser that ships it" and "read-only" are somebody else's business.
CORPUS_WORDS = re.compile(
    r"\b(?:systems?|records?|study|corpus|design systems?|affordances?|techniques?|"
    r"mcp|llms\.txt|skills?|maturity|ai-native|cohort)\b",
    re.IGNORECASE,
)
SENTENCE = re.compile(r"(?<=[.!?])\s+")


def load():
    return json.loads(DATA.read_text(encoding="utf-8"))


def strings_in(rel):
    """(location, text) pairs of prose in one file.

    insights.json is walked as data. Everything else is read as text: prose in a
    generator lives inside a string literal, and the sentence splitter finds it
    without a parser.
    """
    path = ROOT / rel
    if not path.is_file():
        return
    if rel.endswith(".json"):

        def walk(node, at=""):
            if isinstance(node, str):
                yield at, node
            elif isinstance(node, list):
                for i, v in enumerate(node):
                    yield from walk(v, f"{at}[{i}]")
            elif isinstance(node, dict):
                for k, v in node.items():
                    yield from walk(v, f"{at}.{k}")

        yield from walk(json.loads(path.read_text(encoding="utf-8")))
        return
    for lineno, line in enumerate(
        path.read_bytes().decode("utf-8", errors="replace").split("\n"), 1
    ):
        yield f":{lineno}", line


def claims():
    out = []
    names = {s["name"] for s in load()}
    for rel in FILES:
        for at, text in strings_in(rel):
            for sentence in SENTENCE.split(text):
                sentence = sentence.strip()
                if len(sentence) < 25 or not CLAIM.search(sentence):
                    continue
                if not CORPUS_WORDS.search(sentence) and not any(n in sentence for n in names):
                    continue
                out.append(
                    {
                        "id": hashlib.sha256(f"{rel}{at}".encode()).hexdigest()[:8],
                        "where": f"{rel}{at}",
                        "text": sentence,
                        "hash": hashlib.sha256(sentence.encode("utf-8")).hexdigest()[:12],
                    }
                )
    return out


def has(system, **kw):
    return any(
        all(a.get(k) == v for k, v in kw.items())
        for a in system["affordances"]
        if a.get("present", True)
    )


def facts():
    """The sets the sentences are claiming, computed the way the build computes them."""
    systems = load()
    names = [s["name"] for s in systems]
    lines = [f"{len(systems)} systems: {', '.join(names)}", ""]
    for t in sorted({a["type"] for s in systems for a in s["affordances"]}):
        with_it = [s["name"] for s in systems if has(s, type=t)]
        without = [n for n in names if n not in with_it] or ["none"]
        lines.append(f"{t:22s} {len(with_it):>2} have · WITHOUT: {', '.join(without)}")
    lines.append("")
    for t in ("mcp-server", "claude-skill"):
        # official_skills in compute_counts drops anything named "Planned ...".
        official = [
            s["name"]
            for s in systems
            if any(
                a.get("type") == t
                and a.get("official")
                and a.get("present", True)
                and not (a.get("name") or "").lower().startswith("planned")
                for a in s["affordances"]
            )
        ]
        without = [n for n in names if n not in official] or ["none"]
        lines.append(f"official {t:14s} {len(official):>2} · WITHOUT: {', '.join(without)}")
    lines.append("")
    lines.append(f"maturity: {dict(Counter(s['ai_maturity'] for s in systems))}")
    lines.append(
        "technique categories: "
        f"{Counter(t['category'] for s in systems for t in s['techniques']).most_common()}"
    )
    lines.append(
        "affordances per system: "
        + ", ".join(f"{s['name']} {len(s['affordances'])}" for s in systems)
    )
    return "\n".join(lines)


def fingerprint():
    h = hashlib.sha256()
    for name in ("design-systems.json", "insights.json"):
        h.update((ROOT / "data" / name).read_bytes())
    return h.hexdigest()[:16]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--facts", action="store_true", help="print the fact tables and stop")
    ap.add_argument("--include", action="append", default=[], help="extra file to sweep")
    ap.add_argument("--stamp", help="record that every claim below was checked against this data")
    ap.add_argument("--verify-stamp", help="fail unless that stamp covers this data")
    args = ap.parse_args()

    FILES.extend(args.include)
    if args.facts:
        print(facts())
        return 0

    found = claims()
    print(f"data fingerprint: {fingerprint()}")
    print(f"{len(found)} sentence(s) whose truth depends on the record set\n")
    for claim in found:
        print(f"  [{claim['hash']}] {claim['where']}")
        print(f"      {claim['text'][:300]}")
    print("\n" + facts())

    if args.verify_stamp:
        path = Path(args.verify_stamp)
        if not path.is_file():
            print(f"\nno stamp at {args.verify_stamp}: the comparative prose was never checked")
            return 1
        stamp = json.loads(path.read_text(encoding="utf-8"))
        if stamp.get("fingerprint") != fingerprint():
            print(
                f"\nSTALE STAMP: taken at {stamp.get('fingerprint')}, data is now {fingerprint()}"
            )
            print("Every sentence above was checked against a different corpus. Check them again.")
            return 1
        missing = [c for c in found if stamp.get("claims", {}).get(c["hash"]) is None]
        if missing:
            print(f"\n{len(missing)} sentence(s) not covered by the stamp:")
            for claim in missing:
                print(f"  {claim['where']}: {claim['text'][:120]}")
            return 1
        print(f"\nstamp {args.verify_stamp} covers all {len(found)} claims at {fingerprint()}")
        return 0

    if args.stamp:
        Path(args.stamp).parent.mkdir(parents=True, exist_ok=True)
        Path(args.stamp).write_text(
            json.dumps(
                {
                    "fingerprint": fingerprint(),
                    "claims": {c["hash"]: c["where"] for c in found},
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"\nstamped {args.stamp}: {len(found)} claims checked at {fingerprint()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
