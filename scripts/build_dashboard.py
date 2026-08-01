#!/usr/bin/env python3
"""Assemble the dashboard: embed dataset + insights into the HTML template.

Emits two site variants (path-routed index.html for Netlify, hash-routed
artifact.html for the artifact wrapper), the external data payload the site
variant loads (data.js), sitemap.xml, robots.txt, and two build intermediates
consumed by scripts/prerender.mjs (build/payload.json, build/routes.json).
"""

import json
import os
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "dashboard"
BUILD = ROOT / "build"

ORIGIN = "https://state-of-ai-in-design-systems.netlify.app"
LASTMOD = "2026-07-28"

# Wrapper lines stripped from the artifact variant (matched as exact stripped lines).
WRAPPER_LINES = {
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    "</head>",
    "<body>",
    "</body>",
    "</html>",
}
HEAD_START = "<!-- netlify-head:start -->"
HEAD_END = "<!-- netlify-head:end -->"

DATA_SCRIPT = '<script id="ds-data" type="application/json">__DATA__</script>'
EXTERNAL_DATA_SCRIPT = '<script src="/data.js"></script>'

# One entry per top-level view: view name -> (path, title, description).
# Adding a view to the site means adding a line here and nothing else: the route
# table, the sitemap and the prerenderer all read this.
VIEW_TITLES = {
    "overview": (
        "/",
        "State of AI in Design Systems · July 2026",
        "A field study of how 20 open-source design systems and 6 platforms make themselves readable to AI agents.",
    ),
    "techniques": (
        "/techniques",
        "Coercion techniques · State of AI in Design Systems",
        "157 techniques design systems use to keep models on-system, grouped by category and quoted from the source files.",
    ),
    "platforms": (
        "/platforms",
        "Platforms · State of AI in Design Systems",
        "What Figma, Storybook, Supernova, Knapsack and zeroheight give teams who want their design system used by agents.",
    ),
    "insights": (
        "/insights",
        "Insights · State of AI in Design Systems",
        "What the data says: where the 20 systems converge, where they split, and what the leaders do that the rest don't.",
    ),
    "methodology": (
        "/methodology",
        "Methodology · State of AI in Design Systems",
        "How the systems were picked, what counted as an affordance or a technique, and where the numbers come from.",
    ),
    "reading": (
        "/reading",
        "Further reading · State of AI in Design Systems",
        "Writing, talks and courses on what happens when a design system meets an AI agent. The one page here that is kept current rather than fixed at the collection date.",
    ),
    "ai": (
        "/ai",
        "Use this report with AI tools · State of AI in Design Systems",
        "Read this report with an AI assistant: the markdown twins, a prompt to paste, the MCP server, the raw data, and the tools this page registers itself.",
    ),
}

# Copy blocks for the /ai view, compiled by scripts/build_md.py so the page and
# /ai.md render the same words. Written into the payload on the second pass of
# build.sh, once build_md.py has measured the markdown layer it describes.
AI_CONTENT = BUILD / "ai-page-content.json"
OG_IMAGE = BUILD / "og-image.json"


def sanitize(items):
    """Remove research-process fields from published records. A corrected_url
    replaces the link it corrects before being dropped.

    The fallback chain matters: a record with no snippet and no code_url still
    has a link the correction was aimed at, and dropping it silently would mean
    publishing the URL that was found to be wrong. scripts/sanitize_data.py
    walks the same chain and refuses to run if this one is shorter."""
    for it in items:
        cu = it.pop("corrected_url", None)
        if cu:
            if it.get("snippet"):
                it["snippet"]["source_url"] = cu
            elif it.get("code_url"):
                it["code_url"] = cu
            elif it.get("docs_url"):
                it["docs_url"] = cu
            elif it.get("url"):
                it["url"] = cu
        it.pop("verified", None)
        it.pop("verify_note", None)


URL_FIELDS = ("source_url", "docs_url", "code_url", "repo_url")


