// MCP server for "State of AI in Design Systems — July 2026".
//
// Runs on @modelcontextprotocol/server 2.0.0-beta.5 (pinned, no caret) as a
// Netlify Function v2. Dual-era: 2025-* clients are hand-wired through
// WebStandardStreamableHTTPServerTransport so they get application/json rather
// than SSE frames; 2026-07-28 clients go through createMcpHandler. Stateless,
// read-only, unauthenticated, POST-only.
//
// Data comes from the same sanitized build payload the site is generated from,
// and the markdown returned here is byte-identical to the static .md mirrors.

import {
  createMcpHandler,
  isLegacyRequest,
  McpServer,
  preloadSchemas,
  ResourceTemplate,
  WebStandardStreamableHTTPServerTransport,
} from '@modelcontextprotocol/server';
import { z } from 'zod';

import PAYLOAD from '../../build/payload.json' with { type: 'json' };
import MD_MAP from '../../build/md-map.json' with { type: 'json' };

preloadSchemas();

const SITE = 'https://state-of-ai-in-design-systems.netlify.app';
const SERVER_NAME = 'state-of-ai-in-design-systems';
const SERVER_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Module-scope indexes. Built once per cold start, never per request.
// ---------------------------------------------------------------------------

// Typed from schema/*.json via types/data.d.ts, so a field renamed in the
// schema shows up here as a type error rather than as undefined at runtime.
/** @type {import('../../types/data.d.ts').DesignSystems} */
const SYSTEMS = PAYLOAD.systems;
/** @type {import('../../types/data.d.ts').Platforms} */
const PLATFORMS = PAYLOAD.platforms;
const INSIGHTS = PAYLOAD.insights;
const META = PAYLOAD.meta;
const GENERATED = META.generated;
// The reading list is the one section not fixed at the collection window, and
// this date is read from the records rather than written here. A literal would
// keep answering 2026-07-28 long after the list had moved on, which is the
// mis-date the whole `updated` field exists to prevent.
const READING_UPDATED = META.reading_updated;

const SYSTEM_BY_ID = new Map(SYSTEMS.map((s) => [s.id, s]));
const PLATFORM_BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));
const SYSTEM_IDS = SYSTEMS.map((s) => s.id);
const PLATFORM_IDS = PLATFORMS.map((p) => p.id);

const uniqSorted = (xs) => [...new Set(xs)].sort();

const ENUMS = {
  ai_maturity: uniqSorted(SYSTEMS.map((s) => s.ai_maturity)),
  category: uniqSorted(SYSTEMS.map((s) => s.category)),
  affordance_type: uniqSorted(
    SYSTEMS.flatMap((s) => s.affordances.map((a) => a.type)),
  ),
  affordance_audience: uniqSorted(
    SYSTEMS.flatMap((s) => s.affordances.map((a) => a.audience)),
  ),
  technique_category: uniqSorted(
    SYSTEMS.flatMap((s) => s.techniques.map((t) => t.category)),
  ),
  platform: PLATFORM_IDS.slice(),
  system_id: SYSTEM_IDS.slice(),
};

// Snippet registry. Snippets have no ids in the data, so a ref is
// "<kind>:<owner id>:<index within that owner>" — stable as long as the
// record order in the payload is stable, which it is (build output).
const SNIPPETS = new Map();

function registerSnippet(kind, ownerId, ownerName, index, name, snippet) {
  const ref = `${kind}:${ownerId}:${index}`;
  SNIPPETS.set(ref, {
    ref,
    kind,
    owner_id: ownerId,
    owner_name: ownerName,
    name,
    language: snippet.language || 'text',
    source_url: snippet.source_url || null,
    content: snippet.content || '',
  });
  return ref;
}

// Flattened cross-system views.
const AFFORDANCES = [];
const TECHNIQUES = [];
const CAPABILITIES = [];

for (const s of SYSTEMS) {
  s.affordances.forEach((a, i) => {
    const ref = a.snippet
      ? registerSnippet('affordance', s.id, s.name, i, a.name, a.snippet)
      : null;
    AFFORDANCES.push({
      system_id: s.id,
      system_name: s.name,
      index: i,
      type: a.type,
      name: a.name,
      official: a.official === true,
      audience: a.audience,
      description: a.description,
      notes: a.notes,
      docs_url: a.docs_url,
      code_url: a.code_url,
      snippet_ref: ref,
    });
  });
  s.techniques.forEach((t, i) => {
    const ref = t.snippet
      ? registerSnippet('technique', s.id, s.name, i, t.name, t.snippet)
      : null;
    TECHNIQUES.push({
      system_id: s.id,
      system_name: s.name,
      index: i,
      name: t.name,
      category: t.category,
      description: t.description,
      snippet_ref: ref,
      snippet_language: t.snippet ? t.snippet.language || 'text' : null,
      snippet_source_url: t.snippet ? t.snippet.source_url || null : null,
    });
  });
}

for (const p of PLATFORMS) {
  p.capabilities.forEach((c, i) => {
    const ref = c.snippet
      ? registerSnippet('capability', p.id, p.name, i, c.title, c.snippet)
      : null;
    CAPABILITIES.push({
      platform_id: p.id,
      platform_name: p.name,
      index: i,
      title: c.title,
      description: c.description,
      audience: c.audience,
      url: c.url,
      snippet_ref: ref,
    });
  });
}

const COUNTS = {
  systems: SYSTEMS.length,
  platforms: PLATFORMS.length,
  affordances: AFFORDANCES.length,
  techniques: TECHNIQUES.length,
  platform_capabilities: CAPABILITIES.length,
  snippets: SNIPPETS.size,
  findings: INSIGHTS.findings.length,
  report_sections: 0, // filled in below, once the section map exists
};

