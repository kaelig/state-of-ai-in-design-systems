// The Figma side: tree -> Figma scripts run against a strict Plugin API mock,
// incremental STATE_DELTA patches, Figma -> tree round trips, the Figma
// Console MCP adapter and subscriber, the sandbox syntax guard, and the plugin
// build. No Figma needed; see tests/figma-mock.js for what the mock enforces.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import vm from 'node:vm';
import { harbor, withDefaults } from '../src/catalog/index.js';
import { flattenTokens } from '../src/catalog/tokens.js';
import { plan, RECIPES } from '../src/agent/recipes.js';
import { applyOps } from '../src/tree/tree.js';
import { DEFAULT_FONT_SIZE, DEFAULT_SPACE, applyJsonPatch, figmaNodeToTree, serializeFigmaNode } from '../src/figma/figma-to-tree.js';
import { figmaVariableDefs, opsToFigmaScript, readFigmaScript, treeToFigmaScript } from '../src/figma/tree-to-figma.js';
import { checkSandboxScript, extractSandboxFunctions, sandboxSourceIsCurrent, sandboxSyntaxProblems } from '../src/figma/sandbox-tools.js';
import { EXECUTE_TOOL, drawCall, figmaConsoleSubscriber, parseExecuteResult, patchCall, runDesignAgent } from '../src/figma/figma-console-mcp.js';
import { build, checkManifest } from '../figma-plugin/build.mjs';
import { HARBOR_LIBRARY, createFigmaMock, outline, runScript } from './figma-mock.js';

const run = promisify(execFile);
const labRoot = new URL('..', import.meta.url);

/** Every layer under `root`, by name. */
const byName = (/** @type {any} */ root) => new Map(root.findAll(() => true).map((/** @type {any} */ n) => [n.name, n]));
const screenOf = (/** @type {any} */ m) => m.page.children.find((/** @type {any} */ n) => n.getSharedPluginData('agui', 'screen'));
const variableNamed = (/** @type {any} */ m, /** @type {string} */ name) => m.variables.find((/** @type {any} */ v) => v.name === name);
const boundName = (/** @type {any} */ m, /** @type {any} */ alias) => m.variables.find((/** @type {any} */ v) => v.id === alias?.id)?.name;
const paintVar = (/** @type {any} */ m, /** @type {any} */ node) => boundName(m, node.fills[0]?.boundVariables?.color);

/** A tree with every prop filled in, for comparisons that should ignore defaults. */
const normalize = (/** @type {any} */ tree) => ({
  title: tree.title,
  root: tree.root,
  nodes: Object.fromEntries(
    Object.entries(tree.nodes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, n]) => [id, { type: n.type, props: withDefaults(harbor, n.type, n.props), children: n.children ?? null }]),
  ),
});

async function drawn(/** @type {string} */ prompt, /** @type {Record<string, any>} */ options = {}, /** @type {any} */ mockOptions = { localComponents: HARBOR_LIBRARY }) {
  const m = createFigmaMock(mockOptions);
  const { tree } = plan(prompt);
  const result = await runScript(m.figma, treeToFigmaScript(tree, options.catalog ?? harbor, { key: 'thread_1', ...options }));
  return { m, tree, result, screen: screenOf(m) };
}

test('the space and font scales figma-to-tree snaps to match tokens.json', () => {
  const px = (/** @type {string} */ group) => Object.fromEntries(flattenTokens().filter((t) => t.path.slice(0, -1).join('.') === group).map((t) => [t.path.at(-1), t.value.value]));
  assert.deepEqual(DEFAULT_SPACE, px('space'));
  assert.deepEqual(DEFAULT_FONT_SIZE, px('font.size'));
});