def _url_faults(url):
    """Why this string cannot be shipped as a link. Empty list = clean.

    A parenthetical annotation glued onto a URL ("… (tarball: path/to/file)")
    is the failure this gate exists for: the link 404s while looking fine.
    Balanced parentheses inside a path segment are legal and in use
    (Next.js route groups), so they only fail when the URL also has whitespace
    or the parens are unbalanced."""
    faults = []
    if not isinstance(url, str) or not url:
        return ["empty"]
    if re.search(r"\s", url):
        faults.append("whitespace")
    if url[-1] in ")],":
        faults.append("trailing punctuation")
    if url.count("http") > 1:
        faults.append("more than one http")
    opens, closes = url.count("("), url.count(")")
    if opens or closes:
        if opens != closes or re.search(r"\(\S*\s", url):
            faults.append("parenthetical inside the URL")
    return faults


def validate_urls(systems, platforms):
    """Fail the build on any link the site would render dead. Runs before the
    payload is written, so every downstream artifact inherits clean URLs."""
    offenders = []

    def check(where, url):
        faults = _url_faults(url)
        if faults:
            offenders.append((where, url, ", ".join(faults)))

    def walk(where, obj):
        for key in URL_FIELDS:
            if obj.get(key):
                check(f"{where}.{key}", obj[key])
        snippet = obj.get("snippet") or {}
        if snippet.get("source_url"):
            check(f"{where}.snippet.source_url", snippet["source_url"])

    n = 0
    for s in systems:
        walk(s["id"], s)
        for i, u in enumerate(s.get("sources") or []):
            check(f"{s['id']}.sources[{i}]", u)
            n += 1
        for coll in ("affordances", "techniques"):
            for i, item in enumerate(s.get(coll) or []):
                walk(f"{s['id']}.{coll}[{i}]", item)
                n += 1
    for p in platforms:
        walk(p["id"], p)
        for i, c in enumerate(p.get("capabilities") or []):
            walk(f"{p['id']}.capabilities[{i}]", c)
            if c.get("url"):
                check(f"{p['id']}.capabilities[{i}].url", c["url"])
            n += 1

    if offenders:
        print("malformed URLs — the site would render these as dead links:", file=sys.stderr)
        for where, url, why in offenders:
            print(f"  {where}: {why}\n    {url}", file=sys.stderr)
        raise SystemExit(1)
    return n


# --------------------------------------------------------------------- logos
#
# Two sources, one contract. `simple-icons` covers three of the six platforms;
# assets/logos/ holds the three it does not, normalized by hand to the shape its
# files already have. The contract is checked on both, not just the hand-made
# three: a Simple Icons file satisfies it by construction today, and the day the
# package changes its output shape is a day this should say so rather than ship
# a mark that renders as nothing.
ICONS = ROOT / "node_modules" / "simple-icons" / "icons"
LOGOS = ROOT / "assets" / "logos"

_VIEWBOX = re.compile(r"""\bviewBox\s*=\s*["']([^"']*)["']""")
_PATH_D = re.compile(r'<path\b[^>]*\bd="([^"]*)"')
# One opening tag: its name, then its attributes, with quoted values allowed to
# contain the `>` that would otherwise end the tag.
_TAG = re.compile(r"""<([a-zA-Z]+)((?:[^>"']|"[^"]*"|'[^']*')*)>""")
_ATTR = re.compile(r"([a-zA-Z:-]+)\s*=")

# What a mark may be made of. This is an allowlist rather than a list of banned
# colors because of what the resolver keeps: each <path>'s `d` and nothing else.
# Every other attribute is discarded on the way out, so checking only for a
# hardcoded fill would police the attributes that get dropped anyway while
# waving through the ones the extraction silently depends on — a `transform`
# that draws the mark off-canvas, a `fill-rule` whose holes fill in without it,
# a `stroke` that renders as a silhouette once this renderer fills it. A
# <clipPath> is worse than either: never painted in the source, hoisted into the
# output as ink. Reject all of it, so the file that ships is the file that was
# drawn.
_ALLOWED = {"svg": {"viewBox", "xmlns", "role"}, "path": {"d"}, "title": set()}


