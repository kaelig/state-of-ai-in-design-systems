// Turn a UI tree into code a developer can keep: JSX that imports Harbor's
// React components, and a CSF 3 story file that Storybook indexes like any
// hand-written one. Props that equal their catalog default are left out, so
// the output reads like a person wrote it.

import { walkTree } from './tree.js';

/**
 * @param {import('./tree.js').UITree} tree
 * @param {import('../catalog/index.js').Catalog} catalog
 * @param {{ indent?: number }} [options]
 */
export function treeToJsx(tree, catalog, { indent = 0 } = {}) {
  if (!tree.root || !tree.nodes[tree.root]) return 'null';
  const pad = (/** @type {number} */ n) => '  '.repeat(n);
  const render = (/** @type {string} */ id, /** @type {number} */ depth) => {
    const node = tree.nodes[id];
    if (!node) return '';
    const attrs = propsToAttrs(node.type, node.props, catalog);
    const open = `${pad(depth)}<${node.type}${attrs}`;
    const kids = (node.children ?? []).filter((c) => tree.nodes[c]);
    if (!kids.length) return `${open} />`;
    return [`${open}>`, ...kids.map((c) => render(c, depth + 1)), `${pad(depth)}</${node.type}>`].join('\n');
  };
  return render(tree.root, indent);
}

/**
 * @param {string} type
 * @param {Record<string, any>} props
 * @param {import('../catalog/index.js').Catalog} catalog
 */
function propsToAttrs(type, props = {}, catalog) {
  const schema = catalog.components[type]?.props?.properties ?? {};
  const parts = [];
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || schema[name]?.default === value) continue;
    if (value === true) parts.push(name);
    else if (typeof value === 'string') parts.push(`${name}=${JSON.stringify(value)}`);
    else parts.push(`${name}={${JSON.stringify(value)}}`);
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

/** The component names a tree uses, sorted, for an import line. */
export function usedComponents(/** @type {import('./tree.js').UITree} */ tree) {
  const used = new Set();
  walkTree(tree, (_id, n) => used.add(n.type));
  return [...used].sort();
}

/**
 * A complete CSF 3 file with one story that renders the tree. The story's
 * `parameters.agui` keeps the tree itself, so the story can be reopened in the
 * generator, diffed, or sent back to Figma without parsing JSX.
 * @param {import('./tree.js').UITree} tree
 * @param {import('../catalog/index.js').Catalog} catalog
 * @param {{ title?: string, exportName?: string, importFrom?: string, prompt?: string, tags?: string[] }} [options]
 *   `tags` lands on the meta; Storybook's agentic setup marks agent-written
 *   stories 'ai-generated', and '!manifest' keeps a component-less story out
 *   of /manifests/components.json.
 */
export function treeToCsf(tree, catalog, options = {}) {
  const exportName = options.exportName ?? toExportName(tree.title || 'Generated');
  const title = options.title ?? `Generated/${tree.title || exportName}`;
  const importFrom = options.importFrom ?? '../../src/react/index.js';
  const jsx = treeToJsx(tree, catalog, { indent: 3 });
  return `// Generated over AG-UI from ${catalog.name}@${catalog.version}. Edit freely; the tree in
// parameters.agui is what the generator reads back.
import { ${usedComponents(tree).join(', ')} } from '${importFrom}';

export default {
  title: ${JSON.stringify(title)},${options.tags?.length ? `\n  tags: ${JSON.stringify(options.tags)},` : ''}
  parameters: {
    layout: 'padded',
    agui: {
      catalog: ${JSON.stringify(`${catalog.name}@${catalog.version}`)},
      prompt: ${JSON.stringify(options.prompt ?? '')},
      tree: ${JSON.stringify(tree)},
    },
  },
};

export const ${exportName} = {
  render: () => (
${jsx}
  ),
};
`;
}

/** "Sign-up form" -> "SignUpForm" */
export function toExportName(/** @type {string} */ s) {
  const name = s
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
  return /^[A-Z]/.test(name) ? name : `Screen${name}`;
}
