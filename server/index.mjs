// The Render deploy: one Node process in front of what ./scripts/build.sh wrote.
//
// Netlify serves this site out of three pieces — a static publish of dashboard/,
// a Function at /mcp, and two edge functions — and Render has no equivalent of
// the last two. So the pieces are reassembled here, in the order Netlify applies
// them: punctuation redirect, then Accept negotiation, then the static file.
//
// Nothing is reimplemented that could be imported instead. The MCP handler is
// netlify/functions/mcp.mjs itself, mounted at the path its own exported config
// names, so the two deploys answer /mcp with the same code. The route table the
// negotiation reads is the one scripts/build_md.py generates for the edge
// function, written a second time as JSON because Node cannot import the .ts.
// What is restated is the header table and the two edge functions' logic, which
// live in netlify.toml and in Deno TypeScript; the comments below name the rule
// each block mirrors so a change to one is findable from the other.
//
// There is no SPA fallback here either: every route is a real file the build
// wrote, and anything else gets 404.html with a 404 on it.

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, normalize, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import mcp, { config as mcpConfig } from '../netlify/functions/mcp.mjs';
import MD_TWINS from '../build/md-routes.json' with { type: 'json' };

const ROOT = resolve(fileURLToPath(new URL('../dashboard', import.meta.url)));

// Render assigns the port and expects the process to bind every interface.
const PORT = Number(process.env.PORT || 8888);
const HOST = process.env.HOST || '0.0.0.0';

// Only used for the canonical Link header on a negotiated markdown response.
// The default matches the <link rel="canonical"> that build_dashboard.py wrote
// into every prerendered page, so a Render deploy left unconfigured points at
// the same canonical the HTML does rather than contradicting it. Set
// PUBLIC_ORIGIN when the Render instance is the canonical one.
const ORIGIN = (
  process.env.PUBLIC_ORIGIN ||
  'https://state-of-ai-in-design-systems.netlify.app'
).replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// Header table. Mirrors the [[headers]] blocks in netlify.toml.
// ---------------------------------------------------------------------------

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.sqlite': 'application/vnd.sqlite3',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

// The social card is content-addressed and the icons change roughly never.
// Everything else gets the hour netlify.toml gives it, data.js included: it is
// rebuilt with the markup it belongs to, and a stale payload beside fresh HTML
// would be worse than a re-fetch.
const IMMUTABLE =
  /^\/(?:og-image-[^/]*\.png|favicon\.svg|favicon\.ico|apple-touch-icon\.png)$/;

// The mirror layer exists so agents can read the report without parsing HTML,
// so it is readable cross-origin. Same three patterns netlify.toml lists.
const CORS_READABLE = (p) =>
  p.endsWith('.md') ||
  /^\/llms[^/]*\.txt$/.test(p) ||
  p === '/.well-known/llms.txt' ||
  p.startsWith('/data/');

/** @param {string} p Path of the file being served, not of the request. */
function headersFor(p) {
  /** @type {Record<string, string>} */
  const h = {
    // Outbound links go to hundreds of third-party repositories; they get the
    // origin, never the path of the page someone was reading.
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
    'cache-control': IMMUTABLE.test(p)
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600',
  };
  const type = TYPES[extname(p)];
  if (type) h['content-type'] = type;
  if (CORS_READABLE(p)) h['access-control-allow-origin'] = '*';
  // The artifact variant is a duplicate of the site for a different host.
  if (p === '/artifact.html') h['x-robots-tag'] = 'noindex';
  return h;
}

// ---------------------------------------------------------------------------
// Static resolution. Netlify's pretty URLs: /ai is dashboard/ai.html, and
// /systems/primer-github is dashboard/systems/primer-github.html.
// ---------------------------------------------------------------------------

/** Absolute path inside ROOT, or null if the request tried to escape it. */
function safeJoin(p) {
  let decoded;
  try {
    decoded = decodeURIComponent(p);
  } catch {
    return null; // Malformed percent-encoding is not a path.
  }
  if (decoded.includes('\0')) return null;
  const abs = resolve(ROOT, '.' + normalize(decoded));
  return abs === ROOT || abs.startsWith(ROOT + sep) ? abs : null;
}

async function resolveFile(pathname) {
  const candidates =
    pathname === '/'
      ? ['/index.html']
      : [pathname, `${pathname}.html`, `${pathname}/index.html`];
  for (const candidate of candidates) {
    const abs = safeJoin(candidate);
    if (!abs) continue;
    const stats = await stat(abs).catch(() => null);
    if (stats?.isFile()) return { abs, stats, path: candidate };
  }
  return null;
}

