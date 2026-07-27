#!/usr/bin/env python3
"""Merge raw research records with verification verdicts and build the final
JSON dataset + SQLite database for the State of AI in Design Systems study."""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data"
DB = ROOT / "db" / "state-of-ai.sqlite"

SYSTEM_FILES = [
    "shadcn-ui", "material-ui", "chakra-ui", "ant-design", "carbon-design-system",
    "shopify-polaris", "salesforce-slds", "fluent-ui-microsoft", "primer-github",
    "react-spectrum-s2", "cloudscape-design-system", "nuxt-ui", "heroui",
    "mantine", "nord-design-system", "uswds",
]
# group id used in the verify workflow -> raw file stem
GROUP_TO_FILE = {
    "shadcn-ui": "shadcn-ui", "material-ui": "material-ui", "chakra-ui": "chakra-ui",
    "ant-design": "ant-design", "carbon": "carbon-design-system", "polaris": "shopify-polaris",
    "slds": "salesforce-slds", "fluent-ui": "fluent-ui-microsoft", "primer": "primer-github",
    "react-spectrum": "react-spectrum-s2", "cloudscape": "cloudscape-design-system",
    "nuxt-ui": "nuxt-ui", "heroui": "heroui", "mantine": "mantine",
    "nord": "nord-design-system", "uswds": "uswds",
    # critic-driven supplement — verdicts already merged into the raw files
    "atlassian-design-system": "atlassian-design-system",
    "patternfly": "patternfly", "daisyui": "daisyui",
}


def load_verifications(path):
    """Return ({group_id: {claim_id: verdict_dict}}, critic_dict) from a
    workflow task-output file (JSON with a 'result' key holding
    {verifications: [{id, verdicts}], critic})."""
    doc = json.load(open(path))
    result = doc.get("result", doc)
    by_group = {v["id"]: {x["claim_id"]: x for x in v.get("verdicts", [])}
                for v in result.get("verifications", [])}
    critic = result.get("critic")
    return by_group, critic


def apply_verdicts(record, verdicts):
    applied = 0
    for i, a in enumerate(record.get("affordances", [])):
        v = verdicts.get(f"a{i}")
        if v:
            a["verified"] = v["verdict"]
            if v.get("corrected_url"):
                a["corrected_url"] = v["corrected_url"]
            if v.get("note"):
                a["verify_note"] = v["note"]
            applied += 1
    for i, t in enumerate(record.get("techniques", [])):
        v = verdicts.get(f"t{i}")
        if v:
            t["verified"] = v["verdict"]
            if v.get("corrected_url"):
                t["corrected_url"] = v["corrected_url"]
            if v.get("note"):
                t["verify_note"] = v["note"]
            applied += 1
    return applied


def apply_platform_verdicts(platforms, verdicts):
    applied = 0
    for p in platforms:
        for i, c in enumerate(p.get("capabilities", [])):
            v = verdicts.get(f"{p['id']}-c{i}")
            if v:
                c["verified"] = v["verdict"]
                if v.get("corrected_url"):
                    c["corrected_url"] = v["corrected_url"]
                if v.get("note"):
                    c["verify_note"] = v["note"]
                applied += 1
    return applied


