// The agent and the client loop, run through @ag-ui/client's own runAgent so
// every stream passes the SDK's 1.0 verifier (event order, open/close pairs,
// interrupt coverage) and not just our assumptions about it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventType } from '@ag-ui/client';
import { DesignAgent, REVIEW_REASON } from '../src/agent/design-agent.js';
import { createSession } from '../src/agent/session.js';
import { harbor } from '../src/catalog/index.js';
import { validateTree } from '../src/tree/tree.js';

const fast = { delayMs: 0 };

/** Run one prompt through a session and collect what a surface would see. */
async function runPrompt(/** @type {string} */ prompt, /** @type {Record<string, any>} */ props = {}, handlers = {}, tools = /** @type {any[]} */ ([])) {
  const agent = new DesignAgent({ defaults: fast });
  const session = createSession({ agent, handlers, tools });
  await session.send(prompt, props);
  return { agent, session, snap: session.snapshot };
}

for (const mode of ['state', 'tool', 'activity', 'a2ui']) {
  test(`${mode} mode: builds a valid screen and stops for design review`, async () => {
    const { session, snap } = await runPrompt('a sign up form', { mode });
    assert.equal(snap.error, null);
    assert.equal(snap.running, false);
    assert.equal(snap.interrupt?.reason, REVIEW_REASON);
    const tree = session.currentTree();
    assert.ok(tree?.root, 'a tree to draw');
    assert.equal(validateTree(tree, harbor).valid, true);
    const types = new Set(snap.events.map((e) => e.type));
    const expected = { state: EventType.STATE_DELTA, tool: EventType.TOOL_CALL_ARGS, activity: EventType.ACTIVITY_DELTA, a2ui: EventType.ACTIVITY_SNAPSHOT }[mode];
    assert.ok(types.has(expected), `${mode} emits ${expected}`);
    assert.equal(snap.events[0].type, EventType.RUN_STARTED);
  });

  test(`${mode} mode: a planted contract error is caught and repaired before review`, async () => {
    const { session, snap } = await runPrompt('a sign up form', { mode, simulateMistake: true });
    assert.equal(snap.interrupt?.reason, REVIEW_REASON);
    assert.equal(validateTree(session.currentTree(), harbor).valid, true);
    const text = snap.messages
      .filter((m) => m.role === 'assistant')
      .map((m) => m.content)
      .join(' ');
    assert.match(text, mode === 'tool' ? /The client rejected 1 prop/ : /Caught 1 contract error/);
  });
}

test('tool mode: the session answers render_ui and the agent runs again on its own', async () => {
  const { snap } = await runPrompt('pricing with 3 plans', { mode: 'tool', simulateMistake: true });
  const runs = snap.events.filter((e) => e.type === EventType.RUN_STARTED).length;
  assert.equal(runs, 3, 'render (rejected), render (fixed), acknowledge');
  const toolMessages = snap.messages.filter((m) => m.role === 'tool');
  assert.equal(toolMessages.length, 2);
  assert.equal(JSON.parse(String(toolMessages[0].content)).valid, false);
  assert.equal(JSON.parse(String(toolMessages[1].content)).valid, true);
});

test('approving the review calls the export tools the surface offered, and only those', async () => {
  /** @type {any[]} */
  const saved = [];
  const { session } = await runPrompt('dashboard', {}, { save_story: (/** @type {any} */ args) => (saved.push(args), { path: 'stories/generated/Dashboard.stories.jsx' }) }, [
    { name: 'save_story', description: 'Write the screen as a story', parameters: { type: 'object' } },
  ]);
  await session.resume({ approved: true });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].title, 'Generated/Dashboard');
  assert.equal(validateTree(saved[0].tree, harbor).valid, true);
  const snap = session.snapshot;
  assert.equal(snap.state.review.status, 'approved');
  assert.deepEqual(snap.exports.map((e) => e.tool), ['save_story']);
  assert.match(String(snap.messages.at(-1)?.content), /stories\/generated|save_story finished/);
  assert.equal(snap.interrupt, null);
});

