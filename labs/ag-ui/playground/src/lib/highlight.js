// Two small tokenizers for the inspector's code views. They only split text
// into typed runs; joining every token's text gives back the input exactly,
// which is what the tests check. No HTML strings are built here, so nothing
// needs escaping and React renders the spans.

/** @typedef {{ t: string, v: string }} Token */

const JSON_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b|([{}[\],:])/g;

/**
 * Tokenize pretty-printed JSON: keys, strings, numbers, booleans, null and
 * punctuation. Whitespace and anything unexpected come back as plain text.
 * @param {string} src
 * @returns {Token[]}
 */
export function tokenizeJson(src) {
  /** @type {Token[]} */
  const out = [];
  let last = 0;
  for (const m of String(src).matchAll(JSON_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ t: 'plain', v: src.slice(last, at) });
    if (m[1] !== undefined) {
      if (m[2] !== undefined) {
        out.push({ t: 'key', v: m[1] });
        out.push({ t: 'punct', v: m[2] });
      } else out.push({ t: 'string', v: m[1] });
    } else if (m[3] !== undefined) out.push({ t: 'number', v: m[3] });
    else if (m[4] !== undefined) out.push({ t: 'bool', v: m[4] });
    else if (m[5] !== undefined) out.push({ t: 'null', v: m[5] });
    else out.push({ t: 'punct', v: m[6] });
    last = at + m[0].length;
  }
  if (last < src.length) out.push({ t: 'plain', v: src.slice(last) });
  return out;
}

const KEYWORDS = new Set([
  'import', 'from', 'export', 'default', 'const', 'let', 'var', 'return', 'function', 'async', 'await', 'new', 'if', 'else', 'for', 'of', 'in', 'true', 'false', 'null', 'undefined', 'typeof',
]);

const CODE_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(<\/?)([A-Z][\w.]*)|\b([a-zA-Z_$][\w$]*)(?==["{])|\b([a-zA-Z_$][\w$]*)\b|(\d+(?:\.\d+)?)/g;

/**
 * Tokenize JavaScript with JSX well enough to color it: comments, strings,
 * component tags, JSX attribute names, keywords and numbers.
 * @param {string} src
 * @returns {Token[]}
 */
export function tokenizeCode(src) {
  /** @type {Token[]} */
  const out = [];
  let last = 0;
  for (const m of String(src).matchAll(CODE_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ t: 'plain', v: src.slice(last, at) });
    if (m[1] !== undefined) out.push({ t: 'comment', v: m[1] });
    else if (m[2] !== undefined) out.push({ t: 'string', v: m[2] });
    else if (m[3] !== undefined) {
      out.push({ t: 'punct', v: m[3] });
      out.push({ t: 'tag', v: m[4] });
    } else if (m[5] !== undefined) out.push({ t: 'attr', v: m[5] });
    else if (m[6] !== undefined) out.push({ t: KEYWORDS.has(m[6]) ? 'keyword' : 'plain', v: m[6] });
    else out.push({ t: 'number', v: m[7] });
    last = at + m[0].length;
  }
  if (last < src.length) out.push({ t: 'plain', v: src.slice(last) });
  // Merge neighbouring plain runs so React renders fewer nodes.
  /** @type {Token[]} */
  const merged = [];
  for (const tok of out) {
    const prev = merged.at(-1);
    if (prev && prev.t === 'plain' && tok.t === 'plain') prev.v += tok.v;
    else merged.push({ ...tok });
  }
  return merged;
}
