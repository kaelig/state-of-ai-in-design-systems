#!/usr/bin/env node
// Draw the Open Graph card from the records. Counts are computed and never
// typed, and this is the one artifact that rule did not reach: the published
// card was a screenshot, and no check in the repository can read a PNG. It went
// four counts stale without anything noticing.
//
// So the card is generated. The four numbers come from the same counts block
// build_dashboard.py writes for the prose, the PNG is addressed by the hash of
// its own bytes, and build_dashboard.py --final puts that filename in the
// og:image tag. A card that disagrees with the records is now unbuildable,
// because the records are what draw it.
//
// Hashing rather than a fixed URL is what makes a correction land: social
// crawlers key their caches by URL and netlify.toml serves the card immutable
// for a year, so a new card at /og-image.png would stay wrong in every cache
// that had already seen the old one.
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dashboard');
const BUILD = join(ROOT, 'build');
const FONTS = join(ROOT, 'assets', 'fonts');

// Typed rather than inferred: tsc only treats a call as terminating when the
// binding it goes through is annotated, and measure() reads a box die() has
// already ruled out.
/** @type {(msg: string) => never} */
const die = (msg) => {
  console.error('build_og: ' + msg);
  process.exit(1);
};

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const round = (n) => Number(n.toFixed(3));

/* ---------- the counts, from the same place the prose reads them ---------- */

const CARD_COUNTS = ['systems', 'platforms', 'affordances', 'techniques'];

const payloadPath = join(BUILD, 'payload.json');
if (!existsSync(payloadPath))
  die(
    `${payloadPath} is missing: run scripts/build_dashboard.py before ` +
      'scripts/build_og.mjs (scripts/build.sh does both)',
  );
const meta = JSON.parse(readFileSync(payloadPath, 'utf8'))?.meta;
const counts = meta?.counts;
if (!counts) die('build/payload.json has no meta.counts block');
for (const k of CARD_COUNTS) {
  if (!Number.isInteger(counts[k]))
    die(
      `meta.counts.${k} is ${JSON.stringify(counts[k])}, expected an integer`,
    );
}

// The eyebrow states when the study was made, and the payload already says so
// for every other surface. Typing it here would put the card back in the
// position this whole change took it out of: stating something by hand that
// moves elsewhere. scripts/check_hand_counts.py sweeps for exactly that.
if (typeof meta.generated !== 'string' || !meta.generated.trim())
  die('build/payload.json has no meta.generated to date the card with');
const PERIOD = meta.generated.toUpperCase();

const STATS = [
  `${counts.systems} systems`,
  `${counts.platforms} platforms`,
  `${counts.affordances} AI affordances`,
  `${counts.techniques} coercion techniques`,
].join(' · ');

/* ---------- the faces ---------- */

// @resvg/resvg-wasm loads a variable font but renders its default instance, so
// one file would draw every weight as Regular. assets/fonts/ holds three static
// cuts instead, and its README records where they came from.
const WEIGHTS = [400, 600, 750];
const fontBuffers = WEIGHTS.map((w) =>
  readFileSync(join(FONTS, `HankenGrotesk-${w}.ttf`)),
);

