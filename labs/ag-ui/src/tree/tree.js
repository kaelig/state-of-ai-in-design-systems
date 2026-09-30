// The UI tree is the one artifact every surface shares. The agent streams it,
// React and Storybook render it, the Figma bridge draws it, and the exporters
// turn it into JSX and CSF. It is deliberately dumb data: a flat map of nodes,
// each a catalog component name, its props and the ids of its children.

import Ajv from 'ajv';
import jsonpatch from 'fast-json-patch';
import { withDefaults } from '../catalog/index.js';

/**
 * @typedef {{ type: string, props: Record<string, any>, children?: string[] }} UINode
 * @typedef {{ title?: string, root: string | null, nodes: Record<string, UINode> }} UITree
 * @typedef {{ nodeId?: string, path: string, message: string, severity: 'error' | 'warning', rule: string }} Finding
 */

/** @returns {UITree} */
export const emptyTree = () => ({ title: '', root: null, nodes: {} });

/**
 * JSON Patch operations that build `tree` from an empty tree one node at a
 * time, parents before children, so a renderer showing the intermediate states
 * never meets a child id it has no node for.
 * @param {UITree} tree
 * @param {string} [base] JSON Pointer to where the tree lives in state
 * @returns {import('@ag-ui/core').JsonPatchOperation[]}
 */
export function treeToOps(tree, base = '/ui') {
  /** @type {import('@ag-ui/core').JsonPatchOperation[]} */
  const ops = [];
  if (tree.title) ops.push({ op: 'replace', path: `${base}/title`, value: tree.title });
  if (!tree.root) return ops;
  const visit = (/** @type {string} */ id, /** @type {string | null} */ parent) => {
    const node = tree.nodes[id];
    if (!node) return;
    /** @type {UINode} */
    const shell = { type: node.type, props: node.props };
    if (node.children) shell.children = [];
    ops.push({ op: 'add', path: `${base}/nodes/${escape(id)}`, value: shell });
    if (parent === null) ops.push({ op: 'replace', path: `${base}/root`, value: id });
    else ops.push({ op: 'add', path: `${base}/nodes/${escape(parent)}/children/-`, value: id });
    for (const child of node.children ?? []) visit(child, id);
  };
  visit(tree.root, null);
  return ops;
}

