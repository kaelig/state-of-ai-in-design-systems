// The Specs adapter against fixtures shaped like Specs 2 exports and validated
// with the published @directededges/specs-schema, plus catalogDiff, the
// "Figma and code disagree" check.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import { harbor } from '../src/catalog/index.js';
import { validateTree } from '../src/tree/tree.js';
import { treeToFigmaScript } from '../src/figma/tree-to-figma.js';
import {
  SPECS_SCHEMA_VERSION,
  catalogDiff,
  componentPropertyDefinitionsToEntry,
  sentenceCase,
  specToCatalogEntry,
  specsToCatalog,
  validateSpec,
} from '../src/specs/specs-to-catalog.js';
import { HARBOR_LIBRARY, createFigmaMock, runScript } from './figma-mock.js';

const fixture = async (/** @type {string} */ name) => JSON.parse(await readFile(new URL(`./fixtures/specs/${name}.spec.json`, import.meta.url), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });

test(`fixtures and the docs' own sample validate against @directededges/specs-schema ${SPECS_SCHEMA_VERSION}`, async () => {
  for (const name of ['button', 'card']) {
    const { valid, errors } = validateSpec(await fixture(name));
    assert.ok(valid, `${name}: ${errors.map((e) => e.message).join('; ')}`);
  }
  // The toggle-button excerpt from specsplugin.com/code/contract/, completed
  // with the two required fields the excerpt leaves out (title, default).
  const docsSample = {
    title: 'Favorite',
    anatomy: { root: { type: 'container', role: 'togglebutton' }, icon: { type: 'glyph' } },
    props: {
      selected: { type: 'boolean', default: false },
      state: { type: 'string', default: 'Rest', enum: ['Rest', 'Hover', 'Pressed'], nullable: false },
      disabled: { type: 'boolean', default: false },
      accessibilityLabel: { type: 'string', examples: ['Example label'], $extensions: { 'com.figma': { type: 'TEXT', source: { kind: 'codeOnlyProp', layer: 'Accessibility label' } } } },
    },
    default: {},
    invalidPropCombinations: [
      { state: 'Hover', disabled: true },
      { state: 'Pressed', disabled: true },
    ],
  };
  assert.ok(validateSpec(docsSample).valid);
  assert.equal(validateSpec({ ...docsSample, invalidVariantCombinations: [] }).valid, false, 'the pre-0.34.0 name is rejected');
  assert.equal(validateSpec({ title: 'X', anatomy: {}, default: {}, props: { p: { type: 'string' } } }).valid, false, 'the 0.34.0 oneOf quirk: a bare string prop matches two branches');
});

test('specToCatalogEntry: props as JSON Schema, the Figma mapping, anatomy and roles', async () => {
  const { type, entry, findings } = specToCatalogEntry(await fixture('button'));
  assert.equal(type, 'Button');
  assert.deepEqual(findings, []);
  assert.deepEqual(entry.props.properties.variant, { enum: ['Primary', 'Secondary', 'Ghost'], default: 'Primary' });
  assert.deepEqual(entry.props.properties.label, { type: 'string', examples: ['Create account'] });
  assert.deepEqual(entry.props.properties.showIcon, { type: 'boolean', default: false });
  assert.deepEqual(entry.props.required, ['label'], 'nullable: false with no default');
  assert.equal(entry.props.additionalProperties, false);
  assert.deepEqual(entry.figma, { component: 'Button', properties: { variant: 'Variant', size: 'Size', disabled: 'Disabled', label: 'Label', showIcon: 'Show icon' } });
  assert.ok(!('accessibilityLabel' in entry.figma.properties), 'a code-only prop is not a Figma property');
  assert.deepEqual(entry.specs?.codeOnlyProps, ['accessibilityLabel']);
  assert.deepEqual(entry.anatomy, ['container', 'icon', 'label']);
  assert.deepEqual(entry.children, { kind: 'none' });
  assert.match(String(entry.a11y), /container is button/);
  assert.deepEqual(entry.specs?.source, { pageId: '0:1', nodeId: '3:0', nodeType: 'COMPONENT_SET' });
  assert.equal(specToCatalogEntry(await fixture('button'), { enumCase: 'lower' }).entry.props.properties.variant.default, 'primary');
  assert.equal(sentenceCase('accessibilityLabel'), 'Accessibility label');
});

