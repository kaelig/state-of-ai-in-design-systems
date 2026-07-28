#!/usr/bin/env python3
"""Prove every published snippet is a quotation, and every published URL loads.

Snippets in data/design-systems.json and data/platforms.json are published as
verbatim quotation, so every line of `snippet.content` has to appear, as a whole
line, in the page it claims to come from, in order, with nothing silently
dropped in between. A reader cannot tell which record set a snippet came from,
so both are held to it.

Two rules make this catch what a substring search cannot:

  1. Lines are compared whole. A snippet line has to equal a page line (trailing
     whitespace ignored, leading whitespace significant). A substring search
     scores a truncated URL, a dropped trailing parenthetical and a one-word
     line as verbatim, because each of those is a substring of a real line.
  2. Indentation is part of the quotation, and a run of quoted lines has to be
     contiguous on the page. Re-indented code and a dropped table header row are
     both defects, and both are invisible without this.

Nothing here is a warning. respaced, truncated, gap, out-of-order and missing
all fail. `--allow-respaced` exists for the one legitimate case, a page whose
whitespace the server rewrote, and has to be argued in writing rather than typed
to make a run go green.

`unreadable` is reported separately from `missing`, and the distinction is the
point. `missing` accuses the snippet; `unreadable` accuses the URL. A page that
renders client-side, sits behind a bot wall, or ships as a .zip returns no text
to a plain fetch, and calling every line of a perfectly good quotation absent
sends the next person to re-copy something that was never wrong. Response
headers and the text members of a zip are read too, because an affordance is
sometimes delivered in a Link header or inside an archive.

    python3 scripts/check_snippets.py                    # whole corpus, fetches
    python3 scripts/check_snippets.py --only astryx      # one record
    python3 scripts/check_snippets.py --refresh          # ignore the cache
    python3 scripts/check_snippets.py --offline          # cache only, never fetch
    python3 scripts/check_snippets.py --links            # every URL in the data, liveness
    python3 scripts/check_snippets.py --json report.json # machine-readable

Bodies are cached under build/snippet-cache/ (gitignored), written atomically,
one fetch per distinct URL. A re-run after an edit costs nothing. Exit status is
0 only when nothing failed.
"""

import argparse
import hashlib
import html
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import NamedTuple

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "design-systems.json"
PLATFORMS = ROOT / "data" / "platforms.json"
CACHE = ROOT / "build" / "snippet-cache"
UA = "state-of-ai-in-design-systems fidelity check (+https://github.com/kaelig/state-of-ai-in-design-systems)"

BLOB = re.compile(r"^https://github\.com/([^/]+)/([^/]+)/blob/(.+)$")
WIKI = re.compile(r"^https://github\.com/([^/]+)/([^/]+)/wiki/([^/?#]+)/?$")

# Worst last. A snippet takes the status of its worst line.
RANK = ["ok", "gap", "respaced", "truncated", "out-of-order", "missing"]

# Cached bodies carry the response headers ahead of the body, because a snippet
# may legitimately quote a header. Older cache files have no sentinel and are
# still readable as body-only.
HEADER_SENTINEL = "<<<response-headers\n"
HEADER_END = "\n>>>response-headers\n"

# A page that says this is a bot wall, not a document. Reporting its lines as
# "not on the page" is a lie about the quotation: nobody fetched the page.
CHALLENGE = re.compile(
    r"just a moment|enable javascript and cookies|checking your browser|"
    r"cf-browser-verification|attention required!|access denied|are you a robot",
    re.I,
)

# A marked cut tells the reader something was removed. Only these forms count.
ELISION = re.compile(r"^\s*(?:[#/<!*\-]*\s*)?(?:\[?\.\.\.\]?|…)\s*(?:\*/|-->|[-*/>])?\s*$")

# `--allow-respaced` has to be argued in writing rather than typed to make a run
# go green, so the argument lives here and the flag only covers what is named.
# Any other respaced snippet still fails with the flag on, which is the point:
# one page whose markup indents its content is a finding about that page, and a
# second one appearing silently would not be.
RESPACED_EXCEPTIONS = {
    ("supernova", "Supernova Relay — official remote MCP server (per design system)"): (
        "learn.supernova.io wraps its code blocks in markup indented about 150 spaces. "
        "Quoting the eight-line MCP config verbatim would be 1,362 characters, 1,200 of "
        "them leading whitespace that is in the page source and on nobody's screen. The "
        "snippet's own two-space JSON indentation is what the page displays."
    ),
}


