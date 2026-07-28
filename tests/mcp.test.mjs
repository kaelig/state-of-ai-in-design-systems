// Drives netlify/functions/mcp.mjs in-process with plain Request objects.
// No server, no ports. Covers both protocol eras, the context-budget contract,
// and the negative cases.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import handler from '../netlify/functions/mcp.mjs';
import PAYLOAD from '../build/payload.json' with { type: 'json' };
import MD_MAP from '../build/md-map.json' with { type: 'json' };

const URL_ = 'https://state-of-ai-in-design-systems.netlify.app/mcp';
const BOTH = 'application/json, text/event-stream';

// When the data was gathered. Every tool description has to carry it, so an
// agent that quotes the server knows how stale the answer is. Unrelated to the
// MCP protocol version below, which happens to be a date too.
const SNAPSHOT_DATE = '2026-07-28';

// The 2026-07-28 per-request envelope.
const ENVELOPE = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientInfo': { name: 'node-test', version: '0' },
  'io.modelcontextprotocol/clientCapabilities': {},
};

let nextId = 1;

function post(body, headers = {}) {
  return handler(
    new Request(URL_, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: BOTH, ...headers },
      body: JSON.stringify(body),
    }),
  );
}

/** 2025-era call. */
async function legacy(method, params = {}) {
  const response = await post(
    { jsonrpc: '2.0', id: nextId++, method, params },
    { 'mcp-protocol-version': '2025-06-18' },
  );
  const raw = await response.text();
  return { response, raw, body: JSON.parse(raw) };
}

/** 2026-07-28-era call: envelope in params._meta plus the Mcp-* headers. */
async function modern(method, params = {}) {
  const headers = {
    'mcp-protocol-version': '2026-07-28',
    'mcp-method': method,
  };
  if (params.name) headers['mcp-name'] = params.name;
  const response = await post(
    {
      jsonrpc: '2.0',
      id: nextId++,
      method,
      params: { ...params, _meta: ENVELOPE },
    },
    headers,
  );
  const raw = await response.text();
  return { response, raw, body: JSON.parse(raw) };
}

async function callTool(name, args = {}) {
  const { body } = await legacy('tools/call', { name, arguments: args });
  assert.ok(
    body.result,
    `tools/call ${name} returned no result: ${JSON.stringify(body).slice(0, 400)}`,
  );
  return body.result;
}

const firstText = (result) => result.content.map((c) => c.text ?? '').join('');
const callJson = async (name, args) =>
  JSON.parse(firstText(await callTool(name, args)));

// ---------------------------------------------------------------------------

describe('legacy 2025 leg', () => {
  test('initialize returns application/json, not an SSE frame', async () => {
    const response = await post(
      {
        jsonrpc: '2.0',
        id: 1000,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 't', version: '0' },
        },
      },
      {},
    );
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get('content-type') ?? '',
      /application\/json/,
    );
    const body = /** @type {any} */ (await response.json());
    assert.equal(body.result.protocolVersion, '2025-06-18');
    assert.equal(body.result.serverInfo.name, 'state-of-ai-in-design-systems');
  });

  test('tools/list works', async () => {
    const { response, body } = await legacy('tools/list');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.result.tools));
  });

  test('tools/call works, and a second call through the same module works too', async () => {
    const one = await callJson('get_stats');
    assert.equal(one.counts.systems, PAYLOAD.systems.length);
    const two = await callJson('list_systems', { maturity: 'ai-native' });
    assert.ok(two.total > 0);
  });

  test('resources/list and resources/read', async () => {
    const { body: listed } = await legacy('resources/list');
    const uris = listed.result.resources.map((r) => r.uri);
    assert.ok(
      uris.includes('dsai://system/ant-design'),
      `missing system resource in ${uris.slice(0, 5)}`,
    );
    assert.ok(uris.includes('dsai://report/methodology'));

    const { body: read } = await legacy('resources/read', {
      uri: 'dsai://system/ant-design',
    });
    assert.equal(read.result.contents[0].mimeType, 'text/markdown');
    assert.equal(
      read.result.contents[0].text,
      MD_MAP['/systems/ant-design.md'],
    );
  });

  test('prompts/list and prompts/get', async () => {
    const { body: listed } = await legacy('prompts/list');
    assert.deepEqual(listed.result.prompts.map((p) => p.name).sort(), [
      'audit-my-design-system',
      'find-technique-for',
    ]);
    const { body: got } = await legacy('prompts/get', {
      name: 'find-technique-for',
      arguments: { failure: 'the model invents a Box component' },
    });
    assert.match(
      got.result.messages[0].content.text,
      /invents a Box component/,
    );
  });
});