def _logo_faults(svg):
    """Why this file cannot ship as a monochrome mark, and the geometry if it can.

    Everything here is a question JSON Schema cannot ask. ajv has already proved
    the `logo` field exists and names one of two sources; whether the thing it
    names is a 24-unit box drawn without a color is a question about a file."""
    faults = []
    box = _VIEWBOX.search(svg)
    if not box:
        faults.append("no viewBox")
    elif box.group(1).split() != ["0", "0", "24", "24"]:
        faults.append(f'viewBox is "{box.group(1)}", not "0 0 24 24"')

    for tag, attrs in _TAG.findall(svg):
        if tag not in _ALLOWED:
            faults.append(f"<{tag}> is geometry the build cannot carry; flatten it into a <path>")
            continue
        for attr in sorted(set(_ATTR.findall(attrs)) - _ALLOWED[tag]):
            faults.append(f"<{tag}> carries {attr}=, which is dropped when the geometry is taken")

    # An empty `d` is not geometry. It would otherwise satisfy the check below
    # and ship an <svg> that draws nothing, which reads as a mark that is merely
    # missing rather than one that is wrong.
    geometry = [d for d in _PATH_D.findall(svg) if d.strip()]
    if not geometry:
        faults.append("no <path> to draw")
    return faults, "".join(f'<path d="{d}"/>' for d in geometry)


def resolve_logos(platforms):
    """Every record's `logo` as path geometry, keyed by platform id, or stop.

    Kept out of the records on purpose: build_md.py serializes each one verbatim
    into /platforms/<id>.json and /data/platforms.json, so geometry written onto
    a record here would land on a published data surface as though it had been
    authored there. The map mirrors NAV_ICON_PATHS in the template instead."""
    faults, logos = [], {}
    # Checked once. A contributor who has not run `npm install` has one problem,
    # and three missing-file lines would read as a data problem rather than a
    # setup one. This is the first time the Python build reads node_modules.
    missing_pkg = not ICONS.is_dir()

    for p in platforms:
        source, value = p["logo"]["source"], p["logo"]["value"]
        if source == "simple-icons":
            if missing_pkg:
                continue
            base, path = ICONS, ICONS / f"{value}.svg"
            where = f"simple-icons slug '{value}'"
        else:
            base, path = LOGOS, LOGOS / value
            where = f"vendored '{value}'"
        # The schema can only say the value is a non-empty string. `..` and a
        # leading `/` are both strings, and pathlib honors them — an absolute
        # value discards the base entirely — so the one part of the contract
        # that says "a file in one of these two directories" is checked here.
        if not path.resolve().is_relative_to(base.resolve()):
            faults.append((p["id"], f"{where}: resolves outside {base.relative_to(ROOT)}"))
            continue
        try:
            svg = path.read_text(encoding="utf-8")
        # Not just OSError: a file that is not UTF-8 raises UnicodeDecodeError,
        # which is a ValueError, and would otherwise escape as a traceback from
        # the one function whose whole shape is about naming the bad record.
        except (OSError, ValueError):
            faults.append((p["id"], f"{where}: nothing readable at {os.path.relpath(path, ROOT)}"))
            continue
        why, geometry = _logo_faults(svg)
        faults.extend((p["id"], f"{where}: {w}") for w in why)
        if not why:
            logos[p["id"]] = geometry

    if missing_pkg and any(p["logo"]["source"] == "simple-icons" for p in platforms):
        faults.insert(0, ("—", "the simple-icons package is not installed; run `npm install`"))

    # Every offender in one report, the way validate_urls() does it: someone who
    # has broken three records learns about three, not about the first one.
    if faults:
        print("platform logos that do not resolve:", file=sys.stderr)
        for pid, why in faults:
            print(f"  {pid}: {why}", file=sys.stderr)
        raise SystemExit(1)
    return logos


