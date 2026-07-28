#!/usr/bin/env python3
"""Propose the repair for every snippet check_snippets.py fails.

The checker answers "is this a quotation?". This answers "what would make it
one?", and for two defect classes it can answer without a person in the loop.

It does not read the checker's report. The report is deliberately abbreviated -
three dropped lines per snippet, one non-gap defect per segment - which is right
for something a person reads and wrong for a work list, because a repair driven
off a truncated list leaves defects behind and then reports success. So this
imports check_snippets and drives its own placement functions with the limits
lifted. There is one implementation of "where does this line sit on the page",
and it lives in the checker.

What auto-applies is deliberately narrow:

  gap       Insert `...` on its own line at the cut. Always safe: the marker
            makes no claim about what it hides, so its size does not matter.
  respaced  Substitute the page's exact line, but only where exactly one page
            line matches after squashing, that line sits inside the span this
            segment occupies, and it came from the raw served bytes. A derived
            view can hold text that appears nowhere on the page, and a
            round-trip through the checker cannot tell the difference.

Everything else is a proposal a person lands. `truncated` needs someone to know
whether the dropped tail mattered, `out-of-order` needs to know whether the
order carried meaning, and `missing` needs to know whether the page moved or the
quote was always wrong - which is a data correction, not a quotation fix.

    python3 scripts/repair_snippets.py                   # report, changes nothing
    python3 scripts/repair_snippets.py --only astryx     # one record
    python3 scripts/repair_snippets.py --apply           # land the safe classes
    python3 scripts/repair_snippets.py --json out.json   # machine-readable

Exit status is 0 when nothing is left for a person to land.
"""

import argparse
import json
import sys
from difflib import SequenceMatcher
from pathlib import Path
from typing import NamedTuple

import check_snippets as cs

# Marking a cut is always safe. Substituting page text is safe only under the
# three conditions above; everything else needs a person.
AUTO = {"gap", "respaced"}


class Edit(NamedTuple):
    """One concrete change to a snippet's content, and whether it may land alone."""

    kind: str  # the defect class this repairs
    op: str  # "mark-cut" | "substitute" | "restore"
    at: int  # index into content.split("\n")
    text: str | None  # the line to insert or substitute in
    safe: bool  # may --apply land this without a person reading it
    why: str


class Note(NamedTuple):
    """A defect with no derivable edit, and the context for deciding one."""

    kind: str
    line: str  # the snippet line at fault
    why: str
    near: list[str]  # the page lines closest to it, best first


class Proposal(NamedTuple):
    status: str
    edits: list[Edit]
    notes: list[Note]
    after: str | None  # content with the safe edits applied, None if there are none
    round_trip: str | None  # the checker's verdict on `after`
    view: int  # which views() representation the verdict came from


def _span(page, seg, at):
    """The page region this segment occupies, as (lo, hi), or None with no anchor.

    Anchors are the segment's own lines that do appear on the page exactly. A
    substitution from outside them is text from a different part of the page
    wearing the same verdict, and that is the failure the round-trip check is
    structurally unable to catch.
    """
    hits = [(n, page.index(line)) for n, line in enumerate(seg) if line in page]
    if not hits:
        return None
    before = [i for n, i in hits if n < at]
    after = [i for n, i in hits if n > at]
    lo = max(before) if before else 0
    hi = min(after) if after else len(page) - 1
    return (lo, hi) if lo <= hi else None


def _nearest(page, line, count=3):
    """The page lines closest to `line` once whitespace stops mattering."""
    want = cs.squash(line)
    scored = [(SequenceMatcher(None, want, cs.squash(pl)).ratio(), pl) for pl in page if pl.strip()]
    scored.sort(key=lambda pair: -pair[0])
    return [pl.strip()[:120] for _, pl in scored[:count]]