/** RFC 6901 escaping for a single path segment. */
const escape = (/** @type {string} */ s) => s.replace(/~/g, '~0').replace(/\//g, '~1');

/**
 * Apply JSON Patch operations without mutating the input.
 * @template T
 * @param {T} doc
 * @param {import('@ag-ui/core').JsonPatchOperation[]} ops
 * @returns {T}
 */
export function applyOps(doc, ops) {
  return jsonpatch.applyPatch(structuredClone(doc), /** @type {any} */ (ops), false, false).newDocument;
}

const ajv = new Ajv({ allErrors: true, strict: false });
/** @type {WeakMap<object, Map<string, import('ajv').ValidateFunction>>} */
const validators = new WeakMap();

/**
 * @param {import('../catalog/index.js').Catalog} catalog
 * @param {string} type
 */
function propsValidator(catalog, type) {
  let byType = validators.get(catalog);
  if (!byType) validators.set(catalog, (byType = new Map()));
  let v = byType.get(type);
  if (!v) byType.set(type, (v = ajv.compile(catalog.components[type].props)));
  return v;
}

/**
 * Check a tree against the catalog. Errors are contract violations a renderer
 * cannot honor (an unknown component, a prop outside its enum, children on a
 * leaf). Warnings are the design system's own usage rules, the kind a reviewer
 * would flag: two primary buttons side by side, a skipped heading level.
 * @param {UITree} tree
 * @param {import('../catalog/index.js').Catalog} catalog
 * @returns {{ valid: boolean, errors: Finding[], warnings: Finding[] }}
 */
export function validateTree(tree, catalog) {
  /** @type {Finding[]} */
  const findings = [];
  const add = (/** @type {Omit<Finding, 'severity'> & { severity?: Finding['severity'] }} */ f) =>
    findings.push({ severity: 'error', ...f });

  if (!tree || typeof tree !== 'object' || typeof tree.nodes !== 'object') {
    add({ path: '', message: 'The tree needs a `nodes` object and a `root` id.', rule: 'shape' });
    return split(findings);
  }
  if (!tree.root || !tree.nodes[tree.root]) {
    add({ path: '/root', message: `Root "${tree.root}" is not a node.`, rule: 'shape' });
  }

  const parents = new Map();
  for (const [id, node] of Object.entries(tree.nodes)) {
    const contract = catalog.components[node?.type];
    if (!contract) {
      const known = Object.keys(catalog.components).join(', ');
      add({ nodeId: id, path: `/nodes/${id}/type`, message: `"${node?.type}" is not a ${catalog.name} component. Use one of: ${known}.`, rule: 'catalog' });
      continue;
    }
    const validate = propsValidator(catalog, node.type);
    if (!validate(node.props ?? {})) {
      for (const e of validate.errors ?? []) {
        const where = e.instancePath || '';
        let message = `${node.type}${where ? where.replace(/^\//, '.') : ''} ${e.message}`;
        if (e.keyword === 'enum') message += `: ${e.params.allowedValues.map((/** @type {any} */ v) => JSON.stringify(v)).join(', ')}`;
        if (e.keyword === 'additionalProperties') message = `${node.type} has no prop "${e.params.additionalProperty}".`;
        add({ nodeId: id, path: `/nodes/${id}/props${where}`, message, rule: 'props' });
      }
    }
    if (contract.children.kind === 'none' && node.children?.length) {
      add({ nodeId: id, path: `/nodes/${id}/children`, message: `${node.type} cannot contain other components.`, rule: 'children' });
    }
    for (const child of node.children ?? []) {
      if (!tree.nodes[child]) add({ nodeId: id, path: `/nodes/${id}/children`, message: `Child "${child}" does not exist.`, rule: 'shape' });
      else if (parents.has(child)) add({ nodeId: child, path: `/nodes/${child}`, message: `"${child}" has two parents.`, rule: 'shape' });
      else parents.set(child, id);
    }
  }

  // Reachability and cycles, from the root.
  if (tree.root && tree.nodes[tree.root]) {
    const seen = new Set();
    const walk = (/** @type {string} */ id, /** @type {Set<string>} */ path) => {
      if (path.has(id)) {
        add({ nodeId: id, path: `/nodes/${id}`, message: `"${id}" contains itself.`, rule: 'shape' });
        return;
      }
      if (seen.has(id) || !tree.nodes[id]) return;
      seen.add(id);
      for (const c of tree.nodes[id].children ?? []) walk(c, new Set([...path, id]));
    };
    walk(tree.root, new Set());
    for (const id of Object.keys(tree.nodes)) {
      if (!seen.has(id)) add({ nodeId: id, path: `/nodes/${id}`, message: `"${id}" is not reachable from the root.`, rule: 'shape', severity: 'warning' });
    }
  }

  findings.push(...usageRules(tree, catalog));
  return split(findings);
}

/** @param {Finding[]} findings */
function split(findings) {
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Harbor's usage guidelines, written as checks. These are what a design
 * system's docs say in prose; here they run on every generated screen.
 * @param {UITree} tree
 * @param {import('../catalog/index.js').Catalog} catalog
 * @returns {Finding[]}
 */
function usageRules(tree, catalog) {
  /** @type {Finding[]} */
  const out = [];
  const nodes = Object.entries(tree.nodes).filter(([, n]) => catalog.components[n?.type]);
  const h1 = nodes.filter(([, n]) => n.type === 'Heading' && withDefaults(catalog, 'Heading', n.props).level === 1);
  if (h1.length > 1) {
    for (const [id] of h1.slice(1)) out.push({ nodeId: id, path: `/nodes/${id}/props/level`, message: 'Only one level 1 heading per screen.', severity: 'warning', rule: 'heading-order' });
  }
  const levels = nodes.filter(([, n]) => n.type === 'Heading').map(([id, n]) => [id, withDefaults(catalog, 'Heading', n.props).level]);
  let deepest = 0;
  for (const [id, level] of levels) {
    if (level > deepest + 1) out.push({ nodeId: String(id), path: `/nodes/${id}/props/level`, message: `Heading jumps to level ${level} without a level ${level - 1} before it.`, severity: 'warning', rule: 'heading-order' });
    deepest = Math.max(deepest, Number(level));
  }
  for (const [id, n] of nodes) {
    const primaries = (n.children ?? []).filter((c) => tree.nodes[c]?.type === 'Button' && withDefaults(catalog, 'Button', tree.nodes[c].props).variant === 'primary');
    if (primaries.length > 1) {
      out.push({ nodeId: primaries[1], path: `/nodes/${primaries[1]}/props/variant`, message: `Two primary buttons in "${id}". Make one secondary.`, severity: 'warning', rule: 'one-primary' });
    }
  }
  return out;
}

/**
 * Walk the tree depth first, parents before children.
 * @param {UITree} tree
 * @param {(id: string, node: UINode, depth: number) => void} fn
 */
export function walkTree(tree, fn) {
  const visit = (/** @type {string} */ id, /** @type {number} */ depth) => {
    const node = tree.nodes[id];
    if (!node) return;
    fn(id, node, depth);
    for (const c of node.children ?? []) visit(c, depth + 1);
  };
  if (tree.root) visit(tree.root, 0);
}

/**
 * Count components by type, for summaries.
 * @param {UITree} tree
 */
export function summarize(tree) {
  /** @type {Record<string, number>} */
  const counts = {};
  walkTree(tree, (_id, n) => (counts[n.type] = (counts[n.type] ?? 0) + 1));
  return Object.entries(counts)
    .map(([t, n]) => (n > 1 ? `${t} ×${n}` : t))
    .join(', ');
}
