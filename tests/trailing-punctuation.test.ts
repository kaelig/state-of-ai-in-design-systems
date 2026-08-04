// Deno, not node --test, because the file under test is an edge function: it is
// TypeScript and it imports the Netlify edge runtime for its types. It lives
// here rather than beside it because Netlify treats every file in
// netlify/edge-functions/ as a function to deploy.
//
// The case that pays for this file is the last one. The handler and the routing
// config each carry the punctuation set, and they have to carry the same one:
// the config is a string the edge router compiles, so it cannot be derived from
// the handler's regex. A character in one and not the other fails silently —
// either the function never runs, or it runs and hands the request back.

import { strictEqual } from 'node:assert/strict';
import handler, {
  config,
} from '../netlify/edge-functions/trailing-punctuation.ts';

const PASSED_THROUGH = new Response('passed through', { status: 418 });
// deno-lint-ignore no-explicit-any
const context = { next: () => Promise.resolve(PASSED_THROUGH) } as any;

const run = (path: string) =>
  Promise.resolve(handler(new Request('https://example.test' + path), context));

Deno.test('strips the punctuation llms.txt leaves stuck to a URL', async () => {
  const res = await run('/questions/platform-role.md):');
  strictEqual(res.status, 301);
  strictEqual(
    res.headers.get('location'),
    'https://example.test/questions/platform-role.md',
  );
});

Deno.test('strips a sentence-ending period from a bare URL', async () => {
  const res = await run('/insights.md.');
  strictEqual(res.headers.get('location'), 'https://example.test/insights.md');
});

Deno.test('keeps the query string', async () => {
  const res = await run('/llms.txt,?ref=x');
  strictEqual(
    res.headers.get('location'),
    'https://example.test/llms.txt?ref=x',
  );
});

Deno.test(
  'redirects a path that does not exist, and lets it 404 there',
  async () => {
    // Deliberate: the function does not consult the route table. A mangled URL
    // for a page we never published is still a miss, one hop later.
    const res = await run('/no-such-page.md):');
    strictEqual(res.status, 301);
    strictEqual(
      res.headers.get('location'),
      'https://example.test/no-such-page.md',
    );
  },
);

Deno.test('passes a clean path straight through', async () => {
  strictEqual(await run('/systems/ant-design.md'), PASSED_THROUGH);
  strictEqual(await run('/'), PASSED_THROUGH);
});

Deno.test('a mangled root cleans to the homepage, not to nothing', async () => {
  // The leading slash is never stripped, so there is no path that cleans to an
  // empty string and no branch guarding against one.
  const res = await run('/):');
  strictEqual(res.status, 301);
  strictEqual(res.headers.get('location'), 'https://example.test/');
});

Deno.test(
  'the routing config matches exactly what the handler strips',
  async () => {
    const pattern = new RegExp(config.pattern as string);
    const routed = [
      '/questions/platform-role.md):',
      '/insights.md.',
      '/systems/ant-design.md)',
      '/llms.txt,',
    ];
    const untouched = [
      '/',
      '/systems/',
      '/systems/ant-design',
      '/systems/ant-design.md',
      '/llms.txt',
      '/favicon.ico',
      '/data/state-of-ai.sqlite',
      '/og-image-fc576eba.png',
    ];

    for (const path of routed) {
      strictEqual(pattern.test(path), true, `config should route ${path}`);
      strictEqual(
        (await run(path)).status,
        301,
        `handler should redirect ${path}`,
      );
    }
    for (const path of untouched) {
      strictEqual(pattern.test(path), false, `config should ignore ${path}`);
    }
  },
);
