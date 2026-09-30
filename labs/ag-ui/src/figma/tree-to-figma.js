// Harbor UI tree -> Figma. The functions here build one JavaScript program
// that runs in the Figma Plugin API context and draws (or patches) a Harbor
// screen with real components where the file has them, Harbor variables
// everywhere, and faithful auto-layout primitives where it does not.
//
// The same program runs in three hosts, unchanged:
//
//   Figma Console MCP  `figma_execute` { code, timeout?, fileKey? }. The
//                      Desktop Bridge wraps `code` as
//                      "(async function() {\n" + code + "\n})()" and evals
//                      it, so top-level `await` and `return` work and the
//                      return value comes back as the tool result.
//                      Tool: src/core/write-tools.ts at
//                      https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/src/core/write-tools.ts
//                      Wrapper: figma-desktop-bridge/code.js#L489-L520 at
//                      https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/code.js#L489-L520
//                      (also read in the npm 1.40.7 tarball, dist/core/write-tools.js
//                      and figma-desktop-bridge/code.js).
//   Figma's MCP        `use_figma`: "Write plain JavaScript with top-level
//                      `await` and `return`. Code is automatically wrapped in
//                      an async context." (figma-use skill, served by Figma's
//                      MCP server as skill://figma/figma-use/SKILL.md).
//   Harbor plugin      figma-plugin/build.mjs embeds figmaRuntime into the
//                      plugin's main thread and calls it directly.
//
// Sandbox rules the runtime follows (it is shipped as source text by
// Function.prototype.toString, so it may not close over anything in this
// module): no optional chaining ("Figma plugin sandbox doesn't support it",
// Desktop Bridge code.js), no nullish coalescing, no object spread, no bare
// `catch {}`, no AsyncFunction constructor ("AsyncFunction is restricted in
// Figma's plugin sandbox", same file). A test enforces the first four.
//
// Incremental application is a keyed reconciler, not a list of op handlers.
// The screen frame stores the whole tree in shared plugin data; a patch loads
// it, applies the JSON Patch ops (AG-UI STATE_DELTA) with applyJsonPatch, and
// reconciles the canvas against the result by node id:
//
//   node added              the one new layer is built and inserted
//   child appended/moved    the existing layer is moved (insertChild)
//   prop on an instance     setProperties on that instance, nothing redrawn
//   prop on a container     Stack/Grid/Card re-configured in place, same layer
//   prop on a primitive     that one leaf layer is rebuilt (text, button...)
//   type changed            that one layer is rebuilt, its children moved over
//   node removed            that layer is removed
//   /theme/mode             one setExplicitVariableModeForCollection call
//
// What falls back to a full redraw: a patch that does not apply to the stored
// tree (bad path, failed test op, an op on "" or moving from outside /ui), or
// a screen frame that is missing or has no stored tree. The script then
// returns { ok: false, needsRedraw: true } and the caller sends a draw with
// its own copy of the state. A draw is itself a reconcile, so redrawing an
// unchanged tree touches nothing.

import { catalogId } from '../catalog/index.js';
import tokens from '../catalog/tokens.json' with { type: 'json' };
import { DARK_OVERRIDES, tokensToFigmaVariables } from '../catalog/tokens.js';
import { applyJsonPatch } from './figma-to-tree.js';

export const PAYLOAD_VERSION = 1;
export const PLUGIN_DATA_NAMESPACE = 'agui';

/**
 * @typedef {import('../tree/tree.js').UITree} UITree
 * @typedef {import('../catalog/index.js').Catalog} Catalog
 * @typedef {{ kind: 'nodes' | 'none', defaults: Record<string, any>, figma: { component: string | null, key?: string, properties?: Record<string, string> } }} CompactContract
 * @typedef {{ name: string, id: string, components: Record<string, CompactContract> }} CompactCatalog
 * @typedef {{ collection: string, name: string, resolvedType: 'COLOR' | 'FLOAT', value?: any, aliasOf?: string, darkAliasOf?: string, scopes: string[] }} VariableDef
 * @typedef {{
 *   frameName?: string,
 *   key?: string,
 *   tokens?: Record<string, any>,
 *   theme?: { mode?: 'light' | 'dark', density?: string },
 *   width?: number,
 *   syncVariables?: boolean,
 *   searchLocal?: boolean,
 *   fontFamily?: string,
 * }} FigmaScriptOptions
 * @typedef {{
 *   ok: boolean, op: 'draw' | 'patch', key: string, frameId?: string, frameName?: string,
 *   created: { nodeId: string, id: string, type: string, via: string }[],
 *   updated: { nodeId: string, id: string, how: 'props' | 'rebuilt', replaced?: string }[],
 *   removed: string[],
 *   warnings: { message: string, nodeId?: string }[],
 *   variables: { collectionsCreated: number, variablesCreated: number, variablesUpdated: number, darkMode: string },
 *   needsRedraw?: boolean, reason?: string, ignoredOps?: number,
 * }} FigmaRunSummary
 */

/**
 * The slice of the catalog the Figma program needs: children kind, prop
 * defaults and the figma mapping. Keeps the script small enough to send as a
 * tool argument on every patch.
 * @param {Catalog} catalog
 * @param {Iterable<string>} [types] only these component types
 * @returns {CompactCatalog}
 */
export function compactCatalog(catalog, types) {
  const only = types ? new Set(types) : null;
  /** @type {Record<string, CompactContract>} */
  const components = {};
  for (const [type, c] of Object.entries(catalog.components)) {
    if (only && !only.has(type)) continue;
    /** @type {Record<string, any>} */
    const defaults = {};
    for (const [name, s] of Object.entries(c.props?.properties ?? {})) if (s.default !== undefined) defaults[name] = s.default;
    components[type] = { kind: c.children?.kind === 'nodes' ? 'nodes' : 'none', defaults, figma: c.figma ?? { component: null } };
  }
  return { name: catalog.name, id: catalogId(catalog), components };
}

