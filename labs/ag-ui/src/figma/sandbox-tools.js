// Node-only tooling for the code that runs in Figma's plugin sandbox.
//
//   node src/figma/sandbox-tools.js          regenerate sandbox-source.js
//   node src/figma/sandbox-tools.js --check  exit 1 if it is stale
//
// generateSandboxSource() slices each function out of sandbox.js's *file
// text* between its `// @sandbox-begin NAME` / `// @sandbox-end NAME`
// markers, drops `export` and full-line comments, checks the syntax, and
// writes the results as JSON string literals. Browser bundles (the playground,
// Storybook) import sandbox-source.js like any module; a minifier rewrites
// code but leaves string literals alone, so the program Figma receives is the
// one written in sandbox.js whatever the bundler does.
//
// sandboxSyntaxProblems() is the guard the generator, figma-plugin/build.mjs
// and the tests share. It masks string, template, regex and comment contents
// first (a prop value "Loading...done" or a regex like /[?.]/ is not code),
// then looks for the syntax Figma's QuickJS sandbox rejects or that we choose
// to keep out of it: optional chaining, nullish coalescing, spread, and
// `catch` without a binding.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const SANDBOX_FUNCTIONS = /** @type {const} */ (['applyJsonPatch', 'serializeFigmaNode', 'figmaRuntime']);
export const SANDBOX_FILE = new URL('./sandbox.js', import.meta.url);
export const SANDBOX_SOURCE_FILE = new URL('./sandbox-source.js', import.meta.url);

