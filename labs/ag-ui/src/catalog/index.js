// The catalog is the design system's side of the contract. Everything an agent
// is told about Harbor, and everything a renderer will accept from it, is
// derived from harbor.catalog.json here, so the prompt, the tool schema and the
// validator can never disagree about what a Button takes.

import harbor from './harbor.catalog.json' with { type: 'json' };
import tokens from './tokens.json' with { type: 'json' };

export { harbor, tokens };

/**
 * @typedef {{ kind: 'nodes' | 'none', allowed?: string[] }} ChildrenRule
 * @typedef {{
 *   description: string,
 *   category: string,
 *   props: Record<string, any>,
 *   children: ChildrenRule,
 *   anatomy?: string[],
 *   figma?: { component: string | null, key?: string, properties?: Record<string, string>, autoLayout?: Record<string, any> },
 *   a11y?: string,
 * }} ComponentContract
 * @typedef {{ name: string, version: string, description: string, components: Record<string, ComponentContract> }} Catalog
 */

/** @param {Catalog} catalog */
export const catalogId = (catalog) => `${catalog.name}@${catalog.version}`;

/**
 * JSON Schema for one node of the UI tree: a discriminated union with one
 * branch per component, each carrying that component's own props schema. This
 * is what makes "the agent may only use Harbor" enforceable rather than a
 * sentence in a prompt.
 * @param {Catalog} catalog
 */
export function nodeSchema(catalog) {
  return {
    oneOf: Object.entries(catalog.components).map(([type, c]) => {
      /** @type {Record<string, any>} */
      const properties = {
        type: { const: type, description: c.description },
        props: c.props,
      };
      if (c.children.kind === 'nodes') {
        properties.children = {
          type: 'array',
          items: { type: 'string' },
          description: 'Ids of child nodes, in order.',
        };
      }
      return {
        type: 'object',
        properties,
        required: ['type', 'props'],
        additionalProperties: false,
      };
    }),
  };
}

/**
 * The whole tree: a flat map of nodes keyed by id plus the id of the root. Flat
 * rather than nested so a stream can add one node at a time with a JSON Patch
 * `add` and never has to rewrite a subtree it already sent.
 * @param {Catalog} catalog
 */
export function treeSchema(catalog) {
  return {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'A short name for the screen.' },
      root: { type: 'string', description: 'Id of the root node.' },
      nodes: {
        type: 'object',
        description: 'Every node, keyed by a short unique id such as "n1".',
        additionalProperties: nodeSchema(catalog),
      },
    },
    required: ['root', 'nodes'],
    additionalProperties: false,
  };
}

/**
 * The AG-UI frontend tools a client passes in RunAgentInput.tools when it wants
 * the agent to hand it UI as a tool call. The client executes `render_ui`
 * itself (it is the one holding the components) and answers with the
 * validation result, which is how a bad prop gets back to the model.
 * @param {Catalog} catalog
 * @returns {import('@ag-ui/core').Tool[]}
 */
export function catalogToTools(catalog) {
  return [
    {
      name: 'render_ui',
      description:
        `Render a screen using only ${catalog.name} components. ` +
        'Pass the complete tree. The client validates it against the design system and answers with any errors to fix.',
      parameters: treeSchema(catalog),
      metadata: { catalog: catalogId(catalog) },
    },
  ];
}

/**
 * A compact, prompt-sized description of the catalog for RunAgentInput.context.
 * Written as TypeScript-ish signatures because models read those reliably and
 * they cost a fraction of the JSON Schema.
 * @param {Catalog} catalog
 * @returns {import('@ag-ui/core').Context[]}
 */
export function catalogToContext(catalog) {
  const lines = Object.entries(catalog.components).map(([type, c]) => {
    const props = Object.entries(c.props.properties ?? {}).map(([name, s]) => {
      const optional = (c.props.required ?? []).includes(name) ? '' : '?';
      return `${name}${optional}: ${describeType(s)}`;
    });
    const kids = c.children.kind === 'nodes' ? ' [children]' : '';
    return `${type}{ ${props.join('; ')} }${kids} // ${c.description}`;
  });
  return [
    {
      description: `${catalogId(catalog)} component catalog`,
      value: lines.join('\n'),
    },
  ];
}

/** @param {Record<string, any>} s */
function describeType(s) {
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(' | ');
  if (s.type === 'integer' && s.minimum !== undefined) return `${s.minimum}..${s.maximum}`;
  return s.type ?? 'unknown';
}

/**
 * Fill in each prop's schema default so renderers and exporters agree on what
 * an omitted prop means.
 * @param {Catalog} catalog
 * @param {string} type
 * @param {Record<string, any>} [props]
 */
export function withDefaults(catalog, type, props = {}) {
  const schema = catalog.components[type]?.props?.properties ?? {};
  /** @type {Record<string, any>} */
  const out = {};
  for (const [name, s] of Object.entries(schema)) {
    if (s.default !== undefined) out[name] = s.default;
  }
  return { ...out, ...props };
}