# ---------------------------------------------------------------- typography
#
# Prose fields only. Names, orgs, ids, languages, licenses and every URL field
# are absent from this set on purpose, and snippet.content is never touched:
# the snippets are verbatim quotations of other people's files.
PROSE_KEYS = frozenset(
    {
        "summary",
        "description",
        "notes",
        "note",
        "gaps",
        "activity_note",
        "last_release",
        "for_consumers",
        "for_builders",
        "adoption_by_design_systems",
        "title",
        "body",
        "lede",
        "insights_lede",
        "methodology_lede",
        "techniques_lede",
        "platforms_lede",
        "reading_lede",
        "essay",
        "methodology",
        "caveats",
    }
)
_CODE_SPAN = re.compile(r"`[^`]*`")
# A possessive or a contraction: an apostrophe with a letter or digit on its left.
_APOS = re.compile(r"(?<=[A-Za-z0-9])'")
# A quoted run that is not a contraction on either end.
_SINGLE_PAIR = re.compile(r"(?<![A-Za-z0-9])'([^'\n]{1,160})'(?![A-Za-z0-9])")
_OPENERS = " \t\n([{<—–-/"


def _smarten_run(text):
    """Curl the quotes in one stretch of prose. Returns (text, replacements)."""
    n = 0
    text, k = _SINGLE_PAIR.subn("‘\\1’", text)
    n += 2 * k
    text, k = _APOS.subn("’", text)
    n += k
    out: list[str] = []
    for ch in text:
        if ch == '"':
            prev = out[-1] if out else ""
            out.append("“" if (prev == "" or prev in _OPENERS) else "”")
            n += 1
        else:
            out.append(ch)
    return "".join(out), n


def smarten(text):
    """Straight quotes -> typographic ones, skipping `code spans` entirely."""
    parts = []
    n = 0
    pos = 0
    for m in _CODE_SPAN.finditer(text):
        run, k = _smarten_run(text[pos : m.start()])
        parts.append(run)
        n += k
        parts.append(m.group(0))
        pos = m.end()
    run, k = _smarten_run(text[pos:])
    parts.append(run)
    return "".join(parts), n + k


def smarten_tree(node, key=None):
    """Walk the payload, curling only the fields that hold prose."""
    if isinstance(node, dict):
        total = 0
        for k, v in node.items():
            node[k], n = smarten_tree(v, k)
            total += n
        return node, total
    if isinstance(node, list):
        total = 0
        for i, v in enumerate(node):
            node[i], n = smarten_tree(v, key)
            total += n
        return node, total
    if isinstance(node, str) and key in PROSE_KEYS:
        return smarten(node)
    return node, 0


def _smarten_selftest():
    """Five cases, asserted every build: contraction, plain pair, backtick
    protection, possessive, and a quoted phrase that is not a contraction."""
    cases = [
        ("don't ship it", "don’t ship it"),
        ('He said "no" here.', "He said “no” here."),
        ("Run `--flag='x'` as-is", "Run `--flag='x'` as-is"),
        ("the systems' docs", "the systems’ docs"),
        ("'never invent components'", "‘never invent components’"),
    ]
    for src, want in cases:
        got, _ = smarten(src)
        assert got == want, f"smarten({src!r}) == {got!r}, expected {want!r}"


# Prose that opens a sentence with a count wants the word, not the digit
# ("Sixteen of nineteen systems…"). Past twenty the digits read better anyway,
# and a count that grows past twenty falls back to them on its own.
NUMBER_WORD = {
    0: "zero",
    1: "one",
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
    11: "eleven",
    12: "twelve",
    13: "thirteen",
    14: "fourteen",
    15: "fifteen",
    16: "sixteen",
    17: "seventeen",
    18: "eighteen",
    19: "nineteen",
    20: "twenty",
}
# {systems} -> 19, {systems:word} -> nineteen, {systems:Word} -> Nineteen
_COUNT_REF = re.compile(r"\{([a-z_]+)(?::(word|Word))?\}")

# The subset the payload's meta block carries, which the stat tiles and the MCP
# server read. Kept explicit so adding a count for the prose cannot silently
# change the shape of meta.
META_COUNTS = (
    "systems",
    "platforms",
    "official_mcp",
    "official_skills",
    "llms_txt",
    "affordances",
    "techniques",
)


