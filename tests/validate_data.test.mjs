// The validator is step 0 of the build, so its job is to stop a bad record
// before anything is generated from it. These tests run it as a subprocess
// against copies of the real data, because the exit code is the contract.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  cpSync,
  writeFileSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Run the validator against a repo copy whose data has been mutated.
 * @param {((dir: string) => void) | null} mutate
 * @returns {{ code: number, out: string }}
 */
function runAgainst(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'validate-data-'));
  try {
    for (const d of ['data', 'schema', 'scripts']) {
      cpSync(join(ROOT, d), join(dir, d), { recursive: true });
    }
    // Symlinked, not copied: 81 packages per case turned an 8-case suite into
    // nine seconds. The validator only reads from node_modules.
    symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
    writeFileSync(
      join(dir, 'package.json'),
      readFileSync(join(ROOT, 'package.json')),
    );
    if (mutate) mutate(dir);
    try {
      const stdout = execFileSync(
        process.execPath,
        [join(dir, 'scripts', 'validate_data.mjs')],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      return { code: 0, out: stdout };
    } catch (e) {
      const err = /** @type {any} */ (e);
      return {
        code: err.status ?? 1,
        out: `${err.stdout ?? ''}${err.stderr ?? ''}`,
      };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const edit = (dir, rel, fn) => {
  const p = join(dir, rel);
  const json = JSON.parse(readFileSync(p, 'utf8'));
  fn(json);
  writeFileSync(p, JSON.stringify(json, null, 2));
};

/** Record counts come from the data, so adding a system doesn't fail this. */
const recordCount = (rel) =>
  JSON.parse(readFileSync(join(ROOT, 'data', rel), 'utf8')).length;

describe('validate_data accepts the real dataset', () => {
  test('exits 0 and reports every file', () => {
    const { code, out } = runAgainst(null);
    assert.equal(code, 0, out);
    const systems = recordCount('design-systems.json');
    const platforms = recordCount('platforms.json');
    assert.match(out, new RegExp(`design-systems\\.json: ${systems} records`));
    assert.match(out, new RegExp(`platforms\\.json: ${platforms} records`));
    assert.match(out, /insights\.json: 1 record/);
  });
});

describe('validate_data rejects bad records', () => {
  test('an ai_maturity outside the enum fails, naming the record and the allowed values', () => {
    const { code, out } = runAgainst((dir) =>
      edit(dir, 'data/design-systems.json', (d) => {
        d[0].ai_maturity = 'extremely-ai-native';
      }),
    );
    assert.equal(code, 1);
    assert.match(out, /ai_maturity/);
    assert.match(out, /allowed: none, emerging, invested, ai-native/);
  });

  test('a platform capability missing its source url fails', () => {
    const { code, out } = runAgainst((dir) =>
      edit(dir, 'data/platforms.json', (d) => {
        delete d[0].capabilities[0].url;
      }),
    );
    assert.equal(code, 1);
    assert.match(out, /platforms\.json/);
    assert.match(out, /url/);
  });

  test('a capability url that is not http(s) fails', () => {
    const { code } = runAgainst((dir) =>
      edit(dir, 'data/platforms.json', (d) => {
        d[0].capabilities[0].url = 'see the docs';
      }),
    );
    assert.equal(code, 1);
  });

  test('an unknown top-level property on a platform fails', () => {
    const { code, out } = runAgainst((dir) =>
      edit(dir, 'data/platforms.json', (d) => {
        d[0].pricing = 'free';
      }),
    );
    assert.equal(code, 1);
    assert.match(out, /unknown property: pricing/);
  });

  test('insights losing a required section fails', () => {
    const { code, out } = runAgainst((dir) =>
      edit(dir, 'data/insights.json', (d) => {
        delete d.caveats;
      }),
    );
    assert.equal(code, 1);
    assert.match(out, /insights\.json/);
    assert.match(out, /caveats/);
  });

  test('malformed JSON fails with a readable message, not a stack trace', () => {
    const { code, out } = runAgainst((dir) => {
      writeFileSync(join(dir, 'data/platforms.json'), '[{"id": "figma",,}]');
    });
    assert.equal(code, 1);
    assert.match(out, /not readable JSON/);
    assert.doesNotMatch(out, /at Object\.<anonymous>/);
  });

  test('the record id appears in the message, so the failure is findable', () => {
    const { code, out } = runAgainst((dir) =>
      edit(dir, 'data/platforms.json', (d) => {
        d[2].capabilities[0].audience = 'nobody';
      }),
    );
    assert.equal(code, 1);
    assert.match(out, /supernova/);
  });
});

describe('the 2020-12 dialect is actually in use', () => {
  test('the schemas declare draft 2020-12, which the default Ajv export cannot compile', async () => {
    for (const s of [
      'schema/design-system.schema.json',
      'schema/platform.schema.json',
      'schema/insights.schema.json',
    ]) {
      const schema = JSON.parse(readFileSync(join(ROOT, s), 'utf8'));
      assert.equal(
        schema.$schema,
        'https://json-schema.org/draft/2020-12/schema',
        s,
      );
    }
    // Guards the mistake this whole unit is shaped around: if someone swaps the
    // import for the default export, these schemas stop compiling entirely.
    const { default: mod } = await import('ajv');
    const Ajv07 = /** @type {any} */ (mod);
    const schema = JSON.parse(
      readFileSync(join(ROOT, 'schema/platform.schema.json'), 'utf8'),
    );
    assert.throws(
      () => new Ajv07({ strict: false }).compile(schema),
      /2020-12/,
    );
  });
});