test('draw: creates Harbor variables once, as aliases, with scopes and a Dark mode', async () => {
  const { m, result, tree } = await drawn('sign up form');
  const defs = figmaVariableDefs();
  assert.equal(result.ok, true);
  assert.deepEqual(result.variables, { collectionsCreated: 2, variablesCreated: defs.length, variablesUpdated: 0, darkMode: 'created' });
  assert.deepEqual(m.collections.map((c) => c.name).sort(), ['Harbor', 'Harbor palette']);

  const semantic = m.collections.find((c) => c.name === 'Harbor');
  assert.deepEqual(semantic.modes.map((/** @type {any} */ x) => x.name), ['Light', 'Dark']);
  const canvas = variableNamed(m, 'color/bg/canvas');
  const [light, dark] = semantic.modes.map((/** @type {any} */ x) => x.modeId);
  assert.equal(boundName(m, canvas.valuesByMode[light]), 'palette/gray/50', 'semantic tokens alias the palette');
  assert.equal(boundName(m, canvas.valuesByMode[dark]), 'palette/gray/900', 'Dark mode follows DARK_OVERRIDES');
  assert.equal(boundName(m, variableNamed(m, 'space/lg').valuesByMode[dark]), undefined);
  assert.equal(variableNamed(m, 'space/lg').valuesByMode[dark], 16, 'non-color tokens carry their value into Dark');
  assert.deepEqual(variableNamed(m, 'palette/blue/600').scopes, [], 'primitives stay out of the pickers');
  assert.deepEqual(variableNamed(m, 'space/md').scopes, ['GAP']);

  const again = await runScript(m.figma, treeToFigmaScript(tree, harbor, { key: 'thread_1' }));
  assert.equal(again.variables.variablesCreated, 0, 'looked up by name, not recreated');
  assert.equal(again.variables.collectionsCreated, 0);
  assert.equal(m.variables.length, defs.length);
  assert.deepEqual([again.created, again.updated, again.removed], [[], [], []], 'redrawing an unchanged tree touches no layer');
});

test('draw: the sign-up form as auto layout, component instances and token-bound primitives', async () => {
  const { m, tree, result, screen } = await drawn('sign up form');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result, 'the summary survives JSON, as figma_execute returns it');
  assert.equal(result.frameName, 'Sign-up form');
  assert.equal(screen.width, 480);
  assert.equal(screen.layoutMode, 'VERTICAL');
  assert.equal(paintVar(m, screen), 'color/bg/canvas');

  const layers = byName(screen);
  for (const [id, node] of Object.entries(tree.nodes)) {
    const layer = layers.get(`${node.type} · ${id}`);
    assert.ok(layer, `layer for ${id}`);
    assert.deepEqual(JSON.parse(layer.getSharedPluginData('agui', 'node')), { v: 1, nodeId: id, type: node.type, props: node.props });
  }
  assert.deepEqual(
    result.created.map((c) => c.nodeId),
    Object.keys(tree.nodes),
    'every node reported once, parents first',
  );

  const card = layers.get('Card · n1');
  assert.equal(card.layoutMode, 'VERTICAL');
  assert.equal(paintVar(m, card), 'color/bg/surface');
  assert.equal(boundName(m, card.strokes[0].boundVariables.color), 'color/border/default');
  assert.equal(boundName(m, card.boundVariables.paddingLeft), 'space/xl');
  assert.equal(boundName(m, card.boundVariables.topLeftRadius), 'radius/lg');
  assert.equal(card.effects[0].type, 'DROP_SHADOW', 'elevation raised');

  const stack = layers.get('Stack · n2');
  assert.equal(stack.itemSpacing, 16);
  assert.equal(boundName(m, stack.boundVariables.itemSpacing), 'space/lg');
  assert.equal(stack.layoutAlign, 'STRETCH', 'a Card stretches its content');

  const heading = layers.get('Heading · n3');
  assert.equal(heading.type, 'TEXT');
  assert.equal(heading.characters, 'Create your account');
  assert.equal(heading.fontSize, 28);
  assert.equal(heading.fontName.style, 'Bold');
  assert.equal(paintVar(m, heading), 'color/fg/default');
  assert.equal(heading.textAutoResize, 'HEIGHT', 'text wraps to the stack width');
  assert.equal(paintVar(m, layers.get('Text · n4')), 'color/fg/muted');

  const field = layers.get('TextField · n5');
  assert.equal(field.type, 'FRAME', 'no Text field component in the file: a primitive');
  const fieldParts = byName(field);
  assert.equal(fieldParts.get('label').characters, 'Full name');
  assert.equal(fieldParts.get('placeholder').characters, 'Ada Lovelace');
  assert.equal(fieldParts.get('required').characters, '*');
  assert.equal(boundName(m, fieldParts.get('input').strokes[0].boundVariables.color), 'color/border/default');

  const primary = layers.get('Button · n9');
  assert.equal(primary.type, 'INSTANCE');
  assert.equal(primary.componentProperties.Variant.value, 'Primary', 'enum "primary" matched to the variant "Primary"');
  assert.equal(primary.componentProperties['Label#88:1'].value, 'Create account', 'Label#3:0 matched by name despite a different #id');
  assert.equal(primary.layoutAlign, 'STRETCH', 'fullWidth');
  assert.equal(layers.get('Button · n10').componentProperties.Variant.value, 'Ghost');
  assert.equal(layers.get('Checkbox · n8').componentProperties.Checked.value, 'False', 'boolean false matched to "False"');
  assert.equal(m.calls.loadAllPages, 1, 'pages load once per script, only to find local components');
  assert.deepEqual(result.warnings, []);
});