def compute_counts(systems, platforms):
    """Every number the report is allowed to state, derived once. The prose and
    the stat tiles read the same dict, so a figure quoted in a finding and the
    same figure on a tile cannot drift apart."""

    def systems_with(pred):
        return sum(
            1
            for s in systems
            if any(pred(a) for a in s.get("affordances", []) if a.get("present", True))
        )

    return {
        "systems": len(systems),
        "platforms": len(platforms),
        "official_mcp": systems_with(lambda a: a.get("type") == "mcp-server" and a.get("official")),
        "official_skills": systems_with(
            lambda a: (
                a.get("type") == "claude-skill"
                and a.get("official")
                and not (a.get("name") or "").lower().startswith("planned")
            )
        ),
        "llms_txt": systems_with(lambda a: a.get("type") == "llms-txt"),
        "affordances": sum(len(s.get("affordances", [])) for s in systems),
        "techniques": sum(len(s.get("techniques", [])) for s in systems),
        "technique_categories": len(
            {t.get("category") for s in systems for t in s.get("techniques", [])}
        ),
        "ai_native": sum(1 for s in systems if s.get("ai_maturity") == "ai-native"),
    }


def resolve_counts(insights, counts):
    """Editorial copy states counts; the counts come from the records. Any
    {placeholder} in an insights string is filled here, so the site, the
    markdown twins and the JSON passthrough all quote the same number, and a
    changed dataset can't leave a stale figure in the prose."""
    unknown = set()

    def one(m):
        key, form = m.group(1), m.group(2)
        if key not in counts:
            unknown.add(key)
            return m.group(0)
        n = counts[key]
        if form and n in NUMBER_WORD:
            return NUMBER_WORD[n].capitalize() if form == "Word" else NUMBER_WORD[n]
        return str(n)

    def fill(value):
        if isinstance(value, str):
            return _COUNT_REF.sub(one, value)
        if isinstance(value, list):
            return [fill(v) for v in value]
        if isinstance(value, dict):
            return {k: fill(v) for k, v in value.items()}
        return value

    for key in list(insights):
        insights[key] = fill(insights[key])
    if unknown:
        raise SystemExit(f"insights.json references unknown counts: {sorted(unknown)}")
    # A misspelled form ({systems:plural}) names a real count, so the unknown-key
    # check above passes and the braces would ship as literal text. Check the
    # output instead of trusting the keys.
    left = sorted(set(re.findall(r"\{[^{}\s]{1,40}\}", json.dumps(insights, ensure_ascii=False))))
    if left:
        raise SystemExit(f"insights.json has unresolved placeholders: {left}")


def strip_artifact_wrapper(html):
    """Drop the document skeleton lines and the Netlify-only head block."""
    kept = []
    skipping = False
    for line in html.split("\n"):
        s = line.strip()
        if s == HEAD_START:
            skipping = True
            continue
        if s == HEAD_END:
            skipping = False
            continue
        if skipping:
            continue
        if s in WRAPPER_LINES:
            continue
        kept.append(line)
    return "\n".join(kept).lstrip("\n")


def plain_summary(text, limit=155):
    """Markdown-ish summary -> one-line meta description, cut on a word boundary."""
    t = re.sub(r"[`*]+", "", str(text or ""))
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) <= limit:
        return t
    cut = t[: limit - 1]
    if " " in cut:
        cut = cut[: cut.rfind(" ")]
    return cut.rstrip(" ,;:.-/(—") + "…"


def build_routes(systems):
    """Every prerendered route, derived from VIEW_TITLES plus the payload."""
    routes = [
        {"path": path, "view": view, "title": title, "description": desc}
        for view, (path, title, desc) in VIEW_TITLES.items()
    ]
    routes += [
        {
            "path": f"/systems/{s['id']}",
            "view": "system",
            "arg": s["id"],
            "title": f"{s['name']} · State of AI in Design Systems",
            "description": plain_summary(s.get("summary")),
        }
        for s in systems
    ]
    return routes


def write_sitemap(routes):
    urls = [ORIGIN + r["path"] for r in routes]
    body = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{LASTMOD}</lastmod>\n  </url>" for u in urls
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{body}\n</urlset>\n"
    )
    (OUT / "sitemap.xml").write_text(xml, encoding="utf-8")
    return len(urls)


