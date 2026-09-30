// Storybook argTypes derived from the catalog. The Controls panel then offers
// exactly the values the agent is allowed to emit: the same enum, the same
// integer range, the same required props. If Harbor adds a Button variant, the
// agent's tool schema, the validator and the Storybook control all change in
// one edit to harbor.catalog.json.
//
// The InputType shape used here (control, options, description, type, table
// with defaultValue/type summaries) is Storybook's own, verified against
// node_modules/storybook/dist/chunk-DdLFxT9J.d.ts (code/core/src/csf/story.ts,
// `interface InputType` and `type ControlType`) at storybook@10.6.1, and
// https://storybook.js.org/docs/api/arg-types.

/** Enums with this many options or fewer render as inline radios; longer ones as a select. */
const RADIO_MAX = 3;

/**
 * @param {import('../catalog/index.js').Catalog} catalog
 * @param {string} type A component name in the catalog, e.g. "Button".
 * @returns {Record<string, import('storybook/internal/types').InputType>}
 */
export function argTypesFromCatalog(catalog, type) {
  const contract = catalog.components[type];
  if (!contract) throw new Error(`"${type}" is not a ${catalog.name} component.`);
  const properties = contract.props?.properties ?? {};
  const required = new Set(contract.props?.required ?? []);
  /** @type {Record<string, any>} */
  const out = {};
  for (const [name, schema] of Object.entries(properties)) {
    out[name] = argTypeFor(schema, required.has(name));
  }
  return out;
}

/**
 * Story parameters that keep the Controls panel to the catalog's props. The
 * React components also accept `className`, `children` and `onClick`, which
 * react-docgen finds and would otherwise offer as controls; the agent cannot
 * set those, so neither should the panel that claims to mirror its contract.
 * `controls.include` is documented at
 * https://storybook.js.org/docs/essentials/controls#filtering-controls.
 * @param {import('../catalog/index.js').Catalog} catalog
 * @param {string} type
 */
export function parametersFromCatalog(catalog, type) {
  const contract = catalog.components[type];
  return {
    controls: { include: Object.keys(contract?.props?.properties ?? {}) },
    docs: { description: { component: contract?.description ?? '' } },
    harbor: { contract: `${catalog.name}@${catalog.version}#${type}`, anatomy: contract?.anatomy ?? [], a11y: contract?.a11y ?? null },
  };
}

/**
 * One prop's JSON Schema to one Storybook InputType.
 * @param {Record<string, any>} schema
 * @param {boolean} isRequired
 */
function argTypeFor(schema, isRequired) {
  /** @type {Record<string, any>} */
  const argType = { description: describe(schema), table: { category: 'catalog props' } };
  if (schema.default !== undefined) argType.table.defaultValue = { summary: JSON.stringify(schema.default) };

  if (Array.isArray(schema.enum)) {
    argType.options = schema.enum;
    argType.control = { type: schema.enum.length <= RADIO_MAX ? 'inline-radio' : 'select' };
    argType.type = { name: 'enum', value: schema.enum, required: isRequired };
    argType.table.type = { summary: schema.enum.map((v) => JSON.stringify(v)).join(' | ') };
  } else if (schema.type === 'boolean') {
    argType.control = { type: 'boolean' };
    argType.type = { name: 'boolean', required: isRequired };
    argType.table.type = { summary: 'boolean' };
  } else if (schema.type === 'integer' || schema.type === 'number') {
    const bounded = schema.minimum !== undefined && schema.maximum !== undefined;
    argType.control = bounded
      ? { type: 'range', min: schema.minimum, max: schema.maximum, step: schema.type === 'integer' ? 1 : (schema.multipleOf ?? 0.1) }
      : { type: 'number', ...(schema.minimum !== undefined ? { min: schema.minimum } : {}), ...(schema.maximum !== undefined ? { max: schema.maximum } : {}) };
    argType.type = { name: 'number', required: isRequired };
    argType.table.type = { summary: bounded ? `${schema.type} ${schema.minimum}..${schema.maximum}` : schema.type };
  } else if (schema.type === 'string') {
    argType.control = { type: 'text' };
    argType.type = { name: 'string', required: isRequired };
    argType.table.type = { summary: 'string' };
  } else {
    // Anything the catalog adds later that has no obvious control (objects,
    // arrays) is still shown and editable as JSON rather than silently dropped.
    argType.control = { type: 'object' };
    argType.type = { name: 'other', value: String(schema.type ?? 'unknown'), required: isRequired };
  }
  return argType;
}

/**
 * The prop's description plus the constraints a person editing the control
 * should see: the length limits are the ones the validator will enforce.
 * @param {Record<string, any>} schema
 */
function describe(schema) {
  const limits = [];
  if (schema.minLength !== undefined && schema.minLength > 0) limits.push(`at least ${schema.minLength} character${schema.minLength > 1 ? 's' : ''}`);
  if (schema.maxLength !== undefined) limits.push(`at most ${schema.maxLength} characters`);
  const text = schema.description ?? '';
  if (!limits.length) return text;
  const constraint = `${limits.join(', ')}.`;
  return text ? `${text} ${constraint[0].toUpperCase()}${constraint.slice(1)}` : constraint[0].toUpperCase() + constraint.slice(1);
}