def _substitution(page, seg, finding, view):
    """Whether the page's line may be pasted in unattended, and why not if not.

    Three conditions, each covering a different way an exact substitution can
    still be the wrong text. Only one squash-equal line, or the repair is a coin
    toss between two places on the page. Inside the span the segment occupies,
    or the text came from an unrelated section that happens to read the same.
    From the raw served bytes, because a derived view is reconstructed and can
    hold lines the page never served.

    The span test is skipped when the segment has no exactly-matching line to
    anchor against and the page offers exactly one candidate: with a single
    candidate there is no other section for the text to have come from, so the
    test has nothing left to decide.
    """
    squashed = cs.squash(seg[finding.at])
    hits = [i for i, pl in enumerate(page) if pl.strip() and cs.squash(pl) == squashed]
    if view != 0:
        return False, f"matches only in derived view {view}, not the bytes the page served"
    if len(hits) != 1:
        return False, f"{len(hits)} page lines match after squashing; which one is a judgement"
    span = _span(page, seg, finding.at)
    if span and not span[0] <= hits[0] <= span[1]:
        return (
            False,
            f"the only match is at page line {hits[0]}, outside this segment's span {span}",
        )
    return True, "one match, in span, from the raw body"


def repairs(content, page, findings, view):
    """Every edit and note the findings support, without applying any of them."""
    segs = cs.segments_indexed(content)
    edits: list[Edit] = []
    notes: list[Note] = []
    marked: set[int] = set()

    for f in findings:
        seg = segs[f.seg] if 0 <= f.seg < len(segs) else []
        text = [t for _, t in seg]
        line = seg[f.at][1] if 0 <= f.at < len(seg) else ""
        at = seg[f.at][0] if 0 <= f.at < len(seg) else -1

        if f.kind == "gap":
            # One marker per cut, however many page lines it hides. The marker
            # says something was removed; it does not say how much, so a second
            # one at the same point would say nothing the first does not.
            if at in marked:
                continue
            marked.add(at)
            pad = content.split("\n")[at][: len(line) - len(line.lstrip())]
            edits.append(Edit("gap", "mark-cut", at, pad + "...", True, f.why))

        elif f.kind == "respaced" and f.page_line is not None:
            safe, why = _substitution(page, text, f, view)
            edits.append(Edit("respaced", "substitute", at, f.page_line, safe, why))

        elif f.kind == "respaced":
            notes.append(
                Note(
                    "respaced",
                    line,
                    "runs across a line break on the page; split the quote to match the page",
                    _nearest(page, line),
                )
            )

        elif f.kind == "truncated":
            edits.append(
                Edit(
                    "truncated",
                    "restore",
                    at,
                    f.page_line,
                    False,
                    "restore the full line, or shorten to a whole line that still carries the "
                    "point the description depends on",
                )
            )

        elif f.kind == "out-of-order":
            notes.append(
                Note("out-of-order", line or " / ".join(text)[:200], f.why, _nearest(page, line))
            )

        else:
            notes.append(Note("missing", line, f.why, _nearest(page, line)))

    return edits, notes


# A substitution replaces the line at its index; a marker is inserted before it.
# At the same index the substitution has to happen first, or the marker is what
# gets overwritten.
ORDER = {"substitute": 1, "restore": 1, "mark-cut": 0}


def apply_edits(content, edits):
    """`content` with `edits` landed. Bottom-up, so earlier indices stay valid."""
    lines = content.split("\n")
    for edit in sorted(edits, key=lambda e: (e.at, ORDER[e.op]), reverse=True):
        assert edit.text is not None, edit
        if edit.op == "mark-cut":
            lines.insert(edit.at, edit.text)
        else:
            lines[edit.at] = edit.text
    return "\n".join(lines)


def propose(content, body, verdict=None):
    """The complete defect list for one snippet, and what to do about each.

    `verdict` pins the representation the checker judged against. Both the
    candidate URL and the view are chosen by a score whose tie-break is the
    number of findings, so recomputing them with the limits lifted can pick a
    different one - and then the repair lands against a page the report never
    named. The status may still come out worse than the report's, and that is
    the point: the early exit was hiding defects, not inventing them.
    """
    if verdict is None:
        status, findings, page, view = cs.best_view(content, body, cap=None)
    else:
        page, view = verdict.page, verdict.view
        status, findings = cs.check_view(page, cs.segments(content), cap=None)
    if status == "ok":
        return Proposal("ok", [], [], None, None, view)
    edits, notes = repairs(content, page, findings, view)
    safe = [e for e in edits if e.safe]
    after = apply_edits(content, safe) if safe else None
    trip = cs.check_snippet(after, body)[0] if after is not None else None
    return Proposal(status, edits, notes, after, trip, view)