describe('modern 2026-07-28 leg', () => {
  test('server/discover advertises the modern revision', async () => {
    const { response, body } = await modern('server/discover');
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get('content-type') ?? '',
      /application\/json/,
    );
    assert.deepEqual(body.result.supportedVersions, ['2026-07-28']);
    // Modern results carry extra fields (resultType/ttlMs/cacheScope/_meta) — tolerated.
    assert.ok(body.result.capabilities.tools);
  });

  test('tools/list and tools/call round-trip', async () => {
    const { body: listed } = await modern('tools/list');
    assert.ok(listed.result.tools.length >= 9);

    const { body: called } = await modern('tools/call', {
      name: 'get_stats',
      arguments: {},
    });
    const stats = JSON.parse(called.result.content.map((c) => c.text).join(''));
    assert.equal(stats.counts.systems, PAYLOAD.systems.length);
  });

  test('a second modern call through the same module-scope handler works', async () => {
    const { body } = await modern('tools/call', {
      name: 'get_platform',
      arguments: { id: 'figma' },
    });
    const platform = JSON.parse(
      body.result.content.map((c) => c.text).join(''),
    );
    assert.equal(platform.id, 'figma');
  });
});

describe('tool surface', () => {
  test('tool name list is exactly this, sorted', async () => {
    const { body } = await legacy('tools/list');
    assert.deepEqual(body.result.tools.map((t) => t.name).sort(), [
      'get_platform',
      'get_report',
      'get_snippet',
      'get_stats',
      'get_system',
      'list_affordances',
      'list_systems',
      'list_techniques',
      'search',
    ]);
  });

  test('every tool declares itself read-only and describes itself', async () => {
    const { body } = await legacy('tools/list');
    for (const tool of body.result.tools) {
      assert.equal(
        tool.annotations?.readOnlyHint,
        true,
        `${tool.name} is not marked readOnlyHint`,
      );
      assert.ok(
        tool.description.length > 120,
        `${tool.name} description is too thin`,
      );
      assert.match(
        tool.description,
        new RegExp(SNAPSHOT_DATE),
        `${tool.name} does not mention the snapshot date`,
      );
    }
  });
});

