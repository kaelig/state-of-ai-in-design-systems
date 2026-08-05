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
    ' globalThis.__HL_RULES = HL_RULES;' +
    ' globalThis.__highlightSnippets = highlightSnippets;',
  ctx,
  { filename: 'app.js' },
);
const {
  __highlightCode: highlightCode,
  __esc: esc,
  __HL_ALIAS: HL_ALIAS,
  __HL_RULES: HL_RULES,
  __highlightSnippets: highlightSnippets,
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
  html: '<!DOCTYPE html>\n<!-- hi -->\n<div class="a" data-x=\'y\'>\n  <a href="https://x">t</a>\n</div>\n',
  css: '/* c */\n@media print {\n  :root { --tok: oklch(45% 0.09 152); }\n}\na:hover { color: #ff0044; margin: 0 4px; }\n',
  markdown:
    '---\ntitle: x\n---\n\n# Heading\n\nSome prose with `inline code` and a [link](https://x).\n\n- one\n- two\n\n```json\n{"a": 1}\n```\n',
};

test('every modeled grammar round-trips byte for byte', () => {
  for (const [lang, src] of Object.entries(SAMPLES)) {
    assert.equal(unwrap(highlightCode(src, lang)), src, `${lang} round-trip`);
  }
});

test('every modeled grammar actually marks something', () => {
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
    '# Title\n\nOrdinary prose that must not be colored.\n\n- item\n\n```json\n{"a": 1}\n```\n';
  const out = highlightCode(src, 'markdown');
  assert.deepEqual(spansOf(out, 'hl-k'), ['# Title']);
  assert.ok(out.includes('Ordinary prose that must not be colored.'));
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

/* Every snippet that reaches a <pre> on the site, including the /ai install
   configs — those are the ones a reader copies and pastes into a client, so a
   tokenizer that dropped a byte there would break the thing the page exists to
   hand over. Read from the payload rather than data/, because the /ai blocks
   are synthesized at build time and live nowhere else. */
function corpusSnippets() {
  const out = [];
  for (const s of payload.systems || []) {
    for (const a of s.affordances || []) if (a.snippet) out.push(a.snippet);
    for (const t of s.techniques || []) if (t.snippet) out.push(t.snippet);
  }
  for (const p of payload.platforms || []) {
    for (const c of p.capabilities || []) if (c.snippet) out.push(c.snippet);
  }
  for (const sec of (payload.ai_page && payload.ai_page.sections) || []) {
    for (const b of sec.blocks || []) {
      if (b.type === 'code') out.push({ language: b.lang, content: b.text });
      if (b.type === 'configs')
        for (const i of b.items || [])
          out.push({ language: i.lang, content: i.code });
    }
  }
  return out;
}

test('a real corpus snippet round-trips under its own label', () => {
  const snippets = corpusSnippets();
  assert.ok(
    snippets.length > 308,
    `expected the whole corpus plus the /ai blocks, got ${snippets.length}`,
  );
  for (const sn of snippets) {
    assert.equal(
      unwrap(highlightCode(sn.content, sn.language)),
      sn.content,
      `round-trip failed for a ${sn.language} snippet`,
    );
  }
});

/* ---------- the DOM pass ---------- */

/* A snippet, shaped the way snippetHTML() builds it: a .snip wrapper holding a
   .snip-bar with the language label and a <pre id="sn-…"><code>. Only the parts
   highlightSnippets() actually reaches are modeled. */
function makeSnippet(lang, content) {
  /* innerHTML starts null to mean "the pass never wrote here", which is what
     the unmodeled-language test asserts. Annotated, or the literal null
     narrows the property to the null type and reading it back is an error. */
  /** @type {{ textContent: string, innerHTML: string | null }} */
  const code = { textContent: content, innerHTML: null };
  const pre = {
    id: 'sn-x',
    attrs: { tabindex: '0', role: 'group', 'aria-label': `${lang} snippet` },
    querySelector: (sel) => (sel === 'code' ? code : null),
  };
  const label = { textContent: lang };
  const snip = {
    querySelector: (sel) => (sel === '.snip-bar .lang' ? label : null),
  };
  pre.parentNode = snip;
  return {
    code,
    pre,
    root: {
      querySelectorAll: (sel) => (sel === 'pre[id^="sn-"]' ? [pre] : []),
    },
  };
}

test('the pass no-ops under the prerender shim instead of throwing', () => {
  assert.doesNotThrow(() => highlightSnippets({ querySelectorAll: () => [] }));
});

test('the pass survives a missing or unusable root', () => {
  assert.doesNotThrow(() => highlightSnippets());
  assert.doesNotThrow(() => highlightSnippets(null));
  assert.doesNotThrow(() => highlightSnippets({}));
  assert.doesNotThrow(() =>
    highlightSnippets({ querySelectorAll: 'not a function' }),
  );
});

test('a modeled language is written into the code element', () => {
  const { code, root } = makeSnippet('json', '{"a": 1}');
  highlightSnippets(root);
  assert.equal(code.innerHTML, highlightCode('{"a": 1}', 'json'));
  /* Optional chaining, not a bare call: innerHTML starts null to mean "never
     written", which is what the unmodeled-language test below asserts. */
  assert.ok(code.innerHTML?.includes('<span class="hl-k">'));
});

test('an unmodeled language is left exactly as it was', () => {
  for (const lang of ['text', 'http', 'sql']) {
    const { code, root } = makeSnippet(lang, '<b>raw</b>');
    highlightSnippets(root);
    assert.equal(
      code.innerHTML,
      null,
      `${lang} should not have been rewritten`,
    );
  }
});

test('a snippet with no language label is left alone', () => {
  const { code, pre, root } = makeSnippet('json', '{"a": 1}');
  pre.parentNode = { querySelector: () => null };
  highlightSnippets(root);
  assert.equal(code.innerHTML, null);
});

test('a snippet with no code element is skipped without throwing', () => {
  const { pre, root } = makeSnippet('json', '{"a": 1}');
  pre.querySelector = () => null;
  assert.doesNotThrow(() => highlightSnippets(root));
});

test('the label is matched however the bar cased it', () => {
  const { code, root } = makeSnippet('  JSON  ', '{"a": 1}');
  highlightSnippets(root);
  assert.equal(code.innerHTML, highlightCode('{"a": 1}', 'json'));
});

test('the pre keeps its id, tab stop, role and label', () => {
  const { pre, root } = makeSnippet('json', '{"a": 1}');
  const before = { id: pre.id, ...pre.attrs };
  highlightSnippets(root);
  assert.equal(pre.id, before.id);
  assert.deepEqual(pre.attrs, {
    tabindex: before.tabindex,
    role: before.role,
    'aria-label': before['aria-label'],
  });
});

test('running the pass twice does not nest spans', () => {
  const { code, root } = makeSnippet('json', '{"a": 1}');
  highlightSnippets(root);
  const once = code.innerHTML;
  /* textContent flattens what the first pass wrote, the way a real DOM would. */
  code.textContent = '{"a": 1}';
  highlightSnippets(root);
  assert.equal(code.innerHTML, once);
});

/* ---------- what the review found ---------- */

/* The bug this file exists to prevent from coming back. Every quote rule is
   bounded to one line, because an apostrophe in somebody's prose opened a
   string that closed fourteen lines later and twelve snippets shipped that way.
   The round-trip assertions above cannot see it — the bytes are all still
   there — and neither can a marks-something check, because a runaway span is
   still a span. */
const LINE_BOUNDED = ['json', 'yaml', 'shell', 'ts', 'html', 'css'];

test('a value token never crosses a newline in a line-bounded grammar', () => {
  const prose =
    "roleDefinition: >-\n  Use Bob's standard voice and tone to provide kind,\n  concise triage for the design system.\n  Answer in full sentences.\n";
  for (const lang of LINE_BOUNDED) {
    for (const s of spansOf(highlightCode(prose, lang), 'hl-s')) {
      assert.ok(
        !s.includes('\n'),
        `${lang} ran a value token across a newline: ${JSON.stringify(s.slice(0, 60))}`,
      );
    }
  }
});

test('an unbalanced backtick does not swallow the rest of a ts snippet', () => {
  const src = '```json\n{"a": 1}\n```\nmore prose that must stay plain\n';
  for (const s of spansOf(highlightCode(src, 'ts'), 'hl-s')) {
    assert.ok(!s.includes('\n'), 'a template literal ran past its line');
  }
});

test('no value token crosses a newline anywhere in the corpus', () => {
  const langs = new Set(
    Object.keys(HL_ALIAS).filter((l) => LINE_BOUNDED.includes(HL_ALIAS[l])),
  );
  for (const sn of corpusSnippets()) {
    if (!langs.has(String(sn.language || '').toLowerCase())) continue;
    for (const s of spansOf(highlightCode(sn.content, sn.language), 'hl-s')) {
      assert.ok(
        !s.includes('\n'),
        `a ${sn.language} snippet has a runaway value token: ${JSON.stringify(s.slice(0, 60))}`,
      );
    }
  }
});

/* unwrap() decodes &amp; last, and that ordering is the whole correctness of
   this file's central assertion: esc() turns a literal '&lt;' into '&amp;lt;',
   and only decoding the ampersand after the others recovers it. Flip the order
   and every round-trip test above still passes while the helper is wrong. */
test('the round-trip helper decodes entities in the right order', () => {
  assert.equal(esc('&lt;'), '&amp;lt;');
  assert.equal(unwrap(esc('&lt;')), '&lt;');
  assert.equal(unwrap(esc('&amp;')), '&amp;');
  for (const raw of ['&lt;', '&amp;amp;', 'a & b', '<&>', '&#39;']) {
    assert.equal(unwrap(esc(raw)), raw, `helper mangled ${raw}`);
  }
});

/* The class name is interpolated into the span unescaped. That is safe only
   while every class is a literal in HL_RULES, so assert the set is closed
   rather than trusting inspection. */
test('the token class set is closed', () => {
  const declared = [
    ...new Set(
      Object.values(HL_RULES)
        .flat()
        .map(([cls]) => cls),
    ),
  ].sort();
  assert.deepEqual(declared, ['hl-c', 'hl-k', 'hl-p', 'hl-s']);
});

/* Stronger than "no <script got through": every < in the output must open one
   of our own tags and every & must open a known entity. This is the shape that
   catches a future grammar whose class name is computed rather than literal. */
test('every angle bracket and ampersand in the output is ours', () => {
  const soup = '<>&"\'\\/*`${}[]#-|:\n\t</span><span class="x">&amp;&#39;&lt;';
  for (const lang of Object.keys(SAMPLES)) {
    const out = highlightCode(soup, lang);
    const skeleton = out
      .replace(/<span class="hl-[cskp]">/g, '')
      .replace(/<\/span>/g, '');
    assert.ok(!skeleton.includes('<'), `${lang} emitted a foreign <`);
    const stray = skeleton.replace(/&(amp|lt|gt|quot|#39);/g, '');
    assert.ok(!stray.includes('&'), `${lang} emitted an unknown entity`);
    assert.equal(unwrap(out), soup, `${lang} round-trip on metacharacter soup`);
  }
});

test('json marks punctuation, not only keys and values', () => {
  const out = highlightCode('{"a": [1, 2]}', 'json');
  assert.deepEqual(spansOf(out, 'hl-p'), ['{', ':', '[', ',', ']', '}']);
});

test('ts marks punctuation', () => {
  const out = highlightCode('const a = f(1);', 'ts');
  assert.ok(spansOf(out, 'hl-p').includes('='));
  assert.ok(spansOf(out, 'hl-p').includes(';'));
});

test('html marks a doctype', () => {
  const out = highlightCode('<!DOCTYPE html>\n<p>x</p>', 'html');
  assert.ok(spansOf(out, 'hl-k').includes('&lt;!DOCTYPE html&gt;'));
});

test('css marks an at-rule', () => {
  const out = highlightCode('@media print { a { color: red; } }', 'css');
  assert.ok(spansOf(out, 'hl-k').includes('@media'));
});

/* The previous version of this test used 'a'.repeat(100000), which is the
   fastest input the tokenizer can take: no rule matches anywhere, so it
   exercises only the plain-accumulation branch. The real risk is an opener
   that never closes, which restarts an unbounded scan at every one of its
   kind. */
test('unclosed openers finish in bounded time', () => {
  const cases = {
    markdown: '](a',
    shell: '${a',
    ts: '/*a',
    css: '/*a',
    html: '<!--a',
    json: '"a',
    yaml: "'a",
  };
  for (const [lang, unit] of Object.entries(cases)) {
    const big = unit.repeat(Math.ceil(100000 / unit.length));
    const t0 = process.hrtime.bigint();
    const out = highlightCode(big, lang);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    assert.equal(unwrap(out), big, `${lang} lost bytes on ${unit}`);
    assert.ok(ms < 1000, `${lang} took ${ms.toFixed(0)}ms on 100k of ${unit}`);
  }
});

test('a snippet past the length ceiling renders plain rather than slowly', () => {
  const huge = '](a'.repeat(20000);
  assert.equal(highlightCode(huge, 'markdown'), esc(huge));
});
