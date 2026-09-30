// Figma -> Harbor UI tree, the reverse of tree-to-figma.js.
//
// Three pieces, each running in a different place:
//
//   serializeFigmaNode  runs inside Figma (plugin main thread, or a
//                       figma_execute / use_figma script) and turns a node
//                       into plain JSON, because Plugin API nodes cannot
//                       cross postMessage or a tool result. It lives in
//                       sandbox.js, which is shipped to Figma as text; its
//                       source string is SANDBOX_SOURCE.serializeFigmaNode in
//                       sandbox-source.js, and tree-to-figma.js's
//                       readFigmaScript wraps it for figma_execute.
//   figmaNodeToTree     runs anywhere (Node, the plugin UI iframe) and maps
//                       that JSON onto the catalog: a UI tree plus findings.
//   applyJsonPatch      RFC 6902 (also in sandbox.js), for mirroring AG-UI
//                       STATE_DELTA in the plugin UI.
//
// The only import is ./sandbox.js, which has none: figma-plugin/build.mjs
// inlines both files into the plugin's ui.html by concatenating their text
// (the lab has no bundler), so keep it that way.

import { applyJsonPatch, serializeFigmaNode } from './sandbox.js';

export { applyJsonPatch, serializeFigmaNode };

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
    } else if (n.type === 'LINE' || (n.type === 'RECTANGLE' && (n.height ?? 99) <= 2)) {
      id = mintId(n);
      mapped = { type: 'Divider', props: {} };
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
