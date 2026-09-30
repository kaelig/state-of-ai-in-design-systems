// Specs (Nathan Curtis / Directed Edges) -> Harbor catalog entries, and a diff
// between two catalogs: "Figma and code disagree".
//
// Input format: a component spec as exported by the Specs 2 Figma plugin's
// Data section (JSON; the plugin also offers YAML, parse it first) or by the
// Specs CLI, targeting @directededges/specs-schema **0.34.0**
// (schema/component.schema.json, JSON Schema draft-07, CC BY 4.0). The schema
// moves fast (18 releases between April and September 2026; 0.34.0 renamed
// invalidVariantCombinations to invalidPropCombinations), so pin this version
// and re-run the tests when it changes.
//
// Verified against the published package (installed in labs/ag-ui, fixtures in
// tests/fixtures/specs validate with validateSpec below):
//   - Component: required title, anatomy, default; optional props, variants,
//     invalidPropCombinations, subcomponents, metadata (source required when
//     present), instanceExamples, slotContentExamples, images.
//   - Six prop kinds: boolean {default}, string {examples?, nullable?},
//     enum {type:'string', default, enum, nullable?}, number {default?, enum?},
//     slot {minChildren?, maxChildren?, anyOf? (component names), nullable?},
//     image. Each may carry $extensions['com.figma'] {type, name?, source?}
//     where type is one of BOOLEAN, TEXT, INSTANCE_SWAP, VARIANT, and
//     source.kind 'codeOnlyProp' marks a prop that is not a Figma property.
//   - Anatomy: element name -> { type (text, glyph, vector, container, slot,
//     instance, line, ellipse, rectangle, polygon, star), instanceOf?, role?,
//     actions? }.
//   - invalidPropCombinations: objects of prop -> value (scalars, null for
//     unset, or bindings/slot refs).
//   - Quirk in 0.34.0: a bare { "type": "string" } prop fails validation,
//     because it matches both StringProp and EnumProp inside AnyProp's oneOf.
//     Real exports carry `examples` on TEXT props, which disambiguates.
//   Sources: research_notes/AG UI protocol for design systems/specs_plugin.md
//   (https://www.specsplugin.com/schema/props/, /schema/anatomy/,
//   /schema/component/, /code/contract/) and the package's own types/*.ts.
//
// Proposal, not Specs behavior (Specs ships no transform to JSON Schema or to
// an agent catalog; this mapping is ours):
//   - props -> JSON Schema. Enums keep Figma's casing unless enumCase:'lower';
//     a non-nullable string or image with no default becomes required.
//   - The first slot prop -> children { kind:'nodes', allowed, min, max };
//     Harbor nodes have one ordered child list, so further slots are findings.
//   - invalidPropCombinations -> `not: { anyOf: [...] }` on the props schema,
//     so validateTree rejects the combinations Figma never drew. A value equal
//     to the prop's default is not `required`, because Harbor trees omit
//     defaults.
//   - figma.properties: `$extensions['com.figma'].name` when Specs recorded
//     it, otherwise the key in sentence case ("showIcon" -> "Show icon"), the
//     SENTENCE figmaKeys convention. Specs does not record the `#id` suffix
//     Figma adds to TEXT and BOOLEAN names, so the Figma runtime matches those
//     by the name before the `#` (tree-to-figma.js does).
//   - Roles and actions become the entry's a11y note.
//
// Secondary input, cheaper and always available: Figma's own
// ComponentSetNode.componentPropertyDefinitions from the Plugin API (what
// Specs itself reads), via componentPropertyDefinitionsToEntry.

import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SPECS_SCHEMA_PACKAGE = '@directededges/specs-schema';
export const SPECS_SCHEMA_VERSION = '0.34.0';

/**
 * @typedef {import('../catalog/index.js').ComponentContract & {
 *   children: { kind: 'nodes' | 'none', allowed?: string[], min?: number, max?: number, slot?: string },
 *   specs?: Record<string, any>,
 * }} SpecsContract
 * @typedef {{ component?: string, prop?: string, message: string, severity: 'warning' | 'info', rule: string }} SpecsFinding
 */

/** @type {import('ajv').ValidateFunction | null} */
let validator = null;