test('draw: library components import by key; a missing Figma property is a warning, not a crash', async () => {
  const catalog = structuredClone(harbor);
  catalog.components.Badge.figma.key = 'lib-badge';
  catalog.components.Avatar.figma = { component: 'Avatar', properties: { size: 'Size', name: 'Name#8:0' } };
  const { m, result } = await drawn('empty state', { catalog }, {
    libraryComponents: [{ ...HARBOR_LIBRARY[1], key: 'lib-badge' }],
    localComponents: [HARBOR_LIBRARY[0]],
  });
  const badge = result.created.find((c) => c.type === 'Badge');
  assert.equal(badge.via, 'library');
  assert.ok(m.calls.importByKey >= 1);
  const layer = byName(screenOf(m)).get(`Badge · ${badge.nodeId}`);
  assert.equal(layer.componentProperties.Tone.value, 'Accent');
  assert.equal(layer.componentProperties['Label#4:0'].value, 'New');

  const settings = await drawn('settings', { catalog }, { localComponents: [...HARBOR_LIBRARY, { name: 'Avatar', variants: { Size: ['sm', 'md', 'lg'] } }] });
  assert.equal(settings.result.ok, true);
  assert.match(settings.result.warnings.map((w) => w.message).join('\n'), /Avatar\.name maps to the Figma property "Name#8:0", which Avatar does not have/);
  assert.equal(byName(settings.screen).get('Avatar · n6').componentProperties.Size.value, 'lg');
});

test('draw: a Grid wraps with fixed cells; theme.mode dark switches the frame to the Dark mode', async () => {
  const { m, result, screen } = await drawn('dashboard with 4 metrics', { theme: { mode: 'dark' } });
  assert.equal(result.ok, true);
  assert.equal(screen.width, 1120, 'a Grid gets a wide frame');
  const grid = [...byName(screen).values()].find((n) => n.name.startsWith('Grid'));
  assert.equal(grid.layoutMode, 'HORIZONTAL');
  assert.equal(grid.layoutWrap, 'WRAP');
  assert.equal(boundName(m, grid.boundVariables.counterAxisSpacing), 'space/lg');
  // 1120 - 2 * 32 (screen) - 2 * 24 (Stack padding xl) = 1008 wide; 4 cells with 3 gaps of 16.
  assert.equal(grid.width, 1008);
  for (const cell of grid.children) assert.equal(cell.width, (1008 - 3 * 16) / 4);
  const semantic = m.collections.find((c) => c.name === 'Harbor');
  assert.equal(screen.explicitVariableModes[semantic.id], semantic.modes.find((/** @type {any} */ x) => x.name === 'Dark').modeId);

  const free = await drawn('dashboard', { theme: { mode: 'dark' } }, { localComponents: HARBOR_LIBRARY, modeLimit: 1 });
  assert.equal(free.result.ok, true, 'a plan without modes still draws');
  assert.equal(free.result.variables.darkMode, 'unavailable');
  assert.match(free.result.warnings[0].message, /no Dark mode/);
});

