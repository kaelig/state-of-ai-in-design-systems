// The Claude planner against a scripted stand-in for the SDK's stream, so the
// request shape, the partial-tree streaming and the repair round trip are
// tested without a network call or an API key.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventType } from '@ag-ui/client';
import { claudePlanner, parsePartial } from '../src/agent/claude-planner.js';
import { DesignAgent } from '../src/agent/design-agent.js';
import { createSession } from '../src/agent/session.js';
import { plan } from '../src/agent/recipes.js';
import { harbor } from '../src/catalog/index.js';

/**
 * A fake Anthropic client whose beta.messages.stream() replays one scripted
 * response per call: the tool input as input_json_delta chunks, then a final
 * message.
 * @param {Array<{ input?: any, stop_reason?: string, text?: string, stop_details?: any }>} script
 */
function fakeClient(script) {
  /** @type {any[]} */
  const requests = [];
  const client = {
    beta: {
      messages: {
        stream(/** @type {any} */ params) {
          requests.push(structuredClone(params));
          const turn = script[requests.length - 1];
          const json = turn.input === undefined ? '' : JSON.stringify(turn.input);
          const content = [];
          if (turn.text) content.push({ type: 'text', text: turn.text });
          if (turn.input !== undefined) content.push({ type: 'tool_use', id: `toolu_${requests.length}`, name: 'render_ui', input: turn.input });
          return {
            async *[Symbol.asyncIterator]() {
              for (let i = 0; i < json.length; i += 37) {
                yield { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: json.slice(i, i + 37) } };
                await new Promise((r) => setTimeout(r, 1));
              }
            },
            finalMessage: async () => ({ stop_reason: turn.stop_reason ?? 'tool_use', stop_details: turn.stop_details ?? null, content }),
          };
        },
      },
    },
  };
  return { client, requests };
}

test('the request uses auto tool choice, eager streaming, fallbacks and the catalog schema', async () => {
  const tree = plan('pricing').tree;
  const { client, requests } = fakeClient([{ input: tree }]);
  const planner = claudePlanner({ client, partialEveryMs: 0 });
  const out = await planner({ prompt: 'a pricing page', state: {}, catalog: harbor });
  assert.deepEqual(out.tree, tree);
  const [req] = requests;
  assert.equal(req.model, 'claude-opus-5-5');
  assert.deepEqual(req.tool_choice, { type: 'auto' });
  assert.equal(req.fallbacks, 'default');
  assert.deepEqual(req.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(req.tools[0].name, 'render_ui');
  assert.equal(req.tools[0].eager_input_streaming, true);
  assert.deepEqual(req.tools[0].input_schema.required, ['root', 'nodes']);
  assert.match(req.system[0].text, /Button\{ label: string; variant\?: "primary" \| "secondary" \| "ghost"/);
  assert.equal(req.thinking, undefined, 'thinking cannot be disabled on this model, so the request leaves it alone');
});

test('an invalid tree goes back to the model as an error tool_result, and the fix is accepted', async () => {
  const good = plan('sign up form').tree;
  const bad = structuredClone(good);
  const buttonId = Object.keys(bad.nodes).find((id) => bad.nodes[id].type === 'Button') ?? '';
  bad.nodes[buttonId].props.variant = 'danger';
  const { client, requests } = fakeClient([{ input: bad }, { input: good }]);
  const out = await claudePlanner({ client })({ prompt: 'sign up', state: {}, catalog: harbor });
  assert.deepEqual(out.tree, good);
  assert.match(String(out.note), /2 tries/);
  const second = requests[1].messages;
  assert.equal(second.length, 3);
  assert.equal(second[1].role, 'assistant');
  const result = second[2].content[0];
  assert.equal(result.type, 'tool_result');
  assert.equal(result.is_error, true);
  assert.equal(result.tool_use_id, 'toolu_1');
  assert.match(result.content, new RegExp(`/nodes/${buttonId}/props/variant`));
});

test('refusals, text-only answers and truncated output are errors, not screens', async () => {
  for (const [turn, pattern] of /** @type {const} */ ([
    [{ stop_reason: 'refusal', stop_details: { category: 'cyber' } }, /declined.*cyber/],
    [{ text: 'Which product is this for?', stop_reason: 'end_turn' }, /without calling render_ui: Which product/],
    [{ input: { root: 'n1', nodes: {} }, stop_reason: 'max_tokens' }, /ran out of output tokens/],
  ])) {
    const { client } = fakeClient([turn]);
    await assert.rejects(claudePlanner({ client })({ prompt: 'x', state: {}, catalog: harbor }), pattern);
  }
});

test('with a streaming planner the canvas fills in while the model writes', async () => {
  const tree = plan('dashboard with 4 metrics').tree;
  const { client } = fakeClient([{ input: tree }]);
  const agent = new DesignAgent({ planner: claudePlanner({ client, partialEveryMs: 0 }), defaults: { delayMs: 0 } });
  const session = createSession({ agent });
  await session.send('a dashboard');
  const snap = session.snapshot;
  assert.equal(snap.error, null);
  const events = snap.events.map((e) => e.type);
  const planStart = snap.events.findIndex((e) => e.type === EventType.STEP_STARTED && e.event.stepName === 'plan');
  const planEnd = snap.events.findIndex((e) => e.type === EventType.STEP_FINISHED && e.event.stepName === 'plan');
  const deltasDuringPlan = snap.events.slice(planStart, planEnd).filter((e) => e.type === EventType.STATE_DELTA).length;
  assert.ok(deltasDuringPlan > 3, `deltas while planning: ${deltasDuringPlan}`);
  assert.ok(events.indexOf(EventType.STATE_SNAPSHOT) < planStart, 'snapshot opens before the model starts');
  assert.deepEqual(session.currentTree(), tree);
  assert.equal(snap.interrupt?.reason, 'design_review');
  // No partial frame ever named a component the catalog lacks.
  for (const e of snap.events.filter((x) => x.type === EventType.STATE_DELTA)) {
    for (const op of e.event.delta) if (op.value?.type) assert.ok(harbor.components[op.value.type], op.value.type);
  }
});

test('parsePartial draws only nodes it can', () => {
  assert.equal(parsePartial('{"root":"n1","nod'), null);
  const p = parsePartial('{"title":"X","root":"n1","nodes":{"n1":{"type":"Stack","props":{"gap":"lg"},"children":["n2"]},"n2":{"type":"Butt');
  assert.equal(p?.root, 'n1');
  assert.deepEqual(Object.keys(p?.nodes ?? {}), ['n1']);
});
