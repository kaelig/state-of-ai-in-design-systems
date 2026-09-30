// Figma -> Harbor UI tree, the reverse of tree-to-figma.js.
//
// Three pieces live here, and each runs in a different place:
//
//   serializeFigmaNode  runs inside Figma (plugin main thread, or a
//                       figma_execute / use_figma script) and turns a node
//                       into plain JSON, because Plugin API nodes cannot
//                       cross postMessage or a tool result.
//   figmaNodeToTree     runs anywhere (Node, the plugin UI iframe) and maps
//                       that JSON onto the catalog: a UI tree plus findings.
//   applyJsonPatch      RFC 6902, used by the plugin UI to mirror AG-UI
//                       STATE_DELTA and embedded in every tree-to-figma
//                       script so patches apply inside Figma.
//
// This module has no imports on purpose: figma-plugin/build.mjs inlines its
// source into the plugin's ui.html (there is no bundler in the lab), and embeds
// serializeFigmaNode and applyJsonPatch into the plugin's main thread by
// Function.prototype.toString. Those two therefore use only syntax Figma's
// QuickJS sandbox accepts: no optional chaining ("Can't use optional chaining
// (?.) - Figma plugin sandbox doesn't support it", Desktop Bridge code.js,
// https://github.com/southleft/figma-console-mcp/blob/db1967f479514710acc64be4c527ac033410b772/figma-desktop-bridge/code.js),
// no nullish coalescing, no object spread, no bare catch, and no references to
// anything outside the function body.

/**
 * The JSON shape figmaNodeToTree accepts. It is deliberately small: what a
 * plugin can read cheaply and what the Harbor mapping needs. serializeFigmaNode
 * produces it; a Figma Console MCP read (figma_execute returning the same
 * object) or a hand-written fixture works as well.
 *
 * @typedef {{
 *   id: string,
 *   name: string,
 *   type: string,
 *   visible?: boolean,
 *   width?: number,
 *   height?: number,
 *   children?: SerializedNode[],
 *   componentProperties?: Record<string, { type: 'VARIANT' | 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP' | string, value: string | boolean }>,
 *   mainComponent?: { id?: string, name: string, key?: string, parent?: { id?: string, name: string, key?: string, type: string } },
 *   layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID',
 *   layoutWrap?: 'NO_WRAP' | 'WRAP',
 *   itemSpacing?: number,
 *   counterAxisSpacing?: number,
 *   paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number,
 *   primaryAxisAlignItems?: string,
 *   counterAxisAlignItems?: string,
 *   characters?: string,
 *   fontSize?: number,
 *   fontWeight?: number,
 *   boundVariables?: Record<string, string>,
 *   pluginData?: { agui?: string, screen?: string, tree?: string },
 * }} SerializedNode
 *
 * `boundVariables` maps a field (`itemSpacing`, `paddingLeft`, `fills`,
 * `strokes`...) to the bound variable's name, e.g. `space/lg`.
 * `pluginData` holds the shared plugin data tree-to-figma writes in the `agui`
 * namespace: `agui` is a node's `{ nodeId, type, props }`, `screen` and `tree`
 * sit on the screen frame.
 *
 * @typedef {{ nodeId?: string, figmaId?: string, path: string, message: string, severity: 'error' | 'warning' | 'info', rule: string }} FigmaFinding
 */

/** Harbor's space scale in px, used to snap raw spacing back to a token. Kept in step with tokens.json by a test. */
export const DEFAULT_SPACE = { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 };

/** Harbor's font sizes in px, for telling a Heading from Text when a text layer carries no plugin data. */
export const DEFAULT_FONT_SIZE = { sm: 13, md: 15, lg: 18, xl: 22, '2xl': 28 };

/**
 * Which text layer inside a primitive carries which prop. tree-to-figma names
 * those layers after the catalog's anatomy parts, so a designer's edit to the
 * text on the canvas can be read back into the prop.
 */
export const TEXT_LAYERS = {
  Button: { label: 'label' },
  Badge: { label: 'label' },
  TextField: { label: 'label', placeholder: 'placeholder', hint: 'hint' },
  Checkbox: { label: 'label' },
  Alert: { title: 'title', text: 'text' },
  Stat: { label: 'label', value: 'value', change: 'change' },
};