test('patch: STATE_DELTA ops change only what they touch', async () => {
  const { m, tree, screen } = await drawn('sign up form');
  const ids = () => new Map([...byName(screen)].filter(([name]) => name.includes(' · ')).map(([name, n]) => [name, n.id]));
  const patch = (/** @type {any[]} */ ops) => runScript(m.figma, opsToFigmaScript(ops, harbor, { key: 'thread_1' }));
  /** @type {any} */
  let state = { ui: tree, theme: {}, review: { status: 'drafting' } };
  const apply = async (/** @type {any[]} */ ops) => {
    state = applyOps(state, ops);
    return patch(ops);
  };
  const before = ids();

  // A prop on an instance: setProperties in place.
  const calls = m.calls.setProperties;
  let r = await apply([{ op: 'replace', path: '/ui/nodes/n9/props/label', value: 'Start my trial' }]);
  assert.deepEqual([r.created, r.removed], [[], []]);
  assert.deepEqual(r.updated, [{ nodeId: 'n9', id: before.get('Button · n9'), how: 'props' }]);
  assert.equal(m.calls.setProperties, calls + 1);
  assert.equal(byName(screen).get('Button · n9').componentProperties['Label#88:1'].value, 'Start my trial');

  // A prop on a primitive leaf: that one layer is rebuilt, in place.
  r = await apply([{ op: 'replace', path: '/ui/nodes/n3/props/text', value: 'Join Harbor' }]);
  assert.equal(r.updated.length, 1);
  assert.equal(r.updated[0].how, 'rebuilt');
  assert.equal(byName(screen).get('Heading · n3').characters, 'Join Harbor');
  assert.equal(byName(screen).get('Stack · n2').children[0].name, 'Heading · n3', 'same position');

  // A prop on a container: re-configured, same layer, children untouched.
  r = await apply([{ op: 'replace', path: '/ui/nodes/n2/props/gap', value: 'sm' }]);
  assert.deepEqual(r.updated, [{ nodeId: 'n2', id: before.get('Stack · n2'), how: 'props' }]);
  assert.equal(boundName(m, byName(screen).get('Stack · n2').boundVariables.itemSpacing), 'space/sm');

  // Node add + child append: one new layer, at the end.
  r = await apply([
    { op: 'add', path: '/ui/nodes/n99', value: { type: 'Alert', props: { text: 'We never share your email.' } } },
    { op: 'add', path: '/ui/nodes/n2/children/-', value: 'n99' },
  ]);
  assert.deepEqual(r.created.map((c) => c.nodeId), ['n99']);
  assert.deepEqual([r.updated, r.removed], [[], []]);
  assert.equal(byName(screen).get('Stack · n2').children.at(-1).name, 'Alert · n99');

  // Reorder: moved, not rebuilt.
  r = await apply([{ op: 'move', from: '/ui/nodes/n2/children/0', path: '/ui/nodes/n2/children/1' }]);
  assert.deepEqual([r.created, r.updated, r.removed], [[], [], []]);
  assert.deepEqual(byName(screen).get('Stack · n2').children.slice(0, 2).map((/** @type {any} */ n) => n.name), ['Text · n4', 'Heading · n3']);

  // Unlinking a child removes its layer; the others keep their ids.
  r = await apply([{ op: 'remove', path: '/ui/nodes/n2/children/2' }]);
  assert.deepEqual(r.removed, ['n5']);
  const after = ids();
  for (const name of ['Card · n1', 'Stack · n2', 'Text · n4', 'Button · n9', 'TextField · n6']) assert.equal(after.get(name), before.get(name), `${name} kept its layer`);

  // Theme: one mode switch, no layer touched. Ops outside /ui and /theme are ignored.
  r = await apply([
    { op: 'add', path: '/theme/mode', value: 'dark' },
    { op: 'replace', path: '/review', value: { status: 'in_review' } },
  ]);
  const semantic = m.collections.find((c) => c.name === 'Harbor');
  assert.equal(screen.explicitVariableModes[semantic.id], semantic.modes[1].modeId);
  assert.deepEqual([r.created, r.updated, r.removed, r.ignoredOps], [[], [], [], 1]);

  // What the frame stores is what the client holds.
  assert.deepEqual(JSON.parse(screen.getSharedPluginData('agui', 'tree')), state.ui);

  // The same end state drawn from scratch has the same layers.
  const fresh = createFigmaMock({ localComponents: HARBOR_LIBRARY });
  await runScript(fresh.figma, treeToFigmaScript(state.ui, harbor, { key: 'thread_1', theme: { mode: 'dark' } }));
  assert.equal(outline(screenOf(fresh)), outline(screen));
});

test('patch: what cannot apply asks for a redraw and leaves the canvas alone', async () => {
  const { m, screen } = await drawn('sign up form');
  const snapshot = outline(screen);
  const bad = await runScript(m.figma, opsToFigmaScript([{ op: 'replace', path: '/ui/nodes/n404/props/text', value: 'x' }], harbor, { key: 'thread_1' }));
  assert.equal(bad.ok, false);
  assert.equal(bad.needsRedraw, true);
  assert.match(bad.reason, /does not apply/);
  assert.equal(outline(screen), snapshot);

  const whole = await runScript(m.figma, opsToFigmaScript([{ op: 'replace', path: '', value: {} }], harbor, { key: 'thread_1' }));
  assert.equal(whole.needsRedraw, true);
  const missing = await runScript(m.figma, opsToFigmaScript([{ op: 'add', path: '/ui/title', value: 'x' }], harbor, { key: 'another thread' }));
  assert.equal(missing.needsRedraw, true);
  assert.match(missing.reason, /No Harbor frame/);
});