test('invalidPropCombinations become schema clauses that reject exactly those combinations', async () => {
  const { entry } = specToCatalogEntry(await fixture('button'));
  const valid = ajv.compile(entry.props);
  assert.equal(valid({ label: 'Go', variant: 'Ghost', size: 'lg' }), false);
  assert.equal(valid({ label: 'Go', variant: 'Ghost' }), true, 'size defaults to md');
  assert.equal(valid({ label: 'Go', showIcon: true, size: 'sm' }), false);
  assert.equal(valid({ label: 'Go', showIcon: true }), true);
  assert.equal(valid({ variant: 'Primary' }), false, 'label is required');

  // In a catalog, the same clause reaches validateTree.
  const lower = specToCatalogEntry(await fixture('button'), { enumCase: 'lower' }).entry;
  const catalog = { ...harbor, components: { ...harbor.components, Button: lower } };
  const tree = { root: 'n1', nodes: { n1: { type: 'Stack', props: {}, children: ['n2'] }, n2: { type: 'Button', props: { label: 'Go', variant: 'ghost', size: 'lg' } } } };
  const report = validateTree(tree, /** @type {any} */ (catalog));
  assert.equal(report.valid, false);
  assert.equal(report.errors[0].nodeId, 'n2');
  tree.nodes.n2.props.size = 'md';
  assert.equal(validateTree(tree, /** @type {any} */ (catalog)).valid, true);
});

test('a slot prop becomes the entry’s children rule', async () => {
  const { entry } = specToCatalogEntry(await fixture('card'));
  assert.deepEqual(entry.children, { kind: 'nodes', slot: 'content', allowed: ['Stack', 'Heading', 'Text', 'Button', 'Stat'], min: 1, max: 6 });
  assert.ok(!('content' in entry.props.properties), 'a slot is not a prop');
  assert.ok(!('content' in entry.figma.properties));
  assert.deepEqual(Object.keys(entry.props.properties), ['elevation', 'padding']);

  const twoSlots = await fixture('card');
  twoSlots.props.footer = { type: 'slot', anyOf: ['Button'] };
  const r = specToCatalogEntry(twoSlots);
  assert.equal(r.findings[0].rule, 'extra-slot');
});

test('specsToCatalog builds a catalog the Figma side can draw from', async () => {
  const { catalog, findings } = specsToCatalog([await fixture('button'), await fixture('card')], { name: 'harbor-from-figma', enumCase: 'lower' });
  assert.deepEqual(findings, []);
  assert.deepEqual(Object.keys(catalog.components), ['Button', 'Card']);

  // A Specs-derived Button through tree-to-figma: "Label" with no #id still
  // finds the component's "Label#88:1".
  const merged = { ...harbor, components: { ...harbor.components, Button: catalog.components.Button } };
  const tree = { title: 'One button', root: 'n1', nodes: { n1: { type: 'Stack', props: {}, children: ['n2'] }, n2: { type: 'Button', props: { label: 'Go', variant: 'secondary' } } } };
  const m = createFigmaMock({ localComponents: HARBOR_LIBRARY });
  const result = await runScript(m.figma, treeToFigmaScript(tree, /** @type {any} */ (merged), { key: 'k' }));
  const button = m.page.findAll((/** @type {any} */ n) => n.name === 'Button · n2')[0];
  assert.equal(button.componentProperties.Variant.value, 'Secondary');
  assert.equal(button.componentProperties['Label#88:1'].value, 'Go');
  assert.match(result.warnings.map((/** @type {any} */ w) => w.message).join('\n'), /showIcon|Show icon/, 'the Figma file lacks a Specs prop: said, not thrown');
});

