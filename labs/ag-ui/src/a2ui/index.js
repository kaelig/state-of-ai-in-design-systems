// Harbor as an A2UI catalog, and Harbor trees as A2UI v0.9 operations.
//
// AG-UI does not define a UI format; A2UI is the declarative format that
// already rides on it. @ag-ui/a2ui-middleware 0.0.11 delivers a surface as an
// ACTIVITY_SNAPSHOT with activityType "a2ui-surface" and content
// { a2ui_operations: [...] } (see A2UIActivityType, A2UI_OPERATIONS_KEY and
// createA2UIActivityEvents in that package's src/index.ts and src/schema.ts).
// Speaking that shape means a Harbor agent's output renders in any A2UI client
// that registers the Harbor catalog, and an A2UI agent's output renders here.
//
// The component format is v0.9 "flat": { id, component: "Button", ...props },
// children as an array of ids, and the root component's id is "root".

import { catalogId as harborId } from '../catalog/index.js';
import { walkTree } from '../tree/tree.js';

export const A2UI_VERSION = 'v0.9';
export const A2UI_ACTIVITY_TYPE = 'a2ui-surface';
export const A2UI_OPERATIONS_KEY = 'a2ui_operations';

/**
 * A catalog URI for a design system catalog. A2UI treats it as an identifier
 * known to both sides at deploy time, not something fetched at runtime.
 * @param {import('../catalog/index.js').Catalog} catalog
 */
export const a2uiCatalogId = (catalog) => `https://example.com/${catalog.name}/a2ui/${catalog.version}/catalog.json`;

/**
 * The Harbor catalog in A2UI's catalog shape: `catalogId` plus one JSON Schema
 * per component, with props flattened onto the component object the way v0.9
 * writes them.
 * @param {import('../catalog/index.js').Catalog} catalog
 */
export function catalogToA2ui(catalog) {
  const id = a2uiCatalogId(catalog);
  /** @type {Record<string, any>} */
  const components = {};
  for (const [type, c] of Object.entries(catalog.components)) {
    /** @type {Record<string, any>} */
    const properties = {
      id: { type: 'string' },
      component: { const: type },
      ...(c.props.properties ?? {}),
    };
    if (c.children.kind === 'nodes') properties.children = { type: 'array', items: { type: 'string' } };
    components[type] = {
      type: 'object',
      description: c.description,
      properties,
      required: ['id', 'component', ...(c.props.required ?? [])],
      additionalProperties: false,
    };
  }
  return {
    $id: id,
    catalogId: id,
    description: `${harborId(catalog)} as an A2UI catalog.`,
    components,
    theme: {
      type: 'object',
      properties: {
        mode: { enum: ['light', 'dark'] },
        density: { enum: ['comfortable', 'compact'] },
      },
    },
  };
}

/**
 * Operations that create a surface and fill it with the tree's components.
 * @param {import('../tree/tree.js').UITree} tree
 * @param {{ surfaceId: string, catalogId: string, theme?: Record<string, string> }} options
 * @returns {Record<string, any>[]}
 */
export function treeToA2uiOperations(tree, { surfaceId, catalogId, theme }) {
  const ids = rootRenaming(tree);
  /** @type {Record<string, any>[]} */
  const components = [];
  walkTree(tree, (id, node) => {
    /** @type {Record<string, any>} */
    const c = { id: ids(id), component: node.type, ...node.props };
    if (node.children) c.children = node.children.filter((k) => tree.nodes[k]).map(ids);
    components.push(c);
  });
  /** @type {Record<string, any>[]} */
  const ops = [
    { version: A2UI_VERSION, createSurface: { surfaceId, catalogId, ...(theme ? { theme } : {}) } },
    { version: A2UI_VERSION, updateComponents: { surfaceId, components } },
  ];
  // A2UI surfaces have no title. The screen's name travels in the data model,
  // where a renderer that does not bind to it simply ignores it.
  if (tree.title) ops.push({ version: A2UI_VERSION, updateDataModel: { surfaceId, path: '/title', value: tree.title } });
  return ops;
}

/** A2UI wants the root to be "root"; rename it, and anything already called that. */
function rootRenaming(/** @type {import('../tree/tree.js').UITree} */ tree) {
  /** @type {Map<string, string>} */
  const map = new Map();
  if (tree.root) map.set(tree.root, 'root');
  if (tree.root !== 'root' && tree.nodes.root) {
    let n = 1;
    while (tree.nodes[`root_${n}`]) n++;
    map.set('root', `root_${n}`);
  }
  return (/** @type {string} */ id) => map.get(id) ?? id;
}

/**
 * Fold A2UI operations back into a Harbor tree, one surface at a time. Later
 * `updateComponents` replace earlier definitions with the same id, which is
 * the v0.9 update rule. Props are whatever sits on the component object
 * besides id, component and children.
 * @param {Record<string, any>[]} operations
 * @param {string} [surfaceId] defaults to the first surface created
 * @returns {{ tree: import('../tree/tree.js').UITree, surfaceId: string | null, catalogId: string | null, theme: Record<string, any> }}
 */
export function a2uiOperationsToTree(operations, surfaceId) {
  let sid = surfaceId ?? null;
  let catalogId = null;
  let theme = {};
  /** @type {import('../tree/tree.js').UITree} */
  const tree = { title: '', root: null, nodes: {} };
  for (const op of operations ?? []) {
    if (op.createSurface) {
      sid ??= op.createSurface.surfaceId;
      if (op.createSurface.surfaceId === sid) {
        catalogId = op.createSurface.catalogId ?? null;
        theme = op.createSurface.theme ?? {};
      }
    }
    if (op.updateComponents && op.updateComponents.surfaceId === sid) {
      for (const { id, component, children, ...props } of op.updateComponents.components ?? []) {
        tree.nodes[id] = { type: component, props, ...(Array.isArray(children) ? { children } : {}) };
      }
    }
    if (op.updateDataModel?.surfaceId === sid && op.updateDataModel.path === '/title' && typeof op.updateDataModel.value === 'string') {
      tree.title = op.updateDataModel.value;
    }
    if (op.deleteSurface?.surfaceId === sid) {
      tree.nodes = {};
    }
  }
  tree.root = tree.nodes.root ? 'root' : null;
  return { tree, surfaceId: sid, catalogId, theme };
}

/**
 * Harbor findings as A2UI client errors. A2UI v0.9.1 defines one validation
 * error, code VALIDATION_FAILED with a JSON Pointer path, as the way a client
 * tells the agent what to fix.
 * @param {import('../tree/tree.js').Finding[]} findings
 * @param {string} surfaceId
 */
export function findingsToA2uiErrors(findings, surfaceId) {
  return findings.map((f) => ({
    version: A2UI_VERSION,
    error: { code: 'VALIDATION_FAILED', surfaceId, path: f.nodeId ? `/components/${f.nodeId}${f.path.split('/props')[1] ?? ''}` : f.path, message: f.message },
  }));
}