test('figmaConsoleSubscriber: the agent streams AG-UI, Figma Console MCP is the sink, calls are coalesced', async () => {
  const m = createFigmaMock({ localComponents: HARBOR_LIBRARY });
  let deltas = 0;
  /** @type {any[]} */
  const summaries = [];
  const callTool = async (/** @type {string} */ name, /** @type {any} */ args) => {
    assert.equal(name, EXECUTE_TOOL);
    assert.ok(args.timeout <= 30000);
    const result = await runScript(m.figma, args.code);
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, result }) }] };
  };
  const sub = figmaConsoleSubscriber({ callTool, coalesceMs: 100, onResult: (s) => summaries.push(s) });
  const counting = { ...sub, onStateDeltaEvent: (/** @type {any} */ p) => (deltas++, sub.onStateDeltaEvent(p)) };
  const { tree, threadId } = await runDesignAgent('a dashboard with 4 metrics', { subscriber: counting, delayMs: 20 });
  await sub.idle();

  assert.deepEqual(sub.errors, []);
  assert.equal(summaries[0].op, 'draw');
  assert.ok(summaries.slice(1).every((s) => s.op === 'patch' && s.ok), 'then patches');
  assert.ok(sub.calls.length > 1 && sub.calls.length < deltas / 2, `coalesced: ${sub.calls.length} calls for ${deltas} deltas`);
  assert.equal(new Set(summaries.flatMap((s) => s.created.map((/** @type {any} */ c) => c.nodeId))).size, Object.keys(tree.nodes).length, 'each node created exactly once');
  assert.ok(summaries.every((s) => s.key === threadId), 'the frame is keyed by the AG-UI threadId');

  const direct = createFigmaMock({ localComponents: HARBOR_LIBRARY });
  await runScript(direct.figma, treeToFigmaScript(tree, harbor, { key: threadId }));
  assert.equal(outline(screenOf(m)), outline(screenOf(direct)), 'streamed and drawn at once end the same');
});

test('figmaConsoleSubscriber: redraws when a patch cannot apply, retries a timeout once as a draw', async () => {
  const replies = [
    { success: true, result: { ok: true, op: 'draw', created: [], updated: [], removed: [], warnings: [] } },
    { success: true, result: { ok: false, op: 'patch', needsRedraw: true, reason: 'gone', created: [], updated: [], removed: [], warnings: [] } },
    { success: true, result: { ok: true, op: 'draw', created: [], updated: [], removed: [], warnings: [] } },
  ];
  /** @type {string[]} */
  const ops = [];
  const sub = figmaConsoleSubscriber({
    key: 't',
    coalesceMs: 5,
    callTool: async (_name, args) => {
      ops.push(/\((draw|patch)\)/.exec(args.code)?.[1] ?? '?');
      return { content: [{ type: 'text', text: JSON.stringify(replies.shift()) }] };
    },
  });
  sub.onStateSnapshotEvent({ event: /** @type {any} */ ({ snapshot: { ui: { title: 'T', root: null, nodes: {} } } }) });
  await sub.idle();
  sub.onStateDeltaEvent({ event: /** @type {any} */ ({ delta: [{ op: 'replace', path: '/ui/title', value: 'U' }] }) });
  await sub.idle();
  assert.deepEqual(ops, ['draw', 'patch', 'draw']);
  assert.match(sub.calls[2].arguments.code, /"title":"U"/, 'the redraw carries the mirrored state');

  let first = true;
  const retried = figmaConsoleSubscriber({
    key: 't',
    coalesceMs: 5,
    callTool: async () => {
      if (first) {
        first = false;
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: 'Execution timed out after 15000ms' }) }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(replies[0] ?? { success: true, result: { ok: true } }) }] };
    },
  });
  retried.onStateSnapshotEvent({ event: /** @type {any} */ ({ snapshot: {} }) });
  retried.onStateDeltaEvent({ event: /** @type {any} */ ({ delta: [{ op: 'add', path: '/ui', value: { title: '', root: null, nodes: {} } }] }) });
  await retried.idle();
  assert.equal(retried.calls.length, 2);
  assert.deepEqual(retried.errors, []);
  assert.throws(() => parseExecuteResult({ isError: true, content: [{ type: 'text', text: JSON.stringify({ error: 'no bridge', hint: 'open the plugin' }) }] }), /no bridge \(open the plugin\)/);
});

for (const recipe of RECIPES) {
  test(`round trip: ${recipe.name} -> Figma -> serialized JSON -> the same tree`, async () => {
    const { m, tree, screen } = await drawn(recipe.name);
    const json = await serializeFigmaNode(screen, { figma: m.figma });
    assert.deepEqual(JSON.parse(JSON.stringify(json)), json, 'plain JSON');
    const back = figmaNodeToTree(json, harbor);
    assert.deepEqual(back.findings, []);
    assert.deepEqual(normalize(back.tree), normalize(tree));
  });
}

