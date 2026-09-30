// The Storybook integration's Node-testable parts: argTypes derived from the
// catalog, the preset's save_story handler writing to a temp dir, the preview
// client talking to it over a stand-in channel, the event relay to the panel,
// and the manifest drift check. The browser half (the generator story, the
// panel) needs a real Storybook; it is driven with Playwright against both
// `storybook build` and `storybook dev`, outside this suite.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyNameFromExport, toId } from 'storybook/internal/csf';
import { harbor } from '../src/catalog/index.js';
import { plan } from '../src/agent/recipes.js';
import { DesignAgent } from '../src/agent/design-agent.js';
import { createSession } from '../src/agent/session.js';
import { usedComponents } from '../src/tree/to-code.js';
import { argTypesFromCatalog, parametersFromCatalog } from '../src/storybook/arg-types.js';
import { EVENTS } from '../src/storybook/events.js';
import { experimental_serverChannel } from '../src/storybook/preset.js';
import { exportNameFor, storyTitle, writeGeneratedStory } from '../src/storybook/story-writer.js';
import { createSaveStoryHandler, csfForDownload, requestSaveStory, saveStoryTool } from '../src/storybook/save-story-client.js';
import { relaySession } from '../src/storybook/relay.js';
import { compareManifest, formatDrift, manifestToCatalog } from '../src/storybook/manifest-to-catalog.js';

const REACT_ENTRY = fileURLToPath(new URL('../src/react/index.js', import.meta.url));

/**
 * One in-process stand-in for Storybook's channel: every emit reaches every
 * listener, which is what the real server channel does when it broadcasts a
 * response to all connected pages.
 */
function fakeChannel() {
  const bus = new EventEmitter();
  /** @type {{ event: string, args: any[] }[]} */
  const sent = [];
  return {
    sent,
    on: (/** @type {string} */ e, /** @type {any} */ fn) => bus.on(e, fn),
    off: (/** @type {string} */ e, /** @type {any} */ fn) => bus.off(e, fn),
    emit: (/** @type {string} */ e, /** @type {any[]} */ ...args) => {
      sent.push({ event: e, args });
      bus.emit(e, ...args);
    },
  };
}

/** A project-shaped temp dir: <tmp>/.storybook is the configDir the preset sees. */
async function tempProject() {
  const root = await mkdtemp(path.join(tmpdir(), 'agui-sb-'));
  return { root, configDir: path.join(root, '.storybook'), dir: path.join(root, 'stories', 'generated'), cleanup: () => rm(root, { recursive: true, force: true }) };
}

/** Send one request through the preset and wait for its response. */
function roundTrip(/** @type {ReturnType<typeof fakeChannel>} */ channel, /** @type {any} */ payload, id = 'req1') {
  return new Promise((resolve) => {
    const onResponse = (/** @type {any} */ r) => {
      if (r.id !== id) return;
      channel.off(EVENTS.SAVE_STORY_RESPONSE, onResponse);
      resolve(r);
    };
    channel.on(EVENTS.SAVE_STORY_RESPONSE, onResponse);
    channel.emit(EVENTS.SAVE_STORY_REQUEST, { id, payload });
  });
}

test('argTypes mirror the catalog: every prop, and nothing the catalog does not declare', () => {
  for (const [type, c] of Object.entries(harbor.components)) {
    const argTypes = argTypesFromCatalog(harbor, type);
    assert.deepEqual(Object.keys(argTypes).sort(), Object.keys(c.props.properties).sort(), type);
    assert.deepEqual(parametersFromCatalog(harbor, type).controls.include.sort(), Object.keys(c.props.properties).sort(), type);
  }
  assert.throws(() => argTypesFromCatalog(harbor, 'Carousel'), /not a harbor component/);
});

