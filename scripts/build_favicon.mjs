#!/usr/bin/env node
// Rasterize dashboard/favicon.svg into the two icons a browser asks for by
// name: dashboard/favicon.ico and dashboard/apple-touch-icon.png.
//
// The site declares an SVG icon, which every current browser except Safari
// understands — Safari only shipped SVG favicon support in version 26, so on
// anything older the declaration is ignored and the browser falls back to
// requesting /favicon.ico. That request also happens on the markdown mirror and
// the llms*.txt files, which are served as text and have no <head> to declare
// an icon in at all. /apple-touch-icon.png is the same story on iOS: it is
// fetched from the root, with or without a link tag, when someone adds the site
// to a home screen. All three were answering 404.
//
// So the .ico is generated rather than redirected to the .svg: a redirect only
// helps the browsers that already read the SVG, which are exactly the ones that
// never asked. Both are generated rather than committed because a hand-made
// copy of an icon goes stale the first time the icon changes and nothing
// notices — the same failure the social card had before scripts/build_og.mjs
// drew it.
//
// Geometry comes from favicon.svg. Two things are done to it for both outputs:
// the dark-mode block is dropped, because neither format carries two images or
// answers a media query, and the oklch() colors are swapped for their sRGB
// equivalents, because resvg's CSS parser predates oklch() and renders what it
// cannot parse as black without erroring. That is the same reason
// scripts/build_og.mjs writes hex, and it is why this file fails loudly on a
// color it has no hex for instead of shipping a black square.
//
// The touch icon gets one more change: its corners are squared off. iOS masks
// every home-screen icon to its own rounded shape, so shipping the .svg's rx=4
// would round the artwork inside a second, differently-shaped rounding and
// leave transparent slivers at the corners for the home screen to fill with
// whatever it likes.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dashboard');

/** @type {(msg: string) => never} */
const die = (msg) => {
  console.error('build_favicon: ' + msg);
  process.exit(1);
};

// The light theme, because an .ico is one image for both. It is the pale
// ground with dark dots, which stays legible against a dark tab strip; the dark
// variant is a dark square that would disappear into one.
//
// Converted from the oklch() literals in favicon.svg, not eyeballed. The same
// conversion turns the sRGB primaries back into #ff0000 / #00ff00 / #0000ff
// exactly, which is what makes these two trustworthy.
const HEX = {
  'oklch(88.6% 0.028 244.7)': '#cbdceb', // --mat-2 ground, light
  'oklch(38.3% 0.055 245.9)': '#29465f', // ink, light
};

// 16 for the tab, 32 for the same tab on a retina display, 48 for the places
// the OS uses an icon at desktop size. All three are PNG payloads, which every
// browser and every Windows since Vista reads out of an .ico container.
const SIZES = [16, 32, 48];

// The size iOS asks for on a retina phone. One file rather than the old ladder
// of five: iOS downsamples this for every smaller slot, and the artwork is nine
// dots, which is exactly the kind of thing that survives being downsampled.
const TOUCH_SIZE = 180;

/* ---------- favicon.svg, minus the parts these formats cannot carry ------- */

const src = readFileSync(join(OUT, 'favicon.svg'), 'utf8');

// Brace counting rather than a regex: the block is CSS inside <style>, and a
// regex for it would be pinned to today's indentation.
/** @type {(svg: string) => string} */
function dropMediaBlock(svg) {
  const at = svg.indexOf('@media');
  if (at === -1) return svg;
  const open = svg.indexOf('{', at);
  if (open === -1) die('@media in favicon.svg has no opening brace');
  let depth = 0;
  for (let i = open; i < svg.length; i++) {
    if (svg[i] === '{') depth++;
    else if (svg[i] === '}' && --depth === 0)
      return svg.slice(0, at) + svg.slice(i + 1);
  }
  return die('@media in favicon.svg is never closed');
}

let svg = dropMediaBlock(src);
for (const [oklch, hex] of Object.entries(HEX))
  svg = svg.split(oklch).join(hex);

// The two assertions that make a silent black square impossible. A leftover
// oklch() is a color HEX does not know about; a leftover @media is a dark rule
// that would override the light one resvg does understand.
const leftover = svg.match(/oklch\([^)]*\)/g);
if (leftover)
  die(
    `no sRGB value for ${[...new Set(leftover)].join(', ')} — add it to HEX in ` +
      'this file, or resvg will render it black',
  );
if (svg.includes('@media')) die('a @media block survived into the .ico source');

// Full bleed for iOS, which supplies the rounding. Asserted rather than
// replaced blind: if favicon.svg ever writes its corner radius some other way,
// the touch icon would quietly go back to being rounded twice.
const ROUNDED = ' rx="4"';
if (!svg.includes(ROUNDED))
  die(`no ${ROUNDED.trim()} in favicon.svg to square off for the touch icon`);
const squared = svg.replace(ROUNDED, '');

/* ---------- rasterize: PNGs in an ICO container, and the touch icon ------- */

await initWasm(
  readFileSync(
    fileURLToPath(import.meta.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  ),
);

/** @type {(svg: string, size: number) => Buffer} */
const render = (svg, size) =>
  Buffer.from(
    new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng(),
  );

const frames = SIZES.map((size) => ({ size, png: render(svg, size) }));

// ICO is a 6-byte header, then one 16-byte directory entry per image, then the
// image payloads. Everything is little-endian.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // 1 = icon (2 would be a cursor)
header.writeUInt16LE(frames.length, 4);

const dir = Buffer.alloc(16 * frames.length);
let offset = header.length + dir.length;
frames.forEach(({ size, png }, i) => {
  const p = i * 16;
  dir.writeUInt8(size, p); // width, 0 would mean 256
  dir.writeUInt8(size, p + 1); // height
  dir.writeUInt8(0, p + 2); // palette entries, 0 = no palette
  dir.writeUInt8(0, p + 3); // reserved
  dir.writeUInt16LE(1, p + 4); // color planes
  dir.writeUInt16LE(32, p + 6); // bits per pixel
  dir.writeUInt32LE(png.length, p + 8);
  dir.writeUInt32LE(offset, p + 12);
  offset += png.length;
});

const ico = Buffer.concat([header, dir, ...frames.map((f) => f.png)]);
writeFileSync(join(OUT, 'favicon.ico'), ico);

const touch = render(squared, TOUCH_SIZE);
writeFileSync(join(OUT, 'apple-touch-icon.png'), touch);

console.log(
  `build_favicon: dashboard/favicon.ico (${SIZES.join('/')}px, ${ico.length} bytes), ` +
    `dashboard/apple-touch-icon.png (${TOUCH_SIZE}px, ${touch.length} bytes)`,
);