test('round trip: a designer’s edits in Figma come back as props, each reported', async () => {
  const { m, screen } = await drawn('sign up form');
  const layers = byName(screen);
  layers.get('Button · n9').setProperties({ 'Label#88:1': 'Get started', Variant: 'Secondary' });
  layers.get('Heading · n3').characters = 'Welcome aboard';
  byName(layers.get('TextField · n6')).get('label').characters = 'Email';
  const back = figmaNodeToTree(await serializeFigmaNode(screen, { figma: m.figma }), harbor);
  assert.equal(back.tree.nodes.n9.props.label, 'Get started');
  assert.equal(back.tree.nodes.n9.props.variant, 'secondary');
  assert.equal(back.tree.nodes.n3.props.text, 'Welcome aboard');
  assert.equal(back.tree.nodes.n6.props.label, 'Email');
  assert.deepEqual(back.findings.map((f) => [f.rule, f.path]).sort(), [
    ['figma-edit', '/nodes/n3/props/text'],
    ['figma-edit', '/nodes/n6/props/label'],
    ['figma-edit', '/nodes/n9/props/label'],
    ['figma-edit', '/nodes/n9/props/variant'],
  ]);
});

test('figma-to-tree without plugin data: by component name, by layout, and findings instead of crashes', () => {
  const button = (/** @type {string} */ id, /** @type {string} */ variant) => ({
    id,
    name: 'Button',
    type: 'INSTANCE',
    componentProperties: { Variant: { type: 'VARIANT', value: variant }, Size: { type: 'VARIANT', value: 'md' }, 'Label#12:3': { type: 'TEXT', value: 'Go' }, 'Icon#1:2': { type: 'BOOLEAN', value: false } },
    mainComponent: { name: `Variant=${variant}, Size=md`, key: 'k1', parent: { name: 'Button', key: 'set-key', type: 'COMPONENT_SET' } },
  });
  /** @type {any} */
  const frame = {
    id: '1:1',
    name: 'Checkout',
    type: 'FRAME',
    layoutMode: 'VERTICAL',
    itemSpacing: 16,
    paddingTop: 24,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    counterAxisAlignItems: 'CENTER',
    children: [
      { id: '1:2', name: 'Title', type: 'TEXT', characters: 'Pay', fontSize: 28 },
      { id: '1:3', name: 'Small print', type: 'TEXT', characters: 'Taxes included', fontSize: 13, boundVariables: { fills: 'color/fg/muted' } },
      button('1:4', 'Secondary'),
      button('1:5', 'Danger'),
      { id: '1:6', name: 'Tiles', type: 'FRAME', layoutMode: 'HORIZONTAL', layoutWrap: 'WRAP', itemSpacing: 12, width: 520, boundVariables: { itemSpacing: 'space/md' }, children: [{ id: '1:7', name: 'a', type: 'FRAME', layoutMode: 'VERTICAL', width: 160, children: [] }] },
      { id: '1:8', name: 'Logo', type: 'VECTOR' },
      { id: '1:9', name: 'Tooltip', type: 'INSTANCE', componentProperties: {}, mainComponent: { name: 'Tooltip', key: 'tt' } },
      { id: '1:10', name: 'Rule', type: 'RECTANGLE', height: 1 },
      { id: '1:11', name: 'Hidden', type: 'TEXT', characters: 'x', visible: false },
    ],
  };
  const { tree, findings } = figmaNodeToTree(frame, harbor);
  const root = tree.nodes[/** @type {string} */ (tree.root)];
  assert.deepEqual(root, { type: 'Stack', props: { gap: 'lg', padding: 'xl', align: 'center' }, children: ['f1_2', 'f1_3', 'f1_4', 'f1_5', 'f1_6', 'f1_10'] });
  assert.deepEqual(tree.nodes.f1_2, { type: 'Heading', props: { text: 'Pay', level: 1 } });
  assert.deepEqual(tree.nodes.f1_3, { type: 'Text', props: { text: 'Taxes included', size: 'sm', tone: 'muted' } });
  assert.deepEqual(tree.nodes.f1_4, { type: 'Button', props: { variant: 'secondary', size: 'md', label: 'Go' } });
  assert.deepEqual(tree.nodes.f1_5.props, { size: 'md', label: 'Go' }, 'an unknown variant value is dropped, not guessed');
  assert.deepEqual(tree.nodes.f1_6, { type: 'Grid', props: { columns: 3, gap: 'md' }, children: ['f1_7'] });
  assert.deepEqual(tree.nodes.f1_7, { type: 'Stack', props: { gap: 'none', padding: 'none' }, children: [] });
  assert.deepEqual(tree.nodes.f1_10, { type: 'Divider', props: {} });
  const rules = findings.map((f) => `${f.rule}:${f.figmaId}`);
  for (const expected of ['unmapped-figma-property:1:4', 'missing-figma-property:1:4', 'unknown-variant-value:1:5', 'unsupported-node:1:8', 'unknown-component:1:9', 'hidden:1:11']) {
    assert.ok(rules.includes(expected), `${expected} in ${rules.join(', ')}`);
  }
  assert.ok(findings.every((f) => ['error', 'warning', 'info'].includes(f.severity) && f.message));
  assert.deepEqual(figmaNodeToTree({ id: '9:9', name: 'Blob', type: 'VECTOR' }, harbor).findings.map((f) => f.rule), ['unsupported-node', 'empty']);
});