/**
 * Harbor's tokens as Figma variable definitions: the palette as hidden
 * primitives, the semantic layer aliasing it, with a Dark mode alias for every
 * token DARK_OVERRIDES changes and scopes so each variable shows up only in
 * the pickers it belongs to.
 * @param {Record<string, any>} [doc] a DTCG document; Harbor's by default
 * @returns {VariableDef[]}
 */
export function figmaVariableDefs(doc = tokens) {
  /** @type {Record<string, string>} */
  const dark = {};
  for (const [k, v] of Object.entries(DARK_OVERRIDES)) dark[k.split('.').join('/')] = v.split('.').join('/');
  return tokensToFigmaVariables(doc).map((d) => {
    /** @type {VariableDef} */
    const out = { ...d, scopes: scopesFor(d.name) };
    if (dark[d.name]) out.darkAliasOf = dark[d.name];
    return out;
  });
}

/** Variable scopes by token path. Primitives are hidden from pickers; semantic tokens are what designers pick. */
function scopesFor(/** @type {string} */ name) {
  if (name.startsWith('palette/')) return [];
  if (name.startsWith('color/bg/')) return ['FRAME_FILL', 'SHAPE_FILL'];
  if (name.startsWith('color/fg/')) return ['TEXT_FILL', 'SHAPE_FILL'];
  if (name.startsWith('color/border/')) return ['STROKE_COLOR'];
  if (name.startsWith('color/')) return ['ALL_FILLS', 'STROKE_COLOR'];
  if (name.startsWith('space/')) return ['GAP'];
  if (name.startsWith('radius/')) return ['CORNER_RADIUS'];
  if (name.startsWith('font/size/')) return ['FONT_SIZE'];
  if (name.startsWith('font/weight/')) return ['FONT_WEIGHT'];
  return ['ALL_SCOPES'];
}

/** Component types a tree uses. */
const typesIn = (/** @type {UITree} */ tree) => new Set(Object.values(tree?.nodes ?? {}).map((n) => n?.type));

/**
 * The payload for a full draw. A draw reconciles, so it is also the way to
 * resynchronize a frame after a patch could not apply.
 * @param {UITree} tree
 * @param {Catalog} catalog
 * @param {FigmaScriptOptions} [options]
 */
export function drawPayload(tree, catalog, options = {}) {
  const frameName = options.frameName ?? (tree.title || 'Harbor screen');
  return {
    v: PAYLOAD_VERSION,
    op: /** @type {const} */ ('draw'),
    key: options.key ?? frameName,
    frameName,
    tree,
    theme: options.theme ?? {},
    catalog: compactCatalog(catalog, typesIn(tree)),
    variables: figmaVariableDefs(options.tokens),
    options: pickOptions(options, { syncVariables: true }),
  };
}

/**
 * The payload for an incremental update: JSON Patch ops as they arrive in
 * AG-UI STATE_DELTA, relative to the state document (tree at `base`, theme at
 * `/theme`). Ops on other paths are ignored.
 * @param {import('@ag-ui/core').JsonPatchOperation[]} ops
 * @param {Catalog} catalog
 * @param {FigmaScriptOptions & { base?: string }} [options]
 */
export function patchPayload(ops, catalog, options = {}) {
  const base = options.base ?? '/ui';
  if (!/^\/[^/]+$/.test(base)) throw new Error(`base must be a single JSON Pointer segment like "/ui", got "${base}"`);
  return {
    v: PAYLOAD_VERSION,
    op: /** @type {const} */ ('patch'),
    key: options.key ?? options.frameName ?? 'Harbor screen',
    frameName: options.frameName,
    ops,
    base,
    catalog: compactCatalog(catalog),
    variables: figmaVariableDefs(options.tokens),
    options: pickOptions(options, { syncVariables: false }),
  };
}

/** @param {FigmaScriptOptions} options @param {Record<string, any>} defaults */
function pickOptions(options, defaults) {
  /** @type {Record<string, any>} */
  const out = { ...defaults };
  for (const k of ['width', 'syncVariables', 'searchLocal', 'fontFamily']) {
    if (/** @type {any} */ (options)[k] !== undefined) out[k] = /** @type {any} */ (options)[k];
  }
  return out;
}

/**
 * A function's source as it will run in the sandbox, minus full-line comments
 * (they are for readers of this file, not worth shipping on every patch).
 * @param {Function} fn
 */
export function sandboxSource(fn) {
  return fn
    .toString()
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');
}

