// The HTTP face of the agent: a stock HttpAgent must be able to drive it, and
// a second client following the thread must see the same screen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpAgent } from '@ag-ui/client';
import { createServer } from '../src/server/index.js';
import { DesignAgent } from '../src/agent/design-agent.js';

async function listen() {
  const server = createServer({ agent: new DesignAgent({ defaults: { delayMs: 0 } }) });
  await new Promise((r) => server.listen(0, () => r(undefined)));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  return { server, base: `http://127.0.0.1:${address.port}` };
}

test('an HttpAgent runs the design agent over SSE', async () => {
  const { server, base } = await listen();
  try {
    const agent = new HttpAgent({ url: `${base}/agent`, threadId: 'http-1' });
    agent.messages = [{ id: 'u1', role: 'user', content: 'dashboard with 3 metrics' }];
    /** @type {string | undefined} */
    let outcome;
    await agent.runAgent({}, { onRunFinishedEvent: (p) => void (outcome = p.outcome) });
    assert.equal(outcome, 'interrupt');
    assert.equal(agent.state.ui.title, 'Dashboard');
    assert.equal(agent.state.review.status, 'in_review');
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('an observer on /threads/:id/events sees the run another client started', async () => {
  const { server, base } = await listen();
  const controller = new AbortController();
  try {
    const res = await fetch(`${base}/threads/shared/events`, { signal: controller.signal });
    assert.equal(res.headers.get('content-type'), 'text/event-stream');
    const reader = /** @type {ReadableStreamDefaultReader<Uint8Array>} */ (res.body?.getReader());
    const seen = collect(reader);

    const agent = new HttpAgent({ url: `${base}/agent`, threadId: 'shared' });
    agent.messages = [{ id: 'u1', role: 'user', content: 'pricing' }];
    await agent.runAgent();
    await new Promise((r) => setTimeout(r, 50));
    const types = seen.events.map((e) => e.type);
    assert.equal(types[0], 'RUN_STARTED');
    assert.ok(types.includes('STATE_DELTA'));
    assert.equal(types.at(-1), 'RUN_FINISHED');

    // A late observer starts from a snapshot of where the thread is now.
    const late = await fetch(`${base}/threads/shared/events`, { signal: controller.signal });
    const lateSeen = collect(/** @type {any} */ (late.body?.getReader()));
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(lateSeen.events[0]?.type, 'STATE_SNAPSHOT');
    assert.equal(lateSeen.events[0]?.snapshot.ui.title, 'Pricing');
  } finally {
    controller.abort();
    server.closeAllConnections();
    server.close();
  }
});

test('protobuf is negotiated by Accept and the body matches the label', async () => {
  const { server, base } = await listen();
  try {
    const body = JSON.stringify({ threadId: 't', runId: 'r', messages: [{ id: 'u', role: 'user', content: 'pricing' }], tools: [], context: [], state: {}, forwardedProps: {} });
    const res = await fetch(`${base}/agent`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/vnd.ag-ui.event+proto' }, body });
    assert.equal(res.headers.get('content-type'), 'application/vnd.ag-ui.event+proto');
    const bytes = new Uint8Array(await res.arrayBuffer());
    // Length-prefixed frames, not "data: " text.
    assert.notEqual(new TextDecoder().decode(bytes.slice(0, 6)), 'data: ');
    const first = new DataView(bytes.buffer).getUint32(0, false);
    assert.ok(first > 0 && first < bytes.length);

    // And an HttpAgent that asks for protobuf gets a working run.
    const agent = new HttpAgent({ url: `${base}/agent`, headers: { accept: 'application/vnd.ag-ui.event+proto' } });
    agent.messages = [{ id: 'u', role: 'user', content: 'pricing' }];
    await agent.runAgent();
    assert.equal(agent.state.ui.title, 'Pricing');
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('bad input is a 400 with a reason, and the catalog route serves the contract', async () => {
  const { server, base } = await listen();
  try {
    const bad = await fetch(`${base}/agent`, { method: 'POST', body: '{"nope":true}' });
    assert.equal(bad.status, 400);
    assert.match((await bad.json()).error, /RunAgentInput/);
    const cat = await (await fetch(`${base}/catalog`)).json();
    assert.equal(cat.catalog.name, 'harbor');
    assert.equal(cat.tools[0].name, 'render_ui');
    const caps = await (await fetch(`${base}/agent/capabilities`)).json();
    assert.equal(caps.transport.streaming, true);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

/** Read SSE frames into parsed events as they arrive. */
function collect(/** @type {ReadableStreamDefaultReader<Uint8Array>} */ reader) {
  /** @type {{ events: any[] }} */
  const out = { events: [] };
  let buffer = '';
  const decoder = new TextDecoder();
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        let i;
        while ((i = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, i);
          buffer = buffer.slice(i + 2);
          const data = frame
            .split('\n')
            .filter((l) => l.startsWith('data: '))
            .map((l) => l.slice(6))
            .join('\n');
          if (data) out.events.push(JSON.parse(data));
        }
      }
    } catch {
      // aborted
    }
  })();
  return out;
}