def write_robots():
    txt = f"User-agent: *\nAllow: /\nDisallow: /artifact.html\n\nSitemap: {ORIGIN}/sitemap.xml\n"
    (OUT / "robots.txt").write_text(txt, encoding="utf-8")


def load_og_image(required):
    """The social card's filename, which scripts/build_og.mjs hashed from the
    bytes it drew. Absent on the first pass, where the card has not been
    rendered yet; required on the second, where the site HTML is final and the
    tag has to name a file that exists."""
    if not OG_IMAGE.exists():
        if required:
            raise SystemExit(
                f"{OG_IMAGE} is missing: run scripts/build_og.mjs before "
                "scripts/build_dashboard.py --final (scripts/build.sh does both)"
            )
        return None
    return json.loads(OG_IMAGE.read_text(encoding="utf-8"))["file"]


def load_ai_content(required):
    """The /ai copy blocks, with {md_count} resolved. Absent on the first pass of
    a clean build; required on the second, where the site HTML is final."""
    if not AI_CONTENT.exists():
        if required:
            raise SystemExit(
                f"{AI_CONTENT} is missing: run scripts/build_md.py before "
                "scripts/build_dashboard.py --final (scripts/build.sh does both)"
            )
        return None
    content = json.loads(AI_CONTENT.read_text(encoding="utf-8"))
    n = str(content["counts"]["markdown_files"])
    for sec in content["sections"]:
        for b in sec["blocks"]:
            if b.get("type") == "prose":
                b["text"] = b["text"].replace("{md_count}", n)
    return content