test('readFigmaScript reads a frame back by its key', async () => {
  const { m, tree } = await drawn('pricing');
  const out = await runScript(m.figma, readFigmaScript({ key: 'thread_1' }));
  assert.equal(out.ok, true);
  assert.deepEqual(normalize(figmaNodeToTree(out.node, harbor).tree), normalize(tree));
  assert.equal((await runScript(m.figma, readFigmaScript({ key: 'nope' }))).ok, false);
});

test('dry run: `--prompt "sign up form" --dry-run` prints one valid figma_execute request', async () => {
  const { stdout } = await run(process.execPath, ['src/figma/figma-console-mcp.js', '--prompt', 'sign up form', '--dry-run'], { cwd: labRoot, maxBuffer: 1 << 24 });
  const request = JSON.parse(stdout);
  assert.deepEqual(Object.keys(request), ['jsonrpc', 'id', 'method', 'params']);
  assert.equal(request.jsonrpc, '2.0');
  assert.equal(request.method, 'tools/call');
  assert.equal(request.params.name, 'figma_execute');
  assert.deepEqual(Object.keys(request.params.arguments).sort(), ['code', 'timeout']);
  assert.equal(request.params.arguments.timeout, 30000);
  checkSandboxScript(request.params.arguments.code, { filename: 'dry-run code' });
  const m = createFigmaMock({ localComponents: HARBOR_LIBRARY });
  const result = await runScript(m.figma, request.params.arguments.code);
  assert.equal(result.ok, true);
  assert.equal(result.frameName, 'Sign-up form');
  assert.match(result.key, /^thread_/);
});

test('sandbox: generated sources are current, and every script passes the guard and parses', async () => {
  assert.ok(sandboxSourceIsCurrent(), 'src/figma/sandbox-source.js is stale: run `node src/figma/sandbox-tools.js`');
  const { tree } = plan('settings');
  const scripts = {
    draw: treeToFigmaScript(tree, harbor, { key: 'k' }),
    patch: opsToFigmaScript([{ op: 'replace', path: '/ui/title', value: 'Loading...done ?? maybe?.' }], harbor, { key: 'k' }),
    read: readFigmaScript({ key: 'k' }),
    drawCall: drawCall(tree).arguments.code,
    patchCall: patchCall([]).arguments.code,
  };
  for (const [name, code] of Object.entries(scripts)) checkSandboxScript(code, { filename: name });
  for (const [name, source] of Object.entries(extractSandboxFunctions())) checkSandboxScript(`const f = ${source};`, { filename: name });
});

test('sandbox guard: catches what Figma rejects, ignores it inside literals and comments', () => {
  for (const bad of ['try { f(); } catch { }', 'const x = a?.b;', 'const y = a?.[0];', 'const z = a ?? b;', 'const o = { ...p };', 'f(...args);', 'const q = [...xs];']) {
    assert.equal(sandboxSyntaxProblems(bad).length, 1, bad);
    assert.throws(() => checkSandboxScript(bad), /not sandbox-safe/);
  }
  for (const fine of ['const s = "a?.b ?? c ...d";', "const t = 'catch {';", 'const r = /[?.]+\\?\\?/g;', '// a ?? b\nconst n = 1;', '/* {...x} */', 'const c = ok ? .5 : 1;', 'const d = a / b / c;', 'try { f(); } catch (e) { g(e); }']) {
    assert.deepEqual(sandboxSyntaxProblems(fine), [], fine);
  }
  assert.throws(() => checkSandboxScript('const = 1;'), SyntaxError);
});