test('argTypes map JSON Schema to controls: enums, booleans, strings and bounded integers', () => {
  const button = argTypesFromCatalog(harbor, 'Button');
  assert.deepEqual(button.variant.options, ['primary', 'secondary', 'ghost']);
  assert.equal(button.variant.control.type, 'inline-radio', 'three options fit inline');
  assert.deepEqual(button.variant.table.defaultValue, { summary: '"primary"' });
  assert.equal(button.variant.table.type.summary, '"primary" | "secondary" | "ghost"');
  assert.equal(button.fullWidth.control.type, 'boolean');
  assert.deepEqual(button.fullWidth.table.defaultValue, { summary: 'false' });
  assert.equal(button.label.control.type, 'text');
  assert.equal(button.label.type.required, true, 'label is required in the catalog');
  assert.equal(button.variant.type.required, false);
  assert.match(button.label.description, /At least 1 character, at most 40 characters\./);

  const stack = argTypesFromCatalog(harbor, 'Stack');
  assert.equal(stack.gap.control.type, 'select', 'seven options get a select');
  assert.match(stack.gap.description, /^A space\.\* token\./);

  const grid = argTypesFromCatalog(harbor, 'Grid');
  assert.deepEqual(grid.columns.control, { type: 'range', min: 1, max: 4, step: 1 });
  assert.deepEqual(grid.columns.table.defaultValue, { summary: '3' });

  assert.deepEqual(argTypesFromCatalog(harbor, 'Divider'), {});
});

test('the preset writes stories/generated/<ExportName>.stories.jsx with the tree and only the components it uses', async () => {
  const project = await tempProject();
  try {
    const channel = fakeChannel();
    const returned = await experimental_serverChannel(channel, { configDir: project.configDir });
    assert.equal(returned, channel, 'a serverChannel preset must hand the channel on');

    const { tree } = plan('a sign up form');
    const response = await roundTrip(channel, { title: `Generated/${tree.title}`, tree, prompt: 'a sign up form' });
    assert.equal(response.success, true, response.error);
    assert.equal(response.error, null);

    const { payload } = response;
    const file = path.join(project.root, payload.path);
    assert.equal(path.dirname(file), project.dir);
    assert.equal(payload.path, `stories/generated/${payload.exportName}.stories.jsx`);
    assert.equal(payload.title, `Generated/${tree.title}`);
    assert.equal(payload.storyId, toId(payload.title, storyNameFromExport(payload.exportName)));

    const source = await readFile(file, 'utf8');
    assert.ok(source.includes(`tree: ${JSON.stringify(tree)}`), 'parameters.agui.tree holds the tree verbatim');
    assert.ok(source.includes(`prompt: "a sign up form"`));
    assert.ok(source.includes(`tags: ${JSON.stringify(['ai-generated', '!manifest'])},`), 'tagged for review and kept out of the components manifest');
    const importLine = source.split('\n').find((l) => l.startsWith('import '));
    const imported = importLine?.match(/import \{ (.+) \} from '(.+)';/);
    assert.ok(imported, importLine);
    assert.deepEqual(imported[1].split(', '), usedComponents(tree));
    assert.ok(!imported[1].includes('Grid') && !imported[1].includes('Stat'), 'a form does not import dashboard components');
    assert.equal(path.resolve(project.dir, imported[2]), REACT_ENTRY, 'the import path resolves to Harbor from the generated folder');
    assert.match(source, new RegExp(`export const ${payload.exportName} = \\{`));
  } finally {
    await project.cleanup();
  }
});

test('the preset refuses export names that are not plain identifiers, and writes nothing', async () => {
  const project = await tempProject();
  try {
    const channel = fakeChannel();
    await experimental_serverChannel(channel, { configDir: project.configDir });
    const { tree } = plan('a sign up form');
    const attempts = ['../../escape', '..\\..\\escape', 'Nested/Path', 'lowercase', 'Has Space', 'Dot.Name', `A${'b'.repeat(80)}`, 42];
    for (const [i, exportName] of attempts.entries()) {
      const response = await roundTrip(channel, { title: 'Generated/Evil', tree, exportName }, `evil${i}`);
      assert.equal(response.success, false, `${exportName} should be rejected`);
      assert.match(response.error, /not a valid export name/);
    }
    // The name is checked before anything touches the disk, so a rejected
    // request does not even create the generated folder.
    assert.deepEqual(await readdir(project.root), []);
  } finally {
    await project.cleanup();
  }
});

test('the preset rejects trees that break the catalog contract', async () => {
  const project = await tempProject();
  try {
    const channel = fakeChannel();
    await experimental_serverChannel(channel, { configDir: project.configDir });
    const bad = structuredClone(plan('a sign up form').tree);
    bad.nodes.n1.type = 'Carousel';
    const response = await roundTrip(channel, { title: 'Generated/Bad', tree: bad });
    assert.equal(response.success, false);
    assert.match(response.error, /breaks the harbor contract.*"Carousel" is not a harbor component/);
    const missing = await roundTrip(channel, { title: 'Generated/Nothing' }, 'req2');
    assert.equal(missing.success, false);
  } finally {
    await project.cleanup();
  }
});

