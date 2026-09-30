// The contract layer: catalog, tree, validation, exporters, tokens and the
// A2UI projection. Everything else in the lab trusts these.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import { catalogToContext, catalogToTools, harbor, treeSchema, withDefaults } from '../src/catalog/index.js';
import { flattenTokens, tokensToCss, tokensToFigmaVariables } from '../src/catalog/tokens.js';
import { applyOps, emptyTree, summarize, treeToOps, validateTree } from '../src/tree/tree.js';
import { toExportName, treeToCsf, treeToJsx } from '../src/tree/to-code.js';
import { RECIPES, injectMistake, plan, repair, themeIntent } from '../src/agent/recipes.js';
import { a2uiOperationsToTree, catalogToA2ui, findingsToA2uiErrors, treeToA2uiOperations } from '../src/a2ui/index.js';

const PROMPTS = ['a sign up form', 'log in screen', 'dashboard with 4 metrics', 'pricing with three plans', 'profile settings', 'empty state for projects', 'a haiku generator'];

test('every recipe produces a tree that passes the catalog with no errors or warnings', () => {
  for (const p of PROMPTS) {
    const { tree } = plan(p);
    const report = validateTree(tree, harbor);
    assert.deepEqual(report.errors, [], `${p}: ${JSON.stringify(report.errors)}`);
    assert.deepEqual(report.warnings, [], `${p}: ${JSON.stringify(report.warnings)}`);
  }
  assert.equal(RECIPES.length, 5);
});

test('recipes read counts and quoted headlines from the prompt', () => {
  const { tree } = plan('dashboard called "Q3 health" with 2 metrics');
  const stats = Object.values(tree.nodes).filter((n) => n.type === 'Stat');
  assert.equal(stats.length, 2);
  assert.ok(Object.values(tree.nodes).some((n) => n.type === 'Heading' && n.props.text === 'Q3 health'));
});

test('the render_ui tool schema accepts real trees and rejects invented components and props', () => {
  const [tool] = catalogToTools(harbor);
  assert.equal(tool.name, 'render_ui');
  const validate = new Ajv({ strict: false }).compile(tool.parameters);
  assert.ok(validate(plan('pricing').tree), JSON.stringify(validate.errors));
  const bad = structuredClone(plan('pricing').tree);
  bad.nodes.n1.type = 'Carousel';
  assert.equal(validate(bad), false);
  const badProp = structuredClone(plan('sign up').tree);
  const button = Object.values(badProp.nodes).find((n) => n.type === 'Button');
  if (button) button.props.variant = 'danger';
  assert.equal(validate(badProp), false);
  assert.deepEqual(treeSchema(harbor).required, ['root', 'nodes']);
});

test('the prompt-sized context names every component and its enums', () => {
  const [ctx] = catalogToContext(harbor);
  for (const type of Object.keys(harbor.components)) assert.match(ctx.value, new RegExp(`^${type}\\{`, 'm'));
  assert.match(ctx.value, /variant\?: "primary" \| "secondary" \| "ghost"/);
  assert.match(ctx.description, /harbor@1\.0\.0/);
});

test('treeToOps rebuilds the tree exactly, parents before children', () => {
  for (const p of PROMPTS) {
    const { tree } = plan(p);
    const ops = treeToOps(tree);
    const built = applyOps({ ui: emptyTree() }, ops).ui;
    assert.deepEqual(built, tree);
    // No op ever links a child that has not been added yet.
    const added = new Set();
    for (const op of ops) {
      const m = op.path.match(/^\/ui\/nodes\/([^/]+)$/);
      if (m) added.add(m[1]);
      if (op.path.endsWith('/children/-') || op.path === '/ui/root') assert.ok(added.has(/** @type {any} */ (op).value), op.path);
    }
  }
});