/** JSON that is also safe inside a JS source file and an HTML <script>. */
export const jsonForSource = (/** @type {unknown} */ value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .split(String.fromCharCode(0x2028))
    .join('\\u2028')
    .split(String.fromCharCode(0x2029))
    .join('\\u2029');

/**
 * Wrap a payload in the program. The result is a function body: top-level
 * `await` and `return`, the `figma` global in scope.
 * @param {ReturnType<typeof drawPayload> | ReturnType<typeof patchPayload>} payload
 */
export function scriptFromPayload(payload) {
  return [
    `// Harbor -> Figma (${payload.op}), generated by labs/ag-ui/src/figma/tree-to-figma.js.`,
    '// Runs in the Figma plugin sandbox: pass it to figma_execute or use_figma as is.',
    `const payload = ${jsonForSource(payload)};`,
    `const applyJsonPatch = ${sandboxSource(applyJsonPatch)};`,
    `const figmaRuntime = ${sandboxSource(figmaRuntime)};`,
    'return await figmaRuntime(figma, payload, { applyJsonPatch });',
  ].join('\n');
}

/**
 * The program that draws `tree` into a frame, returning a FigmaRunSummary.
 * @param {UITree} tree
 * @param {Catalog} catalog
 * @param {FigmaScriptOptions} [options]
 */
export function treeToFigmaScript(tree, catalog, options = {}) {
  return scriptFromPayload(drawPayload(tree, catalog, options));
}

/**
 * The program that applies AG-UI STATE_DELTA ops to a frame drawn earlier with
 * the same `key`, returning a FigmaRunSummary (with needsRedraw when it could
 * not apply them).
 * @param {import('@ag-ui/core').JsonPatchOperation[]} ops
 * @param {Catalog} catalog
 * @param {FigmaScriptOptions & { base?: string }} [options]
 */
export function opsToFigmaScript(ops, catalog, options = {}) {
  return scriptFromPayload(patchPayload(ops, catalog, options));
}

/**
 * The Figma-side program. Self-contained: everything it uses is defined in its
 * body or passed in, because its source text is what gets shipped.
 * @param {any} figma the Plugin API global
 * @param {any} payload drawPayload() or patchPayload()
 * @param {{ applyJsonPatch: typeof applyJsonPatch }} lib
 * @returns {Promise<FigmaRunSummary>}
 */
export async function figmaRuntime(figma, payload, lib) {
  const NS = 'agui';
  if (!payload || payload.v !== 1) throw new Error('Harbor: unsupported payload version ' + (payload ? payload.v : 'none') + '.');
  const catalog = payload.catalog;
  const options = payload.options || {};
  const created = [];
  const updated = [];
  const removed = [];
  const warnings = [];
  const stats = { collectionsCreated: 0, variablesCreated: 0, variablesUpdated: 0, darkMode: 'unknown' };
  const warned = {};
  const warn = (message, nodeId) => {
    if (warned[message]) return;
    warned[message] = true;
    const w = { message: message };
    if (nodeId) w.nodeId = nodeId;
    warnings.push(w);
  };
  const has = (o, k) => o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
  const assign = Object.assign;
  const stable = (v) => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  };
  const contract = (type) => (has(catalog.components, type) ? catalog.components[type] : null);
  const withDefaults = (type, props) => assign({}, contract(type) ? contract(type).defaults : {}, props || {});
  const readJson = (node, key) => {
    let s = '';
    try {
      s = node.getSharedPluginData(NS, key);
    } catch (e) {
      s = '';
    }
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  };
  const byId = (list, id) => {
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return -1;
  };

  // ------------------------------------------------------------------ variables
  // Harbor's tokens become two collections: "Harbor palette" (primitives) and
  // "Harbor" (semantic, aliasing the palette, with Light and Dark modes).
  // Looked up by name first, so running twice creates nothing new.
  const defs = payload.variables || [];
  const defByName = {};
  defs.forEach((d) => {
    defByName[d.name] = d;
  });
  const resolved = (name) => {
    let d = defByName[name];
    for (let guard = 0; d && d.aliasOf && guard < 12; guard++) d = defByName[d.aliasOf];
    return d ? d.value : undefined;
  };
  const vars = {};
  let semantic = null;
  const modes = { light: null, dark: null };
  let darkError = '';

  async function ensureVariables(sync) {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const byName = {};
    collections.forEach((c) => {
      byName[c.name] = c;
    });
    const locals = await figma.variables.getLocalVariablesAsync();
    const index = {};
    locals.forEach((v) => {
      index[v.variableCollectionId + '|' + v.name] = v;
    });
    const freshCollections = {};
    const fresh = {};
    for (const d of defs) {
      let c = byName[d.collection];
      if (!c) {
        c = figma.variables.createVariableCollection(d.collection);
        byName[d.collection] = c;
        freshCollections[d.collection] = true;
        stats.collectionsCreated++;
      }
      let v = index[c.id + '|' + d.name];
      if (!v) {
        v = figma.variables.createVariable(d.name, c, d.resolvedType);
        index[c.id + '|' + d.name] = v;
        fresh[d.name] = true;
        stats.variablesCreated++;
      }
      if (fresh[d.name] || sync) v.scopes = d.scopes;
      vars[d.name] = v;
      if (d.darkAliasOf && !semantic) semantic = c;
    }
    let darkCreated = false;
    if (semantic) {
      const light = semantic.modes.filter((m) => /^light$/i.test(m.name))[0] || semantic.modes.filter((m) => m.modeId === semantic.defaultModeId)[0];
      if (freshCollections[semantic.name] && light.name !== 'Light') semantic.renameMode(light.modeId, 'Light');
      modes.light = light.modeId;
      const dark = semantic.modes.filter((m) => /^dark$/i.test(m.name))[0];
      if (dark) {
        modes.dark = dark.modeId;
        stats.darkMode = 'present';
      } else if (options.darkMode !== false) {
        try {
          modes.dark = semantic.addMode('Dark');
          darkCreated = true;
          stats.darkMode = 'created';
        } catch (e) {
          darkError = String(e && e.message ? e.message : e);
          stats.darkMode = 'unavailable';
        }
      }
    }
    const valueFor = (d, dark) => {
      const target = dark && d.darkAliasOf ? d.darkAliasOf : d.aliasOf;
      return target ? figma.variables.createVariableAlias(vars[target]) : d.value;
    };
    for (const d of defs) {
      const c = byName[d.collection];
      const v = vars[d.name];
      const write = fresh[d.name] || sync;
      if (write) v.setValueForMode(c.defaultModeId, valueFor(d, false));
      if (c === semantic && modes.dark && (write || darkCreated)) v.setValueForMode(modes.dark, valueFor(d, true));
      if (write && !fresh[d.name]) stats.variablesUpdated++;
    }
  }

  const solid = (name) => {
    const c = resolved(name) || { r: 0, g: 0, b: 0, a: 1 };
    // Paint colors take {r,g,b} only; alpha goes on the paint.
    const paint = { type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } };
    if (typeof c.a === 'number' && c.a < 1) paint.opacity = c.a;
    if (!vars[name]) {
      warn('No variable "' + name + '"; used its raw value.');
      return paint;
    }
    return figma.variables.setBoundVariableForPaint(paint, 'color', vars[name]);
  };
  const fill = (node, name) => {
    node.fills = [solid(name)];
  };
  const stroke = (node, name) => {
    node.strokes = [solid(name)];
    node.strokeWeight = 1;
  };
  const bind = (node, field, name) => {
    const value = resolved(name);
    if (typeof value === 'number') node[field] = value;
    if (vars[name]) node.setBoundVariable(field, vars[name]);
    else warn('No variable "' + name + '" to bind ' + field + ' to.');
  };
  const padding = (node, x, y) => {
    bind(node, 'paddingLeft', x);
    bind(node, 'paddingRight', x);
    bind(node, 'paddingTop', y || x);
    bind(node, 'paddingBottom', y || x);
  };
  const radius = (node, name) => {
    ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].forEach((k) => bind(node, k, name));
  };
  const px = (name) => {
    const v = resolved(name);
    return typeof v === 'number' ? v : 0;
  };

  function applyTheme(screen, theme) {
    if (!semantic || !theme || !theme.mode) return;
    const modeId = theme.mode === 'dark' ? modes.dark : modes.light;
    if (!modeId) {
      warn('This file has no Dark mode for Harbor variables' + (darkError ? ' (' + darkError + ')' : '') + '; the frame stays light.');
      return;
    }
    screen.setExplicitVariableModeForCollection(semantic, modeId);
  }

  // ---------------------------------------------------------------------- text
  const family = options.fontFamily || 'Inter';
  let fonts = null;
  async function ensureFonts() {
    if (fonts) return fonts;
    fonts = {};
    for (const style of ['Regular', 'Medium', 'Bold']) {
      try {
        await figma.loadFontAsync({ family: family, style: style });
        fonts[style] = { family: family, style: style };
      } catch (e) {
        fonts[style] = null;
      }
    }
    if (!fonts.Regular) throw new Error('Harbor: could not load ' + family + ' Regular.');
    ['Medium', 'Bold'].forEach((s) => {
      if (!fonts[s]) {
        warn(family + ' ' + s + ' is not available; used Regular.');
        fonts[s] = fonts.Regular;
      }
    });
    return fonts;
  }
  async function text(chars, o) {
    await ensureFonts();
    const t = figma.createText();
    t.name = o.name || 'text';
    t.fontName = fonts[o.weight || 'Regular'];
    t.characters = String(chars);
    t.fontSize = px(o.size || 'font/size/md');
    fill(t, o.color || 'color/fg/default');
    return t;
  }
  // Mirrors the Desktop Bridge's loadFontsForNode: text inside an instance
  // must have its fonts loaded before setProperties writes a TEXT property.
  async function loadFontsIn(node) {
    let texts = [];
    try {
      texts = node.findAllWithCriteria({ types: ['TEXT'] });
    } catch (e) {
      texts = [];
    }
    const seen = {};
    for (const t of texts) {
      const names = t.fontName === figma.mixed ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName];
      for (const f of names) {
        const k = f.family + '|' + f.style;
        if (seen[k]) continue;
        seen[k] = true;
        try {
          await figma.loadFontAsync(f);
        } catch (e) {
          warn('Could not load ' + f.family + ' ' + f.style + ' used inside a component.');
        }
      }
    }
  }

  // ---------------------------------------------------------------- components
  // A leaf type with figma.key imports from the library; without a key it
  // looks for a local component or component set with figma.component's name;
  // failing both it draws a primitive. Container types (children: nodes) are
  // always frames, because an instance cannot hold arbitrary children.
  const sources = {};
  let locals = null;
  async function localComponents() {
    if (locals) return locals;
    locals = {};
    if (options.searchLocal === false) return locals;
    if (typeof figma.loadAllPagesAsync === 'function') await figma.loadAllPagesAsync();
    const found = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] });
    for (const n of found) {
      if (n.type === 'COMPONENT' && n.parent && n.parent.type === 'COMPONENT_SET') continue;
      if (!has(locals, n.name)) locals[n.name] = n;
    }
    return locals;
  }
  async function componentFor(type, nodeId) {
    if (has(sources, type)) return sources[type];
    const f = contract(type).figma || {};
    let src = null;
    if (f.component && f.key) {
      try {
        src = { node: await figma.importComponentByKeyAsync(f.key), via: 'library' };
      } catch (e1) {
        try {
          src = { node: await figma.importComponentSetByKeyAsync(f.key), via: 'library' };
        } catch (e2) {
          warn(type + ': could not import the library component with key ' + f.key + '; looking for a local one.', nodeId);
        }
      }
    }
    if (!src && f.component) {
      const local = await localComponents();
      if (has(local, f.component)) src = { node: local[f.component], via: 'local' };
    }
    sources[type] = src;
    return src;
  }
  function instantiate(src) {
    const n = src.node;
    const component = n.type === 'COMPONENT_SET' ? n.defaultVariant || n.children[0] : n;
    return component.createInstance();
  }
  // Property definitions come from the component set, never from a variant.
  async function propertyDefinitions(instance) {
    let main = null;
    try {
      main = await instance.getMainComponentAsync();
    } catch (e) {
      main = null;
    }
    if (!main) return {};
    const owner = main.parent && main.parent.type === 'COMPONENT_SET' ? main.parent : main;
    try {
      return owner.componentPropertyDefinitions || {};
    } catch (e) {
      return {};
    }
  }
  const strip = (name) => String(name).replace(/#[^#]*$/, '');
  // The catalog's names carry the #id of Harbor's own file; any other file has
  // different ids, so fall back to matching the name before the #.
  function matchKey(live, figmaName) {
    if (has(live, figmaName)) return figmaName;
    const base = strip(figmaName).toLowerCase();
    for (const k in live) if (has(live, k) && strip(k).toLowerCase() === base) return k;
    return null;
  }
  function matchOption(optionsList, value) {
    if (!optionsList || !optionsList.length) return String(value);
    const s = String(value).toLowerCase();
    for (const o of optionsList) if (String(o).toLowerCase() === s) return o;
    if (typeof value === 'boolean') {
      const words = value ? ['true', 'on', 'yes'] : ['false', 'off', 'no'];
      for (const o of optionsList) if (words.indexOf(String(o).toLowerCase()) >= 0) return o;
    }
    return null;
  }
  async function applyInstanceProps(instance, type, props, nodeId) {
    const map = (contract(type).figma && contract(type).figma.properties) || {};
    const live = instance.componentProperties || {};
    const definitions = await propertyDefinitions(instance);
    const next = {};
    let touchesText = false;
    for (const prop in map) {
      if (!has(map, prop)) continue;
      const value = props[prop];
      if (value === undefined || value === null) continue;
      const key = matchKey(live, map[prop]);
      if (!key) {
        warn(type + '.' + prop + ' maps to the Figma property "' + map[prop] + '", which ' + (instance.name || 'the component') + ' does not have.', nodeId);
        continue;
      }
      const kind = live[key].type;
      if (kind === 'VARIANT') {
        const def = definitions[key];
        const choices = def && def.variantOptions ? def.variantOptions : [];
        const hit = matchOption(choices, value);
        if (hit === null) {
          warn(type + '.' + prop + ' = ' + JSON.stringify(value) + ' has no matching "' + strip(key) + '" variant (' + choices.join(', ') + ').', nodeId);
          continue;
        }
        next[key] = hit;
      } else if (kind === 'BOOLEAN') next[key] = value === true || value === 'true';
      else if (kind === 'TEXT') {
        next[key] = String(value);
        touchesText = true;
      } else warn(type + '.' + prop + ' maps to a ' + kind + ' property, which Harbor does not set.', nodeId);
    }
    if (touchesText) await loadFontsIn(instance);
    if (Object.keys(next).length) instance.setProperties(next);
  }

  // ---------------------------------------------------------------- primitives
  const JUSTIFY = { start: 'MIN', center: 'CENTER', end: 'MAX', 'space-between': 'SPACE_BETWEEN' };
  const ALIGN = { start: 'MIN', center: 'CENTER', end: 'MAX', stretch: 'MIN' };
  const TONES = {
    neutral: ['color/bg/subtle', 'color/fg/default'],
    accent: ['color/accent/subtle', 'color/accent/default'],
    info: ['color/accent/subtle', 'color/accent/default'],
    success: ['color/success/bg', 'color/success/fg'],
    warning: ['color/warning/bg', 'color/warning/fg'],
    danger: ['color/danger/bg', 'color/danger/fg'],
  };
  const HEADING = { 1: 'font/size/2xl', 2: 'font/size/xl', 3: 'font/size/lg' };
  const AVATAR = { sm: 24, md: 32, lg: 48 };
  const SHADOW = { type: 'DROP_SHADOW', color: { r: 0.086, g: 0.098, b: 0.125, a: 0.12 }, offset: { x: 0, y: 4 }, radius: 16, spread: 0, visible: true, blendMode: 'NORMAL' };
  const CELL = 240;

  function autoFrame(direction, name) {
    const f = figma.createFrame();
    f.name = name || 'frame';
    f.layoutMode = direction;
    f.primaryAxisSizingMode = 'AUTO';
    f.counterAxisSizingMode = 'AUTO';
    f.fills = [];
    f.clipsContent = false;
    return f;
  }
  function square(name, size) {
    const f = autoFrame('HORIZONTAL', name);
    f.resize(size, size);
    f.primaryAxisSizingMode = 'FIXED';
    f.counterAxisSizingMode = 'FIXED';
    f.primaryAxisAlignItems = 'CENTER';
    f.counterAxisAlignItems = 'CENTER';
    return f;
  }
  // Text that should wrap to its parent's width. Appended first: stretch only
  // means something inside an auto-layout parent.
  function wrapIn(parent, t) {
    parent.appendChild(t);
    t.textAutoResize = 'HEIGHT';
    t.layoutAlign = 'STRETCH';
    return t;
  }
  function gridWidth(p, avail) {
    const gap = px('space/' + p.gap);
    return avail ? avail : p.columns * CELL + (p.columns - 1) * gap;
  }
  // Stack, Grid and Card are configured rather than built, so a prop change
  // re-configures the same layer instead of replacing it.
  function configure(type, f, p, avail) {
    if (type === 'Stack') {
      f.layoutMode = p.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';
      f.layoutWrap = 'NO_WRAP';
      f.primaryAxisSizingMode = 'AUTO';
      f.counterAxisSizingMode = 'AUTO';
      bind(f, 'itemSpacing', 'space/' + p.gap);
      padding(f, 'space/' + p.padding);
      f.primaryAxisAlignItems = JUSTIFY[p.justify] || 'MIN';
      f.counterAxisAlignItems = ALIGN[p.align] || 'MIN';
      f.fills = [];
    } else if (type === 'Grid') {
      f.layoutMode = 'HORIZONTAL';
      f.layoutWrap = 'WRAP';
      bind(f, 'itemSpacing', 'space/' + p.gap);
      bind(f, 'counterAxisSpacing', 'space/' + p.gap);
      f.resize(gridWidth(p, avail), Math.max(1, f.height || 1));
      f.primaryAxisSizingMode = 'FIXED';
      f.counterAxisSizingMode = 'AUTO';
      f.fills = [];
    } else if (type === 'Card') {
      f.layoutMode = 'VERTICAL';
      f.primaryAxisSizingMode = 'AUTO';
      f.counterAxisSizingMode = 'AUTO';
      bind(f, 'itemSpacing', 'space/md');
      padding(f, 'space/' + p.padding);
      fill(f, 'color/bg/surface');
      stroke(f, 'color/border/default');
      radius(f, 'radius/lg');
      f.effects = p.elevation === 'raised' ? [SHADOW] : [];
    }
  }
  const PRIMITIVES = {
    Heading: (p) => text(p.text, { size: HEADING[p.level] || 'font/size/xl', weight: 'Bold' }),
    Text: (p) => text(p.text, { size: 'font/size/' + p.size, color: p.tone === 'muted' ? 'color/fg/muted' : 'color/fg/default' }),
    Button: async (p) => {
      const f = autoFrame('HORIZONTAL');
      const small = p.size === 'sm';
      f.primaryAxisAlignItems = 'CENTER';
      f.counterAxisAlignItems = 'CENTER';
      padding(f, small ? 'space/md' : 'space/lg', small ? 'space/xs' : 'space/sm');
      radius(f, 'radius/md');
      if (p.variant === 'primary') fill(f, 'color/accent/default');
      if (p.variant === 'secondary') {
        fill(f, 'color/bg/surface');
        stroke(f, 'color/border/default');
      }
      if (p.disabled) f.opacity = 0.5;
      const color = p.variant === 'primary' ? 'color/fg/on-accent' : p.variant === 'ghost' ? 'color/accent/default' : 'color/fg/default';
      f.appendChild(await text(p.label, { name: 'label', size: small ? 'font/size/sm' : 'font/size/md', weight: 'Medium', color: color }));
      return f;
    },
    Badge: async (p) => {
      const tone = TONES[p.tone] || TONES.neutral;
      const f = autoFrame('HORIZONTAL');
      padding(f, 'space/sm', 'space/xs');
      radius(f, 'radius/full');
      fill(f, tone[0]);
      f.appendChild(await text(p.label, { name: 'label', size: 'font/size/sm', weight: 'Medium', color: tone[1] }));
      return f;
    },
    TextField: async (p) => {
      const f = autoFrame('VERTICAL');
      bind(f, 'itemSpacing', 'space/xs');
      const row = autoFrame('HORIZONTAL', 'label row');
      bind(row, 'itemSpacing', 'space/xs');
      row.appendChild(await text(p.label, { name: 'label', size: 'font/size/sm', weight: 'Medium' }));
      if (p.required) row.appendChild(await text('*', { name: 'required', size: 'font/size/sm', weight: 'Medium', color: 'color/danger/fg' }));
      f.appendChild(row);
      const input = autoFrame('HORIZONTAL', 'input');
      input.counterAxisAlignItems = 'CENTER';
      padding(input, 'space/md', 'space/sm');
      fill(input, 'color/bg/surface');
      stroke(input, 'color/border/default');
      radius(input, 'radius/md');
      input.appendChild(await text(p.placeholder || '', { name: p.placeholder ? 'placeholder' : 'value', color: 'color/fg/muted' }));
      f.appendChild(input);
      input.layoutAlign = 'STRETCH';
      if (p.hint) wrapIn(f, await text(p.hint, { name: 'hint', size: 'font/size/sm', color: 'color/fg/muted' }));
      return f;
    },
    Checkbox: async (p) => {
      const f = autoFrame('HORIZONTAL');
      bind(f, 'itemSpacing', 'space/sm');
      f.counterAxisAlignItems = 'CENTER';
      const box = square('control', 16);
      radius(box, 'radius/sm');
      if (p.checked) {
        fill(box, 'color/accent/default');
        const mark = square('indicator', 8);
        radius(mark, 'radius/sm');
        fill(mark, 'color/fg/on-accent');
        box.appendChild(mark);
      } else {
        fill(box, 'color/bg/surface');
        stroke(box, 'color/border/default');
      }
      f.appendChild(box);
      f.appendChild(await text(p.label, { name: 'label' }));
      return f;
    },
    Alert: async (p) => {
      const tone = TONES[p.tone] || TONES.info;
      const f = autoFrame('HORIZONTAL');
      bind(f, 'itemSpacing', 'space/sm');
      padding(f, 'space/md');
      radius(f, 'radius/md');
      fill(f, tone[0]);
      const icon = square('icon', 16);
      radius(icon, 'radius/full');
      fill(icon, tone[1]);
      f.appendChild(icon);
      const content = autoFrame('VERTICAL', 'content');
      bind(content, 'itemSpacing', 'space/xs');
      f.appendChild(content);
      content.layoutGrow = 1;
      if (p.title) wrapIn(content, await text(p.title, { name: 'title', weight: 'Medium' }));
      wrapIn(content, await text(p.text, { name: 'text' }));
      return f;
    },
    Avatar: async (p) => {
      const size = AVATAR[p.size] || AVATAR.md;
      const f = square('avatar', size);
      radius(f, 'radius/full');
      fill(f, 'color/accent/subtle');
      const initials = String(p.name)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('');
      f.appendChild(await text(initials, { name: 'initials', size: p.size === 'lg' ? 'font/size/md' : 'font/size/sm', weight: 'Medium', color: 'color/accent/default' }));
      return f;
    },
    Stat: async (p) => {
      const f = autoFrame('VERTICAL');
      bind(f, 'itemSpacing', 'space/xs');
      f.appendChild(await text(p.label, { name: 'label', size: 'font/size/sm', color: 'color/fg/muted' }));
      f.appendChild(await text(p.value, { name: 'value', size: 'font/size/2xl', weight: 'Bold' }));
      if (p.change) {
        const color = p.trend === 'up' ? 'color/success/fg' : p.trend === 'down' ? 'color/danger/fg' : 'color/fg/muted';
        f.appendChild(await text(p.change, { name: 'change', size: 'font/size/sm', weight: 'Medium', color: color }));
      }
      return f;
    },
    Divider: async (p, ctx) => {
      const f = figma.createFrame();
      f.resize(ctx.avail || CELL, 1);
      fill(f, 'color/border/default');
      return f;
    },
  };

  async function build(type, props, nodeId, avail) {
    const c = contract(type);
    if (c.kind === 'nodes') {
      const f = autoFrame('VERTICAL');
      configure(type, f, props, avail);
      return { node: f, via: 'frame' };
    }
    const src = await componentFor(type, nodeId);
    if (src) {
      const instance = instantiate(src);
      await applyInstanceProps(instance, type, props, nodeId);
      return { node: instance, via: src.via };
    }
    if (!PRIMITIVES[type]) {
      warn(type + ' has no component in this file and no primitive drawing; drew an empty frame.', nodeId);
      return { node: autoFrame('VERTICAL'), via: 'placeholder' };
    }
    return { node: await PRIMITIVES[type](props, { avail: avail, nodeId: nodeId }), via: 'primitive' };
  }

  // -------------------------------------------------------------------- layout
  // What width a container offers its children. Only Grid needs a number (its
  // cells are fixed); everything else stretches through auto layout.
  function inner(type, p, avail) {
    if (type === 'Stack') return { avail: p.direction === 'horizontal' || !avail ? null : avail - 2 * px('space/' + p.padding), cell: null };
    if (type === 'Card') return { avail: avail ? avail - 2 * px('space/' + p.padding) - 2 : null, cell: null };
    if (type === 'Grid') {
      const gap = px('space/' + p.gap);
      const cell = Math.floor((gridWidth(p, avail) - gap * (p.columns - 1)) / p.columns);
      return { avail: cell, cell: cell };
    }
    return { avail: null, cell: null };
  }
  // How a child sits in its parent. Written every time, so a parent whose
  // alignment changed re-fits the children it kept.
  function fit(parent, parentType, pp, child, childType, cp, cell) {
    const isText = child.type === 'TEXT';
    if (cell) {
      child.layoutAlign = 'INHERIT';
      child.layoutGrow = 0;
      if (isText) child.textAutoResize = 'HEIGHT';
      child.resize(cell, Math.max(1, child.height || 1));
      if (child.type === 'FRAME' && child.layoutMode === 'VERTICAL') child.primaryAxisSizingMode = 'AUTO';
      if (child.type === 'FRAME' && child.layoutMode === 'HORIZONTAL') child.counterAxisSizingMode = 'AUTO';
      return;
    }
    const vertical = parent.layoutMode === 'VERTICAL';
    const stretchAll = parentType === '$screen' || parentType === 'Card' || (parentType === 'Stack' && pp.align === 'stretch');
    let stretch = false;
    let grow = false;
    if (vertical) stretch = stretchAll || childType === 'Divider' || (childType === 'Button' && cp.fullWidth === true);
    else {
      grow = (childType === 'Button' && cp.fullWidth === true) || childType === 'Divider';
      stretch = stretchAll && !isText;
    }
    child.layoutAlign = stretch ? 'STRETCH' : 'INHERIT';
    child.layoutGrow = grow ? 1 : 0;
    if (isText) child.textAutoResize = stretch && vertical ? 'HEIGHT' : 'WIDTH_AND_HEIGHT';
  }

  // ---------------------------------------------------------------- reconcile
  function writeData(node, nodeId, type, props, extra) {
    const d = { v: 1, nodeId: nodeId, type: type, props: props || {} };
    if (extra) assign(d, extra);
    node.setSharedPluginData(NS, 'node', JSON.stringify(d));
    node.name = type + ' · ' + nodeId;
  }
  function indexScreen(screen) {
    const idx = {};
    const walk = (n) => {
      const d = readJson(n, 'node');
      if (d && d.nodeId) {
        if (has(idx, d.nodeId)) warn('Two layers carry node id "' + d.nodeId + '" (a duplicated layer?); the copy is left alone.', d.nodeId);
        else idx[d.nodeId] = { node: n, data: d };
      }
      if (n.type !== 'INSTANCE' && n.children) for (const c of n.children) walk(c);
    };
    for (const c of screen.children) walk(c);
    return idx;
  }
  async function reconcile(screen, tree, width) {
    const idx = indexScreen(screen);
    const seen = {};
    const retired = [];
    const nodes = tree && tree.nodes ? tree.nodes : {};

    async function ensure(id, avail) {
      const tn = has(nodes, id) ? nodes[id] : null;
      if (!tn || typeof tn !== 'object') {
        warn('Node "' + id + '" is referenced but not in the tree.', id);
        return null;
      }
      const c = contract(tn.type);
      if (!c) {
        warn('"' + tn.type + '" is not a ' + catalog.name + ' component; skipped.', id);
        return null;
      }
      if (seen[id]) {
        warn('"' + id + '" has two parents; drawn once.', id);
        return null;
      }
      seen[id] = true;
      const props = withDefaults(tn.type, tn.props);
      const hit = has(idx, id) ? idx[id] : null;
      const extra = tn.type === 'Grid' ? { avail: avail || null } : null;
      const sameType = hit && hit.data.type === tn.type;
      const sameProps = sameType && stable(withDefaults(tn.type, hit.data.props)) === stable(props) && (tn.type !== 'Grid' || hit.data.avail === (avail || null));
      let node;
      if (sameType && sameProps) node = hit.node;
      else if (sameType && c.kind === 'nodes' && hit.node.type === 'FRAME') {
        node = hit.node;
        configure(tn.type, node, props, avail);
        writeData(node, id, tn.type, tn.props, extra);
        updated.push({ nodeId: id, id: node.id, how: 'props' });
      } else if (sameType && hit.node.type === 'INSTANCE') {
        node = hit.node;
        await applyInstanceProps(node, tn.type, props, id);
        writeData(node, id, tn.type, tn.props, extra);
        updated.push({ nodeId: id, id: node.id, how: 'props' });
      } else {
        const built = await build(tn.type, props, id, avail);
        node = built.node;
        writeData(node, id, tn.type, tn.props, extra);
        if (hit) {
          const parent = hit.node.parent;
          if (parent) parent.insertChild(Math.max(0, byId(parent.children, hit.node.id)), node);
          retired.push(hit.node);
          updated.push({ nodeId: id, id: node.id, how: 'rebuilt', replaced: hit.node.id });
        } else created.push({ nodeId: id, id: node.id, type: tn.type, via: built.via });
      }
      if (c.kind === 'nodes') {
        const room = inner(tn.type, props, avail);
        const kids = Array.isArray(tn.children) ? tn.children : [];
        let slot = 0;
        for (const childId of kids) {
          const child = await ensure(childId, room.avail);
          if (!child) continue;
          if (!(node.children[slot] && node.children[slot].id === child.id)) node.insertChild(slot, child);
          fit(node, tn.type, props, child, nodes[childId].type, withDefaults(nodes[childId].type, nodes[childId].props), room.cell);
          slot++;
        }
      }
      return node;
    }

    const content = width - 2 * px('space/2xl');
    const rootNode = tree && tree.root ? await ensure(tree.root, content) : null;
    if (rootNode) {
      if (!(screen.children[0] && screen.children[0].id === rootNode.id)) screen.insertChild(0, rootNode);
      fit(screen, '$screen', {}, rootNode, nodes[tree.root].type, withDefaults(nodes[tree.root].type, nodes[tree.root].props), null);
    }
    for (const n of retired) if (!n.removed) n.remove();
    for (const id in idx) {
      if (!has(idx, id) || seen[id]) continue;
      if (!idx[id].node.removed) idx[id].node.remove();
      removed.push(id);
    }
  }

  // ------------------------------------------------------------------- screens
  // One top-level frame per key (the AG-UI threadId, or the frame name). It
  // stores the tree it shows, so a later patch knows what it is patching.
  function findScreen() {
    const scan = (list) => {
      for (const n of list) {
        if (n.type === 'SECTION' && n.children) {
          const inside = scan(n.children);
          if (inside) return inside;
        }
        if (n.type === 'FRAME') {
          const s = readJson(n, 'screen');
          if (s && s.key === payload.key) return n;
        }
      }
      return null;
    };
    return scan(figma.currentPage.children);
  }
  function hasGridOrRow(tree) {
    const nodes = tree && tree.nodes ? tree.nodes : {};
    for (const id in nodes) {
      const n = nodes[id];
      if (n && (n.type === 'Grid' || (n.type === 'Stack' && n.props && n.props.direction === 'horizontal' && n.props.justify === 'space-between'))) return true;
    }
    return false;
  }
  function createScreen(width) {
    const page = figma.currentPage;
    let right = 0;
    for (const n of page.children) if (typeof n.x === 'number' && typeof n.width === 'number') right = Math.max(right, n.x + n.width);
    const f = figma.createFrame();
    f.resize(width, 100);
    f.layoutMode = 'VERTICAL';
    f.primaryAxisSizingMode = 'AUTO';
    f.counterAxisSizingMode = 'FIXED';
    page.appendChild(f);
    f.x = page.children.length > 1 ? right + 160 : 0;
    f.y = 0;
    return f;
  }
  function styleScreen(f) {
    fill(f, 'color/bg/canvas');
    padding(f, 'space/2xl');
    bind(f, 'itemSpacing', 'space/xl');
  }
  function saveScreen(screen, tree, theme, width) {
    screen.setSharedPluginData(NS, 'screen', JSON.stringify({ v: 1, key: payload.key, title: tree && tree.title ? tree.title : '', catalog: catalog.id, width: width }));
    screen.setSharedPluginData(NS, 'tree', JSON.stringify(tree));
    screen.setSharedPluginData(NS, 'theme', JSON.stringify(theme || {}));
  }
  const summary = (screen, extra) => {
    const out = {
      ok: true,
      op: payload.op,
      key: payload.key,
      frameId: screen ? screen.id : undefined,
      frameName: screen ? screen.name : undefined,
      created: created,
      updated: updated,
      removed: removed,
      warnings: warnings,
      variables: stats,
    };
    return extra ? assign(out, extra) : out;
  };
  const redraw = (reason, extra) => assign(summary(null, { ok: false, needsRedraw: true, reason: reason }), extra || {});

  if (payload.op === 'draw') {
    await ensureVariables(options.syncVariables !== false);
    const tree = payload.tree || { title: '', root: null, nodes: {} };
    let screen = findScreen();
    const stored = screen ? readJson(screen, 'screen') : null;
    const width = options.width || (stored && stored.width) || (hasGridOrRow(tree) ? 1120 : 480);
    if (!screen) screen = createScreen(width);
    else if (screen.width !== width) {
      screen.resize(width, Math.max(1, screen.height));
      screen.primaryAxisSizingMode = 'AUTO';
    }
    screen.name = payload.frameName || tree.title || 'Harbor screen';
    styleScreen(screen);
    applyTheme(screen, payload.theme);
    await reconcile(screen, tree, width);
    saveScreen(screen, tree, payload.theme, width);
    return summary(screen);
  }

  if (payload.op === 'patch') {
    const screen = findScreen();
    if (!screen) return redraw('No Harbor frame for "' + payload.key + '" on this page.');
    const meta = readJson(screen, 'screen') || {};
    const tree = readJson(screen, 'tree');
    if (!tree) return redraw('The frame has no stored tree.');
    const theme = readJson(screen, 'theme') || {};
    const base = payload.base || '/ui';
    const under = (path, prefix) => typeof path === 'string' && (path === prefix || path.indexOf(prefix + '/') === 0);
    const relevant = [];
    let ignored = 0;
    for (const op of payload.ops || []) {
      if (op.path === '' || (op.from !== undefined && !under(op.from, base) && !under(op.from, '/theme'))) return redraw('A patch op touches the whole document.');
      if (under(op.path, base) || under(op.path, '/theme')) relevant.push(op);
      else ignored++;
    }
    const doc = { theme: theme };
    doc[base.slice(1)] = tree;
    try {
      lib.applyJsonPatch(doc, relevant);
    } catch (e) {
      return redraw('The patch does not apply to the drawn tree: ' + (e && e.message ? e.message : e) + '.');
    }
    const nextTree = doc[base.slice(1)];
    const touchesTree = relevant.some((op) => under(op.path, base));
    const touchesTheme = relevant.some((op) => under(op.path, '/theme'));
    if (touchesTree || touchesTheme) {
      await ensureVariables(options.syncVariables === true);
      if (touchesTheme) applyTheme(screen, doc.theme);
      const width = meta.width || screen.width;
      if (touchesTree) {
        if (nextTree && nextTree.title && payload.frameName === undefined && screen.name === (tree.title || 'Harbor screen')) screen.name = nextTree.title;
        await reconcile(screen, nextTree, width);
      }
      saveScreen(screen, nextTree, doc.theme, width);
    }
    return summary(screen, { ignoredOps: ignored });
  }

  throw new Error('Harbor: unknown op "' + payload.op + '".');
}