/** `Label#3:0` -> `Label`. Figma suffixes TEXT, BOOLEAN and INSTANCE_SWAP property names with `#<id>`. */
export const stripPropertyId = (/** @type {string} */ name) => String(name).replace(/#[^#]*$/, '');

/**
 * Apply RFC 6902 operations to `doc`, in place, and return the result (a new
 * root only when an op targets ""). Throws on a path that does not resolve, so
 * a caller can fall back to a full redraw rather than draw half a patch.
 * Self-contained and sandbox-safe: it is embedded into Figma scripts verbatim.
 * @template T
 * @param {T} doc
 * @param {{ op: string, path: string, from?: string, value?: any }[]} ops
 * @returns {T}
 */
export function applyJsonPatch(doc, ops) {
  function parse(path) {
    if (path === '') return [];
    if (typeof path !== 'string' || path.charAt(0) !== '/') throw new Error('Not a JSON Pointer: "' + path + '"');
    return path
      .slice(1)
      .split('/')
      .map(function (s) {
        return s.replace(/~1/g, '/').replace(/~0/g, '~');
      });
  }
  function clone(v) {
    return v === undefined ? v : JSON.parse(JSON.stringify(v));
  }
  function container(root, segs, path) {
    var node = root;
    for (var i = 0; i < segs.length - 1; i++) {
      if (node === null || typeof node !== 'object' || !Object.prototype.hasOwnProperty.call(node, segs[i])) throw new Error('Path not found: ' + path);
      node = node[segs[i]];
    }
    if (node === null || typeof node !== 'object') throw new Error('Path not found: ' + path);
    return node;
  }
  function index(arr, key, path, forAdd) {
    if (key === '-' && forAdd) return arr.length;
    if (!/^(0|[1-9][0-9]*)$/.test(key)) throw new Error('Bad array index in ' + path);
    var i = Number(key);
    if (i > arr.length || (!forAdd && i === arr.length)) throw new Error('Index out of range: ' + path);
    return i;
  }
  function get(root, path) {
    var segs = parse(path);
    var node = root;
    for (var i = 0; i < segs.length; i++) {
      if (node === null || typeof node !== 'object' || !Object.prototype.hasOwnProperty.call(node, segs[i])) throw new Error('Path not found: ' + path);
      node = node[segs[i]];
    }
    return node;
  }
  function add(root, path, value) {
    var segs = parse(path);
    if (!segs.length) return value;
    var parent = container(root, segs, path);
    var key = segs[segs.length - 1];
    if (Array.isArray(parent)) parent.splice(index(parent, key, path, true), 0, value);
    else parent[key] = value;
    return root;
  }
  function remove(root, path) {
    var segs = parse(path);
    if (!segs.length) throw new Error('Cannot remove the document root.');
    var parent = container(root, segs, path);
    var key = segs[segs.length - 1];
    if (Array.isArray(parent)) return parent.splice(index(parent, key, path, false), 1)[0];
    if (!Object.prototype.hasOwnProperty.call(parent, key)) throw new Error('Path not found: ' + path);
    var old = parent[key];
    delete parent[key];
    return old;
  }
  var root = doc;
  for (var n = 0; n < ops.length; n++) {
    var op = ops[n];
    if (op.op === 'add') root = add(root, op.path, clone(op.value));
    else if (op.op === 'remove') remove(root, op.path);
    else if (op.op === 'replace') {
      if (op.path === '') root = clone(op.value);
      else {
        remove(root, op.path);
        root = add(root, op.path, clone(op.value));
      }
    } else if (op.op === 'move') {
      var moved = remove(root, op.from);
      root = add(root, op.path, moved);
    } else if (op.op === 'copy') root = add(root, op.path, clone(get(root, op.from)));
    else if (op.op === 'test') {
      if (JSON.stringify(get(root, op.path)) !== JSON.stringify(op.value)) throw new Error('Test failed at ' + op.path);
    } else throw new Error('Unknown patch op "' + op.op + '"');
  }
  return root;
}

/**
 * Serialize a Figma node into a SerializedNode. Runs inside Figma. Async
 * because instances resolve their main component with getMainComponentAsync
 * (the synchronous `mainComponent` getter is unavailable under
 * `documentAccess: "dynamic-page"`) and bound variables resolve by id.
 * Instances are leaves: their insides belong to the component.
 * @param {any} node a Plugin API SceneNode
 * @param {{ depth?: number, figma?: any }} [options]
 * @returns {Promise<SerializedNode>}
 */
export async function serializeFigmaNode(node, options) {
  var api = options && options.figma ? options.figma : typeof figma !== 'undefined' ? figma : null;
  var maxDepth = options && typeof options.depth === 'number' ? options.depth : 24;
  var names = {};
  var LAYOUT = ['layoutMode', 'layoutWrap', 'itemSpacing', 'counterAxisSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'primaryAxisAlignItems', 'counterAxisAlignItems'];
  var BOUND = ['itemSpacing', 'counterAxisSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'topLeftRadius'];

  async function variableName(id) {
    if (!id || !api || !api.variables) return null;
    if (Object.prototype.hasOwnProperty.call(names, id)) return names[id];
    var v = null;
    try {
      v = await api.variables.getVariableByIdAsync(id);
    } catch (e) {
      v = null;
    }
    names[id] = v ? v.name : null;
    return names[id];
  }
  function shared(n, key) {
    try {
      return typeof n.getSharedPluginData === 'function' ? n.getSharedPluginData('agui', key) : '';
    } catch (e) {
      return '';
    }
  }
  async function paintVariable(paints) {
    if (!Array.isArray(paints) || !paints.length) return null;
    var p = paints[0];
    var alias = p && p.boundVariables && p.boundVariables.color;
    return alias ? variableName(alias.id) : null;
  }

  async function visit(n, depth) {
    var out = { id: n.id, name: n.name, type: n.type };
    if (n.visible === false) out.visible = false;
    if (typeof n.width === 'number') {
      out.width = n.width;
      out.height = n.height;
    }
    var data = {};
    var agui = shared(n, 'node');
    if (agui) data.agui = agui;
    var screen = shared(n, 'screen');
    if (screen) {
      data.screen = screen;
      var tree = shared(n, 'tree');
      if (tree) data.tree = tree;
    }
    if (data.agui || data.screen) out.pluginData = data;

    if (n.layoutMode && n.layoutMode !== 'NONE') {
      for (var i = 0; i < LAYOUT.length; i++) if (n[LAYOUT[i]] !== undefined) out[LAYOUT[i]] = n[LAYOUT[i]];
    }
    var bound = {};
    var any = false;
    var bv = n.boundVariables || {};
    for (var b = 0; b < BOUND.length; b++) {
      var alias = bv[BOUND[b]];
      if (alias && alias.id) {
        var name = await variableName(alias.id);
        if (name) {
          bound[BOUND[b]] = name;
          any = true;
        }
      }
    }
    var fillVar = await paintVariable(n.fills);
    if (fillVar) {
      bound.fills = fillVar;
      any = true;
    }
    var strokeVar = await paintVariable(n.strokes);
    if (strokeVar) {
      bound.strokes = strokeVar;
      any = true;
    }
    if (any) out.boundVariables = bound;

    if (n.type === 'TEXT') {
      out.characters = n.characters;
      if (typeof n.fontSize === 'number') out.fontSize = n.fontSize;
      if (typeof n.fontWeight === 'number') out.fontWeight = n.fontWeight;
    }
    if (n.type === 'INSTANCE') {
      var props = {};
      var cp = n.componentProperties || {};
      for (var key in cp) {
        if (Object.prototype.hasOwnProperty.call(cp, key)) props[key] = { type: cp[key].type, value: cp[key].value };
      }
      out.componentProperties = props;
      var main = null;
      try {
        main = await n.getMainComponentAsync();
      } catch (e) {
        main = null;
      }
      if (main) {
        out.mainComponent = { id: main.id, name: main.name, key: main.key };
        if (main.parent && main.parent.type === 'COMPONENT_SET') out.mainComponent.parent = { id: main.parent.id, name: main.parent.name, key: main.parent.key, type: main.parent.type };
      }
      return out;
    }
    if (n.children && depth < maxDepth) {
      out.children = [];
      for (var c = 0; c < n.children.length; c++) out.children.push(await visit(n.children[c], depth + 1));
    }
    return out;
  }
  return visit(node, 0);
}

/**
 * A script for Figma Console MCP's `figma_execute` (or Figma's `use_figma`)
 * that serializes a Harbor screen frame, a node by id, or the current
 * selection, and returns it. Feed the result to figmaNodeToTree in Node.
 * @param {{ key?: string, nodeId?: string }} [target] screen key (the AG-UI threadId) or a Figma node id; the selection when omitted
 * @returns {string}
 */
export function readFigmaScript(target = {}) {
  return [
    '// Harbor: read a Figma node back as JSON (figma-to-tree.js).',
    `const target = ${JSON.stringify(target)};`,
    `const serializeFigmaNode = ${serializeFigmaNode.toString()};`,
    'let node = null;',
    'if (target.nodeId) node = await figma.getNodeByIdAsync(target.nodeId);',
    "else if (target.key) node = figma.currentPage.children.find((n) => { try { const s = n.getSharedPluginData('agui', 'screen'); return s && JSON.parse(s).key === target.key; } catch (e) { return false; } }) || null;",
    'else node = figma.currentPage.selection[0] || null;',
    "if (!node) return { ok: false, error: 'Nothing to read: no matching node and no selection.' };",
    'return { ok: true, node: await serializeFigmaNode(node, { figma }) };',
  ].join('\n');
}

/**
 * Map a serialized Figma node onto the catalog. Plugin data written by
 * tree-to-figma wins for identity (node id, component type), so a frame the
 * agent drew comes back with the same ids; live values on the canvas win for
 * props, so a designer's edits come back too, each reported as a finding.
 * Anything that is not Harbor becomes a finding, never an exception.
 * @param {SerializedNode} root
 * @param {{ name: string, components: Record<string, any> }} catalog
 * @param {{ title?: string, space?: Record<string, number>, fontSize?: Record<string, number> }} [options]
 * @returns {{ tree: { title: string, root: string | null, nodes: Record<string, { type: string, props: Record<string, any>, children?: string[] }> }, findings: FigmaFinding[] }}
 */
export function figmaNodeToTree(root, catalog, options = {}) {
  const space = options.space || DEFAULT_SPACE;
  const fontSize = options.fontSize || DEFAULT_FONT_SIZE;
  /** @type {FigmaFinding[]} */
  const findings = [];
  /** @type {Record<string, { type: string, props: Record<string, any>, children?: string[] }>} */
  const nodes = {};
  const used = new Set();
  const components = catalog.components;

  // Figma component name or key -> catalog type.
  const byName = new Map();
  const byKey = new Map();
  for (const [type, c] of Object.entries(components)) {
    if (c.figma?.component) byName.set(c.figma.component.toLowerCase(), type);
    if (c.figma?.key) byKey.set(c.figma.key, type);
  }
  const typeFromLayerName = (/** @type {string} */ name) => {
    const head = String(name).split(/\s*[·/]\s*/)[0].trim();
    const hit = Object.keys(components).find((t) => t.toLowerCase() === head.toLowerCase());
    return hit ?? null;
  };
  const note = (/** @type {SerializedNode} */ n, /** @type {Omit<FigmaFinding, 'figmaId' | 'path'> & { path?: string }} */ f) =>
    findings.push({ figmaId: n.id, path: f.path ?? `/${n.name}`, ...f });

  const parseJson = (/** @type {string | undefined} */ s) => {
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  const mintId = (/** @type {SerializedNode} */ n, /** @type {string | undefined} */ preferred) => {
    let id = preferred && !used.has(preferred) ? preferred : `f${String(n.id).replace(/[^0-9a-z]+/gi, '_')}`;
    for (let i = 2; used.has(id); i++) id = `${id}_${i}`;
    used.add(id);
    return id;
  };
  const withDefaults = (/** @type {string} */ type, /** @type {Record<string, any>} */ props) => {
    const out = {};
    for (const [k, s] of Object.entries(components[type]?.props?.properties ?? {})) if (s.default !== undefined) out[k] = s.default;
    return { ...out, ...props };
  };
  const nearest = (/** @type {number} */ px, /** @type {string[] | undefined} */ allowed) => {
    const names = (allowed ?? Object.keys(space)).filter((k) => k in space);
    let best = names[0];
    for (const k of names) if (Math.abs(space[k] - px) < Math.abs(space[best] - px)) best = k;
    return best;
  };
  const tokenFor = (/** @type {SerializedNode} */ n, /** @type {string} */ field, /** @type {number | undefined} */ px, /** @type {string[] | undefined} */ allowed) => {
    const bound = n.boundVariables?.[field];
    const m = bound && /^space\/(.+)$/.exec(bound);
    if (m && (!allowed || allowed.includes(m[1]))) return m[1];
    return typeof px === 'number' ? nearest(px, allowed) : undefined;
  };
  const enumOf = (/** @type {string} */ type, /** @type {string} */ prop) => components[type]?.props?.properties?.[prop]?.enum;

  /** Coerce a Figma property value to the prop's schema. */
  const coerce = (/** @type {Record<string, any>} */ schema, /** @type {any} */ value) => {
    if (schema?.enum) {
      const hit = schema.enum.find((/** @type {any} */ e) => String(e).toLowerCase() === String(value).toLowerCase());
      return hit === undefined ? { ok: false } : { ok: true, value: hit };
    }
    if (schema?.type === 'boolean') {
      if (typeof value === 'boolean') return { ok: true, value };
      const s = String(value).toLowerCase();
      if (['true', 'on', 'yes'].includes(s)) return { ok: true, value: true };
      if (['false', 'off', 'no'].includes(s)) return { ok: true, value: false };
      return { ok: false };
    }
    if (schema?.type === 'integer' || schema?.type === 'number') {
      const num = Number(value);
      return Number.isFinite(num) ? { ok: true, value: num } : { ok: false };
    }
    return { ok: true, value: String(value) };
  };

  /** Props from an instance's componentProperties, through the catalog's figma.properties map. */
  const instanceProps = (/** @type {SerializedNode} */ n, /** @type {string} */ type, /** @type {string} */ nodeId) => {
    const contract = components[type];
    const mapping = contract.figma?.properties ?? {};
    const schema = contract.props?.properties ?? {};
    const live = n.componentProperties ?? {};
    const byBase = new Map(Object.keys(live).map((k) => [stripPropertyId(k).toLowerCase(), k]));
    const claimed = new Set();
    /** @type {Record<string, any>} */
    const props = {};
    for (const [prop, figmaName] of Object.entries(mapping)) {
      const key = figmaName in live ? figmaName : byBase.get(stripPropertyId(figmaName).toLowerCase());
      if (!key) {
        note(n, { nodeId, message: `${type}.${prop} maps to the Figma property "${figmaName}", which this instance does not have.`, severity: 'warning', rule: 'missing-figma-property' });
        continue;
      }
      claimed.add(key);
      const raw = live[key].value;
      if (raw === '' && !(contract.props?.required ?? []).includes(prop)) continue;
      const c = coerce(schema[prop], raw);
      if (!c.ok) {
        note(n, { nodeId, message: `${type}.${prop} has no value matching Figma's "${raw}"${schema[prop]?.enum ? ` (expected one of ${schema[prop].enum.join(', ')})` : ''}.`, severity: 'warning', rule: 'unknown-variant-value' });
        continue;
      }
      props[prop] = c.value;
    }
    for (const key of Object.keys(live)) {
      if (!claimed.has(key)) note(n, { nodeId, message: `Figma property "${stripPropertyId(key)}" on ${type} has no ${catalog.name} prop.`, severity: 'info', rule: 'unmapped-figma-property' });
    }
    return props;
  };

  /** Text layers inside a primitive, by name, not crossing into other Harbor nodes. */
  const findText = (/** @type {SerializedNode} */ n, /** @type {string} */ layer) => {
    for (const c of n.children ?? []) {
      if (c.pluginData?.agui) continue;
      if (c.type === 'TEXT' && c.name === layer) return c;
      const deeper = c.type !== 'INSTANCE' ? findText(c, layer) : null;
      if (deeper) return deeper;
    }
    return null;
  };

  /** A designer's edits on the canvas, read back over the props the agent sent. */
  const liveOverrides = (/** @type {SerializedNode} */ n, /** @type {string} */ type, /** @type {Record<string, any>} */ stored, /** @type {string} */ nodeId) => {
    /** @type {Record<string, any>} */
    let live = {};
    if (n.type === 'INSTANCE') live = instanceProps(n, type, nodeId);
    else if (n.type === 'TEXT' && (type === 'Heading' || type === 'Text')) live = { text: n.characters };
    else {
      for (const [prop, layer] of Object.entries(/** @type {Record<string, Record<string, string>>} */ (TEXT_LAYERS)[type] ?? {})) {
        const t = findText(n, layer);
        if (t && typeof t.characters === 'string') live[prop] = t.characters;
      }
    }
    const merged = { ...stored };
    const before = withDefaults(type, stored);
    for (const [prop, value] of Object.entries(live)) {
      if (JSON.stringify(before[prop]) === JSON.stringify(value)) continue;
      merged[prop] = value;
      note(n, { nodeId, path: `/nodes/${nodeId}/props/${prop}`, message: `${type}.${prop} was changed in Figma: ${JSON.stringify(before[prop])} -> ${JSON.stringify(value)}.`, severity: 'info', rule: 'figma-edit' });
    }
    return merged;
  };

  /** A text layer with no plugin data: a Heading or Text by size. */
  const textNode = (/** @type {SerializedNode} */ n) => {
    const size = n.fontSize ?? fontSize.md;
    const text = n.characters ?? '';
    if (size >= fontSize.lg) {
      const level = size >= (fontSize['2xl'] + fontSize.xl) / 2 ? 1 : size >= (fontSize.xl + fontSize.lg) / 2 ? 2 : 3;
      return { type: 'Heading', props: { text, level } };
    }
    /** @type {Record<string, any>} */
    const props = { text };
    if (size <= (fontSize.sm + fontSize.md) / 2) props.size = 'sm';
    if (/muted/.test(n.boundVariables?.fills ?? '')) props.tone = 'muted';
    return { type: 'Text', props };
  };

  /** An auto-layout frame with no plugin data: Grid if it wraps, else Stack. */
  const layoutNode = (/** @type {SerializedNode} */ n, /** @type {string | null} */ named) => {
    const pads = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map((p) => p ?? 0);
    if (named === 'Card') {
      /** @type {Record<string, any>} */
      const props = { padding: tokenFor(n, 'paddingLeft', pads[3], enumOf('Card', 'padding')) };
      return { type: 'Card', props };
    }
    if (named === 'Grid' || (n.layoutMode === 'HORIZONTAL' && n.layoutWrap === 'WRAP')) {
      const gap = tokenFor(n, 'itemSpacing', n.itemSpacing, enumOf('Grid', 'gap'));
      const kids = (n.children ?? []).filter((c) => c.visible !== false);
      let columns = Math.min(4, Math.max(1, kids.length || 1));
      const cell = kids[0]?.width;
      if (n.width && cell) columns = Math.min(4, Math.max(1, Math.round((n.width + (n.itemSpacing ?? 0)) / (cell + (n.itemSpacing ?? 0)))));
      return { type: 'Grid', props: { columns, gap } };
    }
    /** @type {Record<string, any>} */
    const props = {};
    if (n.layoutMode === 'HORIZONTAL') props.direction = 'horizontal';
    if (n.layoutMode !== 'HORIZONTAL' && n.layoutMode !== 'VERTICAL') {
      note(n, { message: `"${n.name}" has no auto layout; read as a vertical Stack, positions are lost.`, severity: 'warning', rule: 'absolute-layout' });
    }
    props.gap = tokenFor(n, 'itemSpacing', n.itemSpacing ?? 0, enumOf('Stack', 'gap'));
    if (new Set(pads).size > 1) note(n, { message: `"${n.name}" has uneven padding (${pads.join('/')}); Harbor's Stack takes one value, using the left.`, severity: 'info', rule: 'uneven-padding' });
    props.padding = tokenFor(n, 'paddingLeft', pads[3], enumOf('Stack', 'padding'));
    const justify = { MIN: 'start', CENTER: 'center', MAX: 'end', SPACE_BETWEEN: 'space-between' }[/** @type {string} */ (n.primaryAxisAlignItems)];
    if (justify) props.justify = justify;
    const align = { MIN: 'start', CENTER: 'center', MAX: 'end', BASELINE: 'start' }[/** @type {string} */ (n.counterAxisAlignItems)];
    // A Harbor Stack stretches its children by default, which Figma draws as
    // MIN alignment plus stretched children; MIN alone reads as the default.
    if (align && align !== 'start') props.align = align;
    return { type: 'Stack', props };
  };

  /**
   * @param {SerializedNode} n
   * @returns {string | null} the tree id, or null when the layer is skipped
   */
  const convert = (n) => {
    if (n.visible === false) {
      note(n, { message: `Hidden layer "${n.name}" was skipped.`, severity: 'info', rule: 'hidden' });
      return null;
    }
    const data = parseJson(n.pluginData?.agui);
    /** @type {{ type: string, props: Record<string, any> } | null} */
    let mapped = null;
    let id;

    if (data && components[data.type]) {
      id = mintId(n, data.nodeId);
      mapped = { type: data.type, props: liveOverrides(n, data.type, data.props ?? {}, id) };
    } else if (n.type === 'INSTANCE') {
      const main = n.mainComponent;
      const set = main?.parent?.type === 'COMPONENT_SET' ? main.parent : null;
      const type = byKey.get(set?.key) ?? byKey.get(main?.key) ?? byName.get(String(set?.name ?? main?.name ?? '').toLowerCase()) ?? null;
      if (!type) {
        note(n, { message: `Instance of "${set?.name ?? main?.name ?? 'an unknown component'}" is not a ${catalog.name} component; skipped.`, severity: 'warning', rule: 'unknown-component' });
        return null;
      }
      id = mintId(n);
      mapped = { type, props: instanceProps(n, type, id) };
    } else if (n.type === 'TEXT') {
      id = mintId(n);
      mapped = textNode(n);
    } else if (['FRAME', 'COMPONENT', 'GROUP', 'SECTION'].includes(n.type)) {
      const named = typeFromLayerName(n.name);
      if (named && components[named].children?.kind === 'none' && !(n.children ?? []).length) {
        id = mintId(n);
        mapped = { type: named, props: {} };
        if (named !== 'Divider') note(n, { nodeId: id, message: `"${n.name}" is named like a ${named} but carries no plugin data or component; its props are defaults.`, severity: 'warning', rule: 'named-only' });
      } else if (!(n.children ?? []).length && (n.height ?? 99) <= 2) {
        id = mintId(n);
        mapped = { type: 'Divider', props: {} };
      } else {
        id = mintId(n);
        mapped = layoutNode(n, named && components[named].children?.kind === 'nodes' ? named : null);
      }
    } else {
      note(n, { message: `${n.type} "${n.name}" has no ${catalog.name} equivalent; skipped.`, severity: 'warning', rule: 'unsupported-node' });
      return null;
    }

    const node = /** @type {{ type: string, props: Record<string, any>, children?: string[] }} */ ({ type: mapped.type, props: mapped.props });
    nodes[id] = node;
    if (components[mapped.type].children?.kind === 'nodes') {
      node.children = [];
      for (const c of n.children ?? []) {
        const childId = convert(c);
        if (childId) node.children.push(childId);
      }
    } else if (n.type !== 'INSTANCE' && n.type !== 'TEXT' && !data) {
      // A frame read as a leaf: anything inside it is not carried over.
      for (const c of n.children ?? []) if (c.type !== 'TEXT') note(c, { message: `"${c.name}" sits inside a ${mapped.type}, which takes no children; dropped.`, severity: 'info', rule: 'leaf-children' });
    }
    return id;
  };

  // A screen frame drawn by tree-to-figma is a wrapper, not a node: its
  // content is the tree's root, and its title is the tree's title.
  const screen = parseJson(root.pluginData?.screen);
  let title = options.title ?? (screen?.title || root.name);
  let rootId = null;
  if (screen) {
    const content = (root.children ?? []).filter((c) => c.visible !== false);
    const ids = content.map(convert).filter(Boolean);
    if (ids.length > 1) {
      rootId = mintId(root, 'screen');
      nodes[rootId] = { type: 'Stack', props: {}, children: /** @type {string[]} */ (ids) };
      findings.push({ figmaId: root.id, path: '/root', message: `The frame holds ${ids.length} top-level layers; wrapped them in a Stack.`, severity: 'info', rule: 'wrapped-root' });
    } else rootId = ids[0] ?? null;
  } else {
    rootId = convert(root);
  }
  if (!rootId) findings.push({ figmaId: root.id, path: '/root', message: `Nothing in "${root.name}" maps to ${catalog.name}.`, severity: 'error', rule: 'empty' });
  return { tree: { title, root: rootId, nodes }, findings };
}