test('saving the same screen twice keeps the first file and numbers the second', async () => {
  const project = await tempProject();
  try {
    const { tree } = plan('pricing with three plans');
    const first = await writeGeneratedStory({ title: 'Generated/Pricing', tree }, { dir: project.dir, root: project.root });
    const second = await writeGeneratedStory({ title: 'Generated/Pricing', tree }, { dir: project.dir, root: project.root });
    assert.equal(second.exportName, `${first.exportName}2`);
    assert.equal(second.title, 'Generated/Pricing 2');
    assert.notEqual(second.storyId, first.storyId, 'two files never share a story id');
    assert.deepEqual((await readdir(project.dir)).sort(), [`${first.exportName}.stories.jsx`, `${second.exportName}.stories.jsx`].sort());
  } finally {
    await project.cleanup();
  }
});

test('titles are always filed under Generated/ and lose dot segments and control characters', () => {
  assert.equal(storyTitle('Generated/Sign up', 'x'), 'Generated/Sign up');
  assert.equal(storyTitle('Sign up', 'x'), 'Generated/Sign up');
  assert.equal(storyTitle('../../etc/passwd', 'x'), 'Generated/etc/passwd');
  assert.equal(storyTitle('Generated//./Weird\u0000 title', 'x'), 'Generated/Weird title');
  assert.equal(storyTitle(undefined, 'Dashboard'), 'Generated/Dashboard');
  assert.equal(exportNameFor(undefined, 'Sign-up form', 'Generated/Sign-up form'), 'SignUpForm');
  assert.equal(exportNameFor('', undefined, 'Generated/3 plans'), 'Screen3Plans');
});

test('the preview client and the preset complete a save over the channel', async () => {
  const project = await tempProject();
  try {
    const channel = fakeChannel();
    await experimental_serverChannel(channel, { configDir: project.configDir });
    const { tree } = plan('profile settings');
    const saved = await requestSaveStory({ title: 'Generated/Settings', tree }, { channel });
    assert.equal(saved.title, 'Generated/Settings');
    // An answer addressed to another request must not settle this one.
    const pending = requestSaveStory({ title: 'Generated/Late', tree }, { channel: { on() {}, off() {}, emit() {} }, timeoutMs: 20 });
    await assert.rejects(pending, /No answer from the Storybook server/);
  } finally {
    await project.cleanup();
  }
});