function tally(items, key) {
  const out = {};
  for (const it of items) {
    const k = typeof key === 'function' ? key(it) : it[key];
    if (k == null) continue;
    out[k] = (out[k] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

// ---------------------------------------------------------------------------
// Report sections. Each one is a key into md-map.json, so the bytes a client
// gets here are the bytes the static mirror serves.
// ---------------------------------------------------------------------------

const FIXED_SECTIONS = [
  ['overview', '/index.md', 'Overview and headline findings'],
  ['systems', '/systems.md', 'All 20 design systems, one entry each'],
  ['matrix', '/matrix.md', 'Affordance coverage matrix'],
  ['techniques', '/techniques.md', 'The model-coercion technique catalog'],
  ['platforms', '/platforms.md', 'The five platforms'],
  [
    'insights',
    '/insights.md',
    'Findings, convergence, divergence, and the essay',
  ],
  [
    'methodology',
    '/methodology.md',
    'How the data was gathered, and its limits',
  ],
  [
    'reading',
    '/reading.md',
    'Further reading on AI and design systems — kept current, not part of the snapshot',
  ],
  ['ai-access', '/ai.md', 'How agents can read this report'],
  ['schema', '/about/schema.md', 'The data schema behind the report'],
];

const SECTIONS = new Map();
for (const [id, path, title] of FIXED_SECTIONS) {
  if (MD_MAP[path]) SECTIONS.set(id, { id, path, title });
}
for (const path of Object.keys(MD_MAP)) {
  if (!path.startsWith('/questions/')) continue;
  const id = path.slice(1).replace(/\.md$/, '');
  SECTIONS.set(id, {
    id,
    path,
    title: `Question: ${id.slice('questions/'.length).replace(/-/g, ' ')}`,
  });
}
COUNTS.report_sections = SECTIONS.size;

const SECTION_IDS = [...SECTIONS.keys()];

function reportTableOfContents() {
  return {
    section: 'all',
    note: 'Pass one of these ids as `section` to read it. Bodies are the same markdown the site serves at the listed url.',
    sections: [...SECTIONS.values()].map((s) => ({
      section: s.id,
      title: s.title,
      url: SITE + s.path,
      bytes: MD_MAP[s.path].length,
    })),
  };
}

// ---------------------------------------------------------------------------
// Search index. Lowercase inverted index over every searchable record.
// ---------------------------------------------------------------------------

const DOCS = [];

function addDoc(doc) {
  DOCS.push(doc);
}

for (const s of SYSTEMS) {
  addDoc({
    kind: 'system',
    system_id: s.id,
    system_name: s.name,
    id: s.id,
    name: s.name,
    category_or_type: s.category,
    source_url: s.docs_url || s.repo_url || null,
    text: [
      s.name,
      s.org,
      s.summary,
      s.gaps,
      s.building_vs_consumption?.for_consumers,
      s.building_vs_consumption?.for_builders,
    ]
      .filter(Boolean)
      .join('\n'),
  });
}
for (const a of AFFORDANCES) {
  addDoc({
    kind: 'affordance',
    system_id: a.system_id,
    system_name: a.system_name,
    id: `${a.system_id}:${a.index}`,
    name: a.name,
    category_or_type: a.type,
    source_url: a.docs_url || a.code_url || null,
    snippet_ref: a.snippet_ref,
    text: [
      a.name,
      a.type,
      a.description,
      a.notes,
      a.snippet_ref ? SNIPPETS.get(a.snippet_ref).content : '',
    ]
      .filter(Boolean)
      .join('\n'),
  });
}
for (const t of TECHNIQUES) {
  addDoc({
    kind: 'technique',
    system_id: t.system_id,
    system_name: t.system_name,
    id: `${t.system_id}:${t.index}`,
    name: t.name,
    category_or_type: t.category,
    source_url: t.snippet_source_url,
    snippet_ref: t.snippet_ref,
    text: [
      t.name,
      t.category,
      t.description,
      t.snippet_ref ? SNIPPETS.get(t.snippet_ref).content : '',
    ]
      .filter(Boolean)
      .join('\n'),
  });
}
for (const p of PLATFORMS) {
  addDoc({
    kind: 'platform',
    system_id: null,
    system_name: null,
    id: p.id,
    name: p.name,
    category_or_type: 'platform',
    source_url: p.sources?.[0] || null,
    text: [p.name, p.summary, p.adoption_by_design_systems]
      .filter(Boolean)
      .join('\n'),
  });
}
for (const c of CAPABILITIES) {
  addDoc({
    kind: 'platform',
    system_id: null,
    system_name: c.platform_name,
    id: `${c.platform_id}:${c.index}`,
    name: c.title,
    category_or_type: 'platform-capability',
    source_url: c.url,
    snippet_ref: c.snippet_ref,
    text: [
      c.title,
      c.description,
      c.snippet_ref ? SNIPPETS.get(c.snippet_ref).content : '',
    ]
      .filter(Boolean)
      .join('\n'),
  });
}
for (const group of ['findings', 'convergence', 'divergence']) {
  INSIGHTS[group].forEach((f, i) => {
    addDoc({
      kind: 'finding',
      system_id: null,
      system_name: null,
      id: `${group}:${i + 1}`,
      name: f.title,
      category_or_type: group,
      source_url: `${SITE}/insights`,
      text: [f.title, f.body].filter(Boolean).join('\n'),
    });
  });
}

const LOWER = DOCS.map((d) => d.text.toLowerCase());

const TOKEN_RE = /[a-z0-9][a-z0-9._+-]*/g;

function tokenize(s) {
  return s.toLowerCase().match(TOKEN_RE) || [];
}

/** @type {Map<string, any[]>} */
const INDEX = new Map();
LOWER.forEach((text, i) => {
  for (const tok of new Set(tokenize(text))) {
    let bucket = INDEX.get(tok);
    if (!bucket) INDEX.set(tok, (bucket = []));
    bucket.push(i);
  }
});

function excerptAround(text, needle) {
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at < 0) return text.slice(0, 240).replace(/\s+/g, ' ').trim();
  const start = Math.max(0, at - 90);
  const end = Math.min(text.length, at + 150);
  return (
    (start > 0 ? '…' : '') +
    text.slice(start, end).replace(/\s+/g, ' ').trim() +
    (end < text.length ? '…' : '')
  );
}

function runSearch(query, kind, systemId, limit) {
  const tokens = [...new Set(tokenize(query))];
  if (!tokens.length) return { total: 0, hits: [] };

  // AND over tokens, with a prefix fallback so "affordanc" still finds things.
  // null until the first token narrows it; tokens is non-empty by the guard
  // above, so the loop always assigns before the scan below reads it.
  /** @type {Set<any> | null} */
  let candidates = null;
  for (const tok of tokens) {
    let bucket = INDEX.get(tok);
    if (!bucket && tok.length >= 4) {
      /** @type {Set<any>} */
      const merged = new Set();
      for (const [key, ids] of INDEX)
        if (key.startsWith(tok)) for (const id of ids) merged.add(id);
      bucket = [...merged];
    }
    if (!bucket || !bucket.length) return { total: 0, hits: [] };
    const set = new Set(bucket);
    if (candidates === null) {
      candidates = set;
    } else {
      const prev = candidates;
      candidates = new Set([...prev].filter((i) => set.has(i)));
    }
    if (!candidates.size) return { total: 0, hits: [] };
  }

  const scored = [];
  for (const i of candidates ?? []) {
    const doc = DOCS[i];
    if (kind && kind !== 'all' && doc.kind !== kind) continue;
    if (systemId && doc.system_id !== systemId) continue;
    let score = 0;
    const lowName = doc.name.toLowerCase();
    for (const tok of tokens) {
      let from = 0;
      let hits = 0;
      while (hits < 20) {
        const at = LOWER[i].indexOf(tok, from);
        if (at < 0) break;
        hits += 1;
        from = at + tok.length;
      }
      score += hits;
      if (lowName.includes(tok)) score += 25;
    }
    scored.push([score, i]);
  }
  scored.sort((a, b) => b[0] - a[0] || a[1] - b[1]);

  const hits = scored.slice(0, limit).map(([, i]) => {
    const doc = DOCS[i];
    const hit = {
      kind: doc.kind,
      system_id: doc.system_id,
      system_name: doc.system_name,
      id: doc.id,
      name: doc.name,
      category_or_type: doc.category_or_type,
      excerpt: excerptAround(doc.text, tokens[0]),
      source_url: doc.source_url,
    };
    if (doc.snippet_ref) hit.snippet_ref = doc.snippet_ref;
    return hit;
  });
  return { total: scored.length, hits };
}

// ---------------------------------------------------------------------------
// Projections
// ---------------------------------------------------------------------------

function firstSentence(text) {
  if (!text) return '';
  const m = text.match(/^[\s\S]{20,400}?[.!?](\s|$)/);
  return (m ? m[0] : text.slice(0, 240)).trim();
}

function systemLine(s) {
  return {
    id: s.id,
    name: s.name,
    org: s.org,
    category: s.category,
    ai_maturity: s.ai_maturity,
    license: s.license,
    docs_url: s.docs_url,
    repo_url: s.repo_url,
    affordance_types: uniqSorted(s.affordances.map((a) => a.type)),
    counts: {
      affordances: s.affordances.length,
      techniques: s.techniques.length,
    },
    headline: firstSentence(s.summary),
  };
}

function systemRecord(s, include) {
  const want = new Set(include || []);
  const withSnippets = want.has('snippets');
  const record = {
    id: s.id,
    name: s.name,
    org: s.org,
    category: s.category,
    license: s.license,
    repo_url: s.repo_url,
    docs_url: s.docs_url,
    ai_maturity: s.ai_maturity,
    maintenance: s.maintenance,
    summary: s.summary,
    building_vs_consumption: s.building_vs_consumption,
    canonical_url: `${SITE}/systems/${s.id}`,
    markdown_url: `${SITE}/systems/${s.id}.md`,
  };

  const wantAll = want.size === 0 || (want.size === 1 && withSnippets);

  if (wantAll || want.has('affordances')) {
    record.affordances = s.affordances.map((a, i) => {
      const ref = a.snippet ? `affordance:${s.id}:${i}` : null;
      const out = {
        type: a.type,
        name: a.name,
        official: a.official === true,
        audience: a.audience,
        description: a.description,
        docs_url: a.docs_url,
        code_url: a.code_url,
      };
      if (a.notes) out.notes = a.notes;
      if (ref) {
        out.snippet_ref = ref;
        if (withSnippets) out.snippet = SNIPPETS.get(ref);
      }
      return out;
    });
  }
  if (wantAll || want.has('techniques')) {
    record.techniques = s.techniques.map((t, i) => {
      const ref = t.snippet ? `technique:${s.id}:${i}` : null;
      const out = {
        name: t.name,
        category: t.category,
        description: t.description,
      };
      if (ref) {
        out.snippet_source_url = t.snippet.source_url || null;
        out.snippet_language = t.snippet.language || 'text';
        out.snippet_ref = ref;
        if (withSnippets) out.snippet = SNIPPETS.get(ref);
      }
      return out;
    });
  }
  if (wantAll || want.has('platform_integrations'))
    record.platform_integrations = s.platform_integrations;
  if (wantAll || want.has('gaps')) record.gaps = s.gaps;
  if (wantAll || want.has('sources')) record.sources = s.sources;

  return record;
}

function platformRecord(p) {
  return {
    id: p.id,
    name: p.name,
    summary: p.summary,
    capabilities: p.capabilities.map((c, i) => {
      const ref = c.snippet ? `capability:${p.id}:${i}` : null;
      const out = {
        title: c.title,
        description: c.description,
        audience: c.audience,
        url: c.url,
      };
      if (ref) out.snippet_ref = ref;
      return out;
    }),
    adoption_by_design_systems: p.adoption_by_design_systems,
    sources: p.sources,
    canonical_url: `${SITE}/platforms/${p.id}`,
    markdown_url: `${SITE}/platforms/${p.id}.md`,
  };
}

// ---------------------------------------------------------------------------
// Tool plumbing
// ---------------------------------------------------------------------------

const json = (value) => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 1) }],
});
const text = (value) => ({ content: [{ type: 'text', text: value }] });
const fail = (message) => ({
  isError: true,
  content: [{ type: 'text', text: message }],
});

