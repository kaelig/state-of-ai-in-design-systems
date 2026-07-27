#!/bin/sh
set -e
cd "$(dirname "$0")/.."
# 1. payload + the two HTML shells (writes build/payload.json, build/routes.json)
python3 scripts/build_dashboard.py
# 2. markdown mirrors, data passthroughs, llms.txt, sitemap, robots.txt.
#    Runs before prerender so any measured file size it reports already exists.
#    Also compiles build/ai-page-content.json, the copy blocks the /ai view renders.
python3 scripts/build_md.py
# 3. rerun step 1 with that copy in hand, so the /ai page and /ai.md are the same
#    words and the file counts in them are measured rather than typed.
python3 scripts/build_dashboard.py --final
# 4. one static HTML file per route
node scripts/prerender.mjs
