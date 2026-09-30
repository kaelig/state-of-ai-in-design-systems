// The playground's pure helpers: event families and grouping for the Events
// tab, the thread rows, and the tokenizers behind the code views. The React
// parts are checked in a browser, not here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventType } from '@ag-ui/core';
import { FAMILIES, countByFamily, eventFamily, filterEvents, formatOffset, formatSize, groupByRun, runOutcome, shortId, visibleFamilies } from '../playground/src/lib/events.js';
import { threadItems, toolResultSummary } from '../playground/src/lib/thread.js';
import { tokenizeCode, tokenizeJson } from '../playground/src/lib/highlight.js';

test('every AG-UI 1.0 event type belongs to exactly one family', () => {
  for (const type of Object.values(EventType)) {
    const hits = FAMILIES.filter((f) => f.match(type));
    assert.equal(hits.length, 1, `${type} matched ${hits.map((f) => f.id).join(', ') || 'nothing'}`);
  }
  assert.equal(eventFamily('STATE_DELTA'), 'state');
  assert.equal(eventFamily('MESSAGES_SNAPSHOT'), 'state');
  assert.equal(eventFamily('TOOL_CALL_ARGS'), 'tool');
  assert.equal(eventFamily('ACTIVITY_SNAPSHOT'), 'activity');
  assert.equal(eventFamily('STEP_STARTED'), 'lifecycle');
  assert.equal(eventFamily('RAW'), 'custom');
  assert.equal(eventFamily('SOMETHING_NEW'), 'other');
});

const log = [
  { type: 'RUN_STARTED', at: 1000, event: { runId: 'run_aaaaaaaa1111' } },
  { type: 'TEXT_MESSAGE_START', at: 1010, event: {} },
  { type: 'STATE_DELTA', at: 1100, event: {} },
  { type: 'RUN_FINISHED', at: 1200, event: { outcome: { type: 'interrupt', interrupts: [{ reason: 'design_review' }] } } },
  { type: 'RUN_STARTED', at: 5000, event: { runId: 'run_bbbbbbbb2222' } },
  { type: 'TOOL_CALL_START', at: 5010, event: {} },
  { type: 'RUN_FINISHED', at: 5100, event: { outcome: { type: 'success', pendingToolCallIds: ['c1'] } } },
];

test('filtering and counting by family', () => {
  assert.equal(filterEvents(log, 'all').length, log.length);
  assert.deepEqual(
    filterEvents(log, 'lifecycle').map((e) => e.type),
    ['RUN_STARTED', 'RUN_FINISHED', 'RUN_STARTED', 'RUN_FINISHED'],
  );
  const counts = countByFamily(log);
  assert.equal(counts.all, 7);
  assert.equal(counts.lifecycle, 4);
  assert.equal(counts.tool, 1);
  assert.equal(counts.reasoning, 0);
  // Reasoning and subagent chips only show once such an event has arrived.
  assert.ok(!visibleFamilies(counts).some((f) => f.id === 'reasoning'));
  assert.ok(visibleFamilies({ ...counts, reasoning: 2 }).some((f) => f.id === 'reasoning'));
});

test('groupByRun splits at RUN_STARTED, keeps log indexes and reads the outcome', () => {
  const runs = groupByRun(log);
  assert.equal(runs.length, 2);
  assert.equal(runs[0].runId, 'run_aaaaaaaa1111');
  assert.equal(runs[0].outcome, 'interrupt: design_review');
  assert.deepEqual(
    runs[1].entries.map((e) => e.index),
    [4, 5, 6],
  );
  assert.equal(runs[1].outcome, 'waiting on 1 tool call');
  assert.equal(runs[1].start, 5000);
  assert.equal(runOutcome({}), 'success');
  assert.equal(groupByRun([]).length, 0);
});

test('time and size labels', () => {
  assert.equal(formatOffset(0), '+0 ms');
  assert.equal(formatOffset(845), '+845 ms');
  assert.equal(formatOffset(1240), '+1.24 s');
  assert.equal(formatOffset(12_500), '+12.5 s');
  assert.equal(formatOffset(-5), '+0 ms');
  assert.equal(formatSize('abc'), '3 B');
  assert.equal(formatSize('x'.repeat(2048)), '2.0 KB');
  assert.equal(shortId('run_1234567890ab'), '12345678');
  assert.equal(shortId(null), '');
});

