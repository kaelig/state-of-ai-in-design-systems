#!/usr/bin/env node
// Step 0 of scripts/build.sh: every record must satisfy its schema before any
// of it reaches the site, the markdown mirrors, the SQLite export or /mcp.
//
// This runs on the deploy path, not only in CI, because Netlify builds from
// source on every deploy and that build is the only one that has to succeed.
//
// Ajv's default export implements draft-07 and cannot even compile these
// schemas, which declare draft 2020-12 — it throws "no schema with key or ref
// .../draft/2020-12/schema". The 2020-12 class is a separate entry point and
// the two dialects cannot share an instance. Do not "simplify" this import.
import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// data/critic-review.json is deliberately absent: it is gitignored working
// material, not part of the published dataset.
const PAIRS = [
  {
    data: 'data/design-systems.json',
    schema: 'schema/design-system.schema.json',
    each: true,
  },
  {
    data: 'data/platforms.json',
    schema: 'schema/platform.schema.json',
    each: true,
  },
  {
    data: 'data/insights.json',
    schema: 'schema/insights.schema.json',
    each: false,
  },
  {
    data: 'data/reading.json',
    schema: 'schema/reading.schema.json',
    each: true,
  },
];

const read = (rel) => {
  try {
    return JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
  } catch (e) {
    throw new Error(
      `${rel} is not readable JSON: ${e instanceof Error ? e.message : String(e)}`,
      {
        cause: e,
      },
    );
  }
};

// The schemas enforce URLs with `pattern: "^https?://"` rather than
// `format: "uri"`, which Ajv ignores unless you also install ajv-formats — it
// would have looked like a constraint and been decoration.
//
// The cast is for tsc only: ajv ships this entry point as CommonJS, so the
// default import is not seen as constructable even though it is at runtime.
const Ajv = /** @type {any} */ (Ajv2020);
const ajv = new Ajv({ allErrors: true, strict: false });

// A record's own id, when it has one, beats an array index in a build log.
const label = (record, i) =>
  record && typeof record === 'object' && typeof record.id === 'string'
    ? `${record.id} (#${i})`
    : `#${i}`;

const failures = [];

for (const { data, schema, each } of PAIRS) {
  let validate;
  try {
    validate = ajv.compile(read(schema));
  } catch (e) {
    failures.push(
      `${schema}: will not compile — ${e instanceof Error ? e.message : String(e)}`,
    );
    continue;
  }

  let instance;
  try {
    instance = read(data);
  } catch (e) {
    failures.push(e instanceof Error ? e.message : String(e));
    continue;
  }

  const records = each ? instance : [instance];
  if (each && !Array.isArray(instance)) {
    failures.push(
      `${data}: expected an array of records, found ${typeof instance}`,
    );
    continue;
  }

  let bad = 0;
  records.forEach((record, i) => {
    if (validate(record)) return;
    bad++;
    for (const err of validate.errors ?? []) {
      const where = err.instancePath || '<root>';
      const extra = err.params?.allowedValues
        ? ` (allowed: ${err.params.allowedValues.join(', ')})`
        : err.params?.additionalProperty
          ? ` (unknown property: ${err.params.additionalProperty})`
          : '';
      failures.push(
        `${data}: ${each ? label(record, i) + ' ' : ''}${where} ${err.message}${extra}`,
      );
    }
  });

  console.log(
    `[0] ${data}: ${records.length} record${records.length === 1 ? '' : 's'} against ${schema} — ${
      bad === 0 ? 'ok' : `${bad} INVALID`
    }`,
  );
}

if (failures.length) {
  console.error(
    `\nFAIL: ${failures.length} schema violation${failures.length === 1 ? '' : 's'}`,
  );
  // Cap the dump. A structural mistake produces hundreds of near-identical
  // lines, and the first twenty are enough to find it.
  for (const f of failures.slice(0, 20)) console.error(`  ${f}`);
  if (failures.length > 20)
    console.error(`  ... and ${failures.length - 20} more`);
  console.error(
    '\nThe published surfaces are built from these files. Fix the data, not the schema,',
  );
  console.error('unless the schema is what is actually wrong.');
  process.exit(1);
}

console.log('[0] data validates against the schemas');
