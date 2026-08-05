import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

/* The tokenizer lives in dashboard/template.html, which is source and not a
   module, so this pulls it out the way scripts/prerender.mjs does: slice the
   app script, run it in a node:vm sandbox with a DOM shim, and read the
   functions off the context. The template is the source of truth here rather
   than the generated dashboard/index.html, but the app boots itself on load —
   route() runs at the bottom of the script — so the sandbox still needs the
   real payload, which is why this suite reads build/ like the others do. */
const ROOT = new URL('..', import.meta.url);
const tpl = readFileSync(
  fileURLToPath(new URL('dashboard/template.html', ROOT)),
  'utf8',
);
const payload = JSON.parse(
  readFileSync(fileURLToPath(new URL('build/payload.json', ROOT)), 'utf8'),
);
const open = tpl.indexOf('<script id="app">');
const close = tpl.indexOf('</script>', open);
assert.ok(open !== -1 && close !== -1, 'app script not found in template');
const appSrc = tpl.slice(open + '<script id="app">'.length, close);

const makeEl = () => ({
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
  getAttribute: () => null,
  hasAttribute: () => false,
  focus() {},
  closest: () => null,
  querySelector: () => makeEl(),
  querySelectorAll: () => [],
});
const els = new Map();
const el = (key) => {
  if (!els.has(key)) els.set(key, makeEl());
  return els.get(key);
};
const sandbox = {
  DATA: payload,
  document: {
    documentElement: el(':root'),
    getElementById: (id) => el('#' + id),
    querySelector: (sel) => el(sel),
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => makeEl(),
  },
  location: {
    pathname: '/',
    hash: '',
    search: '',
    origin: 'https://example.test',
    href: 'https://example.test/',
  },
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
vm.runInContext(
  appSrc +
    '\n;globalThis.__highlightCode = highlightCode;' +
    ' globalThis.__esc = esc;' +
    ' globalThis.__HL_ALIAS = HL_ALIAS;' +
    ' globalThis.__HL_RULES = HL_RULES;',
  ctx,
  { filename: 'app.js' },
);
const {
  __highlightCode: highlightCode,
  __esc: esc,
  __HL_ALIAS: HL_ALIAS,
  __HL_RULES: HL_RULES,
} = sandbox;

/* The invariant the copy button depends on: strip the spans, turn the entities
   back into characters, and you must be holding the input again. */
const unwrap = (html) =>
  html
    .replace(/<span class="hl-[a-z]">/g, '')
    .replace(/<\/span>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const classesIn = (html) =>
  [...html.matchAll(/class="(hl-[a-z])"/g)].map((m) => m[1]);
const spansOf = (html, cls) =>
  [...html.matchAll(new RegExp(`<span class="${cls}">(.*?)</span>`, 'gs'))].map(
    (m) => m[1],
  );

const SAMPLES = {
  json: '{\n  "mcpServers": { "ds": { "url": "https://x/mcp", "n": 3, "on": true, "z": null } }\n}',
  yaml: '# a comment\nname: Build\non:\n  push:\n    branches: [main]\nsteps:\n  - uses: "actions/checkout@v4"\n',
  shell:
    '# install it\nnpx -y some-cli add --transport http "$HOME/x" | tee out.log\n',
  ts: '// a note\nimport { defineConfig } from "vite";\nexport default defineConfig({ base: `/x/`, n: 42 });\n/* block */\n',
  html: '<!-- hi -->\n<div class="a" data-x=\'y\'>\n  <a href="https://x">t</a>\n</div>\n',
  css: '/* c */\n:root { --tok: oklch(45% 0.09 152); }\na:hover { color: #ff0044; margin: 0 4px; }\n',
  markdown:
    '---\ntitle: x\n---\n\n# Heading\n\nSome prose with `inline code` and a [link](https://x).\n\n- one\n- two\n\n```json\n{"a": 1}\n```\n',
};

test('every modelled grammar round-trips byte for byte', () => {
  for (const [lang, src] of Object.entries(SAMPLES)) {
    assert.equal(unwrap(highlightCode(src, lang)), src, `${lang} round-trip`);
  }
});

test('every modelled grammar actually marks something', () => {
  for (const [lang, src] of Object.entries(SAMPLES)) {
    assert.ok(
      classesIn(highlightCode(src, lang)).length > 0,
      `${lang} produced no spans`,
    );
  }
});

test('markup in the source is escaped in every token', () => {
  const hostile = '<script>alert(1)</script>';
  for (const lang of Object.keys(SAMPLES)) {
    const out = highlightCode(hostile, lang);
    assert.ok(!/<script/.test(out), `${lang} let a raw <script through`);
    assert.equal(unwrap(out), hostile, `${lang} round-trip on hostile input`);
  }
});

test('ampersands, quotes and angle brackets survive a round-trip', () => {
  const src = '{ "a": "x < y && z > w", "b": "it\'s \\"quoted\\"" }';
  const out = highlightCode(src, 'json');
  assert.ok(!out.includes('<y'), 'unescaped < reached the output');
  assert.equal(unwrap(out), src);
});

test('an unhighlighted language is exactly esc(src)', () => {
  const src = '<b>GET /x?a=1&b=2</b>';
  for (const lang of [
    'text',
    'http',
    'sql',
    'brainfuck',
    '',
    null,
    undefined,
  ]) {
    const out = highlightCode(src, lang);
    assert.equal(out, esc(src), `expected plain output for ${String(lang)}`);
    assert.ok(
      !out.includes('<span'),
      `${String(lang)} should produce no spans`,
    );
  }
});

test('the two datasets’ disagreeing labels resolve to the same grammar', () => {
  const ts = 'const a: string = "x";';
  assert.equal(highlightCode(ts, 'typescript'), highlightCode(ts, 'ts'));
  assert.equal(highlightCode(ts, 'javascript'), highlightCode(ts, 'ts'));
  assert.equal(highlightCode(ts, 'tsx'), highlightCode(ts, 'ts'));
  const sh = 'echo "hi" # note';
  assert.equal(highlightCode(sh, 'bash'), highlightCode(sh, 'shell'));
  assert.equal(highlightCode(sh, 'sh'), highlightCode(sh, 'shell'));
  const md = '# Title';
  assert.equal(highlightCode(md, 'md'), highlightCode(md, 'markdown'));
  const yml = 'a: 1';
  assert.equal(highlightCode(yml, 'yml'), highlightCode(yml, 'yaml'));
});

test('language matching is case-insensitive', () => {
  const src = '{"a": 1}';
  assert.equal(highlightCode(src, 'JSON'), highlightCode(src, 'json'));
  assert.equal(highlightCode(src, 'Json'), highlightCode(src, 'json'));
});

test('every alias target names a real grammar', () => {
  for (const [label, key] of Object.entries(HL_ALIAS)) {
    assert.ok(HL_RULES[key], `alias ${label} points at missing grammar ${key}`);
  }
  assert.equal(Object.keys(HL_RULES).length, 7, 'expected seven grammars');
});

test('json separates a key from its value', () => {
  const out = highlightCode(
    '{"url": "https://x", "n": 3, "ok": true, "no": null}',
    'json',
  );
  assert.deepEqual(spansOf(out, 'hl-k'), [
    '&quot;url&quot;',
    '&quot;n&quot;',
    '&quot;ok&quot;',
    '&quot;no&quot;',
  ]);
  assert.deepEqual(spansOf(out, 'hl-s'), [
    '&quot;https://x&quot;',
    '3',
    'true',
    'null',
  ]);
});

test('yaml reads a comment but not a hash inside a string', () => {
  const out = highlightCode('url: "https://x#frag" # real comment', 'yaml');
  assert.deepEqual(spansOf(out, 'hl-c'), ['# real comment']);
  assert.deepEqual(spansOf(out, 'hl-k'), ['url']);
  assert.deepEqual(spansOf(out, 'hl-s'), ['&quot;https://x#frag&quot;']);
});

test('shell reads a comment but not a hash inside quotes', () => {
  const out = highlightCode("echo 'a # b' # real\nrun --flag $VAR", 'shell');
  assert.deepEqual(spansOf(out, 'hl-c'), ['# real']);
  assert.deepEqual(spansOf(out, 'hl-s'), ['&#39;a # b&#39;']);
  assert.deepEqual(spansOf(out, 'hl-k'), ['--flag', '$VAR']);
});

test('ts does not start a comment inside a string', () => {
  const out = highlightCode('const u = "https://x//y"; // after', 'ts');
  assert.deepEqual(spansOf(out, 'hl-c'), ['// after']);
  assert.deepEqual(spansOf(out, 'hl-s'), ['&quot;https://x//y&quot;']);
  assert.ok(spansOf(out, 'hl-k').includes('const'));
});

test('ts handles a block comment and a template literal', () => {
  const src = '/* a\n b */\nconst t = `x ${y} z`;';
  const out = highlightCode(src, 'ts');
  assert.deepEqual(spansOf(out, 'hl-c'), ['/* a\n b */']);
  assert.ok(spansOf(out, 'hl-s').includes('`x ${y} z`'));
  assert.equal(unwrap(out), src);
});

test('css marks a custom property and a comment', () => {
  const out = highlightCode('/* c */\n--tok: oklch(45% 0.09 152);', 'css');
  assert.deepEqual(spansOf(out, 'hl-c'), ['/* c */']);
  assert.ok(spansOf(out, 'hl-k').includes('--tok'));
});

test('html marks tags and attribute values, not attribute names', () => {
  const out = highlightCode('<a href="https://x">t</a>', 'html');
  assert.ok(spansOf(out, 'hl-k').includes('&lt;a'));
  assert.ok(spansOf(out, 'hl-s').includes('&quot;https://x&quot;'));
  assert.ok(!spansOf(out, 'hl-k').includes('href'));
});

test('markdown marks structure and leaves prose alone', () => {
  const src =
    '# Title\n\nOrdinary prose that must not be coloured.\n\n- item\n\n```json\n{"a": 1}\n```\n';
  const out = highlightCode(src, 'markdown');
  assert.deepEqual(spansOf(out, 'hl-k'), ['# Title']);
  assert.ok(out.includes('Ordinary prose that must not be coloured.'));
  assert.ok(!/<span[^>]*>Ordinary/.test(out));
  assert.equal(unwrap(out), src);
});

test('markdown does not recursively highlight fenced content', () => {
  const out = highlightCode('```json\n{"a": 1}\n```\n', 'markdown');
  assert.deepEqual(spansOf(out, 'hl-p'), ['```json', '```']);
  assert.ok(!spansOf(out, 'hl-k').includes('&quot;a&quot;'));
});

test('markdown marks an inline code span and a link target', () => {
  const out = highlightCode(
    'See `npm run check` and [docs](https://x/y).',
    'markdown',
  );
  assert.ok(spansOf(out, 'hl-s').includes('`npm run check`'));
  assert.ok(spansOf(out, 'hl-s').includes('](https://x/y)'));
});

test('a heading only counts at the start of a line', () => {
  const out = highlightCode('not a # heading\n# real heading', 'markdown');
  assert.deepEqual(spansOf(out, 'hl-k'), ['# real heading']);
});

test('empty and whitespace-only input come back unchanged', () => {
  for (const lang of Object.keys(SAMPLES)) {
    assert.equal(highlightCode('', lang), '');
    assert.equal(highlightCode('\n', lang), '\n');
    assert.equal(highlightCode('   ', lang), '   ');
  }
});

test('unterminated constructs terminate', () => {
  for (const [lang, src] of Object.entries({
    ts: 'const a = "never closed\nconst b = /* never closed',
    json: '{"a": "unterminated',
    yaml: 'a: "unterminated',
    shell: "echo 'unterminated",
    css: '/* unterminated',
    html: '<!-- unterminated',
    markdown: '```json\nunterminated',
  })) {
    assert.equal(unwrap(highlightCode(src, lang)), src, `${lang} lost bytes`);
  }
});

test('a pathological input finishes in bounded time', () => {
  const big = 'a'.repeat(100000);
  for (const lang of Object.keys(SAMPLES)) {
    const t0 = process.hrtime.bigint();
    assert.equal(unwrap(highlightCode(big, lang)), big);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    assert.ok(ms < 1000, `${lang} took ${ms.toFixed(0)}ms on 100k chars`);
  }
});

test('a real corpus snippet round-trips under its own label', () => {
  const systems = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('data/design-systems.json', ROOT)),
      'utf8',
    ),
  );
  const platforms = JSON.parse(
    readFileSync(fileURLToPath(new URL('data/platforms.json', ROOT)), 'utf8'),
  );
  const snippets = [];
  for (const s of systems) {
    for (const a of s.affordances || [])
      if (a.snippet) snippets.push(a.snippet);
    for (const t of s.techniques || []) if (t.snippet) snippets.push(t.snippet);
  }
  for (const p of platforms) {
    for (const c of p.capabilities || [])
      if (c.snippet) snippets.push(c.snippet);
  }
  assert.ok(
    snippets.length > 300,
    `expected the whole corpus, got ${snippets.length}`,
  );
  for (const sn of snippets) {
    assert.equal(
      unwrap(highlightCode(sn.content, sn.language)),
      sn.content,
      `round-trip failed for a ${sn.language} snippet`,
    );
  }
});
