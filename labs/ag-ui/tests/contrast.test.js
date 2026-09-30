// Every text-on-surface pair Harbor's CSS draws, in both themes, held to WCAG
// AA 4.5:1. The pairs mirror harbor.css; a new component rule that puts text
// on a surface belongs in this list.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DARK_OVERRIDES, flattenTokens } from '../src/catalog/tokens.js';

const tokens = new Map(flattenTokens().map((t) => [t.path.join('.'), t]));

/** Resolve a semantic token to a hex value in one theme. */
function hex(/** @type {string} */ name, /** @type {'light' | 'dark'} */ mode) {
  const key = mode === 'dark' && name in DARK_OVERRIDES ? DARK_OVERRIDES[/** @type {keyof typeof DARK_OVERRIDES} */ (name)] : name;
  const t = tokens.get(key);
  assert.ok(t, `unknown token ${key}`);
  return t.value.hex;
}

function luminance(/** @type {string} */ h) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const ratio = (/** @type {string} */ a, /** @type {string} */ b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [what, text token, surface token in light, surface token in dark]
const PAIRS = [
  ['body text on canvas', 'color.fg.default', 'color.bg.canvas', 'color.bg.canvas'],
  ['body text on a card', 'color.fg.default', 'color.bg.surface', 'color.bg.surface'],
  ['muted text, hints, stat labels', 'color.fg.muted', 'color.bg.surface', 'color.bg.surface'],
  ['muted text on canvas', 'color.fg.muted', 'color.bg.canvas', 'color.bg.canvas'],
  ['primary button label', 'color.fg.on-accent', 'color.accent.default', 'color.accent.default'],
  ['ghost button label', 'color.accent.default', 'color.bg.surface', 'color.bg.surface'],
  ['neutral badge', 'color.fg.default', 'color.bg.subtle', 'color.bg.subtle'],
  ['accent badge and avatar', 'color.accent.default', 'color.accent.subtle', 'color.accent.subtle'],
  ['success badge', 'color.success.fg', 'color.success.bg', 'color.bg.subtle'],
  ['warning badge', 'color.warning.fg', 'color.warning.bg', 'color.bg.subtle'],
  ['danger badge', 'color.danger.fg', 'color.danger.bg', 'color.bg.subtle'],
  ['stat change, up', 'color.success.fg', 'color.bg.surface', 'color.bg.surface'],
  ['stat change, down', 'color.danger.fg', 'color.bg.surface', 'color.bg.surface'],
  ['required marker', 'color.danger.fg', 'color.bg.surface', 'color.bg.surface'],
  ['info alert text', 'color.fg.default', 'color.accent.subtle', 'color.bg.subtle'],
  ['success alert text', 'color.fg.default', 'color.success.bg', 'color.bg.subtle'],
  ['danger alert text', 'color.fg.default', 'color.danger.bg', 'color.bg.subtle'],
];

for (const mode of /** @type {const} */ (['light', 'dark'])) {
  test(`${mode}: every text pair clears 4.5:1`, () => {
    const failures = PAIRS.map(([what, fg, bgLight, bgDark]) => {
      const r = ratio(hex(fg, mode), hex(mode === 'light' ? bgLight : bgDark, mode));
      return r >= 4.5 ? null : `${what}: ${r.toFixed(2)}:1 (${hex(fg, mode)} on ${hex(mode === 'light' ? bgLight : bgDark, mode)})`;
    }).filter(Boolean);
    assert.deepEqual(failures, []);
  });
}