class Finding(NamedTuple):
    """One defect, with enough position to repair it rather than only report it.

    The report prints `kind` and `why` and nothing else, which is all a reader
    needs. A repair needs to know where: which segment, which line inside it,
    and what the page actually says at that spot. Carrying those here is what
    lets scripts/repair_snippets.py reuse this walk instead of writing a second
    one that drifts from it.
    """

    kind: str
    why: str
    # The page's own text this verdict was reached against: the dropped line for
    # a gap, the matched line for respaced and truncated, None when nothing on
    # the page matched at all.
    page_line: str | None = None
    seg: int = -1  # index into segments(content)
    at: int = -1  # index into that segment; for a gap, the line the cut precedes


def fetch_urls(url):
    """Every URL that serves the same document, best first.

    A blob page and a wiki page are HTML wrappers around a file. Comparing a
    markdown table against the rendered HTML fails for reasons that have nothing
    to do with the quotation, so fetch the file the page displays as well.
    """
    bare = url.split("#")[0]
    out = [bare]
    m = BLOB.match(bare)
    if m:
        owner, repo, rest = m.groups()
        out.insert(0, f"https://raw.githubusercontent.com/{owner}/{repo}/{rest.split('?')[0]}")
    m = WIKI.match(bare)
    if m:
        owner, repo, page = m.groups()
        out.insert(0, f"https://raw.githubusercontent.com/wiki/{owner}/{repo}/{page}.md")
    return out


def cache_path(url):
    return CACHE / (hashlib.sha256(url.encode("utf-8")).hexdigest()[:32] + ".txt")


def unpack_archive(raw):
    """Text members of a zip, concatenated, or None if this is not a zip.

    A skill distributed as a .zip is still a published document; the file the
    snippet quotes is simply inside it. Reading the container's bytes as text
    and reporting every line as absent says the quotation is wrong when what is
    wrong is the reader.
    """
    if not raw.startswith(b"PK\x03\x04"):
        return None
    out = []
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            for info in zf.infolist():
                if info.is_dir() or "__MACOSX/" in info.filename:
                    continue
                try:
                    text = zf.read(info).decode("utf-8")
                except (UnicodeDecodeError, zipfile.BadZipFile):
                    continue
                out.append(f"\n===== {info.filename} =====\n{text}")
    except zipfile.BadZipFile:
        return None
    return "".join(out) if out else None


def fetch(url, timeout, offline, refresh):
    """Return (body, note).

    Cache writes are atomic. Two threads never share a URL, but a killed run
    must not leave a half-written body behind that reads as a page.
    """
    path = cache_path(url)
    if path.exists() and not refresh:
        return path.read_text(encoding="utf-8", errors="replace"), "cache"
    if offline:
        return None, "not cached"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
            raw = resp.read()
            headers = "".join(f"{k.lower()}: {v}\n" for k, v in resp.headers.items())
    except urllib.error.HTTPError as exc:
        return None, f"HTTP {exc.code}"
    except Exception as exc:  # noqa: BLE001 - any transport failure is a fetch failure
        return None, f"fetch failed: {type(exc).__name__}"
    body = unpack_archive(raw) or raw.decode("utf-8", errors="replace")
    body = HEADER_SENTINEL + headers.rstrip("\n") + HEADER_END + body
    CACHE.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(f".{os.getpid()}.part")
    tmp.write_text(body, encoding="utf-8")
    os.replace(tmp, path)
    return body, "network"


def split_cached(body):
    """Return (headers, body) for a cached response, headers possibly empty."""
    if not body.startswith(HEADER_SENTINEL):
        return "", body
    head, _, rest = body[len(HEADER_SENTINEL) :].partition(HEADER_END)
    return head, rest