def build_sqlite(systems, platforms):
    DB.parent.mkdir(exist_ok=True)
    DB.unlink(missing_ok=True)
    con = sqlite3.connect(DB)
    cur = con.cursor()
    cur.executescript("""
    CREATE TABLE systems (
      id TEXT PRIMARY KEY, name TEXT, org TEXT, category TEXT,
      repo_url TEXT, docs_url TEXT, license TEXT, ai_maturity TEXT,
      actively_maintained INTEGER, last_release TEXT, activity_note TEXT,
      for_consumers TEXT, for_builders TEXT, gaps TEXT, summary TEXT
    );
    CREATE TABLE affordances (
      id INTEGER PRIMARY KEY AUTOINCREMENT, system_id TEXT REFERENCES systems(id),
      type TEXT, name TEXT, official INTEGER, audience TEXT, description TEXT,
      docs_url TEXT, code_url TEXT, snippet_language TEXT, snippet_content TEXT,
      snippet_source_url TEXT, verified TEXT, verify_note TEXT, notes TEXT
    );
    CREATE TABLE techniques (
      id INTEGER PRIMARY KEY AUTOINCREMENT, system_id TEXT REFERENCES systems(id),
      name TEXT, category TEXT, description TEXT, snippet_language TEXT,
      snippet_content TEXT, snippet_source_url TEXT, verified TEXT, verify_note TEXT
    );
    CREATE TABLE platform_integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, system_id TEXT REFERENCES systems(id),
      platform TEXT, description TEXT, url TEXT
    );
    CREATE TABLE sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT, system_id TEXT REFERENCES systems(id), url TEXT
    );
    CREATE TABLE platforms (
      id TEXT PRIMARY KEY, name TEXT, summary TEXT, adoption TEXT
    );
    CREATE TABLE platform_capabilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT, platform_id TEXT REFERENCES platforms(id),
      title TEXT, description TEXT, audience TEXT, url TEXT,
      snippet_language TEXT, snippet_content TEXT, snippet_source_url TEXT,
      verified TEXT, verify_note TEXT
    );
    """)
    for s in systems:
        m = s.get("maintenance", {})
        b = s.get("building_vs_consumption", {})
        cur.execute(
            "INSERT INTO systems VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (s["id"], s.get("name"), s.get("org"), s.get("category"),
             s.get("repo_url"), s.get("docs_url"), s.get("license"), s.get("ai_maturity"),
             1 if m.get("actively_maintained") else 0, m.get("last_release"),
             m.get("activity_note"), b.get("for_consumers"), b.get("for_builders"),
             s.get("gaps"), s.get("summary")))
        for a in s.get("affordances", []):
            sn = a.get("snippet") or {}
            cur.execute(
                "INSERT INTO affordances (system_id,type,name,official,audience,description,docs_url,code_url,snippet_language,snippet_content,snippet_source_url,verified,verify_note,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (s["id"], a.get("type"), a.get("name"), 1 if a.get("official") else 0,
                 a.get("audience"), a.get("description"), a.get("docs_url"), a.get("code_url"),
                 sn.get("language"), sn.get("content"), sn.get("source_url"),
                 a.get("verified"), a.get("verify_note"), a.get("notes")))
        for t in s.get("techniques", []):
            sn = t.get("snippet") or {}
            cur.execute(
                "INSERT INTO techniques (system_id,name,category,description,snippet_language,snippet_content,snippet_source_url,verified,verify_note) VALUES (?,?,?,?,?,?,?,?,?)",
                (s["id"], t.get("name"), t.get("category"), t.get("description"),
                 sn.get("language"), sn.get("content"), sn.get("source_url"),
                 t.get("verified"), t.get("verify_note")))
        for p in s.get("platform_integrations", []):
            cur.execute(
                "INSERT INTO platform_integrations (system_id,platform,description,url) VALUES (?,?,?,?)",
                (s["id"], p.get("platform"), p.get("description"), p.get("url")))
        for u in s.get("sources", []):
            cur.execute("INSERT INTO sources (system_id,url) VALUES (?,?)", (s["id"], u))
    for p in platforms:
        cur.execute("INSERT INTO platforms VALUES (?,?,?,?)",
                    (p["id"], p.get("name"), p.get("summary"), p.get("adoption_by_design_systems")))
        for c in p.get("capabilities", []):
            sn = c.get("snippet") or {}
            cur.execute(
                "INSERT INTO platform_capabilities (platform_id,title,description,audience,url,snippet_language,snippet_content,snippet_source_url,verified,verify_note) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (p["id"], c.get("title"), c.get("description"), c.get("audience"), c.get("url"),
                 sn.get("language"), sn.get("content"), sn.get("source_url"),
                 c.get("verified"), c.get("verify_note")))
    con.commit()
    counts = {t: cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
              for t in ("systems", "affordances", "techniques", "platforms", "platform_capabilities")}
    con.close()
    return counts


# post-verification editorial adjustments from the completeness-critic's
# consistency review (each disclosed in the record's gaps field)
MATURITY_ADJUST = {
    "cloudscape-design-system": "invested",
    "chakra-ui": "ai-native",
}


def main(journal_path):
    by_group, critic = load_verifications(journal_path)
    systems = []
    total_applied = 0
    for group_id, stem in GROUP_TO_FILE.items():
        record = json.load(open(RAW / f"{stem}.json"))
        total_applied += apply_verdicts(record, by_group.get(group_id, {}))
        if record["id"] in MATURITY_ADJUST:
            record["ai_maturity"] = MATURITY_ADJUST[record["id"]]
        systems.append(record)
    platforms = json.load(open(RAW / "platforms.json"))
    plat_verdicts = {}
    plat_verdicts.update(by_group.get("platforms-figma-storybook", {}))
    plat_verdicts.update(by_group.get("platforms-docs", {}))
    total_applied += apply_platform_verdicts(platforms, plat_verdicts)

    order = {"ai-native": 0, "invested": 1, "emerging": 2, "none": 3}
    systems.sort(key=lambda s: (order.get(s.get("ai_maturity"), 9), s["name"].lower()))

    json.dump(systems, open(OUT / "design-systems.json", "w"), indent=2)
    json.dump(platforms, open(OUT / "platforms.json", "w"), indent=2)
    if critic:
        json.dump(critic, open(OUT / "critic-review.json", "w"), indent=2)

    counts = build_sqlite(systems, platforms)
    verdict_tally = {}
    for g in by_group.values():
        for v in g.values():
            verdict_tally[v["verdict"]] = verdict_tally.get(v["verdict"], 0) + 1
    print(f"verdicts applied: {total_applied}; tally: {verdict_tally}")
    print(f"sqlite: {counts}")
    print(f"critic findings: {len(critic.get('missing', [])) if critic else 'none'}")


if __name__ == "__main__":
    main(sys.argv[1])
