#!/usr/bin/env python3
"""Self-check for the markdown mirror layer. Run after scripts/build.sh."""
import json
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dashboard"
ORIGIN = "https://state-of-ai-in-design-systems.netlify.app"
fail = []

# 1. every link target in llms.txt resolves to a file on disk
txt = (OUT / "llms.txt").read_text(encoding="utf-8")
targets = re.findall(r"\]\((https?://[^)\s]+)\)", txt)
missing = []
for t in sorted(set(targets)):
    if not t.startswith(ORIGIN):
        continue
    rel = t[len(ORIGIN):].split("#")[0].lstrip("/")
    if not (OUT / rel).exists():
        missing.append(t)
print(f"[1] llms.txt links: {len(set(targets))} unique, {len(missing)} missing")
if missing:
    fail.append("missing llms.txt targets: " + ", ".join(missing))

# 2. size budget
size = len(txt.encode("utf-8"))
print(f"[2] llms.txt size: {size} bytes ({'ok' if size < 16384 else 'OVER'} / 16384)")
if size >= 16384:
    fail.append("llms.txt over 16KB")
if (OUT / ".well-known" / "llms.txt").read_bytes() != (OUT / "llms.txt").read_bytes():
    fail.append("/.well-known/llms.txt differs from /llms.txt")

# 3. grep gate over generated artifacts only
# 'critic' is matched as a standalone token: the words "critical"/"critically"
# appear inside verbatim source snippets and are not the critic table.
pats = ["verify_note", '"verified"', r"\bcritic\b"]
hits = {p: [] for p in pats}
gen_ext = {".md", ".json", ".txt", ".sqlite", ".ts"}
scanned = 0
for f in sorted(OUT.rglob("*")):
    if not f.is_file() or f.suffix not in gen_ext:
        continue
    scanned += 1
    blob = f.read_bytes()
    for p in pats:
        if re.search(p.encode(), blob):
            hits[p].append(str(f.relative_to(ROOT)))
for f in sorted((ROOT / "netlify").rglob("*.ts")):
    scanned += 1
    blob = f.read_bytes()
    for p in pats:
        if re.search(p.encode(), blob):
            hits[p].append(str(f.relative_to(ROOT)))
print(f"[3] grep gate over {scanned} generated files:")
for p in pats:
    print(f"    {p!r}: {len(hits[p])} hits" + (" -> " + ", ".join(hits[p][:5]) if hits[p] else ""))
    if hits[p]:
        fail.append(f"grep gate hit {p}")
# report what the excluded HTML/data.js contain, for the record
html_hits = {}
for f in [OUT / "index.html", OUT / "artifact.html", OUT / "data.js"]:
    blob = f.read_bytes()
    html_hits[f.name] = {p: len(re.findall(p.encode(), blob)) for p in pats}
print(f"    (excluded site copy) {html_hits}")

# 4. frontmatter parses as YAML on 3 sampled files
samples = ["index.md", "systems/primer-github.md", "questions/mcp-server-adoption.md"]
try:
    import yaml  # type: ignore
    loader = lambda s: yaml.safe_load(s)
    mode = "PyYAML"
except ImportError:
    mode = "strict key: value parser"

    def loader(s):
        out = {}
        for line in s.splitlines():
            if not line.strip() or line.startswith("#"):
                continue
            if line.startswith(("  ", "- ")):
                continue
            k, sep, v = line.partition(":")
            assert sep and re.fullmatch(r"[A-Za-z0-9_]+", k), f"bad frontmatter line: {line!r}"
            out[k] = v.strip()
        return out
for s in samples:
    body = (OUT / s).read_text(encoding="utf-8")
    assert body.startswith("---\n"), f"{s}: no frontmatter"
    fm = body.split("---\n", 2)[1]
    try:
        keys = list(loader(fm).keys())
        print(f"[4] {s}: frontmatter ok ({mode}), keys={keys}")
    except Exception as e:  # noqa: BLE001
        fail.append(f"frontmatter parse failed for {s}: {e}")

# 5. sqlite opens and counts match the payload
payload = json.loads((ROOT / "build" / "payload.json").read_text(encoding="utf-8"))
con = sqlite3.connect(OUT / "data" / "state-of-ai.sqlite")
tables = [r[0] for r in con.execute(
    "select name from sqlite_master where type='table' order by name")]
counts = {t: con.execute(f"select count(*) from {t}").fetchone()[0] for t in tables}
cols = {t: [r[1] for r in con.execute(f"pragma table_info({t})")] for t in tables}
# Table names match db/state-of-ai.sqlite so the README's example queries run
# unchanged against the published copy.
expect = {
    "systems": len(payload["systems"]),
    "platforms": len(payload["platforms"]),
    "affordances": sum(len(s.get("affordances") or []) for s in payload["systems"]),
    "techniques": sum(len(s.get("techniques") or [])
                      for s in payload["systems"]),
}
print(f"[5] sqlite tables: {counts}")
for t, n in expect.items():
    if t in counts and counts[t] != n:
        fail.append(f"sqlite {t}={counts[t]} but payload has {n}")
    elif t not in counts:
        fail.append(f"sqlite missing table {t}")
    else:
        print(f"    {t}: {counts[t]} == payload {n}")
if "critic" in tables:
    fail.append("sqlite still has a critic table")
bad_cols = {t: [c for c in cs if c in ("verified", "verify_note")] for t, cs in cols.items()}
bad_cols = {t: c for t, c in bad_cols.items() if c}
print(f"    verification columns present: {bad_cols or 'none'}")
if bad_cols:
    fail.append(f"sqlite verification columns: {bad_cols}")
con.close()

# 6. md-map parses and matches files on disk byte for byte
mm = json.loads((ROOT / "build" / "md-map.json").read_text(encoding="utf-8"))
drift = [k for k, v in mm.items() if (OUT / k.lstrip("/")).read_text(encoding="utf-8") != v]
print(f"[6] md-map.json: {len(mm)} routes, {len(drift)} drifted from disk")
if drift:
    fail.append(f"md-map drift: {drift[:5]}")

# 7. inventory
inv = {}
for f in OUT.rglob("*"):
    if f.is_file():
        inv.setdefault(f.suffix or "(none)", [0, 0])
        inv[f.suffix][0] += 1
        inv[f.suffix][1] += f.stat().st_size
print("[7] dashboard/ inventory:")
for ext, (n, b) in sorted(inv.items(), key=lambda kv: -kv[1][1]):
    print(f"    {ext:9} {n:4} files  {b:>10,} bytes")
print(f"    TOTAL     {sum(v[0] for v in inv.values()):4} files  "
      f"{sum(v[1] for v in inv.values()):>10,} bytes")

print()
print("FAIL: " + "; ".join(fail) if fail else "ALL CHECKS PASS")
sys.exit(1 if fail else 0)