def detag(body):
    """A line-preserving plain-text view of an HTML page."""
    body = re.sub(r"(?is)<(script|style)\b.*?</\1>", "\n", body)
    body = re.sub(r"(?i)<br\s*/?>", "\n", body)
    body = re.sub(r"(?i)</(p|div|li|tr|h[1-6]|pre|section|td|th|option)>", "\n", body)
    body = re.sub(r"(?s)<[^>]+>", "", body)
    return html.unescape(body)


def unescape_json(body):
    """GitHub and several docs sites embed file contents as escaped JSON strings."""
    out = body.replace("\\r\\n", "\n").replace("\\n", "\n")
    out = out.replace('\\"', '"').replace("\\/", "/").replace("\\t", "\t")
    return html.unescape(re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), out))


def views(body):
    """Every representation a verbatim line may legitimately live in."""
    headers, body = split_cached(body)
    out = [body]
    if headers:
        # An affordance can be delivered in the response headers rather than the
        # document - a Link header advertising .well-known endpoints, say. That
        # is quotable, and it is not in the body.
        out.append(headers)
    if "<" in body and ">" in body:
        out.append(detag(body))
    if "\\n" in body or '\\"' in body:
        out.append(unescape_json(body))
    return out


def unreadable(body):
    """Why this response is not a document, or None if it reads as one.

    Separating this from `missing` matters: one says the quotation is wrong, the
    other says nobody managed to read the page. They need opposite fixes.
    """
    _, body = split_cached(body)
    text = squash(detag(body)) if "<" in body else squash(body)
    if CHALLENGE.search(text[:2000]):
        return "the response is a bot challenge, not the page"
    if len(text) < 200:
        return f"the response carries {len(text)} characters of text; nothing to match against"
    return None


def squash(text):
    return re.sub(r"\s+", " ", text).strip()


def segments_indexed(content):
    """segments(), with each quoted line's index in content.split("\n").

    The check only needs the text. A repair edits the content, so it needs the
    line numbers the segments were built from; deriving them a second time is
    how a repair ends up marking a cut in the wrong place.
    """
    segs: list[list[tuple[int, str]]] = [[]]
    for i, raw in enumerate(content.split("\n")):
        line = raw.rstrip()
        if ELISION.match(line):
            segs.append([])
        elif line.strip():
            segs[-1].append((i, line))
    return [s for s in segs if s]


def segments(content):
    """Snippet content split at elision markers, blank lines dropped."""
    return [[line for _, line in seg] for seg in segments_indexed(content)]


def place(page, seg, start):
    """First contiguous placement of seg in page at or after start.

    Blank page lines may be skipped: they are not dropped content. Any non-blank
    page line between two quoted lines is an unmarked cut and disqualifies the
    placement.
    """
    first = seg[0]
    for i in range(start, len(page)):
        if page[i] != first:
            continue
        j, k = i + 1, 1
        while j < len(page) and k < len(seg):
            if page[j] == seg[k]:
                j += 1
                k += 1
            elif not page[j]:
                j += 1
            else:
                break
        if k == len(seg):
            return i, j
    return None


def place_with_gaps(page, seg, start):
    """In-order placement that tolerates dropped page lines, and names them.

    Each drop carries the index in `seg` of the quoted line it sits before,
    which is exactly where a marker has to go for the cut to be marked. A drop
    is always interior: `n` is falsy for the first quoted line, so nothing is
    ever reported before it, and the walk stops at the last one.
    """
    cursor, drops = start, []
    for n, line in enumerate(seg):
        try:
            at = page.index(line, cursor)
        except ValueError:
            return None
        if n and at > cursor:
            drops += [(n, ln) for ln in page[cursor:at] if ln.strip()]
        cursor = at + 1
    return cursor, drops