test('validation reports contract errors with paths and guideline warnings separately', () => {
  const { tree } = plan('sign up form');
  const { tree: broken, mistake } = injectMistake(tree);
  assert.match(mistake, /variant "danger"/);
  const report = validateTree(broken, harbor);
  assert.equal(report.valid, false);
  assert.equal(report.errors.length, 1);
  assert.match(report.errors[0].message, /must be equal to one of the allowed values: "primary", "secondary", "ghost"/);
  assert.match(report.errors[0].path, /^\/nodes\/n\d+\/props\/variant$/);

  const fixed = repair(broken, report.errors, harbor);
  assert.equal(validateTree(fixed, harbor).valid, true);

  const two = structuredClone(tree);
  const stack = Object.values(two.nodes).find((n) => n.type === 'Stack' && n.children?.length);
  two.nodes.x1 = { type: 'Button', props: { label: 'One' } };
  two.nodes.x2 = { type: 'Button', props: { label: 'Two' } };
  stack?.children?.push('x1', 'x2');
  const r2 = validateTree(two, harbor);
  assert.equal(r2.valid, true);
  assert.ok(r2.warnings.some((w) => w.rule === 'one-primary'));
});

test('structural problems are caught: unknown root, missing child, leaf with children, cycles', () => {
  const t = { root: 'a', nodes: { a: { type: 'Stack', props: {}, children: ['b', 'ghost'] }, b: { type: 'Text', props: { text: 'x' }, children: ['a'] } } };
  const r = validateTree(t, harbor);
  const rules = r.errors.map((e) => e.message);
  assert.ok(rules.some((m) => /"ghost" does not exist/.test(m)));
  assert.ok(rules.some((m) => /Text cannot contain/.test(m)));
  assert.ok(rules.some((m) => /contains itself/.test(m)));
  assert.equal(validateTree({ root: 'zz', nodes: {} }, harbor).valid, false);
  assert.equal(validateTree(/** @type {any} */ (null), harbor).valid, false);
});

test('JSX and CSF exports omit defaults and import only what is used', () => {
  const { tree } = plan('empty state');
  const jsx = treeToJsx(tree, harbor);
  assert.match(jsx, /^<Stack gap="lg" padding="2xl" align="center">/);
  assert.doesNotMatch(jsx, /direction="vertical"/);
  const csf = treeToCsf(tree, harbor, { prompt: 'empty state' });
  assert.match(csf, /import \{ Badge, Button, Heading, Stack, Text \} from/);
  assert.match(csf, /export const EmptyState = \{/);
  assert.match(csf, /"prompt": "empty state"|prompt: "empty state"/);
  assert.equal(toExportName('sign-up form'), 'SignUpForm');
  assert.equal(toExportName('3 plans'), 'Screen3Plans');
});

test('withDefaults fills schema defaults without overriding given props', () => {
  assert.deepEqual(withDefaults(harbor, 'Button', { label: 'Go', size: 'sm' }), { label: 'Go', variant: 'primary', size: 'sm', fullWidth: false, disabled: false });
});

test('tokens resolve aliases and feed both CSS and Figma variables', () => {
  const flat = flattenTokens();
  const canvas = flat.find((t) => t.path.join('.') === 'color.bg.canvas');
  assert.deepEqual(canvas?.alias, ['palette', 'gray', '50']);
  assert.equal(canvas?.value.hex, '#f8f9fa');
  const css = tokensToCss();
  assert.match(css, /--harbor-color-bg-canvas: var\(--harbor-palette-gray-50\);/);
  assert.match(css, /--harbor-space-lg: 16px;/);
  const vars = tokensToFigmaVariables();
  assert.ok(vars.some((v) => v.name === 'color/accent/default' && v.aliasOf === 'palette/blue/600'));
  assert.ok(vars.some((v) => v.name === 'space/lg' && v.value === 16 && v.resolvedType === 'FLOAT'));
});

test('theme intent recognizes follow-ups without a rebuild', () => {
  assert.deepEqual(themeIntent('make it dark and compact'), { mode: 'dark', density: 'compact' });
  assert.deepEqual(themeIntent('a pricing page'), {});
});

test('summarize counts components', () => {
  assert.match(summarize(plan('pricing with 3 plans').tree), /Card ×3/);
});

test('A2UI: the catalog projects to one schema per component, and trees round-trip', () => {
  const cat = catalogToA2ui(harbor);
  assert.equal(cat.catalogId, cat.$id);
  assert.deepEqual(Object.keys(cat.components).sort(), Object.keys(harbor.components).sort());
  assert.deepEqual(cat.components.Button.required, ['id', 'component', 'label']);
  const validate = new Ajv({ strict: false }).compile(cat.components.Button);
  assert.ok(validate({ id: 'b', component: 'Button', label: 'Go', variant: 'ghost' }));
  assert.equal(validate({ id: 'b', component: 'Button', label: 'Go', variant: 'danger' }), false);

  for (const p of PROMPTS) {
    const { tree } = plan(p);
    const ops = treeToA2uiOperations(tree, { surfaceId: 's1', catalogId: cat.catalogId, theme: { mode: 'dark' } });
    assert.equal(ops[0].version, 'v0.9');
    assert.deepEqual(ops[0].createSurface, { surfaceId: 's1', catalogId: cat.catalogId, theme: { mode: 'dark' } });
    const comps = ops[1].updateComponents.components;
    assert.equal(comps[0].id, 'root');
    for (const c of comps) assert.ok(validateAgainst(cat, c), `${p}: ${JSON.stringify(c)}`);
    const back = a2uiOperationsToTree(ops);
    assert.equal(back.catalogId, cat.catalogId);
    assert.deepEqual(back.theme, { mode: 'dark' });
    assert.equal(validateTree(back.tree, harbor).valid, true);
    assert.equal(Object.keys(back.tree.nodes).length, Object.keys(tree.nodes).length);
  }
});

test('A2UI: later updateComponents replace earlier definitions by id', () => {
  const ops = [
    { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: 'c' } },
    { version: 'v0.9', updateComponents: { surfaceId: 's', components: [{ id: 'root', component: 'Stack', children: ['t'] }, { id: 't', component: 'Text', text: 'old' }] } },
    { version: 'v0.9', updateComponents: { surfaceId: 's', components: [{ id: 't', component: 'Text', text: 'new' }] } },
    { version: 'v0.9', updateComponents: { surfaceId: 'other', components: [{ id: 't', component: 'Text', text: 'elsewhere' }] } },
  ];
  assert.equal(a2uiOperationsToTree(ops).tree.nodes.t.props.text, 'new');
});