function sendFile(req, res, file, { status = 200, extra = {} } = {}) {
  const tag = `W/"${file.stats.size.toString(16)}-${Math.floor(file.stats.mtimeMs).toString(16)}"`;
  const headers = {
    ...headersFor(file.path),
    ...extra,
    etag: tag,
    'last-modified': file.stats.mtime.toUTCString(),
  };
  if (status === 200 && req.headers['if-none-match'] === tag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  res.writeHead(status, {
    ...headers,
    'content-length': String(file.stats.size),
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file.abs).pipe(res);
}

async function sendNotFound(req, res) {
  const page = await resolveFile('/404.html');
  if (page) return sendFile(req, res, page, { status: 404 });
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Not found\n');
}

// ---------------------------------------------------------------------------
// The MCP function, bridged from node:http to the Request/Response it expects.
// ---------------------------------------------------------------------------

const MCP_PATH = mcpConfig.path;

function toRequest(req) {
  const host = req.headers.host || `${HOST}:${PORT}`;
  // Render terminates TLS in front of the process, so the scheme the client
  // used is only in the forwarded header.
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(
    ',',
  )[0];
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    for (const one of Array.isArray(value) ? value : [value])
      headers.append(name, one);
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(new URL(req.url ?? '/', `${proto}://${host}`), {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : null,
    duplex: 'half',
  });
}

async function serveMcp(req, res) {
  const response = await mcp(toRequest(req));
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) {
    res.end();
    return;
  }
  Readable.fromWeb(response.body).pipe(res);
}

// ---------------------------------------------------------------------------
// The two edge functions.
// ---------------------------------------------------------------------------

// netlify/edge-functions/trailing-punctuation.ts. The characters prose and
// markdown leave stuck to a URL; no published path ends with any of them. Kept
// character-for-character in step with TRAILING in that file.
const TRAILING = /[).,;:!?'"\]}>]+$/;

// netlify/edge-functions/markdown.ts. The route table is generated, so the set
// of negotiable routes here and there is one set.
const wantsMarkdown = (accept) =>
  Boolean(accept) && accept.toLowerCase().includes('text/markdown');

// ---------------------------------------------------------------------------

async function handle(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === MCP_PATH) return serveMcp(req, res);

  // Strip the punctuation a link parser took with it and redirect, permanently:
  // the mangled URL is never going to be the right one. If what is left does
  // not exist either, it 404s like anything else.
  const cleaned = url.pathname.replace(TRAILING, '');
  if (cleaned !== url.pathname) {
    res.writeHead(301, { location: cleaned + url.search });
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain' });
    res.end('Method not allowed\n');
    return;
  }

  // Trailing slashes are equivalent: /systems/ and /systems are one route.
  const pathname =
    url.pathname !== '/' && url.pathname.endsWith('/')
      ? url.pathname.slice(0, -1)
      : url.pathname;

  const twin = MD_TWINS[pathname];
  if (twin) {
    // Vary on both branches. Without it a cache in front of this would hand
    // markdown to browsers, or HTML to agents.
    if (wantsMarkdown(req.headers.accept)) {
      const file = await resolveFile(twin);
      // Twin missing on disk: fall through to the HTML rather than 404.
      if (file)
        return sendFile(req, res, file, {
          extra: {
            'content-type': 'text/markdown; charset=utf-8',
            'access-control-allow-origin': '*',
            link: `<${ORIGIN}${pathname}>; rel="canonical"`,
            vary: 'Accept',
          },
        });
    }
    const page = await resolveFile(pathname);
    if (page) return sendFile(req, res, page, { extra: { vary: 'Accept' } });
    return sendNotFound(req, res);
  }

  const file = await resolveFile(pathname);
  if (file) return sendFile(req, res, file);
  return sendNotFound(req, res);
}

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error('[server]', req.method, req.url, error);
    if (res.headersSent) return res.destroy();
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Internal server error\n');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`serving ${ROOT} on http://${HOST}:${PORT} (mcp at ${MCP_PATH})`);
});

// Render sends SIGTERM on deploy and on scale-down, and kills the process after
// a grace period. Finish the requests already in flight rather than cutting them.
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => server.close(() => process.exit(0)));
