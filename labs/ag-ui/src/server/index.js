// The design agent over HTTP, in the shape every AG-UI client already speaks:
//
//   POST /agent                      RunAgentInput in, AG-UI events out (SSE, or
//                                    protobuf when the client asks for it)
//   GET  /agent/capabilities         AgentCapabilities
//   GET  /catalog                    the catalog plus the tools and context a
//                                    client should pass, so thin clients (the
//                                    Figma plugin) need not bundle it
//   GET  /threads/:threadId/events   a read-only mirror of every run on a thread,
//                                    so a second surface can follow along: the
//                                    Figma plugin draws what someone is
//                                    generating in Storybook, live
//
// No framework, no state beyond the in-memory mirror. Run with
// `npm run agent`; PORT defaults to 8787.

import http from 'node:http';
import { EventEncoder } from '@ag-ui/encoder';
import { EventType } from '@ag-ui/core';
import { RunAgentInputSchema } from '@ag-ui/core/schemas';
import { catalogToContext, catalogToTools, harbor } from '../catalog/index.js';
import { applyOps } from '../tree/tree.js';
import { DesignAgent } from '../agent/design-agent.js';

/**
 * @param {{ agent?: DesignAgent, log?: (line: string) => void }} [options]
 */
export function createServer({ agent = new DesignAgent(), log = () => {} } = {}) {
  /** @type {Map<string, { state: any, observers: Set<http.ServerResponse> }>} */
  const threads = new Map();
  const thread = (/** @type {string} */ id) => {
    let t = threads.get(id);
    if (!t) threads.set(id, (t = { state: undefined, observers: new Set() }));
    return t;
  };

  /** Keep the mirror's copy of state current so a late observer starts from it. */
  const mirror = (/** @type {string} */ threadId, /** @type {any} */ event) => {
    const t = thread(threadId);
    if (event.type === EventType.STATE_SNAPSHOT) t.state = event.snapshot;
    if (event.type === EventType.STATE_DELTA && t.state) {
      try {
        t.state = applyOps(t.state, event.delta);
      } catch {
        // A delta the mirror cannot apply is the producer's bug to report, not
        // the mirror's to crash on; the next snapshot resynchronizes it.
      }
    }
    const line = new EventEncoder().encodeSSE(event);
    for (const res of t.observers) res.write(line);
  };

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();

    if (req.method === 'GET' && url.pathname === '/agent/capabilities') {
      return json(res, 200, await agent.getCapabilities());
    }
    if (req.method === 'GET' && url.pathname === '/catalog') {
      return json(res, 200, { catalog: agent.catalog, tools: catalogToTools(agent.catalog), context: catalogToContext(agent.catalog) });
    }

    const watch = url.pathname.match(/^\/threads\/([^/]+)\/events$/);
    if (req.method === 'GET' && watch) {
      const threadId = decodeURIComponent(watch[1]);
      const t = thread(threadId);
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      // Send the headers now. Node holds them until the first write, and on a
      // quiet thread that is the keep-alive ping 15 seconds away.
      res.write(': following ' + threadId.replace(/[\r\n]/g, '') + '\n\n');
      // Start the observer from the thread's current state, as a snapshot.
      if (t.state) res.write(new EventEncoder().encodeSSE(/** @type {any} */ ({ type: EventType.STATE_SNAPSHOT, snapshot: t.state })));
      t.observers.add(res);
      const ping = setInterval(() => res.write(': keep-alive\n\n'), 15000);
      req.on('close', () => {
        clearInterval(ping);
        t.observers.delete(res);
      });
      log(`observer joined ${threadId}`);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/agent') {
      let input;
      try {
        input = RunAgentInputSchema.parse(JSON.parse(await body(req)));
      } catch (error) {
        return json(res, 400, { error: 'Body is not a valid RunAgentInput.', detail: String(/** @type {any} */ (error)?.message ?? error).slice(0, 2000) });
      }
      const encoder = new EventEncoder({ accept: req.headers.accept });
      res.writeHead(200, { 'Content-Type': encoder.getContentType(), 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      log(`run ${input.runId} on ${input.threadId} (${input.forwardedProps?.mode ?? 'state'})`);
      const sub = agent.run(/** @type {any} */ (input)).subscribe({
        next: (event) => {
          // encodeBinary, not encode: encode() always writes SSE text, so a
          // server that negotiated protobuf through getContentType() and then
          // called encode() would label one format and send the other.
          res.write(encoder.encodeBinary(event));
          mirror(input.threadId, event);
        },
        error: (error) => {
          log(`run ${input.runId} failed: ${error}`);
          res.end();
        },
        complete: () => res.end(),
      });
      req.on('close', () => sub.unsubscribe());
      return;
    }

    json(res, 404, { error: 'Not found', routes: ['POST /agent', 'GET /agent/capabilities', 'GET /catalog', 'GET /threads/:threadId/events'] });
  });
}

/** @param {http.ServerResponse} res @param {number} status @param {unknown} data */
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/** @param {http.IncomingMessage} req */
function body(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8787);
  let planner;
  if (process.env.ANTHROPIC_API_KEY && process.env.PLANNER !== 'scripted') {
    ({ claudePlanner: planner } = await import('../agent/claude-planner.js'));
  }
  const agent = new DesignAgent({ catalog: harbor, ...(planner ? { planner: planner() } : {}) });
  createServer({ agent, log: (l) => console.log(l) }).listen(port, () => {
    console.log(`AG-UI design agent on http://localhost:${port}/agent (${planner ? 'Claude' : 'scripted'} planner, catalog ${harbor.name}@${harbor.version})`);
  });
}
