// One DTCG file feeds both sides of the loop: CSS custom properties for the
// React components, and Figma variables for the plugin. When the agent changes
// `theme` in shared state, both surfaces swap the same token set.

import tokens from './tokens.json' with { type: 'json' };

/**
 * @typedef {{ path: string[], type: string, value: any, alias?: string[] }} FlatToken
 */

/**
 * Flatten a DTCG document into tokens with resolved values. `$type` inherits
 * from the nearest group; `{a.b.c}` aliases resolve against the same document
 * and keep a record of what they pointed at.
 * @param {Record<string, any>} doc
 * @returns {FlatToken[]}
 */
export function flattenTokens(doc = tokens) {
  /** @type {FlatToken[]} */
  const out = [];
  const walk = (/** @type {Record<string, any>} */ node, /** @type {string[]} */ path, /** @type {string | undefined} */ type) => {
    const t = node.$type ?? type;
    if ('$value' in node) {
      out.push({ path, type: String(t), value: node.$value });
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (!k.startsWith('$') && v && typeof v === 'object') walk(v, [...path, k], t);
    }
  };
  walk(doc, [], undefined);

  const byPath = new Map(out.map((t) => [t.path.join('.'), t]));
  const resolve = (/** @type {FlatToken} */ t, /** @type {Set<string>} */ seen) => {
    const m = typeof t.value === 'string' ? t.value.match(/^\{([^}]+)\}$/) : null;
    if (!m) return t.value;
    const key = m[1];
    if (seen.has(key)) throw new Error(`Token alias cycle at ${key}`);
    const target = byPath.get(key);
    if (!target) throw new Error(`Unknown token ${key} in ${t.path.join('.')}`);
    t.alias ??= key.split('.');
    return resolve(target, new Set([...seen, key]));
  };
  for (const t of out) t.value = resolve(t, new Set());
  return out;
}

/** A DTCG value as a CSS value. */
export function cssValue(/** @type {FlatToken} */ t) {
  if (t.type === 'color') return t.value.hex ?? `color(srgb ${t.value.components.join(' ')})`;
  if (t.type === 'dimension') return `${t.value.value}${t.value.unit}`;
  return String(t.value);
}

/** `color.bg.canvas` -> `--harbor-color-bg-canvas` */
export const cssVar = (/** @type {string[]} */ path, prefix = 'harbor') => `--${prefix}-${path.join('-')}`;

/**
 * Custom properties for every token. Semantic tokens reference their palette
 * token with var() so a theme can override the palette alone.
 * @param {{ selector?: string, prefix?: string, doc?: Record<string, any> }} [options]
 */
export function tokensToCss({ selector = ':root', prefix = 'harbor', doc = tokens } = {}) {
  const lines = flattenTokens(doc).map((t) => {
    const value = t.alias ? `var(${cssVar(t.alias, prefix)})` : cssValue(t);
    return `  ${cssVar(t.path, prefix)}: ${value};`;
  });
  return `${selector} {\n${lines.join('\n')}\n}\n`;
}

/**
 * Dark mode as overrides of the semantic layer only. Kept here rather than as
 * a second DTCG file because the lab needs one alternate theme, not a resolver.
 */
export const DARK_OVERRIDES = {
  'color.bg.canvas': 'palette.gray.900',
  'color.bg.surface': 'palette.gray.800',
  'color.bg.subtle': 'palette.gray.700',
  'color.fg.default': 'palette.gray.50',
  'color.fg.muted': 'palette.gray.200',
  'color.border.default': 'palette.gray.700',
  'color.accent.default': 'palette.blue.300',
  'color.accent.hover': 'palette.blue.100',
  'color.accent.subtle': 'palette.gray.700',
  'color.fg.on-accent': 'palette.gray.900',
  // Status text sits on dark surfaces in dark mode (a Stat's change, a
  // required marker), so it needs the light steps to keep 4.5:1.
  'color.success.fg': 'palette.green.300',
  'color.warning.fg': 'palette.amber.300',
  'color.danger.fg': 'palette.red.300',
};

export function darkCss(selector = '[data-harbor-mode="dark"]', prefix = 'harbor') {
  const lines = Object.entries(DARK_OVERRIDES).map(([k, v]) => `  ${cssVar(k.split('.'), prefix)}: var(${cssVar(v.split('.'), prefix)});`);
  return `${selector} {\n${lines.join('\n')}\n}\n`;
}

/**
 * Figma variable definitions, in the shape the Plugin API wants: collection,
 * name with slashes, resolved type, and either a value or an alias target.
 * @returns {{ collection: string, name: string, resolvedType: 'COLOR' | 'FLOAT', value?: any, aliasOf?: string }[]}
 */
export function tokensToFigmaVariables(doc = tokens) {
  return flattenTokens(doc)
    .filter((t) => ['color', 'dimension', 'fontWeight'].includes(t.type))
    .map((t) => {
      const name = t.path.join('/');
      const collection = t.path[0] === 'palette' ? 'Harbor palette' : 'Harbor';
      const resolvedType = t.type === 'color' ? 'COLOR' : 'FLOAT';
      if (t.alias) return { collection, name, resolvedType, aliasOf: t.alias.join('/') };
      const value = t.type === 'color' ? { r: t.value.components[0], g: t.value.components[1], b: t.value.components[2], a: t.value.alpha ?? 1 } : t.type === 'dimension' ? t.value.value : t.value;
      return { collection, name, resolvedType, value };
    });
}