describe('context budget', () => {
  // The failure mode that actually hurts: one call eating the agent's window.
  const MINIMAL = [
    ['list_systems', {}],
    ['search', { query: 'code connect' }],
    ['list_affordances', {}],
    ['list_affordances', { type: 'mcp-server' }],
    ['list_techniques', {}],
    ['list_techniques', { category: 'validation-loop' }],
    ['get_snippet', { ref: 'technique:ant-design:0' }],
    ['get_stats', {}],
    ['get_report', {}],
    ['get_platform', { id: 'figma' }],
  ];

  for (const [name, args] of MINIMAL) {
    test(`${name}(${JSON.stringify(args)}) stays under 32KB`, async () => {
      const size = firstText(await callTool(name, args)).length;
      assert.ok(size < 32 * 1024, `${name} returned ${size} bytes`);
    });
  }

  test('the default get_system for every system stays under 32KB', async () => {
    for (const system of PAYLOAD.systems) {
      const size = firstText(
        await callTool('get_system', { id: system.id }),
      ).length;
      assert.ok(
        size < 32 * 1024,
        `get_system ${system.id} returned ${size} bytes`,
      );
    }
  });

  test('get_system strips snippet bodies unless asked', async () => {
    const leanText = firstText(
      await callTool('get_system', { id: 'ant-design' }),
    );
    const fatText = firstText(
      await callTool('get_system', { id: 'ant-design', include: ['snippets'] }),
    );
    assert.ok(
      !leanText.includes('"snippet"'),
      'snippet bodies leaked into the default get_system',
    );
    assert.ok(leanText.includes('"snippet_ref"'), 'no snippet_ref handed back');
    assert.ok(
      fatText.includes('"content"'),
      'include:["snippets"] did not add the bodies',
    );
    assert.ok(
      fatText.length > leanText.length * 1.4,
      `snippets added only ${fatText.length - leanText.length} bytes`,
    );
  });

  test('list_* default page sizes are what the descriptions promise', async () => {
    assert.equal((await callJson('list_affordances')).returned, 25);
    assert.equal((await callJson('list_techniques')).returned, 25);
  });

  test('pagination reports a next_offset when there is more', async () => {
    const first = await callJson('list_affordances', { limit: 10 });
    assert.equal(first.items.length, 10);
    assert.equal(first.next_offset, 10);
    const second = await callJson('list_affordances', {
      limit: 10,
      offset: 10,
    });
    assert.equal(second.offset, 10);
    assert.notEqual(first.items[0].name, second.items[0].name);
  });
});

describe('markdown is byte-identical to the static mirrors', () => {
  test('get_system format markdown', async () => {
    for (const id of ['shadcn-ui', 'uswds', 'ant-design']) {
      const md = firstText(
        await callTool('get_system', { id, format: 'markdown' }),
      );
      assert.equal(md, MD_MAP[`/systems/${id}.md`]);
    }
  });

  test('get_report sections', async () => {
    for (const [section, path] of [
      ['methodology', '/methodology.md'],
      ['reading', '/reading.md'],
      ['insights', '/insights.md'],
      ['overview', '/index.md'],
      ['questions/mcp-server-adoption', '/questions/mcp-server-adoption.md'],
    ]) {
      const md = firstText(await callTool('get_report', { section }));
      assert.equal(md, MD_MAP[path]);
    }
  });

  test('the reading section dates itself, not the snapshot', async () => {
    const md = firstText(await callTool('get_report', { section: 'reading' }));
    // The rest of the report is fixed at the collection window and stamps every
    // page with it. This one moves, so an agent that carries the window from
    // get_stats has to be told, in the page itself, to use a different date.
    assert.match(md, /^updated: "\d{4}-\d{2}-\d{2}"$/m);
    assert.doesNotMatch(md, /^data_collected:/m);
    assert.match(md, /kept current/i);
  });

  test('the tool metadata carves the reading section out of the snapshot', async () => {
    // An agent reads tools/list before it reads any section, and this server's
    // own instructions tell it to anchor on get_stats. Both surfaces claimed one
    // blanket snapshot date, which would have mis-dated the one section exempt
    // from it — and gone on doing so as the list moved.
    const { body } = await legacy('tools/list');
    const getReport = body.result.tools.find((t) => t.name === 'get_report');
    assert.match(getReport.description, /reading.*kept current/is);

    const stats = await callJson('get_stats');
    assert.equal(stats.reading_updated, PAYLOAD.meta.reading_updated);
    assert.notEqual(stats.reading_updated, undefined);
    assert.match(getReport.description, new RegExp(stats.reading_updated));
  });

  test('get_report with no section lists the sections', async () => {
    const toc = await callJson('get_report');
    assert.equal(toc.section, 'all');
    assert.ok(toc.sections.some((s) => s.section === 'methodology'));
    assert.equal(
      toc.sections.length,
      Object.keys(MD_MAP).filter(isReportPath).length,
    );
  });
});