test('threadItems shows text, tool calls, tool results and activities in order', () => {
  const items = threadItems([
    { id: 'u1', role: 'user', content: 'a sign up form' },
    { id: 'a1', role: 'assistant', content: 'Building a sign-up form.' },
    { id: 'act1', role: 'activity', activityType: 'harbor.surface', content: {} },
    { id: 'a2', role: 'assistant', toolCalls: [{ id: 'c1', type: 'function', function: { name: 'render_ui', arguments: '{"root":"n1"}' } }] },
    { id: 't1', role: 'tool', toolCallId: 'c1', content: JSON.stringify({ valid: false, errors: [{ message: 'x' }], warnings: [] }) },
  ]);
  assert.deepEqual(
    items.map((i) => i.kind),
    ['user', 'assistant', 'activity', 'tool-call', 'tool-result'],
  );
  const result = items.at(-1);
  assert.equal(result?.kind === 'tool-result' && result.name, 'render_ui');
  assert.equal(result?.kind === 'tool-result' && result.ok, false);
  // An assistant message that only carries tool calls adds no empty text row.
  assert.equal(items.filter((i) => i.kind === 'assistant').length, 1);
});

test('toolResultSummary reads validation reports and export results', () => {
  assert.deepEqual(toolResultSummary('render_ui', '{"valid":true,"errors":[],"warnings":[]}'), { summary: 'valid', ok: true });
  assert.deepEqual(toolResultSummary('render_ui', '{"valid":true,"errors":[],"warnings":[{},{}]}'), { summary: 'valid, 2 guideline warnings', ok: true });
  assert.deepEqual(toolResultSummary('render_ui', '{"valid":false,"errors":[{}],"warnings":[]}'), { summary: 'rejected: 1 contract error', ok: false });
  assert.deepEqual(toolResultSummary('export_code', '{"message":"Exported.","jsx":"<Card />"}'), { summary: 'Exported.', ok: true });
  assert.equal(toolResultSummary('export_code', '{"error":"boom"}').ok, false);
  assert.equal(toolResultSummary('x', 'not json').summary, 'not json');
});

test('tokenizers give back their input exactly and tag the interesting parts', () => {
  const json = JSON.stringify({ title: 'Sign-up form', nodes: { n1: { type: 'Button', props: { fullWidth: true, level: 2, hint: null } } } }, null, 2);
  const jt = tokenizeJson(json);
  assert.equal(jt.map((t) => t.v).join(''), json);
  assert.ok(jt.some((t) => t.t === 'key' && t.v === '"title"'));
  assert.ok(jt.some((t) => t.t === 'string' && t.v === '"Sign-up form"'));
  assert.ok(jt.some((t) => t.t === 'bool' && t.v === 'true'));
  assert.ok(jt.some((t) => t.t === 'number' && t.v === '2'));
  assert.ok(jt.some((t) => t.t === 'null'));

  const code = `// Generated\nimport { Card, Button } from '../src/react/index.js';\nexport const A = () => (\n  <Card padding="xl">\n    <Button label="Go" fullWidth />\n  </Card>\n);\n`;
  const ct = tokenizeCode(code);
  assert.equal(ct.map((t) => t.v).join(''), code);
  assert.ok(ct.some((t) => t.t === 'comment' && t.v === '// Generated'));
  assert.ok(ct.some((t) => t.t === 'keyword' && t.v === 'import'));
  assert.ok(ct.some((t) => t.t === 'tag' && t.v === 'Card'));
  assert.ok(ct.some((t) => t.t === 'attr' && t.v === 'padding'));
  assert.ok(ct.some((t) => t.t === 'string' && t.v === '"xl"'));
  // Plain runs are merged, so no two neighbors are both plain.
  assert.ok(ct.every((t, i) => i === 0 || !(t.t === 'plain' && ct[i - 1].t === 'plain')));
});