def diagnose(page, line, cursor):
    """Why one line did not land where the snippet puts it.

    Returns (kind, why, page_line). `page_line` is the page's own text the
    verdict was reached against, so a repair can substitute it rather than
    re-deriving it from a message that has already been truncated for display.
    It is None when no single page line matched.
    """
    if line in page:
        return (
            "out-of-order",
            f"quoted out of the order the page has it: {line.strip()[:100]}",
            line,
        )
    squashed = squash(line)
    for page_line in page:
        if page_line and squash(page_line) == squashed:
            return (
                "respaced",
                f"matches only after respacing, so it was re-indented or reflowed: {line.strip()[:90]}",
                page_line,
            )
    for page_line in page[cursor:] + page[:cursor]:
        flat = squash(page_line)
        if squashed and squashed in flat and flat != squashed:
            return (
                "truncated",
                (
                    "is part of a longer line, and the rest was dropped without a marker.\n"
                    f"              page has:    {page_line.strip()[:100]}\n"
                    f"              snippet has: {line.strip()[:100]}"
                ),
                page_line,
            )
    if squashed and squashed in squash("\n".join(page)):
        return (
            "respaced",
            f"appears only across a line break on the page, so the quote was re-wrapped: {line.strip()[:90]}",
            None,
        )
    return "missing", f"is not on the page at all: {line.strip()[:100]}", None


def check_view(page, segs, cap=3):
    """Status and findings for one representation of the page.

    `cap` bounds two separate kinds of under-reporting at once: how many
    dropped page lines a gap segment names, and whether a segment stops at its
    first non-gap defect. Both are right for a report a person reads and wrong
    for a work list, because a repair driven off a truncated list leaves
    defects behind and then reports success. Pass None to lift both.

    It is one switch rather than two on purpose. The number of findings is the
    tie-break in best_view(), so lifting a limit for the checker's own run
    would change which representation of a page wins.
    """
    findings: list[Finding] = []
    status = "ok"
    cursor = 0
    for s, seg in enumerate(segs):
        hit = place(page, seg, cursor)
        if hit:
            cursor = hit[1]
            continue
        loose = place_with_gaps(page, seg, cursor)
        if loose and loose[1]:
            cursor, drops = loose
            status = max(status, "gap", key=RANK.index)
            for at, line in drops if cap is None else drops[:cap]:
                findings.append(
                    Finding(
                        "gap",
                        f"the page has a line here that the snippet drops: {line.strip()[:100]}",
                        line,
                        s,
                        at,
                    )
                )
            continue
        faulted = False
        for n, line in enumerate(seg):
            if line in page[cursor:]:
                continue
            kind, why, hit_line = diagnose(page, line, cursor)
            status = max(status, kind, key=RANK.index)
            findings.append(Finding(kind, why, hit_line, s, n))
            faulted = True
            if cap is not None:
                break
        if not faulted:
            status = max(status, "out-of-order", key=RANK.index)
            findings.append(
                Finding(
                    "out-of-order",
                    "the quoted run does not appear in this order on the page",
                    None,
                    s,
                )
            )
    return status, findings


def best_view(content, body, cap=3):
    """The representation of the page that scores best, and its verdict.

    Returns (status, findings, page, view). `view` indexes views(), where 0 is
    always the raw served bytes. A repair may only substitute page text from
    that one: a derived view can hold text that appears nowhere on the page, and
    a round-trip through the checker cannot tell the difference.
    """
    segs = segments(content)
    if not segs:
        empty = [Finding("missing", "snippet is empty or is nothing but elision markers")]
        return "missing", empty, [], -1
    best: tuple[tuple[int, int], str, list[Finding], list[str], int] | None = None
    for v, view in enumerate(views(body)):
        page = [ln.rstrip() for ln in view.split("\n")]
        status, findings = check_view(page, segs, cap)
        score = (RANK.index(status), len(findings))
        if best is None or score < best[0]:
            best = (score, status, findings, page, v)
        if status == "ok":
            break
    assert best is not None
    return best[1], best[2], best[3], best[4]


def check_snippet(content, body):
    """Best status across every representation of the page."""
    status, findings, _, _ = best_view(content, body)
    return status, findings


class Verdict(NamedTuple):
    status: str
    findings: list[Finding]
    page: list[str]
    view: int
    url: str  # the candidate that read best, which is not always the cited one