function isReportPath(path) {
  return (
    path.startsWith('/questions/') ||
    [
      '/index.md',
      '/systems.md',
      '/matrix.md',
      '/techniques.md',
      '/platforms.md',
      '/insights.md',
      '/methodology.md',
      '/reading.md',
      '/ai.md',
      '/about/schema.md',
    ].includes(path)
  );
}

describe('get_stats matches the payload', () => {
  test('counts are strictly equal to counts derived from payload.json', async () => {
    const stats = await callJson('get_stats');
    const systems = PAYLOAD.systems;
    const affordances = systems.flatMap((s) => s.affordances);
    const techniques = systems.flatMap((s) => s.techniques);
    const capabilities = PAYLOAD.platforms.flatMap((p) => p.capabilities);

    assert.equal(stats.counts.systems, systems.length);
    assert.equal(stats.counts.platforms, PAYLOAD.platforms.length);
    assert.equal(stats.counts.affordances, affordances.length);
    assert.equal(stats.counts.techniques, techniques.length);
    assert.equal(stats.counts.platform_capabilities, capabilities.length);
    assert.equal(stats.counts.findings, PAYLOAD.insights.findings.length);
    assert.equal(
      stats.counts.snippets,
      [...affordances, ...techniques, ...capabilities].filter((x) => x.snippet)
        .length,
    );
    // The payload's own headline counts must agree too.
    assert.equal(stats.counts.systems, PAYLOAD.meta.counts.systems);
    assert.equal(stats.counts.affordances, PAYLOAD.meta.counts.affordances);
    assert.equal(stats.counts.techniques, PAYLOAD.meta.counts.techniques);
  });

  test('breakdowns sum to the totals', async () => {
    const stats = await callJson('get_stats');
    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    assert.equal(sum(stats.by_maturity), stats.counts.systems);
    assert.equal(sum(stats.by_category), stats.counts.systems);
    assert.equal(sum(stats.affordance_types), stats.counts.affordances);
    assert.equal(sum(stats.technique_categories), stats.counts.techniques);
  });

  test('enums cover every value present in the data', async () => {
    const stats = await callJson('get_stats');
    for (const type of Object.keys(stats.affordance_types)) {
      assert.ok(
        stats.enums.affordance_type.includes(type),
        `${type} missing from the enum`,
      );
    }
    assert.deepEqual(
      stats.enums.system_id,
      PAYLOAD.systems.map((s) => s.id),
    );
    assert.deepEqual(
      stats.enums.platform,
      PAYLOAD.platforms.map((p) => p.id),
    );
  });
});

describe('no research-process fields leak', () => {
  const FORBIDDEN = [
    'verify_note',
    '"verified"',
    'verify_status',
    '"corrected"',
  ];

  test('get_system, list_techniques, get_snippet and search bodies are clean', async () => {
    const bodies = [
      firstText(
        await callTool('get_system', {
          id: 'ant-design',
          include: ['snippets'],
        }),
      ),
      firstText(
        await callTool('get_system', {
          id: 'carbon-design-system',
          include: ['snippets'],
        }),
      ),
      firstText(await callTool('list_techniques', { limit: 100 })),
      firstText(await callTool('list_affordances', { limit: 100 })),
      firstText(
        await callTool('get_snippet', { ref: 'technique:ant-design:0' }),
      ),
      firstText(await callTool('search', { query: 'validation' })),
      firstText(await callTool('get_report', { section: 'methodology' })),
    ];
    for (const body of bodies) {
      for (const needle of FORBIDDEN) {
        assert.ok(!body.includes(needle), `response contains ${needle}`);
      }
    }
  });
});

