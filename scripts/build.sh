#!/bin/sh
set -e
cd "$(dirname "$0")/.."
# 0. every record against its schema, before anything is generated from it. On
#    the deploy path deliberately: Netlify builds from source on every deploy,
#    so this is the only gate a bad record has to pass.
node scripts/validate_data.mjs
# 1. payload + the two HTML shells (writes build/payload.json, build/routes.json)
python3 scripts/build_dashboard.py
# 2. markdown mirrors, data passthroughs, llms.txt, sitemap, robots.txt.
#    Runs before prerender so any measured file size it reports already exists.
#    Also compiles build/ai-page-content.json, the copy blocks the /ai view renders.
python3 scripts/build_md.py
# 3. the social card, drawn from the counts step 1 computed and named after the
#    hash of its own bytes. Before step 4 because that is what writes the
#    og:image tag, and after step 1 because that is what writes the counts.
node scripts/build_og.mjs
# 4. rerun step 1 with that copy in hand, so the /ai page and /ai.md are the same
#    words and the file counts in them are measured rather than typed. Also
#    substitutes the card's filename into both shells.
python3 scripts/build_dashboard.py --final
# 5. one static HTML file per route
node scripts/prerender.mjs
# 6. the two icons browsers fetch by name, rasterized from dashboard/favicon.svg.
#    Last because it reads nothing this pipeline writes: the browsers that ask
#    for /favicon.ico are the ones that cannot read the .svg the head declares,
#    plus any browser pointed at a .md or llms.txt file, which has no head to
#    read at all, and /apple-touch-icon.png is what iOS asks for by itself.
node scripts/build_favicon.mjs