/** The patterns, applied to code with every literal and comment masked out. */
export const SANDBOX_FORBIDDEN = [
  { re: /catch\s*\{/, what: '`catch` without a binding' },
  { re: /\?\.(?!\d)/, what: 'optional chaining' },
  { re: /\?\?/, what: 'nullish coalescing' },
  { re: /\.\.\.\s*[A-Za-z_$[({]/, what: 'spread syntax' },
];

const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

/**
 * Replace the contents of string, template and regex literals and of comments
 * with spaces, keeping line breaks and offsets, so a pattern search only sees
 * code. Regex literals are told from division by the token before the slash,
 * the usual heuristic; good enough for hand-written sandbox code and JSON.
 * @param {string} code
 */
export function maskLiterals(code) {
  const out = code.split('');
  const blank = (/** @type {number} */ from, /** @type {number} */ to) => {
    for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  let i = 0;
  let prev = '';
  let word = '';
  while (i < code.length) {
    const c = code[i];
    const next = code[i + 1];
    if (c === '/' && next === '/') {
      const end = code.indexOf('\n', i);
      const stop = end < 0 ? code.length : end;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (c === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end < 0 ? code.length : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < code.length && code[j] !== c) j += code[j] === '\\' ? 2 : 1;
      blank(i + 1, j);
      i = j + 1;
      prev = c;
      word = '';
      continue;
    }
    if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev) || REGEX_AFTER_WORD.has(word))) {
      let j = i + 1;
      let inClass = false;
      while (j < code.length && code[j] !== '\n') {
        if (code[j] === '\\') j += 2;
        else if (code[j] === '[') (inClass = true), j++;
        else if (code[j] === ']') (inClass = false), j++;
        else if (code[j] === '/' && !inClass) break;
        else j++;
      }
      blank(i + 1, j);
      i = j + 1;
      while (/[a-z]/i.test(code[i] ?? '')) i++;
      prev = '/';
      word = '';
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[A-Za-z0-9_$]/.test(c)) {
      let j = i;
      while (j < code.length && /[A-Za-z0-9_$]/.test(code[j])) j++;
      word = code.slice(i, j);
      prev = 'a';
      i = j;
      continue;
    }
    prev = c;
    word = '';
    i++;
  }
  return out.join('');
}

/**
 * @param {string} code
 * @returns {{ what: string, line: number, excerpt: string }[]}
 */
export function sandboxSyntaxProblems(code) {
  const masked = maskLiterals(code);
  const lines = code.split('\n');
  const problems = [];
  for (const { re, what } of SANDBOX_FORBIDDEN) {
    const global = new RegExp(re.source, 'g');
    for (const m of masked.matchAll(global)) {
      const line = masked.slice(0, m.index).split('\n').length;
      problems.push({ what, line, excerpt: lines[line - 1].trim().slice(0, 120) });
    }
  }
  return problems;
}

/**
 * Throw if `code` would not run in the sandbox: forbidden syntax, or a parse
 * error. `wrap` parses it the way the Desktop Bridge runs figma_execute code,
 * as the body of an async function.
 * @param {string} code
 * @param {{ wrap?: boolean, filename?: string }} [options]
 */
export function checkSandboxScript(code, { wrap = true, filename = 'sandbox script' } = {}) {
  const problems = sandboxSyntaxProblems(code);
  if (problems.length) throw new Error(`${filename} is not sandbox-safe:\n${problems.map((p) => `  line ${p.line}: ${p.what}: ${p.excerpt}`).join('\n')}`);
  new vm.Script(wrap ? `(async function () {\n${code}\n})` : code, { filename });
  return true;
}

/**
 * The three sandbox functions as source text, cut from sandbox.js.
 * @param {string} [text] sandbox.js's contents
 * @returns {Record<typeof SANDBOX_FUNCTIONS[number], string>}
 */
export function extractSandboxFunctions(text = readFileSync(SANDBOX_FILE, 'utf8')) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const name of SANDBOX_FUNCTIONS) {
    const begin = `// @sandbox-begin ${name}\n`;
    const end = `\n// @sandbox-end ${name}`;
    const i = text.indexOf(begin);
    const j = i < 0 ? -1 : text.indexOf(end, i);
    if (i < 0 || j < 0) throw new Error(`sandbox.js has no @sandbox-begin/@sandbox-end markers around ${name}.`);
    const source = text
      .slice(i + begin.length, j)
      .replace(/^export\s+/, '')
      .split('\n')
      .filter((line) => !/^\s*\/\//.test(line))
      .join('\n');
    if (!new RegExp(`^(async\\s+)?function\\s+${name}\\(`).test(source)) throw new Error(`The ${name} markers must enclose exactly the function declaration.`);
    checkSandboxScript(`const f = ${source};`, { filename: `sandbox.js#${name}` });
    out[name] = source;
  }
  return /** @type {any} */ (out);
}

/** JSON that is also valid inside JS source and an HTML <script>. */
const literal = (/** @type {string} */ s) =>
  JSON.stringify(s).replace(/</g, '\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

/** The text of sandbox-source.js for the given functions. */
export function renderSandboxSource(fns = extractSandboxFunctions()) {
  return [
    '// Generated by src/figma/sandbox-tools.js from src/figma/sandbox.js. Do not edit;',
    '// run `node src/figma/sandbox-tools.js` after changing sandbox.js.',
    '// String literals on purpose: a bundler that minifies this module cannot',
    '// change the code Figma runs.',
    '',
    'export const SANDBOX_SOURCE = {',
    ...SANDBOX_FUNCTIONS.map((name) => `  ${name}: ${literal(fns[name])},`),
    '};',
    '',
  ].join('\n');
}

/** Regenerate sandbox-source.js; returns the function sources. */
export function writeSandboxSource() {
  const fns = extractSandboxFunctions();
  const text = renderSandboxSource(fns);
  let current = '';
  try {
    current = readFileSync(SANDBOX_SOURCE_FILE, 'utf8');
  } catch {
    current = '';
  }
  if (current !== text) writeFileSync(SANDBOX_SOURCE_FILE, text);
  return fns;
}

/** True when sandbox-source.js matches sandbox.js. */
export function sandboxSourceIsCurrent() {
  try {
    return readFileSync(SANDBOX_SOURCE_FILE, 'utf8') === renderSandboxSource();
  } catch {
    return false;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--check')) {
    if (!sandboxSourceIsCurrent()) {
      console.error('src/figma/sandbox-source.js is stale; run `node src/figma/sandbox-tools.js`.');
      process.exitCode = 1;
    }
  } else {
    writeSandboxSource();
    console.log('Wrote src/figma/sandbox-source.js.');
  }
}
