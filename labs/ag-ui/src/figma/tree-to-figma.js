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
// The Figma-side program itself (figmaRuntime, applyJsonPatch,
// serializeFigmaNode) lives in sandbox.js, which follows the sandbox's syntax
// rules, and reaches every host as string literals from the generated
// sandbox-source.js, never through Function.prototype.toString: a bundler
// that minifies this module cannot change what Figma runs. See sandbox.js.
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
import { SANDBOX_SOURCE } from './sandbox-source.js';

export { figmaRuntime } from './sandbox.js';
export { SANDBOX_SOURCE };

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
    `const applyJsonPatch = ${SANDBOX_SOURCE.applyJsonPatch};`,
    `const figmaRuntime = ${SANDBOX_SOURCE.figmaRuntime};`,
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
 * A program for figma_execute (or use_figma) that serializes a Harbor screen
 * frame, a node by id, or the current selection, and returns it as a
 * SerializedNode for figmaNodeToTree (figma-to-tree.js).
 * @param {{ key?: string, nodeId?: string }} [target] a screen key (the AG-UI threadId) or a Figma node id; the selection when omitted
 * @returns {string}
 */
export function readFigmaScript(target = {}) {
  return [
    '// Harbor: read a Figma node back as JSON, generated by labs/ag-ui/src/figma/tree-to-figma.js.',
    `const target = ${jsonForSource(target)};`,
    `const serializeFigmaNode = ${SANDBOX_SOURCE.serializeFigmaNode};`,
    'let node = null;',
    'if (target.nodeId) node = await figma.getNodeByIdAsync(target.nodeId);',
    'else if (target.key) {',
    '  for (const n of figma.currentPage.children) {',
    "    let s = '';",
    "    try { s = n.getSharedPluginData('agui', 'screen'); } catch (e) { s = ''; }",
    '    if (s && JSON.parse(s).key === target.key) { node = n; break; }',
    '  }',
    '} else node = figma.currentPage.selection[0] || null;',
    "if (!node) return { ok: false, error: 'Nothing to read: no matching node and no selection.' };",
    'return { ok: true, node: await serializeFigmaNode(node, { figma: figma }) };',
  ].join('\n');
}
