#!/usr/bin/env node
// Prerender every route to real HTML. The view functions in the app script are
// pure JSON -> string builders, so they run in node:vm behind a small DOM shim
// and produce the same markup the browser would. No dependencies.
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dashboard');
const BUILD = join(ROOT, 'build');
const ORIGIN = 'https://state-of-ai-in-design-systems.netlify.app';

// Annotated so tsc treats a call as terminating: the og:image check below reads
// a match die() has already ruled out.
/** @type {(msg: string) => never} */
const die = (msg) => {
  console.error('prerender: ' + msg);
  process.exit(1);
};

const shell = readFileSync(join(OUT, 'index.html'), 'utf8');
const payload = JSON.parse(readFileSync(join(BUILD, 'payload.json'), 'utf8'));
const routes = JSON.parse(readFileSync(join(BUILD, 'routes.json'), 'utf8'));
// The one source file this step reads that the build did not generate. It is
// here for the maturity vocabulary check below, which needs the schema's enum
// and the template's render order in the same place.
const systemSchema = JSON.parse(
  readFileSync(join(ROOT, 'schema', 'design-system.schema.json'), 'utf8'),
);

const open = shell.indexOf('<script id="app">');
if (open === -1) die('no <script id="app"> in dashboard/index.html');
const close = shell.indexOf('</script>', open);
if (close === -1) die('unterminated app script');
const appSrc = shell.slice(open + '<script id="app">'.length, close);

/* ---------- DOM shim: enough for the app's five DOM touch points ---------- */
const els = new Map();
function makeEl() {
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    open: false,
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    getAttribute() {
      return null;
    },
    hasAttribute() {
      return false;
    },
    focus() {},
    closest() {
      return null;
    },
    querySelector() {
      return makeEl();
    },
    querySelectorAll() {
      return [];
    },
  };
}
const el = (key) => {
  if (!els.has(key)) els.set(key, makeEl());
  return els.get(key);
};
const document = {
  documentElement: el(':root'),
  getElementById: (id) => el('#' + id),
  querySelector: (sel) => el(sel),
  querySelectorAll: () => [],
  addEventListener() {},
  createElement: () => makeEl(),
};
const location = {
  pathname: '/',
  hash: '',
  search: '',
  origin: ORIGIN,
  href: ORIGIN + '/',
};
const sandbox = {
  DATA: payload,
  document,
  location,
  history: { pushState() {}, replaceState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { clipboard: null },
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    addListener() {},
  }),
  setTimeout() {},
  clearTimeout() {},
  console,
  AbortController,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.window.addEventListener = () => {};
sandbox.window.scrollTo = () => {};
const ctx = vm.createContext(sandbox);

try {
  vm.runInContext(
    appSrc +
      '\n;globalThis.__VIEWS = VIEWS; globalThis.__renderSyslist = renderSyslist;' +
      ' globalThis.__registerReportTools = registerReportTools; globalThis.__NAV = NAV;' +
      ' globalThis.__NAV_ICON_PATHS = NAV_ICON_PATHS;' +
      ' globalThis.__MAT_ORDER = MAT_ORDER;' +
      ' globalThis.__footHTML = footHTML;',
    ctx,
    { filename: 'app.js' },
  );
} catch (e) {
  die(
    'app script threw in the sandbox: ' +
      (e instanceof Error ? e.stack : String(e)),
  );
}

const VIEWS = sandbox.__VIEWS;
const renderSyslist = sandbox.__renderSyslist;
if (!VIEWS || typeof renderSyslist !== 'function')
  die('VIEWS / renderSyslist not exposed');

const NAV_HTML = el('#nav').innerHTML;
// Per view, not once: the footer names when the page's contents were gathered,
// and the reading list is the one page that does not answer that with the
// collection window. Taking the module-load value for every file would ship the
// overview's answer on all of them.
const footHTML = sandbox.__footHTML;
if (typeof footHTML !== 'function') die('footHTML not exposed');
const NAV_FOOT_PROBE = footHTML('overview');
if (!NAV_HTML || !NAV_FOOT_PROBE)
  die('nav or footer markup was never recorded');

/* ---------- head + body splicing ---------- */
const attrEsc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function sub(html, re, replacement, label) {
  if (!re.test(html)) die('head pattern not found: ' + label);
  return html.replace(re, () => replacement);
}

