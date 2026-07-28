#!/usr/bin/env python3
"""Find every count and every snapshot date typed by hand, and say which are wrong.

compute_counts() fills {placeholder} tokens in data/insights.json and nothing
else. Every other number on the site, in the meta descriptions, in the MCP tool
descriptions, in the social card and in the prose was typed by a person, and so
was every statement of when the data was gathered. Both go stale silently.

Three things make this find what a grep does not:

  - It reads every tracked file as bytes. scripts/prerender.mjs is classified as
    binary by file(1), so grep skips it unless forced, and extensionless files
    like LICENSE-DATA fall out of any sweep filtered by extension.
  - It matches over the whole file with newlines flattened to spaces, so a count
    split across a line break is still a count. AGENTS.md wraps "how 20" /
    "open-source design systems" and a line-at-a-time sweep reports it clean.
  - It knows all nine derived counts, not just the four with obvious nouns.
    official_mcp, official_skills, llms_txt, technique_categories and ai_native
    are the numbers the headline findings are built on.

    python3 scripts/check_hand_counts.py                       # stale hits only
    python3 scripts/check_hand_counts.py --all                 # every hit
    python3 scripts/check_hand_counts.py --stamp S.json        # record what was resynced
    python3 scripts/check_hand_counts.py --verify-stamp S.json # did the data move since?

The stamp exists because a record revised after the first build moves the totals
a second time, which silently invalidates a resync that was correct an hour ago.

Put `counts-ok` in a comment on a line to exempt a number that is deliberately
local or historical. Exit status is 1 when a hit disagrees with the computed
counts, when a snapshot date disagrees with the window below, when
compute_counts() cannot express an absence, or when the data moved since a stamp.
"""

import argparse
import bisect
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# The one place the snapshot window is written down. Everything else in the
# repository quotes it, and this sweep is what keeps those quotations honest.
SNAPSHOT = {
    "start": "2026-07-26",
    "end": "2026-07-28",
    "renderings": {
        "26–28 July 2026",  # en dash, the site and the prose
        "26-28 July 2026",  # hyphen, LICENSE-DATA
        "26--28 July 2026",  # BibTeX, README
        "July 2026",
        "2026-07-26",
        "2026-07-27",
        "2026-07-28",
    },
}

# Third-party prose quoted verbatim: the numbers and the dates in there belong to
# somebody else. Generated files restate the counts by definition.
SKIP = {
    "data/design-systems.json",
    "data/platforms.json",
    "package-lock.json",
    "deno.lock",
    "netlify/edge-functions/lib/md-routes.ts",
    "types/data.d.ts",
}
SKIP_PREFIXES = ("build/", "node_modules/", "dashboard/og-image.png", "dashboard/favicon.svg")

WORDS = {
    w: n + 1
    for n, w in enumerate(
        "one two three four five six seven eight nine ten eleven twelve thirteen fourteen "
        "fifteen sixteen seventeen eighteen nineteen twenty".split()
    )
}

# Longest first: "technique categories" must win over "categories", and
# "ai-native systems" over "systems".
KEYWORDS = [
    ("design systems", "systems"),
    ("ai-native systems", "ai_native"),
    ("ai native systems", "ai_native"),
    ("technique categories", "technique_categories"),
    ("categories of technique", "technique_categories"),
    ("official mcp servers", "official_mcp"),
    ("official mcp server", "official_mcp"),
    ("mcp servers", "official_mcp"),
    ("agent skills", "official_skills"),
    ("claude skills", "official_skills"),
    ("skills", "official_skills"),
    ("llms.txt", "llms_txt"),
    ("systems", "systems"),
    ("platforms", "platforms"),
    ("affordances", "affordances"),
    ("techniques", "techniques"),
]

# The number cannot be glued to a word ("h2 Affordances" is a heading level), and
# the words between it and the keyword are real words: two letters or more, no
# punctuation. That drops `sum(1 for s in systems)` and "26–28 July 2026. Design
# systems ship fast", which are the two shapes that flooded an earlier sweep.
NUM = r"(?<![\w-])(?P<num>\d{1,4}|" + "|".join(WORDS) + r")"
FILLER = r"(?P<mid>(?:[A-Za-z][\w-]+\s+){0,3}?)"
KW = "|".join(re.escape(k) for k, _ in KEYWORDS)
HIT = re.compile(NUM + r"\s+" + FILLER + r"(?P<kw>" + KW + r")\b", re.IGNORECASE)

MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"
DATE = re.compile(
    r"\b\d{4}-\d{2}-\d{2}\b"
    r"|\b\d{1,2}\s*(?:--|[–—-])\s*\d{1,2}\s+(?:" + MONTHS + r")\s+\d{4}\b"
    r"|\b\d{1,2}\s+(?:" + MONTHS + r")\s+\d{4}\b"
    r"|\b(?:" + MONTHS + r")\s+\d{4}\b",
    re.IGNORECASE,
)
# A date next to any of these words is claiming when the study was done.
SNAPSHOT_WORDS = re.compile(
    r"snapshot|gathered|field surve|field study|as they stood|data (?:is|was|from)|"
    r"survey of|report is|study is|derived",
    re.IGNORECASE,
)