def repair(content, body, verdict, limit=6):
    """Land the safe edits, then look again, until nothing safe is left.

    One pass is not a fixpoint. Restoring a line's indentation can uncover a cut
    that the respaced verdict was standing in front of: the segment could not
    place at all before, so the dropped page lines between its lines were never
    reachable. Returns the repaired content, the proposal describing what one
    pass found, the verdict left at the end, and how many passes it took.
    """
    first = propose(content, body, verdict)
    prop, passes = first, 0
    while prop.after is not None and passes < limit:
        content, passes = prop.after, passes + 1
        prop = propose(content, body)
    assert passes < limit, f"{passes} passes without settling"
    return content, first, prop.status, passes


# --------------------------------------------------------------------------
# Tests. The transformations came second on purpose: getting the cut marker
# wrong silently corrupts 57 snippets, and the round-trip below cannot catch a
# substitution that is exact but copied from the wrong part of the page.
# --------------------------------------------------------------------------


def _selftest():
    def edits_of(prop, kind=None):
        return [e for e in prop.edits if kind is None or e.kind == kind]

    # One interior drop yields one marker at the drop point, and nothing else.
    p = propose("A\nC", "A\nB\nC\n")
    assert p.status == "gap", p.status
    assert [(e.op, e.at, e.text) for e in p.edits] == [("mark-cut", 1, "...")], p.edits
    assert p.after == "A\n...\nC", repr(p.after)
    assert p.round_trip == "ok", p.round_trip

    # Two separate drops yield two markers, each at its own point.
    p = propose("A\nC\nE", "A\nB\nC\nD\nE\n")
    assert p.after == "A\n...\nC\n...\nE", repr(p.after)
    assert p.round_trip == "ok", p.round_trip

    # Page content before the first quoted line or after the last is not a cut.
    p = propose("A\nB", "X\nA\nB\nY\n")
    assert p.status == "ok", p.status
    assert p.edits == [] and p.after is None

    # A snippet that already marks the cut is left alone.
    p = propose("A\n...\nC", "A\nB\nC\n")
    assert p.status == "ok", p.status
    assert p.edits == []

    # More than three drops: a marker at every one, proving the cap is lifted.
    p = propose("A\nC\nE\nG\nI", "A\nB\nC\nD\nE\nF\nG\nH\nI\n")
    assert len(edits_of(p, "gap")) == 4, p.edits
    assert p.after == "A\n...\nC\n...\nE\n...\nG\n...\nI", repr(p.after)
    assert p.round_trip == "ok", p.round_trip
    # ... and that the checker's own run still stops at three.
    capped = cs.check_view(
        ["A", "B", "C", "D", "E", "F", "G", "H", "I"], [["A", "C", "E", "G", "I"]]
    )
    assert len(capped[1]) == 3, capped

    # Two defects in one segment are both reported, proving the early exit is gone.
    p = propose("  alpha\n  beta", "alpha\nbeta\n")
    assert len(edits_of(p, "respaced")) == 2, p.edits
    capped = cs.check_view(["alpha", "beta"], [["  alpha", "  beta"]])
    assert len(capped[1]) == 1, capped

    # A re-indented line with one squash-equal match inside the span, from the
    # raw body, is substituted - carrying the page's leading whitespace, which
    # is the part of the quotation that was lost.
    p = propose("def f():\n  return 1\nprint(f())", "def f():\n    return 1\nprint(f())\n")
    assert [(e.op, e.at, e.text, e.safe) for e in p.edits] == [
        ("substitute", 1, "    return 1", True)
    ], p.edits
    assert p.after == "def f():\n    return 1\nprint(f())", repr(p.after)
    assert p.round_trip == "ok", p.round_trip

    # Two squash-equal page lines: a proposal, not an applied edit.
    p = propose(
        "def f():\n  return 1\nprint(f())",
        "def f():\n    return 1\nprint(f())\n    return 1\n",
    )
    assert edits_of(p, "respaced"), p.edits
    assert not any(e.safe for e in p.edits), p.edits
    assert p.after is None

    # A segment with no exactly-matching line to anchor a span still applies
    # when the page offers exactly one candidate: there is no second section for
    # the text to have been taken from, so the span test has nothing to decide.
    p = propose("  alpha", "alpha\nbeta\n")
    assert [(e.op, e.text, e.safe) for e in p.edits] == [("substitute", "alpha", True)], p.edits
    assert p.after == "alpha" and p.round_trip == "ok", (p.after, p.round_trip)

    # Two candidates far apart is exactly the case that test exists for.
    p = propose("  alpha", "alpha\nbeta\nalpha\n")
    assert not any(e.safe for e in p.edits), p.edits

    # A match that only exists in a derived view: a proposal, not an applied edit.
    p = propose("def f():\n  return 1", "<div>def f():</div><div>    return 1</div>")
    assert p.view != 0, p.view
    assert not any(e.safe for e in p.edits), p.edits
    assert p.after is None

    # Restoring indentation uncovers a cut the respaced verdict was masking:
    # the segment could not place at all before, so the dropped line was out of
    # reach. One pass is not a fixpoint.
    body = "A\n    B\nC\nD\n"
    content, first, left, passes = repair("A\n  B\nD", body, None)
    assert first.status == "respaced" and passes == 2, (first.status, passes)
    assert content == "A\n    B\n...\nD", repr(content)
    assert left == "ok", left

    # A missing line yields context and no candidate edit.
    p = propose("alpha\nomega", "alpha\nbeta\ngamma\n")
    assert p.status == "missing", p.status
    assert edits_of(p, "missing") == [], p.edits
    assert [n.kind for n in p.notes] == ["missing"], p.notes
    assert p.notes[0].line == "omega" and p.notes[0].near, p.notes

    # truncated and out-of-order propose, but never apply.
    p = propose("the full sentence here", "the full sentence here, with a tail\n")
    assert p.status == "truncated", p.status
    assert [(e.op, e.text, e.safe) for e in p.edits] == [
        ("restore", "the full sentence here, with a tail", False)
    ], p.edits
    assert p.after is None

    p = propose("C\nA", "A\nB\nC\n")
    assert p.status == "out-of-order", p.status
    assert not any(e.safe for e in p.edits), p.edits
    assert [n.kind for n in p.notes] == ["out-of-order"], p.notes

    # Nothing outside the two sanctioned classes is ever landed unattended.
    for content, body in [
        ("the full sentence here", "the full sentence here, with a tail\n"),
        ("C\nA", "A\nB\nC\n"),
        ("alpha\nomega", "alpha\nbeta\ngamma\n"),
        ("def f():\n  return 1", "<div>def f():</div><div>    return 1</div>"),
    ]:
        for edit in propose(content, body).edits:
            assert not edit.safe or edit.kind in AUTO, edit