test('rejecting the review exports nothing and asks what to change', async () => {
  let called = false;
  const { session } = await runPrompt('settings', {}, { draw_in_figma: () => (called = true) }, [{ name: 'draw_in_figma', description: 'Draw in Figma', parameters: {} }]);
  await session.resume({ approved: false, notes: 'fewer fields' });
  assert.equal(called, false);
  assert.match(String(session.snapshot.messages.at(-1)?.content), /fewer fields/);
});

test('activity and a2ui threads can still export after approval', async () => {
  for (const mode of ['activity', 'a2ui']) {
    /** @type {any[]} */
    const drawn = [];
    const { session } = await runPrompt('empty state', { mode }, { draw_in_figma: (/** @type {any} */ a) => (drawn.push(a), { frame: '1:2' }) }, [{ name: 'draw_in_figma', description: 'x', parameters: {} }]);
    await session.resume({ approved: true });
    assert.equal(drawn.length, 1, mode);
    assert.equal(drawn[0].frameName, 'Empty state');
  }
});

test('a theme-only follow-up edits state instead of redrawing', async () => {
  const { session } = await runPrompt('dashboard');
  const before = session.currentTree();
  await session.send('make it dark');
  const snap = session.snapshot;
  assert.equal(snap.state.theme.mode, 'dark');
  assert.deepEqual(session.currentTree(), before);
  const lastRun = snap.events.slice(snap.events.findLastIndex((e) => e.type === EventType.RUN_STARTED));
  assert.ok(!lastRun.some((e) => e.type === EventType.STATE_SNAPSHOT), 'no snapshot on a theme change');
  assert.ok(lastRun.some((e) => e.type === EventType.STATE_DELTA && e.event.delta[0].path === '/theme/mode'));
});

test('sending a new prompt while a review is pending cancels it rather than breaking the thread', async () => {
  const { session } = await runPrompt('dashboard');
  assert.ok(session.snapshot.interrupt);
  await session.send('a sign up form');
  assert.equal(session.snapshot.error, null);
  assert.equal(session.currentTree()?.title, 'Sign-up form');
});

test('tool mode falls back to shared state when the client offers no render_ui tool', async () => {
  const agent = new DesignAgent({ defaults: fast });
  agent.messages = [{ id: 'u', role: 'user', content: 'pricing' }];
  await agent.runAgent({ tools: [], forwardedProps: { mode: 'tool' } });
  assert.ok(agent.state.ui.root);
  assert.match(String(agent.messages.find((m) => m.role === 'assistant' && /render_ui/.test(String(m.content)))?.content), /no render_ui tool/);
});

test('capabilities declare what the agent does', async () => {
  const caps = await new DesignAgent().getCapabilities();
  assert.equal(caps.humanInTheLoop?.interrupts, true);
  assert.equal(caps.tools?.clientProvided, true);
  assert.deepEqual(caps.custom?.modes, ['state', 'tool', 'activity', 'a2ui']);
});

test('a custom planner replaces the recipes without touching the stream', async () => {
  const agent = new DesignAgent({
    defaults: fast,
    planner: async () => ({ recipe: 'custom', tree: { title: 'One', root: 'a', nodes: { a: { type: 'Text', props: { text: 'Hello' } } } } }),
  });
  const session = createSession({ agent });
  await session.send('anything');
  assert.equal(session.currentTree()?.nodes.a.props.text, 'Hello');
});

for (const mode of ['tool', 'activity', 'a2ui']) {
  test(`${mode} mode: "make it dark" changes the theme without replanning`, async () => {
    const { session } = await runPrompt('pricing', { mode });
    const before = session.currentTree();
    await session.send('make it dark', { mode });
    assert.equal(session.currentTheme().mode, 'dark');
    assert.deepEqual(session.currentTree(), before);
  });
}

test('per-send options hold for the automatic tool-answer rounds', async () => {
  const { snap } = await runPrompt('pricing', { mode: 'tool', review: false });
  assert.equal(snap.interrupt, null);
});