test('catalogDiff: where Harbor’s code and its Figma spec disagree', async () => {
  const figma = specToCatalogEntry(await fixture('button')).entry;
  const d = catalogDiff(harbor.components.Button, figma);
  assert.equal(d.equal, false);
  assert.deepEqual(d.props.added.map((/** @type {any} */ x) => x.prop).sort(), ['accessibilityLabel', 'showIcon']);
  assert.deepEqual(d.props.removed.map((/** @type {any} */ x) => x.prop), ['fullWidth']);
  assert.deepEqual(
    d.props.changed.map((/** @type {any} */ c) => [c.prop, c.field]),
    [['size', 'values']],
    'variant differs only in case, label is required on both sides, disabled is boolean on both',
  );
  assert.match(d.props.changed[0].message, /Figma adds "lg"/);
  assert.deepEqual(d.anatomy, { added: ['icon'], removed: [] });
  assert.equal(d.figma, null, 'Label#3:0 and Label name the same property');
  assert.ok(d.messages.includes('Button.fullWidth is in code but not in Figma.'));

  const strict = catalogDiff(harbor.components.Button, figma, { strictCase: true });
  assert.ok(strict.props.changed.some((/** @type {any} */ c) => c.prop === 'variant' && c.field === 'values'));
  assert.equal(catalogDiff(harbor.components.Button, harbor.components.Button).equal, true);
  assert.deepEqual(catalogDiff(harbor.components.Button, structuredClone(harbor.components.Button)).messages, []);
});

test('catalogDiff: equivalent shapes compare equal; kinds, defaults, required and slots do not', () => {
  const heading = harbor.components.Heading;
  const fromFigma = structuredClone(heading);
  fromFigma.props.properties.level = { type: 'integer', enum: [1, 2, 3], default: 2 };
  assert.equal(catalogDiff(heading, fromFigma).equal, true, 'integer 1..3 and enum [1,2,3] are the same set');

  fromFigma.props.properties.level = { type: 'string', default: '2' };
  fromFigma.props.required = [];
  const d = catalogDiff(heading, fromFigma);
  assert.deepEqual(d.props.changed.map((/** @type {any} */ c) => `${c.prop}.${c.field}`).sort(), ['level.type', 'text.required']);

  const card = structuredClone(harbor.components.Card);
  const cardFigma = structuredClone(card);
  cardFigma.children = { kind: 'nodes', allowed: ['Stack'], max: 1 };
  cardFigma.props.properties.elevation.default = 'raised';
  const c = catalogDiff(card, cardFigma);
  assert.deepEqual(c.props.changed.map((/** @type {any} */ x) => x.field), ['default']);
  assert.equal(c.children.messages.length, 2);

  const whole = catalogDiff(harbor, { name: 'figma', components: { Button: harbor.components.Button, Tooltip: harbor.components.Badge } });
  assert.ok(whole.onlyCode.includes('Stack'));
  assert.deepEqual(whole.onlyFigma, ['Tooltip']);
  assert.equal(whole.components.Button.equal, true);
});

test('componentPropertyDefinitionsToEntry: Figma’s own property definitions as a second input', () => {
  const { type, entry } = componentPropertyDefinitionsToEntry(
    {
      Variant: { type: 'VARIANT', defaultValue: 'Primary', variantOptions: ['Primary', 'Secondary', 'Ghost'] },
      Size: { type: 'VARIANT', defaultValue: 'md', variantOptions: ['sm', 'md'] },
      Disabled: { type: 'VARIANT', defaultValue: 'false', variantOptions: ['false', 'true'] },
      'Label#3:0': { type: 'TEXT', defaultValue: 'Button' },
      'Show icon#9:1': { type: 'BOOLEAN', defaultValue: false },
    },
    { name: 'Button', anatomy: ['container', 'label'], enumCase: 'lower' },
  );
  assert.equal(type, 'Button');
  assert.deepEqual(entry.props.properties.disabled, { type: 'boolean', default: false }, 'a true/false variant is a boolean');
  assert.deepEqual(entry.props.properties.variant, { enum: ['primary', 'secondary', 'ghost'], default: 'primary' });
  assert.equal(entry.figma.properties.label, 'Label#3:0', 'keeps the #id Figma needs');
  assert.equal(entry.figma.properties.showIcon, 'Show icon#9:1');
  const d = catalogDiff(harbor.components.Button, entry);
  assert.deepEqual(d.props.added.map((/** @type {any} */ x) => x.prop), ['showIcon']);
  assert.deepEqual(d.props.removed.map((/** @type {any} */ x) => x.prop), ['fullWidth']);
  assert.deepEqual(d.props.changed.map((/** @type {any} */ x) => `${x.prop}.${x.field}`), ['label.required']);
});