def load_counts():
    spec = importlib.util.spec_from_file_location(
        "build_dashboard", ROOT / "scripts" / "build_dashboard.py"
    )
    assert spec and spec.loader, "cannot load scripts/build_dashboard.py"
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    systems = json.loads((ROOT / "data" / "design-systems.json").read_text(encoding="utf-8"))
    platforms = json.loads((ROOT / "data" / "platforms.json").read_text(encoding="utf-8"))
    return module.compute_counts(systems, platforms), module.compute_counts


def absence_faults(compute_counts):
    """Can the build express an affordance that documents something's absence?

    patternfly's llms.txt affordance records that both files 404. compute_counts
    counts any affordance of type llms-txt as a system that publishes one, so the
    report states a number that is one too high and no check sees it. The fix is
    a field the counter honours, not a sentence in a command file.
    """
    probe = [
        {
            "id": "probe",
            "ai_maturity": "none",
            "affordances": [
                {"type": "llms-txt", "name": "absent", "official": True, "present": False},
                {"type": "mcp-server", "name": "absent", "official": True, "present": False},
                {"type": "claude-skill", "name": "absent", "official": True, "present": False},
            ],
            "techniques": [],
        }
    ]
    counts = compute_counts(probe, [])
    bad = [k for k in ("llms_txt", "official_mcp", "official_skills") if counts[k] != 0]
    if not bad:
        return []
    return [
        'compute_counts() counts an affordance marked "present": false as present '
        f"({', '.join(bad)}). Until it does not, every count of what systems publish is "
        "one too high for each documented absence, and the prose cannot say the true thing "
        "without typing a number by hand.\n"
        "    Fix, in scripts/build_dashboard.py: change\n"
        "        def systems_with(pred):\n"
        '            return sum(1 for s in systems if any(pred(a) for a in s.get("affordances", [])))\n'
        "    to\n"
        "        def systems_with(pred):\n"
        "            return sum(\n"
        "                1\n"
        "                for s in systems\n"
        '                if any(pred(a) for a in s.get("affordances", []) if a.get("present", True))\n'
        "            )\n"
        "    then document `present` in schema/design-system.schema.json, run `npm run types`,\n"
        '    and set "present": false on the affordances that record a 404.'
    ]


def fingerprint():
    """What the counts were derived from. Revise a record and this moves."""
    h = hashlib.sha256()
    for name in ("design-systems.json", "platforms.json", "insights.json"):
        h.update((ROOT / "data" / name).read_bytes())
    return h.hexdigest()[:16]


def tracked_files():
    out = subprocess.run(
        ["git", "-C", str(ROOT), "ls-files"], capture_output=True, text=True, check=True
    ).stdout.splitlines()
    for rel in out:
        if rel in SKIP or rel.startswith(SKIP_PREFIXES):
            continue
        yield rel


def line_index(text):
    """Offsets of every line start, for turning a match position into a line number."""
    starts, at = [0], text.find("\n")
    while at >= 0:
        starts.append(at + 1)
        at = text.find("\n", at + 1)
    return starts


def value_of(token):
    token = token.lower()
    return WORDS.get(token, int(token) if token.isdigit() else None)


def sweep_counts(counts, files):
    """Every number sitting next to a word one of the nine counts owns."""
    keyword_key = dict(KEYWORDS)
    known_values = set(counts.values())
    hits = []
    for rel in files:
        path = ROOT / rel
        if not path.is_file():
            continue
        text = path.read_bytes().decode("utf-8", errors="replace")
        starts = line_index(text)
        # Newlines become spaces so a count wrapped across two lines still reads
        # as one phrase, and every offset still maps back to its real line.
        flat = text.replace("\n", " ")
        for m in HIT.finditer(flat):
            value = value_of(m.group("num"))
            key = keyword_key[m.group("kw").lower()]
            if value is None:
                continue
            lineno = bisect.bisect_right(starts, m.start())
            line = text.split("\n")[lineno - 1]
            if "counts-ok" in line:
                continue
            window = flat[max(0, m.start() - 160) : m.end() + 160]
            keys_near = {keyword_key[w.group("kw").lower()] for w in HIT.finditer(window)}
            expected = counts[key]
            # A number that equals some other computed count is prose about a
            # subset ("Seventeen systems ship an MCP server"), not a stale total.
            stale = value != expected and value not in known_values
            near = abs(value - expected) <= max(3, expected * 0.25)
            hits.append(
                {
                    "file": rel,
                    "line": lineno,
                    "text": m.group(0),
                    "value": value,
                    "key": key,
                    "expected": expected,
                    "stale": stale,
                    "claim": stale
                    and near
                    and (len(keys_near) > 1 or m.group("kw").lower() == "design systems"),
                    "context": line.strip()[:160],
                }
            )
    return hits