def best_source(content, source_url, bodies, cap=3):
    """The candidate URL that reads best for this snippet, and its verdict.

    A blob page and the raw file behind it are the same document, so the one
    that reads best is the one to judge against. Returns (Verdict, note), with
    Verdict None when no candidate produced a body at all; `note` then carries
    why the last attempt failed.
    """
    best: tuple[tuple[int, int], Verdict] | None = None
    note = "not cached"
    for candidate in fetch_urls(source_url):
        body, note = bodies.get(candidate, (None, "not fetched"))
        if body is None:
            continue
        status, findings, page, view = best_view(content, body, cap)
        score = (RANK.index(status), len(findings))
        if best is None or score < best[0]:
            best = (score, Verdict(status, findings, page, view, candidate))
        if status == "ok":
            break
    return (best[1] if best else None), note


def collect_snippets(systems, platforms, only):
    """Every published snippet, from both record sets.

    A platform capability publishes a snippet in exactly the shape a system
    affordance does; it is named `title` rather than `name`, and that is the
    whole difference. Leaving the platforms out kept a tenth of the report's
    quotations unchecked while the rest of it read as uniformly verified.
    """
    for system in systems:
        if only and system.get("id") not in only:
            continue
        for kind in ("affordances", "techniques"):
            for item in system.get(kind, []):
                snippet = item.get("snippet") or {}
                if snippet.get("content"):
                    yield system["id"], kind[:-1], item.get("name", "?"), snippet
    for platform in platforms:
        if only and platform.get("id") not in only:
            continue
        for item in platform.get("capabilities", []):
            snippet = item.get("snippet") or {}
            if snippet.get("content"):
                yield platform["id"], "capability", item.get("title", "?"), snippet


def collect_links(systems, only):
    """Every URL the report publishes, not only the ones snippets quote."""
    for system in systems:
        if only and system.get("id") not in only:
            continue
        sid = system["id"]
        for key in ("repo_url", "docs_url"):
            if system.get(key):
                yield sid, "record", key, system[key]
        for n, url in enumerate(system.get("sources", [])):
            yield sid, "source", f"sources[{n}]", url
        for kind in ("affordances", "techniques"):
            for item in system.get(kind, []):
                snippet = item.get("snippet") or {}
                name = item.get("name", "?")
                for key in ("docs_url", "code_url"):
                    if item.get(key):
                        yield sid, kind[:-1], f"{name} · {key}", item[key]
                if snippet.get("source_url"):
                    yield sid, kind[:-1], f"{name} · snippet", snippet["source_url"]
        for item in system.get("platform_integrations", []):
            if item.get("url"):
                yield sid, "platform", item.get("platform", "?"), item["url"]


def prefetch(urls, args):
    """One fetch per distinct URL, in parallel, into the cache."""
    bodies = {}

    def one(url):
        return url, fetch(url, args.timeout, args.offline, args.refresh)

    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        for url, result in pool.map(one, sorted(urls)):
            bodies[url] = result
    return bodies


def run_links(systems, args):
    rows = list(collect_links(systems, set(args.only)))
    bodies = prefetch({url for *_, url in rows}, args)
    counts = {"ok": 0, "dead": 0, "skipped": 0}
    report = []
    for sid, kind, where, url in rows:
        body, note = bodies[url]
        status = "ok" if body is not None else ("skipped" if note == "not cached" else "dead")
        counts[status] += 1
        report.append(
            {
                "system": sid,
                "kind": kind,
                "where": where,
                "url": url,
                "status": status,
                "note": note,
            }
        )
        if status == "dead":
            print(f"        DEAD  {sid} · {where}\n              {url}\n              {note}")
    print(
        f"\nlinks: {len(rows)} checked · {counts['ok']} load · {counts['dead']} dead · "
        f"{counts['skipped']} not cached"
    )
    if counts["dead"]:
        print("\nA claim whose URL does not load is a claim the report cannot carry.")
        print("Repoint it at a permalink, or drop the claim.")
    return report, 1 if counts["dead"] else 0