def report_line(row):
    print(f"{row['status'].upper():>13}  {row['system']} · {row['kind']} · {row['item']}")
    print(f"               {row.get('fetched') or row.get('source_url')}")
    if row.get("note"):
        print(f"               {row['note']}")
    for edit in row.get("edits", []):
        verb = "apply" if edit["safe"] else "hold "
        print(f"               {verb} {edit['op']:11s} line {edit['at']:>3}  {edit['why']}")
        if edit["op"] != "mark-cut":
            print(f"                     page: {(edit['text'] or '')[:110]}")
    for note in row.get("notes", []):
        print(f"               hold  {note['kind']:11s} {note['why'][:110]}")
        for near in note["near"]:
            print(f"                     near: {near}")


def run(systems, args):
    rows = list(cs.collect_snippets(systems, set(args.only)))
    wanted = set()
    for *_, snippet in rows:
        if snippet.get("source_url"):
            wanted |= set(cs.fetch_urls(snippet["source_url"]))
    bodies = cs.prefetch(wanted, args)

    report, landed, counts = [], 0, dict.fromkeys(["clean", "applied", "partial", "held"], 0)
    for sid, kind, name, snippet in rows:
        url = snippet.get("source_url")
        row = {"system": sid, "kind": kind, "item": name, "source_url": url}
        if not url:
            row["status"] = "no-source-url"
            counts["held"] += 1
            report.append(row)
            continue
        # cap=3 so the candidate URL is the one the checker's own report names.
        verdict, note = cs.best_source(snippet["content"], url, bodies)
        if verdict is None:
            row["status"] = "unfetchable" if note != "not cached" else "not cached"
            row["note"] = note
            counts["held"] += 1
            report.append(row)
            continue
        body = bodies[verdict.url][0]
        after, prop, left, passes = repair(snippet["content"], body, verdict)
        if prop.status == "ok":
            counts["clean"] += 1
            continue
        row.update(
            status=prop.status,
            reported=verdict.status,
            fetched=verdict.url,
            view=prop.view,
            edits=[e._asdict() for e in prop.edits],
            notes=[n._asdict() for n in prop.notes],
            round_trip=left,
            passes=passes,
        )
        counts["clean" if left == "ok" else "partial" if passes else "held"] += 1

        if args.apply and passes:
            # A repair may not make a snippet worse. It routinely leaves one
            # failing - marking a cut does nothing about a truncated line in the
            # same snippet - and that is the next unit's work, not a fault here.
            if cs.RANK.index(left) > cs.RANK.index(prop.status):
                row["refused"] = f"{prop.status} would become {left}"
            else:
                snippet["content"] = after
                landed += 1
        report.append(row)

    for row in report:
        report_line(row)

    fixed = sum(1 for r in report if r.get("round_trip") == "ok")
    print(
        f"\nproposals: {len(rows)} snippets · {counts['clean'] - fixed} already verbatim · "
        f"{fixed} repaired outright · {counts['partial']} repaired but still failing · "
        f"{counts['held']} need a person"
    )
    moved = sum(1 for r in report if r.get("reported") and r["reported"] != r["status"])
    if moved:
        print(
            f"{moved} snippets are worse than the checker's report says: its early exit stops at "
            "the first\ndefect in a segment, so the report is not the work list."
        )
    if args.apply:
        print(f"applied to {landed} snippets")
    return report, 0 if counts["partial"] + counts["held"] == 0 else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", action="append", default=[], help="record id, repeatable")
    ap.add_argument("--apply", action="store_true", help="land the auto-applicable classes")
    ap.add_argument("--offline", action="store_true", help="use the cache, never fetch")
    ap.add_argument("--refresh", action="store_true", help="ignore the cache")
    ap.add_argument("--timeout", type=float, default=25.0)
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--json", dest="json_out", help="write the full report here")
    args = ap.parse_args()
    _selftest()

    text = cs.DATA.read_text(encoding="utf-8")
    systems = json.loads(text)
    known = {s["id"] for s in systems}
    for wanted in args.only:
        if wanted not in known:
            print(f"no record with id {wanted!r}", file=sys.stderr)
            return 2

    report, code = run(systems, args)
    if args.apply:
        # This exact serializer round-trips the committed file byte for byte, so
        # the diff is the repair and nothing else. Any other one reformats all
        # 4,900 lines and destroys per-record review.
        out = json.dumps(systems, indent=2, ensure_ascii=False) + "\n"
        assert text.endswith("\n") and json.loads(out) == systems
        cs.DATA.write_text(out, encoding="utf-8")
    if args.json_out:
        Path(args.json_out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.json_out).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"wrote {args.json_out}")
    return code


if __name__ == "__main__":
    sys.exit(main())