/**
 * Validate a spec against the published Specs component schema. The schema
 * references its siblings (metadata, styles, settings, conventions) by
 * relative file name, so they are registered under those names.
 * @param {unknown} spec
 * @returns {{ valid: boolean, errors: { path: string, message: string }[] }}
 */
export function validateSpec(spec) {
  if (!validator) {
    const dir = dirname(fileURLToPath(import.meta.resolve(`${SPECS_SCHEMA_PACKAGE}/schema/component`)));
    const load = (/** @type {string} */ f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const pkg = JSON.parse(readFileSync(join(dir, '../package.json'), 'utf8'));
    if (pkg.version !== SPECS_SCHEMA_VERSION) throw new Error(`${SPECS_SCHEMA_PACKAGE} is ${pkg.version}; this adapter targets ${SPECS_SCHEMA_VERSION}.`);
    const ajv = new Ajv({ strict: false, allErrors: true });
    for (const f of ['metadata', 'styles', 'settings', 'conventions']) ajv.addSchema(load(`${f}.schema.json`), `${f}.schema.json`);
    validator = ajv.compile(load('component.schema.json'));
  }
  const valid = /** @type {boolean} */ (validator(spec));
  return { valid, errors: valid ? [] : (validator.errors ?? []).map((e) => ({ path: e.instancePath, message: `${e.instancePath || '/'} ${e.message}` })) };
}

/** "Text field" -> "TextField", "button" -> "Button". */
export const typeName = (/** @type {string} */ title) =>
  String(title)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

/** "showIcon" -> "Show icon": the SENTENCE figmaKeys convention. */
export const sentenceCase = (/** @type {string} */ key) => {
  const words = String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  return words.length ? words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? ' ' + words.slice(1).join(' ') : '') : key;
};