describe('search', () => {
  test('finds techniques and hands back a usable snippet_ref', async () => {
    const result = await callJson('search', {
      query: 'copilot instructions',
      kind: 'technique',
      limit: 5,
    });
    assert.ok(result.total > 0);
    const withRef = result.hits.find((h) => h.snippet_ref);
    assert.ok(withRef, 'no hit carried a snippet_ref');
    const snippet = await callJson('get_snippet', { ref: withRef.snippet_ref });
    assert.equal(snippet.ref, withRef.snippet_ref);
    assert.ok(snippet.content.length > 0);
  });

  test('a query with no matches returns an empty result, not an error', async () => {
    const result = await callJson('search', { query: 'zzzzqqqxyzzy' });
    assert.equal(result.total, 0);
    assert.deepEqual(result.hits, []);
  });

  test('system_id narrows the results', async () => {
    const result = await callJson('search', {
      query: 'mcp',
      system_id: 'shadcn-ui',
      limit: 50,
    });
    for (const hit of result.hits) assert.equal(hit.system_id, 'shadcn-ui');
  });
});

describe('errors are errors, not crashes', () => {
  test('unknown tool comes back as a JSON-RPC error', async () => {
    const { response, body } = await legacy('tools/call', {
      name: 'no_such_tool',
      arguments: {},
    });
    assert.equal(response.status, 200);
    assert.ok(
      body.error || body.result?.isError,
      'expected an error, got a plain result',
    );
  });

  test('get_system with a bad id lists the valid ids', async () => {
    const { body } = await legacy('tools/call', {
      name: 'get_system',
      arguments: { id: 'not-a-system' },
    });
    const message = body.result.content.map((c) => c.text).join('');
    assert.equal(body.result.isError, true);
    assert.match(message, /not-a-system/);
    for (const id of ['shadcn-ui', 'uswds'])
      assert.ok(message.includes(id), `${id} not listed`);
  });

  test('get_report with a bad section lists the valid sections', async () => {
    const { body } = await legacy('tools/call', {
      name: 'get_report',
      arguments: { section: 'nope' },
    });
    const message = body.result.content.map((c) => c.text).join('');
    assert.equal(body.result.isError, true);
    assert.match(message, /methodology/);
  });

  test('get_snippet with a bad ref explains the ref format', async () => {
    const { body } = await legacy('tools/call', {
      name: 'get_snippet',
      arguments: { ref: 'technique:nope:99' },
    });
    const message = body.result.content.map((c) => c.text).join('');
    assert.equal(body.result.isError, true);
    assert.match(message, /<kind>:<owner id>:<index>/);
  });

  test('a bad enum value is rejected by schema validation', async () => {
    const { body } = await legacy('tools/call', {
      name: 'list_systems',
      arguments: { maturity: 'wishful' },
    });
    assert.ok(body.error || body.result?.isError);
  });
});

describe('HTTP negative cases', () => {
  test('GET is 405', async () => {
    const response = await handler(new Request(URL_, { method: 'GET' }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.equal(/** @type {any} */ (await response.json()).error.code, -32000);
  });

  test('DELETE is 405', async () => {
    const response = await handler(new Request(URL_, { method: 'DELETE' }));
    assert.equal(response.status, 405);
  });

  test('OPTIONS preflight is 204 with CORS', async () => {
    const response = await handler(
      new Request(URL_, {
        method: 'OPTIONS',
        headers: {
          origin: 'https://example.com',
          'access-control-request-method': 'POST',
        },
      }),
    );
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.match(
      response.headers.get('access-control-allow-headers') ?? '',
      /content-type/,
    );
  });

  test('legacy POST accepting only application/json is 406', async () => {
    const response = await post(
      { jsonrpc: '2.0', id: 900, method: 'tools/list', params: {} },
      { accept: 'application/json' },
    );
    assert.equal(response.status, 406);
  });

  test('POST with content-type text/plain is 415', async () => {
    const response = await handler(
      new Request(URL_, {
        method: 'POST',
        headers: { 'content-type': 'text/plain', accept: BOTH },
        body: '{"jsonrpc":"2.0","id":901,"method":"tools/list","params":{}}',
      }),
    );
    assert.equal(response.status, 415);
  });

  test('every successful response carries CORS headers', async () => {
    const { response } = await legacy('tools/list');
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.ok(response.headers.get('access-control-expose-headers'));
  });
});