test('applyJsonPatch agrees with fast-json-patch on the ops AG-UI sends', () => {
  const doc = { ui: { title: '', root: null, nodes: { n1: { type: 'Stack', props: {}, children: ['n2'] }, n2: { type: 'Text', props: { text: 'a' } } } }, theme: {} };
  const ops = [
    { op: 'replace', path: '/ui/title', value: 'T' },
    { op: 'add', path: '/ui/nodes/n3', value: { type: 'Badge', props: { label: 'b' } } },
    { op: 'add', path: '/ui/nodes/n1/children/0', value: 'n3' },
    { op: 'add', path: '/ui/nodes/n1/children/-', value: 'n4' },
    { op: 'remove', path: '/ui/nodes/n1/children/2' },
    { op: 'move', from: '/ui/nodes/n1/children/0', path: '/ui/nodes/n1/children/1' },
    { op: 'copy', from: '/ui/nodes/n2/props', path: '/ui/nodes/n3/props' },
    { op: 'test', path: '/ui/nodes/n3/props/text', value: 'a' },
    { op: 'add', path: '/theme/mode', value: 'dark' },
    { op: 'add', path: '/ui/nodes/a~1b', value: { type: 'Divider', props: {} } },
  ];
  assert.deepEqual(applyJsonPatch(structuredClone(doc), ops), applyOps(doc, /** @type {any} */ (ops)));
  assert.throws(() => applyJsonPatch(structuredClone(doc), [{ op: 'replace', path: '/ui/missing/x', value: 1 }]), /Path not found/);
  assert.throws(() => applyJsonPatch(structuredClone(doc), [{ op: 'test', path: '/ui/title', value: 'nope' }]), /Test failed/);
});

test('plugin build: manifest, a main thread that draws and reads, and a UI that parses', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harbor-plugin-'));
  const built = await build(dir, { regenerate: false });
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  assert.deepEqual(checkManifest(manifest), []);
  assert.equal(manifest.documentAccess, 'dynamic-page');
  assert.deepEqual(manifest.editorType, ['figma']);
  assert.deepEqual(manifest.networkAccess.devAllowedDomains, ['http://localhost:8787']);
  assert.equal(built.manifest.main, 'code.js');

  const code = await readFile(join(dir, 'code.js'), 'utf8');
  checkSandboxScript(code, { wrap: false, filename: 'code.js' });
  const m = createFigmaMock({ localComponents: HARBOR_LIBRARY });
  /** @type {any[]} */
  const posted = [];
  const ui = { postMessage: (/** @type {any} */ msg) => posted.push(msg), onmessage: /** @type {any} */ (null) };
  /** @type {Record<string, Function>} */
  const listeners = {};
  const figma = Object.assign(m.figma, {
    ui,
    showUI: () => {},
    on: (/** @type {string} */ event, /** @type {Function} */ fn) => (listeners[event] = fn),
    viewport: { scrollAndZoomIntoView: () => {} },
  });
  vm.runInNewContext(code, { figma, __html__: '<html></html>', console });
  assert.equal(posted[0].type, 'selection-changed', 'announces the selection on start');
  const reply = async (/** @type {any} */ msg) => {
    await ui.onmessage(msg);
    return posted.find((p) => p.requestId === msg.requestId);
  };
  const { tree } = plan('sign up form');
  const drew = await reply({ type: 'draw', requestId: 1, key: 'thread_p', frameName: 'From the plugin', tree, focus: true });
  assert.equal(drew.type, 'result', drew.message);
  assert.equal(drew.result.ok, true);
  assert.equal(drew.result.created.length, Object.keys(tree.nodes).length);
  const patched = await reply({ type: 'patch', requestId: 2, key: 'thread_p', ops: [{ op: 'replace', path: '/ui/nodes/n3/props/text', value: 'Hi' }] });
  assert.equal(patched.result.updated[0].how, 'rebuilt');
  m.page.selection = [screenOf(m)];
  const read = await reply({ type: 'read-selection', requestId: 3 });
  assert.equal(read.type, 'selection');
  const back = figmaNodeToTree(read.node, harbor).tree;
  assert.equal(back.nodes.n3.props.text, 'Hi');

  const html = await readFile(join(dir, 'ui.html'), 'utf8');
  assert.doesNotMatch(html, /\/\*@[A-Z_]+@\*\//, 'no template marker left');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((s) => s[1]);
  assert.equal(scripts.length, 3);
  for (const s of scripts) new vm.Script(s);
  const page = vm.createContext({});
  vm.runInContext(scripts[0] + '\n' + scripts[1] + '\n;globalThis.out = { HARBOR_BUNDLED, figmaNodeToTree, applyJsonPatch };', page);
  assert.equal(page.out.HARBOR_BUNDLED.catalog.name, 'harbor');
  assert.equal(page.out.figmaNodeToTree(read.node, page.out.HARBOR_BUNDLED.catalog).tree.nodes.n3.props.text, 'Hi', 'the UI can read a selection without the server');
  assert.match(scripts[2], /draw_in_figma/);
  assert.match(scripts[2], /threads\/\$\{encodeURIComponent\(id\)\}\/events/);
});