def main():
    # Second pass of scripts/build.sh: the /ai copy exists now, and sitemap.xml
    # and robots.txt have been extended by build_md.py, so leave them alone.
    final = "--final" in sys.argv
    ai_page = load_ai_content(final)
    og_image = load_og_image(final)
    systems = json.load(open(DATA / "design-systems.json"))
    platforms = json.load(open(DATA / "platforms.json"))
    insights = json.load(open(DATA / "insights.json"))
    reading = json.load(open(DATA / "reading.json"))
    for s in systems:
        sanitize(s.get("affordances", []))
        sanitize(s.get("techniques", []))
    for p in platforms:
        sanitize(p.get("capabilities", []))

    n_records = validate_urls(systems, platforms)
    logos = resolve_logos(platforms)

    # Before the payload is written, so every downstream surface — the site, the
    # markdown twins, the JSON passthroughs, the SQLite export and the MCP
    # server — quotes the same characters.
    _smarten_selftest()
    _, n_quotes = smarten_tree(systems)
    _, k = smarten_tree(platforms)
    n_quotes += k
    _, k = smarten_tree(insights)
    n_quotes += k
    _, k = smarten_tree(reading)
    n_quotes += k

    counts = compute_counts(systems, platforms)
    resolve_counts(insights, counts)

    # The reading list is the one surface not fixed at the collection date, so it
    # states when it last moved. Derived from the records for the same reason the
    # counts are: a date typed by hand is a date that goes stale in silence. The
    # group order comes from the schema's own vocabulary rather than a second
    # list here, so adding a kind is a one-file change.
    reading_kinds = json.loads((ROOT / "schema" / "reading.schema.json").read_text())["properties"][
        "kind"
    ]["enum"]
    # Newest first within each group, undated work last, ties by title. Three
    # stable passes rather than one composite key: sorting a date descending and
    # a title ascending in the same key needs a value that inverts a string.
    reading.sort(key=lambda r: r["title"])
    reading.sort(key=lambda r: r.get("published") or "", reverse=True)
    reading.sort(key=lambda r: reading_kinds.index(r["kind"]))

    # One mistyped year here would advertise a date the list has not reached on
    # the page, the markdown twin, llms.txt, the sitemap and two MCP tools at
    # once, and the schema's date pattern cannot tell 2027 from a typo.
    reading_updated = max(r["added_on"] for r in reading)
    today = datetime.now(UTC).date().isoformat()
    if reading_updated > today:
        raise SystemExit(
            f"data/reading.json has an added_on in the future: {reading_updated} (today is {today}). "
            f"Every surface quotes that date as when the list last moved."
        )

    meta = {
        "generated": "July 2026",
        "reading_updated": reading_updated,
        "reading_kinds": reading_kinds,
        "counts": {k: counts[k] for k in META_COUNTS},
        # The client router sets document.title on every in-page navigation.
        # It reads these so a client-side visit to /techniques gets the same title
        # a crawler gets from the prerendered file, instead of the short nav word.
        "view_titles": {view: title for view, (_p, title, _d) in VIEW_TITLES.items()},
    }

    payload = {
        "systems": systems,
        "platforms": platforms,
        # Beside the records rather than on them: this is resolved geometry, not
        # an authored field, and the records are serialized verbatim elsewhere.
        "logos": logos,
        "insights": insights,
        "reading": reading,
        "meta": meta,
    }
    if ai_page:
        payload["ai_page"] = ai_page
    blob = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    template = open(OUT / "template.html", encoding="utf-8").read()
    assert "__DATA__" in template, "template is missing the __DATA__ placeholder"
    assert "__ROUTING__" in template, "template is missing the __ROUTING__ placeholder"
    assert HEAD_START in template and HEAD_END in template, "netlify-head markers missing"
    assert DATA_SCRIPT in template, "template is missing the ds-data script line"
    assert '<script id="app">' in template, "template is missing the app script id"
    assert "__OG_IMAGE__" in template, "template is missing the __OG_IMAGE__ placeholder"

    # The card is drawn from the records and addressed by the hash of its own
    # bytes, so its filename moves whenever the counts on it do. Substituting it
    # here reaches every route: prerender.mjs uses dashboard/index.html as the
    # shell for all 27 of them. On the first pass the card does not exist yet and
    # the placeholder stands; the pass that writes the final HTML fills it, and
    # prerender.mjs refuses to ship a file that still carries it.
    if og_image:
        template = template.replace("__OG_IMAGE__", og_image)

    # Site variant: the payload lives in a shared /data.js, so the 26 prerendered
    # pages stay small and agents reading the HTML don't wade through 700KB of JSON.
    site = template.replace(DATA_SCRIPT, EXTERNAL_DATA_SCRIPT).replace("__ROUTING__", "path")
    site_path = OUT / "index.html"
    site_path.write_text(site, encoding="utf-8")

    data_js = "window.DATA=" + blob + ";\n"
    data_path = OUT / "data.js"
    data_path.write_text(data_js, encoding="utf-8")

    # Artifact variant: single file, payload stays inline.
    artifact = strip_artifact_wrapper(
        template.replace("__DATA__", blob).replace("__ROUTING__", "hash")
    )
    artifact_path = OUT / "artifact.html"
    artifact_path.write_text(artifact, encoding="utf-8")

    routes = build_routes(systems)
    BUILD.mkdir(parents=True, exist_ok=True)
    (BUILD / "payload.json").write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    (BUILD / "routes.json").write_text(
        json.dumps(routes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    n_urls = len(routes)
    if not final:
        n_urls = write_sitemap(routes)
        write_robots()

    print(f"wrote {site_path} ({len(site.encode('utf-8'))} bytes)")
    print(f"wrote {data_path} ({len(data_js.encode('utf-8'))} bytes)")
    print(f"wrote {artifact_path} ({len(artifact.encode('utf-8'))} bytes)")
    print(f"wrote {BUILD / 'payload.json'} ({len(blob.encode('utf-8'))} bytes)")
    print(f"wrote {BUILD / 'routes.json'} ({len(routes)} routes)")
    if final:
        print(f"kept {OUT / 'sitemap.xml'} and robots.txt as build_md.py left them")
    else:
        print(f"wrote {OUT / 'sitemap.xml'} ({n_urls} urls)")
        print(f"wrote {OUT / 'robots.txt'}")
    print(f"url check: clean across {n_records} linked records")
    print(f"smart quotes: {n_quotes} replacements across prose fields")
    print(f"meta={json.dumps(meta['counts'])}")
    print(
        "ai_page: " + (f"{len(ai_page['sections'])} sections" if ai_page else "absent (first pass)")
    )
    print("og:image: " + (og_image or "placeholder kept (first pass)"))


if __name__ == "__main__":
    main()