/** `Label#3:0` -> `Label` */
const stripId = (/** @type {string} */ name) => String(name).replace(/#[^#]*$/, '');

/**
 * One Specs component spec -> one Harbor-shaped catalog entry.
 * @param {Record<string, any>} spec
 * @param {{ type?: string, description?: string, category?: string, enumCase?: 'preserve' | 'lower' }} [options]
 * @returns {{ type: string, entry: SpecsContract, findings: SpecsFinding[] }}
 */
export function specToCatalogEntry(spec, options = {}) {
  const type = options.type ?? typeName(spec.title);
  const lower = options.enumCase === 'lower';
  const cased = (/** @type {any} */ v) => (lower && typeof v === 'string' ? v.toLowerCase() : v);
  /** @type {SpecsFinding[]} */
  const findings = [];
  /** @type {Record<string, any>} */
  const properties = {};
  /** @type {string[]} */
  const required = [];
  /** @type {Record<string, string>} */
  const figmaProperties = {};
  /** @type {[string, Record<string, any>][]} */
  const slots = [];
  const codeOnly = [];

  for (const [key, prop] of Object.entries(spec.props ?? {})) {
    const fx = prop.$extensions?.['com.figma'] ?? {};
    const isCodeOnly = fx.source?.kind === 'codeOnlyProp';
    const nullable = prop.nullable;
    /** @type {Record<string, any> | null} */
    let schema = null;
    if (prop.type === 'boolean') schema = { type: 'boolean', default: prop.default };
    else if (prop.type === 'string' && Array.isArray(prop.enum)) {
      schema = { enum: prop.enum.map(cased), default: cased(prop.default) };
      if (nullable === true) schema.enum.push(null);
    } else if (prop.type === 'string') {
      schema = { type: 'string' };
      if (prop.examples?.length) schema.examples = prop.examples;
      if (nullable === false) required.push(key);
    } else if (prop.type === 'number') {
      const ints = Array.isArray(prop.enum) && prop.enum.every(Number.isInteger);
      schema = { type: ints ? 'integer' : 'number' };
      if (Array.isArray(prop.enum)) schema.enum = [...prop.enum];
      if (prop.default !== undefined) schema.default = prop.default;
      else if (nullable === false) required.push(key);
    } else if (prop.type === 'image') {
      schema = { type: 'string', description: 'An image reference (a Specs image prop).' };
      if (nullable === false && prop.default == null) required.push(key);
    } else if (prop.type === 'slot') {
      slots.push([key, prop]);
      continue;
    } else {
      findings.push({ component: type, prop: key, message: `${type}.${key} has an unknown Specs prop type "${prop.type}"; skipped.`, severity: 'warning', rule: 'unknown-prop-type' });
      continue;
    }
    if (schema.default === undefined) delete schema.default;
    properties[key] = schema;
    if (isCodeOnly) codeOnly.push(key);
    else figmaProperties[key] = fx.name ?? sentenceCase(key);
  }

  /** @type {SpecsContract['children']} */
  let children = { kind: 'none' };
  if (slots.length) {
    const [key, slot] = slots[0];
    children = { kind: 'nodes', slot: key };
    if (Array.isArray(slot.anyOf) && slot.anyOf.length) children.allowed = slot.anyOf.map(typeName);
    if (Number.isInteger(slot.minChildren)) children.min = slot.minChildren;
    if (Number.isInteger(slot.maxChildren)) children.max = slot.maxChildren;
    for (const [extra] of slots.slice(1)) {
      findings.push({ component: type, prop: extra, message: `${type} has a second slot "${extra}"; Harbor nodes have one child list, so it is not modeled.`, severity: 'warning', rule: 'extra-slot' });
    }
  }

  /** @type {Record<string, any>} */
  const propsSchema = { type: 'object', properties, additionalProperties: false };
  if (required.length) propsSchema.required = required;
  const clauses = [];
  for (const combo of spec.invalidPropCombinations ?? []) {
    /** @type {Record<string, any>} */
    const consts = {};
    const needed = [];
    let usable = true;
    for (const [k, raw] of Object.entries(combo)) {
      if (k === '$nested' || raw === null || typeof raw === 'object') continue;
      if (!properties[k]) {
        findings.push({ component: type, prop: k, message: `An invalid combination names "${k}", which is not a scalar prop of ${type}; the combination is dropped.`, severity: 'warning', rule: 'invalid-combination' });
        usable = false;
        break;
      }
      const value = cased(raw);
      consts[k] = { const: value };
      if (properties[k].default !== value) needed.push(k);
    }
    if (usable && Object.keys(consts).length) clauses.push(needed.length ? { properties: consts, required: needed } : { properties: consts });
  }
  if (clauses.length) propsSchema.not = { anyOf: clauses };

  const anatomy = spec.anatomy ?? {};
  const roles = Object.entries(anatomy)
    .filter(([, e]) => e?.role)
    .map(([name, e]) => `${name} is ${[].concat(e.role).join(' and ')}`);
  const actions = Object.entries(anatomy)
    .filter(([, e]) => e?.actions?.length)
    .map(([name, e]) => `${name} does ${e.actions.map((/** @type {any} */ a) => a.type).join(', ')}`);

  /** @type {SpecsContract} */
  const entry = {
    description: options.description ?? `${spec.title}, from its Specs spec.`,
    category: options.category ?? 'component',
    props: propsSchema,
    children,
    anatomy: Object.keys(anatomy),
    figma: { component: spec.title, properties: figmaProperties },
    specs: {
      schema: `${SPECS_SCHEMA_PACKAGE}@${SPECS_SCHEMA_VERSION}`,
      source: spec.metadata?.source,
      anatomy: Object.fromEntries(Object.entries(anatomy).map(([k, e]) => [k, { type: e?.type, ...(e?.role ? { role: e.role } : {}), ...(e?.instanceOf ? { instanceOf: e.instanceOf } : {}) }])),
      codeOnlyProps: codeOnly,
      invalidPropCombinations: spec.invalidPropCombinations ?? [],
    },
  };
  if (roles.length || actions.length) entry.a11y = `From Specs: ${[...roles, ...actions].join('; ')}.`;
  return { type, entry, findings };
}

/**
 * Several specs (and their subcomponents) -> a Harbor-shaped catalog.
 * @param {Record<string, any>[]} specs
 * @param {{ name?: string, version?: string, description?: string, enumCase?: 'preserve' | 'lower' }} [options]
 */
export function specsToCatalog(specs, options = {}) {
  /** @type {Record<string, SpecsContract>} */
  const components = {};
  /** @type {SpecsFinding[]} */
  const findings = [];
  const add = (/** @type {Record<string, any>} */ spec) => {
    const r = specToCatalogEntry(spec, { enumCase: options.enumCase });
    if (components[r.type]) findings.push({ component: r.type, message: `Two specs map to ${r.type}; kept the first.`, severity: 'warning', rule: 'duplicate' });
    else components[r.type] = r.entry;
    findings.push(...r.findings);
  };
  for (const spec of specs) {
    add(spec);
    for (const [name, sub] of Object.entries(spec.subcomponents ?? {})) add({ ...sub, title: sub.title ?? name });
  }
  return {
    catalog: { name: options.name ?? 'specs', version: options.version ?? '0.0.0', description: options.description ?? 'Generated from Specs component specs.', components },
    findings,
  };
}

/**
 * Figma's ComponentSetNode.componentPropertyDefinitions (Plugin API) -> an
 * entry. VARIANT becomes an enum, BOOLEAN a boolean, TEXT and INSTANCE_SWAP a
 * string; the `#id` suffix is dropped from the prop name and kept in the
 * figma mapping, which is exactly what tree-to-figma needs.
 * @param {Record<string, { type: string, defaultValue: any, variantOptions?: string[] }>} definitions
 * @param {{ name: string, anatomy?: string[], description?: string, category?: string, key?: string, enumCase?: 'preserve' | 'lower' }} options
 */
export function componentPropertyDefinitionsToEntry(definitions, options) {
  const lower = options.enumCase === 'lower';
  const cased = (/** @type {any} */ v) => (lower && typeof v === 'string' ? v.toLowerCase() : v);
  /** @type {Record<string, any>} */
  const properties = {};
  /** @type {Record<string, string>} */
  const figmaProperties = {};
  /** @type {SpecsFinding[]} */
  const findings = [];
  let children = /** @type {SpecsContract['children']} */ ({ kind: 'none' });
  for (const [figmaName, d] of Object.entries(definitions)) {
    const words = stripId(figmaName).split(/[^A-Za-z0-9]+/).filter(Boolean);
    const key = words.map((w, i) => (i ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('');
    if (d.type === 'VARIANT') {
      const values = (d.variantOptions ?? []).map(cased);
      const bool = values.length === 2 && values.every((v) => /^(true|false)$/i.test(String(v)));
      properties[key] = bool ? { type: 'boolean', default: /^true$/i.test(String(d.defaultValue)) } : { enum: values, default: cased(d.defaultValue) };
    } else if (d.type === 'BOOLEAN') properties[key] = { type: 'boolean', default: Boolean(d.defaultValue) };
    else if (d.type === 'TEXT') properties[key] = { type: 'string', examples: [String(d.defaultValue)] };
    else if (d.type === 'INSTANCE_SWAP') properties[key] = { type: 'string', description: 'A component id to swap in.' };
    else if (d.type === 'SLOT') {
      children = { kind: 'nodes', slot: key };
      continue;
    } else {
      findings.push({ component: options.name, prop: key, message: `Unknown Figma property type ${d.type}; skipped.`, severity: 'warning', rule: 'unknown-prop-type' });
      continue;
    }
    figmaProperties[key] = figmaName;
  }
  const type = typeName(options.name);
  /** @type {SpecsContract} */
  const entry = {
    description: options.description ?? `${options.name}, from Figma's component properties.`,
    category: options.category ?? 'component',
    props: { type: 'object', properties, additionalProperties: false },
    children,
    anatomy: options.anatomy ?? [],
    figma: { component: options.name, properties: figmaProperties, ...(options.key ? { key: options.key } : {}) },
  };
  return { type, entry, findings };
}

/**
 * A prop schema reduced to what both sides can state: its kind, its closed
 * value set if any (an integer range of a dozen or fewer counts), its default
 * and whether it is required.
 * @param {Record<string, any> | undefined} schema
 * @param {boolean} required
 */
function shapeOf(schema, required) {
  const s = schema ?? {};
  if (Array.isArray(s.enum)) return { kind: 'enum', values: s.enum.filter((/** @type {any} */ v) => v !== null), default: s.default, required };
  if (s.type === 'integer' && Number.isInteger(s.minimum) && Number.isInteger(s.maximum) && s.maximum - s.minimum <= 12) {
    const values = [];
    for (let i = s.minimum; i <= s.maximum; i++) values.push(i);
    return { kind: 'enum', values, default: s.default, required };
  }
  const kind = s.type === 'integer' ? 'number' : (s.type ?? 'any');
  return { kind: Array.isArray(kind) ? kind.join('|') : kind, values: null, default: s.default, required };
}

/**
 * What differs between two catalog entries, or two whole catalogs. Read `a`
 * as code and `b` as Figma (or Specs): "added" is in Figma only, "removed" is
 * in code only. Enum values and defaults compare case-insensitively unless
 * strictCase, because Figma variant values are usually capitalized and code
 * values usually are not, and tree-to-figma matches them the same way.
 * Figma property names compare without their `#id` suffix.
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 * @param {{ strictCase?: boolean, ignore?: ('anatomy' | 'figma' | 'children')[], name?: string }} [options]
 * @returns {any}
 */
export function catalogDiff(a, b, options = {}) {
  if (a?.components && b?.components) {
    /** @type {Record<string, any>} */
    const components = {};
    const onlyCode = Object.keys(a.components).filter((t) => !(t in b.components));
    const onlyFigma = Object.keys(b.components).filter((t) => !(t in a.components));
    for (const t of Object.keys(a.components)) if (t in b.components) components[t] = catalogDiff(a.components[t], b.components[t], { ...options, name: t });
    const messages = [
      ...onlyCode.map((t) => `${t} is in code but not in Figma.`),
      ...onlyFigma.map((t) => `${t} is in Figma but not in code.`),
      ...Object.values(components).flatMap((d) => d.messages),
    ];
    return { equal: messages.length === 0, onlyCode, onlyFigma, components, messages };
  }

  const name = options.name ?? b?.figma?.component ?? 'Component';
  const ignore = new Set(options.ignore ?? []);
  const norm = (/** @type {any} */ v) => (!options.strictCase && typeof v === 'string' ? v.toLowerCase() : v);
  const key = (/** @type {any} */ v) => JSON.stringify(norm(v));
  const list = (/** @type {any[]} */ vs) => vs.map((v) => JSON.stringify(v)).join(', ');
  /** @type {string[]} */
  const messages = [];

  const pa = a?.props?.properties ?? {};
  const pb = b?.props?.properties ?? {};
  const ra = new Set(a?.props?.required ?? []);
  const rb = new Set(b?.props?.required ?? []);
  const added = Object.keys(pb)
    .filter((p) => !(p in pa))
    .map((prop) => ({ prop, schema: pb[prop] }));
  const removed = Object.keys(pa)
    .filter((p) => !(p in pb))
    .map((prop) => ({ prop, schema: pa[prop] }));
  for (const { prop } of added) messages.push(`${name}.${prop} is in Figma but not in code.`);
  for (const { prop } of removed) messages.push(`${name}.${prop} is in code but not in Figma.`);

  /** @type {{ prop: string, field: string, code: any, figma: any, message: string }[]} */
  const changed = [];
  const change = (/** @type {string} */ prop, /** @type {string} */ field, /** @type {any} */ code, /** @type {any} */ figma, /** @type {string} */ message) => {
    changed.push({ prop, field, code, figma, message });
    messages.push(message);
  };
  for (const prop of Object.keys(pa).filter((p) => p in pb)) {
    const x = shapeOf(pa[prop], ra.has(prop));
    const y = shapeOf(pb[prop], rb.has(prop));
    if (x.kind !== y.kind) {
      change(prop, 'type', x.kind, y.kind, `${name}.${prop} is ${x.kind === 'enum' ? `one of ${list(x.values ?? [])}` : x.kind} in code but ${y.kind === 'enum' ? `one of ${list(y.values ?? [])}` : y.kind} in Figma.`);
      continue;
    }
    if (x.values && y.values) {
      const xs = new Set(x.values.map(key));
      const ys = new Set(y.values.map(key));
      const figmaOnly = y.values.filter((v) => !xs.has(key(v)));
      const codeOnly = x.values.filter((v) => !ys.has(key(v)));
      if (figmaOnly.length || codeOnly.length) {
        const parts = [];
        if (figmaOnly.length) parts.push(`Figma adds ${list(figmaOnly)}`);
        if (codeOnly.length) parts.push(`code adds ${list(codeOnly)}`);
        change(prop, 'values', x.values, y.values, `${name}.${prop} values differ: ${parts.join('; ')}.`);
      }
    }
    if (x.default !== undefined && y.default !== undefined && key(x.default) !== key(y.default)) {
      change(prop, 'default', x.default, y.default, `${name}.${prop} defaults to ${JSON.stringify(x.default)} in code and ${JSON.stringify(y.default)} in Figma.`);
    }
    if (x.required !== y.required) {
      change(prop, 'required', x.required, y.required, `${name}.${prop} is ${x.required ? 'required' : 'optional'} in code but ${y.required ? 'required' : 'optional'} in Figma.`);
    }
  }

  /** @type {any} */
  let children = null;
  if (!ignore.has('children')) {
    const ca = a?.children ?? { kind: 'none' };
    const cb = b?.children ?? { kind: 'none' };
    const diffs = [];
    if (ca.kind !== cb.kind) diffs.push(`${name} ${ca.kind === 'nodes' ? 'takes children' : 'takes no children'} in code but ${cb.kind === 'nodes' ? 'has a slot' : 'has no slot'} in Figma.`);
    else if (ca.kind === 'nodes') {
      const sa = ca.allowed ? [...ca.allowed].sort().join(', ') : 'any component';
      const sb = cb.allowed ? [...cb.allowed].sort().join(', ') : 'any component';
      if (sa !== sb) diffs.push(`${name} accepts ${sa} in code but ${sb} in Figma.`);
      if ((ca.min ?? null) !== (cb.min ?? null) || (ca.max ?? null) !== (cb.max ?? null)) diffs.push(`${name} takes ${ca.min ?? 0}..${ca.max ?? '∞'} children in code but ${cb.min ?? 0}..${cb.max ?? '∞'} in Figma.`);
    }
    if (diffs.length) {
      children = { code: ca, figma: cb, messages: diffs };
      messages.push(...diffs);
    }
  }

  /** @type {any} */
  let anatomy = null;
  if (!ignore.has('anatomy')) {
    const aa = new Set(a?.anatomy ?? []);
    const ab = new Set(b?.anatomy ?? []);
    const inFigma = [...ab].filter((x) => !aa.has(x));
    const inCode = [...aa].filter((x) => !ab.has(x));
    if (inFigma.length || inCode.length) {
      anatomy = { added: inFigma, removed: inCode };
      if (inFigma.length) messages.push(`${name} anatomy: Figma has ${inFigma.join(', ')}, code does not.`);
      if (inCode.length) messages.push(`${name} anatomy: code has ${inCode.join(', ')}, Figma does not.`);
    }
  }

  /** @type {any} */
  let figma = null;
  if (!ignore.has('figma')) {
    const fa = a?.figma ?? {};
    const fb = b?.figma ?? {};
    const diffs = [];
    if ((fa.component ?? null) !== (fb.component ?? null) && fa.component && fb.component) diffs.push(`${name} is the Figma component "${fa.component}" in code's mapping but "${fb.component}" in Figma.`);
    const ma = fa.properties ?? {};
    const mb = fb.properties ?? {};
    for (const prop of Object.keys(ma).filter((p) => p in mb)) {
      if (stripId(ma[prop]).toLowerCase() !== stripId(mb[prop]).toLowerCase()) diffs.push(`${name}.${prop} maps to Figma property "${stripId(ma[prop])}" in code but "${stripId(mb[prop])}" in Figma.`);
    }
    for (const prop of Object.keys(pa).filter((p) => p in pb && p in mb && !(p in ma))) diffs.push(`${name}.${prop} is a Figma property ("${stripId(mb[prop])}") that code's mapping does not bind.`);
    if (diffs.length) {
      figma = { messages: diffs };
      messages.push(...diffs);
    }
  }

  return { equal: messages.length === 0, props: { added, removed, changed }, children, anatomy, figma, messages };
}