function navFor(view) {
  const active = view === 'system' ? 'systems' : view;
  const re = new RegExp(`<a href="([^"]*)" data-r="${active}">`);
  /* replace() hands back the input untouched when the pattern misses, so an
     edit to the anchor in template.html could ship every page with no current
     item and still exit 0. Two things read the attributes this matches: the
     rail's own current-page styling, and the :has() rule that keeps the byline
     on the narrow overview. Fail here rather than there. */
  if (!re.test(NAV_HTML))
    die(`no nav anchor matched for view "${view}" — the anchor markup moved`);
  return NAV_HTML.replace(
    re,
    (m, h) =>
      `<a class="on" aria-current="page" href="${h}" data-r="${active}">`,
  );
}

// Where a route's markdown twin lives. Two things read it: the <link
// rel="alternate"> below, and the check on the page-level download further
// down, which is why it is one function and not two expressions.
const mdFor = (p) => (p === '/' ? '/index.md' : p + '.md');

function page({ path, view, title, description, body, noindex }) {
  const url = ORIGIN + path;
  const mdHref = mdFor(path);
  let h = shell;
  h = sub(
    h,
    /<title>[\s\S]*?<\/title>/,
    `<title>${attrEsc(title)}</title>`,
    'title',
  );
  h = sub(
    h,
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${attrEsc(description)}">`,
    'description',
  );
  h = sub(
    h,
    /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${attrEsc(title)}">`,
    'og:title',
  );
  h = sub(
    h,
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${attrEsc(description)}">`,
    'og:description',
  );
  h = sub(
    h,
    /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="${attrEsc(url)}">`,
    'og:url',
  );
  h = sub(
    h,
    /<meta name="twitter:title" content="[^"]*">/,
    `<meta name="twitter:title" content="${attrEsc(title)}">`,
    'twitter:title',
  );
  h = sub(
    h,
    /<meta name="twitter:description" content="[^"]*">/,
    `<meta name="twitter:description" content="${attrEsc(description)}">`,
    'twitter:description',
  );
  h = sub(
    h,
    /<link rel="canonical" href="[^"]*">/,
    noindex
      ? '<meta name="robots" content="noindex">'
      : `<link rel="canonical" href="${attrEsc(url)}">\n<link rel="alternate" type="text/markdown" href="${attrEsc(mdHref)}">`,
    'canonical',
  );

  // The Article JSON-LD ships on every page, so it has to name that page.
  const ld = (s) => JSON.stringify(String(s)).replace(/</g, '\\u003c');
  h = sub(h, /"headline": "[^"]*"/, `"headline": ${ld(title)}`, 'ld headline');
  h = sub(
    h,
    /"description": "[^"]*"/,
    `"description": ${ld(description)}`,
    'ld description',
  );
  h = sub(
    h,
    /"url": "https:\/\/state-of-ai-in-design-systems[^"]*"/,
    `"url": ${ld(url)}`,
    'ld url',
  );
  // Structured data reads the same claim as the page. Everything else here was
  // published once and never revised, so datePublished alone is honest; the
  // reading list is revised, and a crawler that sees no dateModified has no
  // reason to come back for it.
  if (view === 'reading') {
    h = sub(
      h,
      /"datePublished": "[^"]*"/,
      `"datePublished": ${ld(payload.meta.reading_updated)},\n  "dateModified": ${ld(payload.meta.reading_updated)}`,
      'ld reading dates',
    );
  }

  h = sub(
    h,
    /<nav id="nav" aria-label="Sections"><\/nav>/,
    `<nav id="nav" aria-label="Sections">${navFor(view)}</nav>`,
    'nav slot',
  );
  h = sub(
    h,
    /<div id="view-root"><\/div>/,
    `<div id="view-root"><div class="view on">${body}</div></div>`,
    'view-root slot',
  );
  h = sub(
    h,
    /<footer class="foot" id="foot" role="contentinfo"><\/footer>/,
    `<footer class="foot" id="foot" role="contentinfo">${footHTML(view)}</footer>`,
    'foot slot',
  );
  return h;
}

function render(route) {
  const fn = VIEWS[route.view];
  if (typeof fn !== 'function')
    die(`no view function for "${route.view}" (${route.path})`);
  let body = fn(route.arg);
  if (route.view === 'systems') {
    renderSyslist();
    const list = el('#syslist').innerHTML;
    if (!list) die('renderSyslist produced nothing');
    const n = payload.systems.length;
    body = body
      .replace(
        '<div class="syslist" id="syslist"></div>',
        `<div class="syslist" id="syslist">${list}</div>`,
      )
      .replace(
        '<p class="count" id="syscount" role="status"></p>',
        `<p class="count" id="syscount" role="status">${n} of ${n} systems</p>`,
      );
  }
  return body;
}

const written = [];
function emit(relPath, html) {
  const full = join(OUT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html, 'utf8');
  written.push([relPath, Buffer.byteLength(html)]);
}

// File-form output (matrix.html, systems/shadcn-ui.html): Netlify serves these
// extensionless with a 200, so the canonical URL never redirects. Directory
// form (matrix/index.html) made every canonical 301 to its trailing-slash twin.
const relFor = (p) =>
  p === '/' ? 'index.html' : p.replace(/^\//, '') + '.html';

let minBody = Infinity;
for (const r of routes) {
  const rel = relFor(r.path);
  const body = render(r);
  // The shell alone is ~50KB, so a file-size floor cannot catch an empty view.
  if (body.length < 400)
    die(`${r.path} rendered only ${body.length} chars of view HTML`);
  // The page-level download names its own twin from the view name, which the
  // view functions carry as a literal. Rename a route and every one of these
  // would point at a 404 that loads fine everywhere else on the page, so the
  // route table gets to say what the file is called, and the file has to exist:
  // build_md.py wrote the twins at step 2, four steps before this runs.
  const md = mdFor(r.path);
  if (!body.includes(`href="${md}" download=`))
    die(`${r.path} does not offer its markdown twin (expected href="${md}")`);
  if (!existsSync(join(OUT, md)))
    die(`${r.path} offers ${md}, which is not on disk`);
  minBody = Math.min(minBody, body.length);
  emit(rel, page({ ...r, body }));
}
emit(
  '404.html',
  page({
    path: '/404',
    view: 'system',
    title: 'Not found',
    description: 'That address is not part of this report.',
    // A sentinel id no record can collide with. Written as an escape on
    // purpose: as a raw byte it makes this whole file read as binary to
    // ripgrep, which then skips it in silence. The WebMCP tool-list check
    // and the og:image check below both went missing from a repo-wide
    // search that way, and a search that finds nothing reads like proof
    // that nothing is there.
    body: VIEWS.system('\u0000not-a-system'),
    noindex: true,
  }),
);

// Remove any directory-form twin a previous build left behind; with both
// matrix.html and matrix/index.html on disk, Netlify's resolution is ambiguous.
for (const r of routes) {
  if (r.path === '/') continue;
  const dirTwin = join(OUT, r.path.replace(/^\//, ''), 'index.html');
  if (existsSync(dirTwin)) {
    rmSync(dirTwin);
  }
  try {
    const dir = join(OUT, r.path.replace(/^\//, ''));
    if (existsSync(dir) && readdirSync(dir).length === 0)
      rmSync(dir, { recursive: true });
  } catch {
    /* dir holds md/json mirrors — keep it */
  }
}

/* ---------- guard rails: an empty page must never ship quietly ---------- */
const MIN = 2048;
const small = written.filter(([, n]) => n <= MIN);
if (small.length)
  die(
    `route files under ${MIN}B: ${small.map(([p, n]) => `${p}=${n}`).join(', ')}`,
  );
for (const [p] of written)
  if (!existsSync(join(OUT, p))) die('missing after write: ' + p);

const read = (p) => readFileSync(join(OUT, p), 'utf8');
const count = (s, needle) => s.split(needle).length - 1;

// Counted inside the rendered list only: the app script carries the same class
// name inside its own template literal.
const sysHtml = read('systems.html');
const listStart = sysHtml.indexOf('id="syslist"');
const sysList = sysHtml.slice(
  listStart,
  sysHtml.indexOf('id="foot"', listStart),
);
const nSystems = payload.systems.length;
const nSysrow = count(sysList, 'class="sysrow"');
if (nSysrow !== nSystems)
  die(`/systems.html has ${nSysrow} sysrows, expected ${nSystems}`);
const nSysGroup = count(sysList, 'class="sysgroup');
const nMaturities = new Set(payload.systems.map((s) => s.ai_maturity)).size;
if (nSysGroup !== nMaturities)
  die(`/systems.html has ${nSysGroup} cohort strips, expected ${nMaturities}`);
if (!sysHtml.includes('class="syslist-head"'))
  die('/systems.html lost its column header row');

// Group header rows and multiple tbodies now sit between the system rows, so
// count the rows that carry a row header and exclude the cohort strips.
const mxHtml = read('matrix.html');
const mxTable = mxHtml.slice(
  mxHtml.indexOf('<table class="mx">'),
  mxHtml.indexOf('</table>'),
);
const nRows = count(mxTable, '<th scope="row" class="sys">');
if (nRows !== nSystems)
  die(`/matrix.html has ${nRows} system rows, expected ${nSystems}`);
const nMxGroups = count(mxTable, 'class="mx-group');
const nMxBodies = count(mxTable, '<tbody>');
if (nMxGroups !== nMxBodies)
  die(`/matrix.html has ${nMxGroups} group rows across ${nMxBodies} tbodies`);
if (count(mxTable, 'scope="rowgroup"') !== nMxGroups)
  die('a matrix cohort strip is missing scope="rowgroup"');

const rootHtml = read('index.html');
if (!rootHtml.includes('<h1>How design systems talk to machines</h1>'))
  die('root index.html is missing the overview h1');

// Every stat tile is a claim, and every claim owes the reader the page that
// backs it up. Slice the list rather than the document: "tile" also appears in
// the print rules up in the style block.
const tilesStart = rootHtml.indexOf('<ul class="tiles">');
if (tilesStart === -1) die('root index.html is missing the stat tiles');
const tiles = rootHtml.slice(tilesStart, rootHtml.indexOf('</ul>', tilesStart));
const nTiles = count(tiles, 'class="tile"');
const tileHrefs = [...tiles.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
if (tileHrefs.length !== nTiles)
  die(
    `${nTiles} stat tiles carry ${tileHrefs.length} links; every tile needs one`,
  );
// Prerendered output is the path-routed variant, so these are route paths. The
// hash-routed artifact builds from the same source and is not prerendered.
const routePaths = new Set(routes.map((r) => r.path));
for (const h of tileHrefs)
  if (!routePaths.has(h))
    die(`a stat tile links to "${h}", which is not a route`);

// Every view in routes.json got a file, and the nav offers every one of them.
const viewRoutes = routes.filter((r) => r.view !== 'system');
for (const r of viewRoutes) {
  if (!written.some(([p]) => p === relFor(r.path)))
    die(`no file written for view route ${r.path}`);
}
const navItems = sandbox.__NAV.map(([r]) => r);
if (navItems.length !== viewRoutes.length)
  die(
    `nav has ${navItems.length} items but routes.json has ${viewRoutes.length} view routes`,
  );
for (const [r] of sandbox.__NAV) {
  if (!routes.some((x) => x.view === r))
    die(`nav item "${r}" has no route in routes.json`);
}
// Every nav item carries its icon. One template string builds all nine rows, so
// a missing glyph is a missing NAV_ICON_PATHS key rather than a typo in nine
// files, and it degrades quietly: the row still renders, just shorter than its
// neighbors. Check the map rather than the markup — a missing key still emits
// an <svg>, it just fills it with the string "undefined", so counting tags
// reports nine icons for eight glyphs.
const navIconPaths = sandbox.__NAV_ICON_PATHS || {};
const iconless = navItems.filter((r) => !navIconPaths[r]);
if (iconless.length) die(`nav items with no icon: ${iconless.join(', ')}`);
const navIcons = count(NAV_HTML, '<svg');
if (navIcons !== navItems.length)
  die(`nav has ${navItems.length} items but ${navIcons} icons`);

// Every maturity level the schema allows has to be one MAT_ORDER knows, because
// the spectrum's rung glyph counts fill from that array's index. indexOf returns
// -1 rather than throwing, so a level added to the schema alone renders a glyph
// claiming the full scale — the top of the scale, not the bottom, and the
// direction a new tier would plausibly belong in, which is what makes it likely
// to survive review. Check the vocabulary, not the markup: every band comes off
// the same template string, so a glyph count can only fail when that string is
// broken, which the short-body check above already catches.
const matOrder = sandbox.__MAT_ORDER;
if (!Array.isArray(matOrder)) die('MAT_ORDER not exposed');
const schemaLevels = systemSchema.properties.ai_maturity.enum;
const unknownLevels = schemaLevels.filter((k) => !matOrder.includes(k));
if (unknownLevels.length)
  die(
    `ai_maturity values in the schema with no MAT_ORDER entry: ${unknownLevels.join(', ')}`,
  );

// The /ai page describes tools it registers, so the two must be the same list.
const aiHtml = read('ai.html');
if (!aiHtml.includes('Use this report with AI tools'))
  die('/ai.html is missing its h1');
if (!aiHtml.includes('data-copy=')) die('/ai.html has no copy buttons');
const declared = payload.ai_page && payload.ai_page.webmcp_tools;
if (!declared || !declared.length)
  die('payload.ai_page.webmcp_tools is missing');
const captured = [];
sandbox.document.modelContext = {
  registerTool(tool) {
    if (
      !tool ||
      !tool.name ||
      !tool.description ||
      typeof tool.execute !== 'function'
    )
      die('a WebMCP tool is missing name, description or execute');
    if (
      !tool.annotations ||
      tool.annotations.readOnlyHint !== true ||
      tool.annotations.untrustedContentHint !== true
    )
      die(
        `WebMCP tool ${tool.name} is missing readOnlyHint / untrustedContentHint`,
      );
    captured.push(tool);
    return Promise.resolve();
  },
};
const handle = sandbox.__registerReportTools(payload);
sandbox.document.modelContext = undefined;
const names = captured.map((t) => t.name);
if (names.join(',') !== declared.join(','))
  die(
    `WebMCP tools ${names.join(',')} but /ai copy says ${declared.join(',')}`,
  );
for (const t of captured) {
  const res = await t.execute({ id: payload.systems[0].id, query: 'mcp' });
  if (typeof res !== 'string' || res.length < 20)
    die(`WebMCP tool ${t.name} returned no JSON string`);
  JSON.parse(res);
}
if (!handle || typeof handle.unregister !== 'function')
  die('registerReportTools returned no handle');

function allHtml(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) allHtml(p, acc);
    else if (e.name.endsWith('.html') && e.name !== 'template.html')
      acc.push(p);
  }
  return acc;
}
for (const f of allHtml(OUT)) {
  const s = readFileSync(f, 'utf8');
  for (const p of ['__DATA__', '__ROUTING__', '__OG_IMAGE__'])
    if (s.includes(p)) die(`unsubstituted ${p} in ${f}`);
}

// The card is generated and content-addressed, so its name changes with the
// counts drawn on it. This is what makes a card that disagrees with the records
// unbuildable: the tag can only name a file scripts/build_og.mjs just wrote from
// those records, and a stale name is a name with nothing behind it.
const cardNamedBy = (attr, prop) => {
  const m = rootHtml.match(
    new RegExp(`<meta ${attr}="${prop}" content="[^"]*/([^"/]+)">`),
  );
  if (!m) die(`index.html has no ${prop} tag to check`);
  return m[1];
};
const ogCard = cardNamedBy('property', 'og:image');
const twitterCard = cardNamedBy('name', 'twitter:image');
if (ogCard !== twitterCard)
  die(`og:image names ${ogCard} but twitter:image names ${twitterCard}`);
if (!existsSync(join(OUT, ogCard)))
  die(
    `og:image names ${ogCard}, which is not in dashboard/. ` +
      'Run scripts/build_og.mjs before build_dashboard.py --final.',
  );

console.log(`prerendered ${written.length} files`);
console.log(`  nav: ${navItems.length} items (${navItems.join(', ')})`);
console.log(`  webmcp tools registered and executed: ${names.join(', ')}`);
console.log(`  smallest view body: ${minBody} chars`);
console.log(
  `  smallest: ${written.reduce((a, b) => (b[1] < a[1] ? b : a)).join('=')} bytes`,
);
console.log(
  `  largest:  ${written.reduce((a, b) => (b[1] > a[1] ? b : a)).join('=')} bytes`,
);
console.log(
  `  /systems sysrows=${nSysrow} (+${nSysGroup} cohort strips)  /matrix system rows=${nRows} in ${nMxBodies} tbodies`,
);
console.log(
  `  stat tiles: ${nTiles}, each linked (${[...new Set(tileHrefs)].sort().join(' ')})`,
);
console.log(
  '  placeholder scan: clean across ' + allHtml(OUT).length + ' html files',
);
console.log(`  og:image: ${ogCard}, present in dashboard/`);