def run_snippets(systems, platforms, args):
    rows = list(collect_snippets(systems, platforms, set(args.only)))
    wanted = set()
    for *_, snippet in rows:
        if snippet.get("source_url"):
            wanted |= set(fetch_urls(snippet["source_url"]))
    bodies = prefetch(wanted, args)

    counts = dict.fromkeys(["ok", "respaced", "failed", "unreadable", "unfetchable", "skipped"], 0)
    report = []
    for sid, kind, name, snippet in rows:
        url = snippet.get("source_url")
        row = {"system": sid, "kind": kind, "item": name, "source_url": url}
        if not url:
            row["status"] = "failed"
            row["findings"] = [["missing", "snippet has no source_url"]]
            counts["failed"] += 1
            report.append(row)
            continue
        verdict, note = best_source(snippet["content"], url, bodies)
        if verdict is None:
            row["status"] = "skipped" if note == "not cached" else "unfetchable"
            row["note"] = note
            counts[row["status"]] += 1
            report.append(row)
            continue
        status, findings = verdict.status, verdict.findings
        row["fetched"] = verdict.url
        # Position travels inside the run for the repair pass; the report keeps
        # the two fields a reader needs, so the JSON stays what it always was.
        row["findings"] = [[f.kind, f.why] for f in findings]
        why = unreadable(bodies[verdict.url][0]) if status == "missing" else None
        if why:
            # Everything is "missing" from a page nobody could read. Saying so as
            # a quotation defect sends the next person to re-copy a snippet that
            # was fine, and leaves the unreadable URL in place.
            row["status"] = "unreadable"
            row["note"] = why
            counts["unreadable"] += 1
        elif status == "ok":
            row["status"] = "ok"
            counts["ok"] += 1
        elif status == "respaced" and args.allow_respaced and (sid, name) in RESPACED_EXCEPTIONS:
            row["status"] = "respaced"
            row["note"] = RESPACED_EXCEPTIONS[(sid, name)]
            counts["respaced"] += 1
        else:
            row["status"] = "failed"
            counts["failed"] += 1
        report.append(row)

    for row in report:
        if row["status"] == "ok":
            continue
        print(f"{row['status'].upper():>12}  {row['system']} · {row['kind']} · {row['item']}")
        print(f"              {row.get('source_url')}")
        if row.get("note"):
            print(f"              {row['note']}")
        for kind, why in row.get("findings", [])[:4]:
            print(f"              {kind}: {why}")

    total = sum(counts.values())
    print(
        f"\nsnippets: {total} checked · {counts['ok']} verbatim · {counts['failed']} failed · "
        f"{counts['respaced']} respaced (allowed) · {counts['unreadable']} unreadable · "
        f"{counts['unfetchable']} unfetchable · {counts['skipped']} not cached"
    )
    if counts["failed"]:
        print("\nA snippet that does not appear verbatim, whole-line and contiguous on its source")
        print("page is not a quotation. Re-copy it from the page, mark the cut with ... on its own")
        print("line, or point source_url at the document the text actually came from.")
    if counts["unreadable"]:
        print("\nAn unreadable source_url is a broken citation, not a broken quotation. The page")
        print("returned no document to this fetcher: it may render client-side, sit behind a bot")
        print("wall, or be an archive. Open it in a browser, then point source_url at something")
        print("that serves the text - a .md twin, a raw file, a registry endpoint.")
    bad = counts["failed"] + counts["unreadable"] + counts["unfetchable"]
    return report, 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", action="append", default=[], help="record id, repeatable")
    ap.add_argument("--links", action="store_true", help="check URL liveness instead of snippets")
    ap.add_argument("--offline", action="store_true", help="use the cache, never fetch")
    ap.add_argument("--refresh", action="store_true", help="ignore the cache")
    ap.add_argument(
        "--allow-respaced",
        action="store_true",
        help="downgrade the whitespace-only mismatches argued in RESPACED_EXCEPTIONS",
    )
    ap.add_argument("--timeout", type=float, default=25.0)
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--json", dest="json_out", help="write the full report here")
    args = ap.parse_args()

    systems = json.loads(DATA.read_text(encoding="utf-8"))
    platforms = json.loads(PLATFORMS.read_text(encoding="utf-8"))
    known = {s["id"] for s in systems} | {p["id"] for p in platforms}
    for wanted in args.only:
        if wanted not in known:
            print(f"no record with id {wanted!r}", file=sys.stderr)
            return 2

    report, code = (
        run_links(systems, args) if args.links else run_snippets(systems, platforms, args)
    )
    if args.json_out:
        Path(args.json_out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.json_out).write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"wrote {args.json_out}")
    return code


if __name__ == "__main__":
    sys.exit(main())