def sweep_dates(files):
    """Every date-shaped string, split into snapshot claims and everything else."""
    hits = []
    for rel in files:
        path = ROOT / rel
        if not path.is_file():
            continue
        text = path.read_bytes().decode("utf-8", errors="replace")
        starts = line_index(text)
        flat = text.replace("\n", " ")
        for m in DATE.finditer(flat):
            raw = re.sub(r"\s+", " ", m.group(0))
            lineno = bisect.bisect_right(starts, m.start())
            line = text.split("\n")[lineno - 1]
            if "counts-ok" in line:
                continue
            window = flat[max(0, m.start() - 120) : m.end() + 120]
            claim = bool(SNAPSHOT_WORDS.search(window))
            hits.append(
                {
                    "file": rel,
                    "line": lineno,
                    "text": raw,
                    "claim": claim,
                    "stale": claim and raw not in SNAPSHOT["renderings"],
                    "context": line.strip()[:160],
                }
            )
    return hits


def show(rows, label):
    if not rows:
        return
    print(f"\n{label}")
    for row in rows:
        flag = "STALE" if row.get("stale") else "  ok "
        detail = f" (computed {row['key']}={row['expected']})" if "key" in row else ""
        print(f"{flag}  {row['file']}:{row['line']}  {row['text']!r}{detail}")
        print(f"         {row['context']}")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--all", action="store_true", help="print correct hits too")
    ap.add_argument("--skip", action="append", default=[], help="path to leave out, repeatable")
    ap.add_argument("--json", dest="json_out", help="write the full report here")
    ap.add_argument("--stamp", help="record the counts and a data fingerprint here")
    ap.add_argument("--verify-stamp", help="fail if the data moved since that stamp")
    args = ap.parse_args()

    counts, compute_counts = load_counts()
    print("computed: " + json.dumps(counts))
    print(f"snapshot window: {SNAPSHOT['start']} to {SNAPSHOT['end']}")

    faults = absence_faults(compute_counts)
    for fault in faults:
        print(f"\nFAIL: {fault}")

    if args.verify_stamp:
        stamp = json.loads(Path(args.verify_stamp).read_text(encoding="utf-8"))
        if stamp["fingerprint"] == fingerprint() and stamp["counts"] == counts:
            print(f"stamp {args.verify_stamp} is current ({fingerprint()})")
        else:
            print(
                f"STALE STAMP: {args.verify_stamp} was taken at {stamp['fingerprint']}, "
                f"data is now {fingerprint()}"
            )
            for key, was in stamp["counts"].items():
                if was != counts.get(key):
                    print(f"  {key}: {was} -> {counts.get(key)}")
            print("\nThe records changed after the last resync. Rebuild, redo the resync against")
            print("the new numbers, then stamp again.")
            return 1

    files = [rel for rel in tracked_files() if rel not in args.skip]
    hits = sweep_counts(counts, files)
    dates = sweep_dates(files)

    stale_claims = [h for h in hits if h["claim"]]
    stale_other = [h for h in hits if h["stale"] and not h["claim"]]
    stale_dates = [d for d in dates if d["stale"]]
    other_dates = [d for d in dates if not d["claim"]]

    show(stale_claims, "counts that state the size of the study and disagree with the records:")
    show(stale_other, "other numbers next to those words — read each one, most are local:")
    show(stale_dates, "snapshot dates that disagree with the window above:")
    if args.all:
        show([h for h in hits if not h["stale"]], "counts that already agree:")
        show(other_dates, "other dates — they describe somebody else, read before touching:")

    print(
        f"\n{len(hits)} hand-typed count(s) · {len(stale_claims)} stale claim(s) · "
        f"{len(stale_other)} to read by eye · {len(dates)} date(s) · {len(stale_dates)} stale"
    )
    if args.json_out:
        Path(args.json_out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.json_out).write_text(
            json.dumps({"counts": counts, "hits": hits, "dates": dates}, indent=2), encoding="utf-8"
        )
        print(f"wrote {args.json_out}")

    if stale_claims or stale_dates or faults:
        print("\nEach one was typed by hand and has to be retyped by hand. Prose in")
        print("data/insights.json should use a {placeholder} instead. A number that is")
        print("deliberately local or historical takes a `counts-ok` marker on its line.")
        return 1
    if args.stamp:
        Path(args.stamp).parent.mkdir(parents=True, exist_ok=True)
        Path(args.stamp).write_text(
            json.dumps({"fingerprint": fingerprint(), "counts": counts}, indent=2), encoding="utf-8"
        )
        print(f"stamped {args.stamp} at fingerprint {fingerprint()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