await initWasm(
  readFileSync(
    fileURLToPath(import.meta.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  ),
);

const FAMILY = 'Hanken Grotesk';
// resvg picks a face by CSS weight, and usvg rejects non-standard values:
// `font-weight: 750`, which the retired scripts/og-image.html used, parsed as
// normal and would have drawn the title in Regular. 700 is the CSS weight, and
// with 750 the boldest face loaded, matching resolves it to the cut the title
// has always been set in.
const DISPLAY = 700;

const draw = (svg) =>
  new Resvg(svg, {
    font: { fontBuffers, defaultFontFamily: FAMILY, loadSystemFonts: false },
  });

// The width of one line, from resvg's own bounding box rather than from summing
// advance widths out of the font: it is the renderer's answer, measured on the
// faces that draw the card, so it cannot disagree with what lands in the PNG.
// getBBox measures the geometry and not the canvas, so the probe's viewport is
// nominal — a line wider than it is still measured whole.
function measure({ text, size, weight, tracking = 0 }) {
  const probe = draw(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1">` +
      `<text x="0" y="0" font-family="${FAMILY}" font-size="${size}"` +
      ` font-weight="${weight}" letter-spacing="${round(tracking)}">${esc(text)}</text></svg>`,
  );
  const box = probe.getBBox();
  if (!box) die(`nothing rendered while measuring ${JSON.stringify(text)}`);
  return box.x + box.width;
}

// Three weights of the same string cannot measure the same. Identical widths
// mean resvg fell back to a default face, which is the failure the vendored
// fonts exist to remove: the old screenshot shipped a card set in a fallback
// whenever the capture outran the webfont, and nothing caught that either.
const probeWidths = [400, 600, DISPLAY].map((weight) =>
  measure({ text: 'Design Systems', size: 80, weight }).toFixed(2),
);
if (new Set(probeWidths).size !== probeWidths.length)
  die(
    `the three weights measured ${probeWidths.join('px, ')}px: at least two ` +
      'faces are the same, so assets/fonts/ did not load and the card would be ' +
      'set in a fallback',
  );

/* ---------- layout ---------- */

const W = 1200;
const H = 630;
const PAD = 80;
const CONTENT = W - PAD * 2;

const INK = '#111111';
const MUTED = '#555555';
const ACCENT = '#2563eb';
const PAPER = '#ffffff';

// Hanken Grotesk is 1000 units per em with ascent 1000 and descent -303, so CSS
// `line-height: normal` is 1.303em and a baseline sits one em below the top of
// its line box. Every y below is that arithmetic over the box model the retired
// card's stylesheet described, so the card keeps the layout it was published in.
const NORMAL = 1.303;
const lineBox = (size) => size * NORMAL;

const EYEBROW = { size: 20, weight: 600, tracking: 0.18 * 20 };
const TITLE = { size: 110, weight: DISPLAY, tracking: -0.03 * 110 };
const STATS_TYPE = { size: 26, weight: 400 };
const BYLINE = { size: 24, weight: 600 };
const TITLE_LEAD = TITLE.size * 1.02;

const eyebrowBase = PAD + EYEBROW.size;
const titleTop = PAD + lineBox(EYEBROW.size) + 30;
const titleBase =
  titleTop + (TITLE_LEAD - lineBox(TITLE.size)) / 2 + TITLE.size;
const ruleTop = titleTop + TITLE_LEAD * 2 + 36;
const statsBase = ruleTop + 3 + 28 + STATS_TYPE.size;
const bylineBase = H - PAD - lineBox(BYLINE.size) + BYLINE.size;

// Only the stats line varies, so the title is two literal lines rather than a
// layout engine. Nothing here reflows and nothing needs to.
const TITLE_LINES = ['State of AI in', 'Design Systems'];

/* ---------- the card ---------- */

const line = ({ y, size, weight, fill, tracking = 0, body }) =>
  `<text x="${PAD}" y="${round(y)}" font-family="${FAMILY}" font-size="${size}"` +
  ` font-weight="${weight}" letter-spacing="${round(tracking)}" fill="${fill}"` +
  `>${body}</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${PAPER}"/>
${line({
  ...EYEBROW,
  y: eyebrowBase,
  fill: ACCENT,
  body: esc(`FIELD STUDY · ${PERIOD}`),
})}
${TITLE_LINES.map((t, i) =>
  line({
    ...TITLE,
    y: titleBase + i * TITLE_LEAD,
    fill: INK,
    body: esc(t),
  }),
).join('\n')}
<rect x="${PAD}" y="${round(ruleTop)}" width="64" height="3" fill="${ACCENT}"/>
${line({ ...STATS_TYPE, y: statsBase, fill: MUTED, body: esc(STATS) })}
${line({
  ...BYLINE,
  y: bylineBase,
  fill: INK,
  body:
    esc('Kaelig Deloumeau-Prigent') +
    `<tspan dx="16" font-weight="400" fill="${MUTED}">${esc('kaelig.fr')}</tspan>`,
})}
</svg>
`;

/* ---------- guards, none of which reads a pixel ---------- */

// The card states the counts it was drawn from, or it is not this card. STATS is
// composed from them, so this is the whole of that claim: checking each number
// against the line that was built out of it would assert nothing.
if (!svg.includes(esc(STATS)))
  die('the card SVG does not carry the stats line its counts composed');

// A fourth digit or a longer noun would run past the content box and clip
// against the padding. The card is drawn once per build, so measuring it costs
// nothing, and the alternative is learning about it from a published card.
const statsWidth = measure({ ...STATS_TYPE, text: STATS });
if (statsWidth > CONTENT)
  die(
    `the stats line measures ${statsWidth.toFixed(1)}px against a ${CONTENT}px ` +
      `content box: "${STATS}" would clip. Shorten it or drop the type size.`,
  );

const rendered = draw(svg).render();
if (rendered.width !== W || rendered.height !== H)
  die(`rasterized ${rendered.width}x${rendered.height}, expected ${W}x${H}`);
const bytes = Buffer.from(rendered.asPng());

/* ---------- write it hashed, and sweep what an earlier build left ---------- */

const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 8);
const file = `og-image-${hash}.png`;
writeFileSync(join(OUT, file), bytes);

// prerender.mjs sweeps its stale routes for the same reason: dashboard/ is the
// publish directory, so whatever is left behind in it ships.
const stale = readdirSync(OUT).filter(
  (f) => /^og-image-[0-9a-f]{8}\.png$/.test(f) && f !== file,
);
for (const f of stale) rmSync(join(OUT, f));

writeFileSync(
  join(BUILD, 'og-image.json'),
  JSON.stringify({ file, width: W, height: H, stats: STATS }, null, 2) + '\n',
  'utf8',
);

console.log(`wrote ${join(OUT, file)} (${bytes.length} bytes)`);
console.log(`  stats: ${STATS}`);
console.log(
  `  stats line: ${statsWidth.toFixed(1)}px in a ${CONTENT}px content box`,
);
console.log(`  faces: ${WEIGHTS.join(', ')} from assets/fonts/`);
if (stale.length) console.log(`  swept: ${stale.join(', ')}`);