test('approving the review makes the agent call save_story, and the file is written', async () => {
  const project = await tempProject();
  try {
    const channel = fakeChannel();
    await experimental_serverChannel(channel, { configDir: project.configDir });
    const session = createSession({
      agent: new DesignAgent(),
      tools: [saveStoryTool(harbor)],
      handlers: { save_story: createSaveStoryHandler({ channel, isDev: () => true, prompt: () => 'a sign up form' }) },
      forwardedProps: { delayMs: 0 },
    });
    await session.send('a sign up form', { mode: 'tool' });
    assert.equal(session.snapshot.interrupt?.reason, 'design_review');
    assert.ok(session.snapshot.interrupt?.metadata.exportTools.includes('save_story'));
    await session.resume({ approved: true });

    const save = session.snapshot.exports.find((e) => e.tool === 'save_story');
    assert.ok(save, 'the agent called save_story');
    assert.equal(save.result.saved, true, JSON.stringify(save.result));
    const files = await readdir(project.dir);
    assert.deepEqual(files, [path.basename(save.result.path)]);
    const lastText = session.snapshot.messages.filter((m) => m.role === 'assistant' && typeof m.content === 'string').at(-1);
    assert.match(String(lastText?.content), /Saved stories\/generated\//, 'the agent reports where the story went');
  } finally {
    await project.cleanup();
  }
});

test('in a static build save_story writes nothing and offers the CSF source instead', async () => {
  const handler = createSaveStoryHandler({ isDev: () => false });
  const { tree } = plan('a sign up form');
  const result = await handler({ title: `Generated/${tree.title}`, tree }, /** @type {any} */ (null));
  assert.equal(result.saved, false);
  assert.equal(result.fallback, 'download');
  assert.match(result.message, /static Storybook build/);
  const { fileName, source } = csfForDownload({ title: `Generated/${tree.title}`, tree });
  assert.equal(fileName, result.fileName);
  assert.ok(source.includes(JSON.stringify(tree)));
  assert.ok(source.includes("from '../../src/react/index.js'"));
  assert.ok(source.includes(`tags: ${JSON.stringify(['ai-generated', '!manifest'])},`), 'the download is the same file the preset would write');
});

test('the relay sends each logged event to the manager once, batched', async () => {
  const session = createSession({ agent: new DesignAgent(), forwardedProps: { delayMs: 0, review: false } });
  const channel = fakeChannel();
  const stop = relaySession(session, channel, { sessionId: 's1', transport: 'test', threadId: session.agent.threadId });
  await session.send('a dashboard with 4 metrics');
  await new Promise((r) => setTimeout(r, 40));
  stop();
  assert.equal(channel.sent[0].event, EVENTS.SESSION_STARTED);
  const relayed = channel.sent.filter((s) => s.event === EVENTS.EVENTS_LOGGED).flatMap((s) => s.args[0].events);
  assert.equal(relayed.length, session.snapshot.events.length, 'every event, no duplicates');
  assert.equal(relayed[0].type, 'RUN_STARTED');
  assert.equal(relayed.at(-1).type, 'RUN_FINISHED');
  assert.ok(relayed.every((e) => typeof e.detail === 'string' && e.detail.length <= 4100));
  const statuses = channel.sent.filter((s) => s.event === EVENTS.STATUS).map((s) => s.args[0]);
  assert.equal(statuses.at(-1).running, false);
});

test('the manifest drift check reports disagreements, not plumbing', () => {
  /** @param {Record<string, any>} props */
  const entry = (name, props, stories = [{ id: 'x', name: 'X' }]) => ({ id: `harbor-${name.toLowerCase()}`, name, reactDocgen: { exportName: name, props }, stories });
  const manifest = {
    v: 0,
    meta: { docgen: 'react-docgen' },
    components: {
      a: entry('Button', {
        variant: { required: false, defaultValue: { value: "'secondary'", computed: false } },
        size: { required: false, defaultValue: { value: "'md'", computed: false } },
        tooltip: { required: false },
        className: { required: false, defaultValue: { value: "''", computed: false } },
      }),
      b: entry('Grid', { columns: { required: false, defaultValue: { value: '3', computed: false } } }),
      c: entry('Heading', { text: { required: false, tsType: { name: 'string' } }, level: { required: false, defaultValue: { value: '2', computed: false } } }),
      d: entry('Carousel', {}),
      // What Storybook 10.6 emits for a story file with no meta.component.
      e: { id: 'generated-sign-up-form', name: 'Sign-upform', path: './stories/generated/SignUpForm.stories.jsx', error: { name: 'No component found', message: 'We could not detect the component from your story file.' } },
    },
  };
  const shaped = manifestToCatalog(manifest);
  assert.equal(shaped.components.Grid.props.columns.default, 3);
  const report = compareManifest(manifest);
  assert.equal(report.inSync, false);
  assert.deepEqual(report.unknown, ['Carousel'], 'an error entry is not an unknown component');
  assert.deepEqual(report.errors, [{ id: 'generated-sign-up-form', path: './stories/generated/SignUpForm.stories.jsx', error: 'No component found' }]);
  assert.ok(report.missing.includes('Stack') && !report.missing.includes('Button'));
  const button = report.components.find((c) => c.type === 'Button');
  assert.deepEqual(button?.defaults, [{ prop: 'variant', catalog: 'primary', manifest: 'secondary' }]);
  assert.deepEqual(button?.extra, ['tooltip'], 'className is plumbing, tooltip is drift');
  assert.ok(button?.invisible.includes('label'));
  const heading = report.components.find((c) => c.type === 'Heading');
  assert.deepEqual(heading?.requiredMismatch, [{ prop: 'text', catalog: true, manifest: false }], 'typed props are held to the catalog');
  assert.deepEqual(report.components.find((c) => c.type === 'Grid')?.defaults, []);
  const text = formatDrift(report);
  assert.match(text, /default {3}Button\.variant: catalog "primary", component "secondary"/);
  assert.match(text, /Drift found\./);
  assert.throws(() => manifestToCatalog(/** @type {any} */ ({})), /Not a Storybook components manifest/);
});