const PROVENANCE =
  'Snapshot of 2026-07-28. Cite the source_url on each record, not this server.';

// The block every prompt opens with. An agent that gets the filter vocabulary in
// the prompt does not have to spend a call discovering it, and cannot spend that
// call inventing a value no tool accepts. Derived from the payload at
// registration time, like every other published surface here, so an enum that
// gains a value changes this text rather than leaving it quietly wrong.
const PROMPT_PREAMBLE = [
  `The State of AI in Design Systems survey: ${COUNTS.systems} open-source design systems and ` +
    `${COUNTS.platforms} platforms, with ${COUNTS.affordances} AI affordances and ` +
    `${COUNTS.techniques} model-coercion techniques on record. Snapshot of 2026-07-28.`,
  '',
  'The filter vocabulary, which every list_* call takes verbatim:',
  `- affordance_type: ${ENUMS.affordance_type.join(', ')}`,
  `- technique_category: ${ENUMS.technique_category.join(', ')}`,
  `- ai_maturity: ${ENUMS.ai_maturity.join(', ')}`,
  `- category: ${ENUMS.category.join(', ')}`,
  'Call get_stats for the per-system breakdown and the system ids.',
  '',
  'Two rules for whatever you build from this. Cite the source_url on each record, not this',
  'server. And when you cannot find something, say you could not find it — a lookup that came',
  'back empty is not evidence that the thing is absent.',
].join('\n');