test('A2UI: findings become VALIDATION_FAILED errors with JSON Pointer paths', () => {
  const { tree } = injectMistake(plan('sign up form').tree);
  const [err] = findingsToA2uiErrors(validateTree(tree, harbor).errors, 's1');
  assert.equal(err.error.code, 'VALIDATION_FAILED');
  assert.equal(err.error.surfaceId, 's1');
  assert.match(err.error.path, /^\/components\/n\d+\/variant$/);
});

/** @param {any} cat @param {any} component */
function validateAgainst(cat, component) {
  return new Ajv({ strict: false }).compile(cat.components[component.component])(component);
}

test('A2UI: the screen title survives the round trip through the data model', () => {
  const { tree } = plan('pricing');
  const ops = treeToA2uiOperations(tree, { surfaceId: 's', catalogId: 'c' });
  assert.deepEqual(ops.at(-1), { version: 'v0.9', updateDataModel: { surfaceId: 's', path: '/title', value: 'Pricing' } });
  assert.equal(a2uiOperationsToTree(ops).tree.title, 'Pricing');
});

test('CSF export carries tags on the meta when asked', () => {
  const csf = treeToCsf(plan('pricing').tree, harbor, { tags: ['ai-generated', '!manifest'] });
  assert.match(csf, /title: "Generated\/Pricing",\n  tags: \["ai-generated","!manifest"\],/);
  assert.doesNotMatch(treeToCsf(plan('pricing').tree, harbor), /tags:/);
});

test('slot rules from a Specs export are enforced: allowed types, min and max', () => {
  const catalog = structuredClone(harbor);
  catalog.components.Card.children = { kind: 'nodes', allowed: ['Stack'], min: 1, max: 1 };
  const tree = { root: 'c', nodes: { c: { type: 'Card', props: {}, children: ['t', 's'] }, t: { type: 'Text', props: { text: 'x' } }, s: { type: 'Stack', props: {}, children: [] } } };
  const messages = validateTree(tree, catalog).errors.map((e) => e.message);
  assert.ok(messages.some((m) => /Card takes only Stack; "t" is a Text/.test(m)), messages.join('\n'));
  assert.ok(messages.some((m) => /at most 1 child component\./.test(m)));
  const empty = { root: 'c', nodes: { c: { type: 'Card', props: {}, children: [] } } };
  assert.ok(validateTree(empty, catalog).errors.some((e) => /at least 1 child component\./.test(e.message)));
  // Harbor's own catalog has no slot limits, so every recipe still passes.
  assert.equal(validateTree(plan('pricing').tree, harbor).valid, true);
});