function page(items, limit, offset) {
  const start = offset || 0;
  const slice = items.slice(start, start + limit);
  const out = {
    total: items.length,
    offset: start,
    returned: slice.length,
    items: slice,
  };
  if (start + slice.length < items.length) {
    out.next_offset = start + slice.length;
    out.note = `More results: call again with offset ${out.next_offset}.`;
  }
  return out;
}

function buildServer() {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        'Read-only research data from "State of AI in Design Systems", a July 2026 field survey of ' +
        `${COUNTS.systems} open-source design systems and ${COUNTS.platforms} platforms, cataloging ` +
        `${COUNTS.affordances} AI affordances and ${COUNTS.techniques} model-coercion techniques. ` +
        'Start with get_stats to learn the filter vocabulary, then search or list_*, then get_system for one ' +
        'record. Snippet bodies are opt-in through get_snippet so responses stay small. ' +
        'Every record carries the source_url it was taken from — quote that when you cite a claim, and read ' +
        'get_report({section:"methodology"}) for how the data was gathered and what it does not cover. ' +
        'Source and corrections: https://github.com/kaelig/state-of-ai-in-design-systems — ' +
        'if a record here is wrong, open an issue with the URL that shows what it should say.',
    },
  );

  const RO = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };

  // -- 1. list_systems ----------------------------------------------------
  server.registerTool(
    'list_systems',
    {
      title: 'List design systems',
      description:
        `List the ${COUNTS.systems} design systems and component libraries in the survey, one compact line each: ` +
        'id, org, category, AI maturity, license, doc and repo links, which affordance types it ships, and a ' +
        'one-sentence headline. Filter to narrow before spending a get_system call. Snapshot of 2026-07-28; ' +
        "cite each record's docs_url or repo_url rather than this server. Full detail: get_system.",
      inputSchema: z.object({
        maturity: z
          .enum(ENUMS.ai_maturity)
          .optional()
          .describe('How far the system has gone on AI consumption.'),
        category: z.enum(ENUMS.category).optional(),
        has_affordance: z
          .enum(ENUMS.affordance_type)
          .optional()
          .describe(
            'Only systems shipping at least one affordance of this type.',
          ),
        platform: z
          .enum(ENUMS.platform)
          .optional()
          .describe(
            'Only systems with a documented integration with this platform.',
          ),
        org: z
          .string()
          .optional()
          .describe(
            'Case-insensitive substring match on the maintaining organization.',
          ),
      }),
      annotations: RO,
    },
    async ({ maturity, category, has_affordance, platform, org }) => {
      let rows = SYSTEMS;
      if (maturity) rows = rows.filter((s) => s.ai_maturity === maturity);
      if (category) rows = rows.filter((s) => s.category === category);
      if (has_affordance)
        rows = rows.filter((s) =>
          s.affordances.some((a) => a.type === has_affordance),
        );
      // Optional in the schema, present on all 20 records today. Without
      // the guard the first record that omits it crashes this filter.
      if (platform)
        rows = rows.filter((s) =>
          (s.platform_integrations ?? []).some((p) => p.platform === platform),
        );
      if (org) {
        const needle = org.toLowerCase();
        rows = rows.filter((s) =>
          String(s.org || '')
            .toLowerCase()
            .includes(needle),
        );
      }
      return json({
        total: rows.length,
        of: SYSTEMS.length,
        generated: GENERATED,
        systems: rows.map(systemLine),
      });
    },
  );

  // -- 2. get_system ------------------------------------------------------
  server.registerTool(
    'get_system',
    {
      title: 'Get one design system',
      description:
        'Full record for one design system: summary, maintenance status, every AI affordance, every ' +
        'model-coercion technique, platform integrations, gaps, and sources. Snippet bodies are stripped by ' +
        'default and replaced with a snippet_ref you can pass to get_snippet — ask for include:["snippets"] ' +
        'only when you really want every code block, it is roughly ten times the size. format:"markdown" ' +
        'returns the same page the site publishes at /systems/{id}.md, front matter and all. ' +
        'Snapshot of 2026-07-28; cite the source_url on each record.',
      inputSchema: z.object({
        id: z
          .string()
          .describe('System id, as returned by list_systems or search.'),
        include: z
          .array(
            z.enum([
              'affordances',
              'techniques',
              'platform_integrations',
              'gaps',
              'sources',
              'snippets',
            ]),
          )
          .optional()
          .describe(
            'Narrow the record to these sections. Omit for everything except snippet bodies.',
          ),
        format: z
          .enum(['json', 'markdown'])
          .optional()
          .describe('Defaults to json.'),
      }),
      annotations: RO,
    },
    async ({ id, include, format }) => {
      const system = SYSTEM_BY_ID.get(id);
      if (!system) {
        return fail(
          `No system with id "${id}". Valid ids: ${SYSTEM_IDS.join(', ')}. ` +
            'Use list_systems or search to find one.',
        );
      }
      if (format === 'markdown') {
        const md = MD_MAP[`/systems/${id}.md`];
        if (!md)
          return fail(
            `No markdown page for "${id}". Retry with format:"json".`,
          );
        return text(md);
      }
      return json(systemRecord(system, include));
    },
  );

  // -- 3. search ----------------------------------------------------------
  server.registerTool(
    'search',
    {
      title: 'Search the survey',
      description:
        'Full-text search across every system summary, affordance, coercion technique, snippet body, ' +
        'platform capability, and finding. Words are ANDed. Returns short excerpts with a source_url and, ' +
        'where one exists, a snippet_ref for get_snippet. This is the cheapest way in when you do not know ' +
        'which system to look at. Snapshot of 2026-07-28; cite the source_url on each hit.',
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            'Words to look for, e.g. "code connect" or "hallucinated component".',
          ),
        kind: z
          .enum([
            'all',
            'system',
            'affordance',
            'technique',
            'platform',
            'finding',
          ])
          .optional(),
        system_id: z.string().optional().describe('Restrict to one system.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe('Default 20.'),
      }),
      annotations: RO,
    },
    async ({ query, kind, system_id, limit }) => {
      if (system_id && !SYSTEM_BY_ID.has(system_id)) {
        return fail(
          `No system with id "${system_id}". Valid ids: ${SYSTEM_IDS.join(', ')}.`,
        );
      }
      const result = runSearch(query, kind, system_id, limit || 20);
      return json({ query, ...result, note: PROVENANCE });
    },
  );

  // -- 4. list_affordances ------------------------------------------------
  server.registerTool(
    'list_affordances',
    {
      title: 'List AI affordances',
      description:
        `The cross-system view of all ${COUNTS.affordances} AI affordances: MCP servers, agent skills, ` +
        'llms.txt files, instruction files, registries, scaffolding CLIs and the rest. Use it to answer ' +
        '"who ships X" across the whole survey. Descriptions only, no snippet bodies — follow a snippet_ref ' +
        'into get_snippet for the code. Paginated; check next_offset. Snapshot of 2026-07-28; cite each ' +
        "record's docs_url or code_url.",
      inputSchema: z.object({
        type: z.enum(ENUMS.affordance_type).optional(),
        system_id: z.string().optional(),
        audience: z
          .enum(ENUMS.affordance_audience)
          .optional()
          .describe('Who the affordance is aimed at.'),
        official: z
          .boolean()
          .optional()
          .describe('true for first-party only, false for community only.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Default 25.'),
        offset: z.number().int().min(0).optional(),
      }),
      annotations: RO,
    },
    async ({ type, system_id, audience, official, limit, offset }) => {
      if (system_id && !SYSTEM_BY_ID.has(system_id)) {
        return fail(
          `No system with id "${system_id}". Valid ids: ${SYSTEM_IDS.join(', ')}.`,
        );
      }
      let rows = AFFORDANCES;
      if (type) rows = rows.filter((a) => a.type === type);
      if (system_id) rows = rows.filter((a) => a.system_id === system_id);
      if (audience) rows = rows.filter((a) => a.audience === audience);
      if (official !== undefined)
        rows = rows.filter((a) => a.official === official);
      const projected = rows.map((a) => ({
        system_id: a.system_id,
        system_name: a.system_name,
        type: a.type,
        name: a.name,
        official: a.official,
        audience: a.audience,
        description: a.description,
        docs_url: a.docs_url,
        code_url: a.code_url,
        has_snippet: Boolean(a.snippet_ref),
        snippet_ref: a.snippet_ref || undefined,
      }));
      return json(page(projected, limit || 25, offset));
    },
  );

  // -- 5. list_techniques -------------------------------------------------
  server.registerTool(
    'list_techniques',
    {
      title: 'List model-coercion techniques',
      description:
        `The catalog of ${COUNTS.techniques} techniques these systems use to stop a model writing plausible ` +
        'but wrong code: validation loops, prohibitions and allow-lists, curated context, tool gating, token ' +
        'enforcement, exemplars, registry metadata, instruction files, scaffolding, design-to-code mapping. ' +
        'Descriptions only; pass a snippet_ref to get_snippet for the verbatim source. Paginated. ' +
        'Snapshot of 2026-07-28; cite snippet_source_url.',
      inputSchema: z.object({
        category: z.enum(ENUMS.technique_category).optional(),
        system_id: z.string().optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Default 25.'),
        offset: z.number().int().min(0).optional(),
      }),
      annotations: RO,
    },
    async ({ category, system_id, limit, offset }) => {
      if (system_id && !SYSTEM_BY_ID.has(system_id)) {
        return fail(
          `No system with id "${system_id}". Valid ids: ${SYSTEM_IDS.join(', ')}.`,
        );
      }
      let rows = TECHNIQUES;
      if (category) rows = rows.filter((t) => t.category === category);
      if (system_id) rows = rows.filter((t) => t.system_id === system_id);
      const projected = rows.map((t) => ({
        system_id: t.system_id,
        system_name: t.system_name,
        name: t.name,
        category: t.category,
        description: t.description,
        snippet_language: t.snippet_language,
        snippet_source_url: t.snippet_source_url,
        snippet_ref: t.snippet_ref || undefined,
      }));
      return json(page(projected, limit || 25, offset));
    },
  );

  // -- 6. get_snippet -----------------------------------------------------
  server.registerTool(
    'get_snippet',
    {
      title: 'Get one snippet',
      description:
        'Fetch the verbatim body of one quoted file or code block by its ref, as handed to you by search, ' +
        'list_affordances, list_techniques or get_system. Refs look like "technique:ant-design:3" or ' +
        '"affordance:carbon-design-system:7". Returns the text with the source_url it was quoted from — ' +
        'quote that URL when you use the snippet. Snapshot of 2026-07-28.',
      inputSchema: z.object({
        ref: z.string().describe('A snippet_ref returned by another tool.'),
      }),
      annotations: RO,
    },
    async ({ ref }) => {
      const snippet = SNIPPETS.get(ref);
      if (!snippet) {
        const sample = [...SNIPPETS.keys()].slice(0, 3).join(', ');
        return fail(
          `No snippet with ref "${ref}". Refs are "<kind>:<owner id>:<index>" where kind is technique, ` +
            `affordance or capability, for example ${sample}. Get one from search or list_techniques.`,
        );
      }
      return json(snippet);
    },
  );

  // -- 7. get_stats -------------------------------------------------------
  server.registerTool(
    'get_stats',
    {
      title: 'Get survey counts and filter vocabulary',
      description:
        'Counts, breakdowns, and the exact enum values every other tool accepts as a filter. Call this first ' +
        'if you are unsure what to pass for maturity, affordance type, technique category, system id or ' +
        'report section. Also carries per-system affordance coverage. Small and cheap. Snapshot of ' +
        '2026-07-28, except the "reading" report section — see reading_updated in the response.',
      inputSchema: z.object({}),
      annotations: RO,
    },
    async () => {
      return json({
        report: 'State of AI in Design Systems',
        generated: GENERATED,
        snapshot_date: '2026-07-28',
        // Everything above is fixed at snapshot_date. The reading section is not,
        // so it states its own date here rather than letting an agent anchor the
        // whole report on one field the way this server's instructions teach.
        reading_updated: READING_UPDATED,
        site: SITE,
        author: 'Kaelig Deloumeau-Prigent',
        license: 'CC-BY-4.0',
        counts: COUNTS,
        by_maturity: tally(SYSTEMS, 'ai_maturity'),
        by_category: tally(SYSTEMS, 'category'),
        affordance_types: tally(AFFORDANCES, 'type'),
        affordance_audiences: tally(AFFORDANCES, 'audience'),
        official_affordances: AFFORDANCES.filter((a) => a.official).length,
        technique_categories: tally(TECHNIQUES, 'category'),
        coverage: SYSTEMS.map((s) => ({
          system_id: s.id,
          ai_maturity: s.ai_maturity,
          affordance_types: uniqSorted(s.affordances.map((a) => a.type)),
        })),
        enums: {
          ...ENUMS,
          search_kind: [
            'all',
            'system',
            'affordance',
            'technique',
            'platform',
            'finding',
          ],
          system_include: [
            'affordances',
            'techniques',
            'platform_integrations',
            'gaps',
            'sources',
            'snippets',
          ],
          report_section: SECTION_IDS,
        },
        note: PROVENANCE,
      });
    },
  );

  // -- 8. get_report ------------------------------------------------------
  server.registerTool(
    'get_report',
    {
      title: 'Read a section of the written report',
      description:
        'The prose half of the study: the findings, where the systems converge and diverge, the essay, the ' +
        'per-question pages, and — read this before quoting any number — the methodology and its caveats. ' +
        'Returns markdown byte-identical to the file the site serves, with YAML front matter carrying the ' +
        'canonical url and citation. Call with no arguments for the list of sections. Snapshot of ' +
        `2026-07-28, except the "reading" section, which is kept current and carries its own updated date (${READING_UPDATED}).`,
      inputSchema: z.object({
        section: z
          .string()
          .optional()
          .describe(
            'A section id from get_stats enums.report_section, or "all" for the list. Default "all".',
          ),
      }),
      annotations: RO,
    },
    async ({ section }) => {
      const wanted = section || 'all';
      if (wanted === 'all') return json(reportTableOfContents());
      const entry = SECTIONS.get(wanted);
      if (!entry) {
        return fail(
          `No report section "${wanted}". Valid sections: ${SECTION_IDS.join(', ')}. ` +
            'Call get_report with no arguments for titles and sizes.',
        );
      }
      return text(MD_MAP[entry.path]);
    },
  );

  // -- 9. get_platform ----------------------------------------------------
  server.registerTool(
    'get_platform',
    {
      title: 'Get one platform',
      description:
        `One of the ${COUNTS.platforms} platforms design systems build on: ${PLATFORM_IDS.join(', ')}. ` +
        'Platforms are shaped differently from systems — they have capabilities rather than affordances — so ' +
        'they get their own tool. Includes what the platform ships for agents and how widely design systems ' +
        'have adopted it. Snippet bodies come back as refs for get_snippet. ' +
        'Snapshot of 2026-07-28; cite the url on each capability.',
      inputSchema: z.object({
        id: z.enum(ENUMS.platform),
        format: z
          .enum(['json', 'markdown'])
          .optional()
          .describe('Defaults to json.'),
      }),
      annotations: RO,
    },
    async ({ id, format }) => {
      const platform = PLATFORM_BY_ID.get(id);
      if (!platform)
        return fail(
          `No platform with id "${id}". Valid ids: ${PLATFORM_IDS.join(', ')}.`,
        );
      if (format === 'markdown') {
        const md = MD_MAP[`/platforms/${id}.md`];
        if (!md)
          return fail(
            `No markdown page for "${id}". Retry with format:"json".`,
          );
        return text(md);
      }
      return json(platformRecord(platform));
    },
  );

  // -- resources ----------------------------------------------------------
  server.registerResource(
    'design-system',
    new ResourceTemplate('dsai://system/{id}', {
      list: async () => ({
        resources: SYSTEMS.map((s) => ({
          uri: `dsai://system/${s.id}`,
          name: s.name,
          title: `${s.name} — AI affordances`,
          description: firstSentence(s.summary),
          mimeType: 'text/markdown',
        })),
      }),
      complete: {
        id: async (value) =>
          SYSTEM_IDS.filter((id) =>
            id.startsWith(String(value || '').toLowerCase()),
          ),
      },
    }),
    {
      title: 'Design system record',
      description:
        'One page per design system, the same markdown the site publishes at /systems/{id}.md.',
      mimeType: 'text/markdown',
    },
    async (uri, { id }) => {
      const key = `/systems/${id}.md`;
      if (!MD_MAP[key])
        throw new Error(
          `Unknown system "${id}". Valid ids: ${SYSTEM_IDS.join(', ')}.`,
        );
      return {
        contents: [
          { uri: uri.href, mimeType: 'text/markdown', text: MD_MAP[key] },
        ],
      };
    },
  );

  server.registerResource(
    'report-section',
    new ResourceTemplate('dsai://report/{section}', {
      list: async () => ({
        resources: [...SECTIONS.values()]
          .filter((s) => !s.id.startsWith('questions/'))
          .map((s) => ({
            uri: `dsai://report/${s.id}`,
            name: s.id,
            title: s.title,
            description: `${s.title}. Mirrors ${SITE}${s.path}.`,
            mimeType: 'text/markdown',
          })),
      }),
      complete: {
        section: async (value) =>
          SECTION_IDS.filter((id) =>
            id.startsWith(String(value || '').toLowerCase()),
          ),
      },
    }),
    {
      title: 'Report section',
      description:
        'A written section of the report, byte-identical to the markdown the site serves.',
      mimeType: 'text/markdown',
    },
    async (uri, { section }) => {
      const entry = SECTIONS.get(decodeURIComponent(String(section)));
      if (!entry)
        throw new Error(
          `Unknown section "${section}". Valid sections: ${SECTION_IDS.join(', ')}.`,
        );
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: MD_MAP[entry.path],
          },
        ],
      };
    },
  );

  // -- prompts ------------------------------------------------------------
  // Five, and the set is asserted against the list /ai publishes, so a prompt
  // added here without being published there fails the build.
  server.registerPrompt(
    'start-here',
    {
      title: 'Start here',
      description:
        'Orientation for an agent that has just connected: what this server holds, which tool answers ' +
        'which kind of question, the filter vocabulary, and what the other prompts are for.',
      argsSchema: z.object({}),
    },
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              PROMPT_PREAMBLE,
              '',
              'What to call, and when:',
              '- get_stats: counts, breakdowns, and every value the filters accept. The cheapest first call when you are not sure what to pass.',
              '- search: when the question is a phrase. Full text across summaries, affordances, techniques, snippet bodies and findings.',
              '- list_systems, list_affordances, list_techniques: when the question is a filter rather than a phrase. Paginated, descriptions only.',
              '- get_system, get_platform: one whole record, once you know which one you want.',
              '- get_snippet: the verbatim body of a quoted file, by the snippet_ref another tool handed you. Bodies are opt-in so the list calls stay small.',
              '- get_report: one written section of the report, byte for byte the page the site publishes.',
              '',
              'One thing the snapshot date above does not cover: the reading list is kept current rather than fixed at the collection window, so quote that page’s own date when you cite it. Everything else here is dated research about a corner of the discipline that ships weekly, and something you can go and look at today beats something recorded in July.',
              '',
              'The other prompts on this server:',
              '- audit-my-design-system: where one system stands against the survey, and what it is missing.',
              '- adopt-an-affordance: ship one affordance, with the working examples to copy from.',
              '- build-my-roadmap: turn audit findings into sequenced work.',
              '- find-technique-for: a model gets your components wrong in one specific way, and you want to know what other systems do about it.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'audit-my-design-system',
    {
      title: 'Audit a design system against the survey',
      description:
        'Compare a design system against the survey and name what it is missing for AI consumers.',
      argsSchema: z.object({
        target: z
          .string()
          .describe(
            'The design system to audit: a repo url, a docs url, or a name.',
          ),
        compare_to: z
          .string()
          .optional()
          .describe(
            'Optional id from this survey to benchmark against, e.g. shadcn-ui.',
          ),
      }),
    },
    ({ target, compare_to }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Audit ${target} against the State of AI in Design Systems survey.`,
              '',
              PROMPT_PREAMBLE,
              '',
              'Work in this order.',
              '',
              `1. Read ${target}: its repo, its docs, and any llms.txt, AGENTS.md, .github/copilot-instructions.md, CLAUDE.md, skill or MCP server it ships.`,
              compare_to
                ? `2. Call get_system with id "${compare_to}" and use it as the benchmark.`
                : '2. Pick two or three systems to benchmark against, comparable in category, consumer model and team size. Not the most advanced systems in the survey: a five-person library serving one internal app learns very little from a platform team with a public registry. Call list_systems to shortlist, then get_system on each.',
              '3. For every affordance type above, say whether the target ships it and link the file you checked. Some of these exist to serve external consumers, and a system that has none is not behind for lacking them: a registry, a public MCP server and a scaffolding CLI all assume somebody outside your team builds with your components. Where that is the case, record N/A with the reason instead of a gap. A private single-consumer system scored against affordances aimed at strangers gets a coverage table that measures the wrong thing.',
              '4. Call list_techniques for the categories the target has nothing in, then get_snippet on the two or three most transferable so you have the verbatim text.',
              `5. Build one real screen from ${target}'s own docs and whatever context it ships, using only what a model would find, and write down every place you had to guess. This is the step that measures what the documentation does rather than what it contains.`,
              '',
              `Step 5 only means anything from a context that has not read ${target}. By now you have, so running it yourself tests your memory rather than the docs, and the result is provisional. Record it that way when that is what happened.`,
              '',
              'If your client can run subagents: steps 1, 3 and 4 fan out cleanly, one agent per affordance type or technique category, and the findings merge. Step 5 does not. It has to go to an agent told nothing but the name of the system and the screen to build, which is also the only way to run it honestly.',
              '',
              'Report a coverage table with absent and N/A kept apart, the three gaps that would cost the most,',
              'and for each gap a concrete example from the survey with its source_url. Say plainly when you',
              'could not find something rather than recording it as absent.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'adopt-an-affordance',
    {
      title: 'Adopt one AI affordance',
      description:
        'Gather the working examples of one affordance type from the systems in the survey that already ' +
        'ship it, and turn them into something you can build.',
      argsSchema: z.object({
        // The enum rather than a string, so a client surfaces the valid values
        // and a wrong one is rejected here instead of returning an empty list.
        affordance: z
          .enum(ENUMS.affordance_type)
          .describe(
            'The affordance type to adopt, e.g. llms-txt or mcp-server.',
          ),
        context: z
          .string()
          .optional()
          .describe(
            'Optional: who you are building for. Team size, who consumes the system, public or internal.',
          ),
      }),
    },
    ({ affordance, context }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              // "the X affordance", not "a X affordance": the article is wrong for
              // half the enum, and the value is interpolated so nothing can pick.
              `Work out how to ship the ${affordance} affordance, starting from the design systems in the State of AI in Design Systems survey that already have one.`,
              '',
              PROMPT_PREAMBLE,
              ...(context ? ['', `Your situation: ${context}`] : []),
              '',
              `1. Call list_affordances with type "${affordance}" to see everyone who ships one.`,
              context
                ? '2. Call get_system on the two or three whose situation is closest to yours, not the two or three with the most impressive version.'
                : '2. Call get_system on the two or three whose situation is closest to the one you are building for, not the two or three with the most impressive version.',
              '3. Call get_snippet on their snippet_refs, so you are working from the file itself rather than from a description of it.',
              '',
              'Then give me what those systems actually ship, quoted, each with its source_url; one line per',
              'example on what would have to change for it to work here; and the smallest version worth',
              'shipping first. If nothing in the survey fits, say so rather than stretching a platform team’s',
              'answer onto a situation it was never built for.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'build-my-roadmap',
    {
      title: 'Build a roadmap from audit findings',
      description:
        'Turn a set of audit findings into sequenced work, with the survey’s evidence attached to each ' +
        'item and the dependency order made explicit.',
      argsSchema: z.object({
        findings: z
          .string()
          .describe('What the audit surfaced. One gap per line is fine.'),
        constraints: z
          .string()
          .optional()
          .describe('Optional: people, time, horizon.'),
      }),
    },
    ({ findings, constraints }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Turn these findings into sequenced work, with the survey’s evidence attached.',
              '',
              'Findings:',
              findings,
              ...(constraints ? ['', `Work within: ${constraints}`] : []),
              '',
              PROMPT_PREAMBLE,
              '',
              '1. For each finding, look for a system that has already solved it. Call search, then get_system or get_snippet, and attach the source_url. Where the survey has nothing to say about a finding, mark it that way rather than inventing an authority for it.',
              '2. Sequence into now, next and later, with the dependency order stated rather than implied, and name the critical path. Some of that order is not a preference: a query surface built on docs a machine cannot parse ships confusion faster than it ships answers, so the parsing comes first.',
              '3. For each item, say what an agent can do and what needs a person, and give a done-when somebody else could check. “Improve the docs” is not one. “/llms.txt returns 200 and lists every route” is.',
              '',
              'Report the sequence, not an essay. One line of reasoning per item is enough.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'find-technique-for',
    {
      title: 'Find a technique for a failure mode',
      description:
        'Given a way models get your components wrong, find the techniques other design systems use against it.',
      argsSchema: z.object({
        failure: z
          .string()
          .describe(
            'The failure, e.g. "the model invents a Box component" or "it hardcodes hex colors".',
          ),
        system_id: z
          .string()
          .optional()
          .describe('Optional: only look at one system from the survey.'),
      }),
    },
    ({ failure, system_id }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Failure mode: ${failure}`,
              '',
              'Find how the design systems in the State of AI in Design Systems survey handle this.',
              `1. Call search with the failure described in the vocabulary the data uses${system_id ? `, restricted to system_id "${system_id}"` : ''}.`,
              '2. Call list_techniques on the categories that came back to see the full set in each.',
              '3. Call get_snippet on the three or four most directly applicable, so you have the verbatim text.',
              '',
              'Then give me: the technique categories that address this failure, the strongest concrete',
              'example of each with its source_url, and a draft of the instruction-file text I could adapt.',
              'Where systems disagree about the approach, say so instead of picking one silently.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  return server;
}

// ---------------------------------------------------------------------------
// HTTP plumbing (dual era)
// ---------------------------------------------------------------------------

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers':
    'content-type, accept, authorization, mcp-protocol-version, mcp-method, mcp-name, mcp-session-id, last-event-id',
  'access-control-expose-headers':
    'content-type, mcp-protocol-version, mcp-session-id',
  'access-control-max-age': '86400',
};

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function rpcError(status, message, extra) {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message },
      id: null,
    }),
    {
      status,
      headers: {
        'content-type': 'application/json',
        ...(extra || {}),
        ...CORS,
      },
    },
  );
}

// Modern (2026-07-28) leg. Built once at module scope; never closed — closing it
// would poison every later invocation on a warm container.
const modern = createMcpHandler(buildServer, {
  legacy: 'reject',
  responseMode: 'json',
  onerror: (error) => console.error('[mcp]', error),
});

// Legacy (2025-*) leg, hand-wired so replies are application/json rather than
// SSE frames. responseMode does not reach the built-in legacy fallback.
async function serveLegacy(request) {
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
}

export default async function handler(request) {
  // Preflight first: createMcpHandler answers OPTIONS with 405.
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { ...CORS, allow: 'POST, OPTIONS' },
    });
  }
  if (request.method !== 'POST') {
    return rpcError(
      405,
      'Method not allowed. This MCP endpoint accepts POST.',
      { allow: 'POST, OPTIONS' },
    );
  }
  try {
    const response = (await isLegacyRequest(request))
      ? await serveLegacy(request)
      : await modern.fetch(request);
    return withCors(response);
  } catch (error) {
    console.error('[mcp] unhandled', error);
    return rpcError(500, 'Internal error handling the MCP request.');
  }
}

export const config = { path: '/mcp' };
