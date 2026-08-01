// The logo gate is step 1 of the build, and it is the only thing standing
// between a malformed mark and every heading on the site. These tests run it as
// a subprocess against copies of the real assets, because the exit code is the
// contract — the same shape tests/validate_data.test.mjs uses for step 0.
//
// The gate is worth testing at this length because of how it fails. A logo that
// does not resolve stops the build loudly; a logo that resolves *wrongly* ships
// a solid square where a mark should be, with a green build behind it. Most of
// the cases below are the second kind.
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

// build_dashboard.py derives its own ROOT from __file__, so the copied scripts/
// directory makes the copy's assets/ and node_modules/ the ones it reads.
const DRIVER = `
import json, sys
sys.path.insert(0, sys.argv[1] + "/scripts")
import build_dashboard as b
logos = b.resolve_logos(json.load(open(sys.argv[1] + "/data/platforms.json")))
print(" ".join(sorted(logos)))
`;

/**
 * Run resolve_logos() against a repo copy whose data or assets were mutated.
 * @param {((dir: string) => void) | null} mutate
 * @param {{ withPackage?: boolean }} [opts]
 * @returns {{ code: number, out: string }}
 */
function runGate(mutate, opts = {}) {
  const { withPackage = true } = opts;
  const dir = mkdtempSync(join(tmpdir(), 'resolve-logos-'));
  try {
    for (const d of ['data', 'schema', 'scripts', 'assets']) {
      cpSync(join(ROOT, d), join(dir, d), { recursive: true });
    }
    // Symlinked rather than copied, for the reason the sibling suite gives:
    // the gate only reads node_modules/simple-icons/icons/. Omitting it is how
    // the "you have not run npm install" case is set up.
    if (withPackage) {
      symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
    }
    if (mutate) mutate(dir);
    try {
      const stdout = execFileSync('python3', ['-c', DRIVER, dir], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
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

/**
 * @param {string} dir
 * @param {string} id
 * @param {(record: any) => void} fn
 */
const editLogo = (dir, id, fn) => {
  const p = join(dir, 'data/platforms.json');
  const records = JSON.parse(readFileSync(p, 'utf8'));
  fn(records.find((/** @type {any} */ r) => r.id === id));
  writeFileSync(p, JSON.stringify(records, null, 2));
};

/**
 * Replace a vendored mark's body, keeping the file where the record expects it.
 * @param {string} dir
 * @param {string} body
 */
const writeMark = (dir, body) =>
  writeFileSync(join(dir, 'assets/logos/zeroheight.svg'), body);

/** @returns {string[]} */
const platformIds = () =>
  JSON.parse(readFileSync(join(ROOT, 'data/platforms.json'), 'utf8'))
    .map((/** @type {any} */ p) => p.id)
    .sort();

describe('resolve_logos accepts the real records', () => {
  test('every platform resolves to geometry', () => {
    const { code, out } = runGate(null);
    assert.equal(code, 0, out);
    // Derived from the data, so adding a platform does not fail this.
    assert.equal(out.trim(), platformIds().join(' '));
  });
});

describe('resolve_logos stops a logo that cannot be found', () => {
  test('a simple-icons slug that does not exist fails, naming the slug', () => {
    const { code, out } = runGate((dir) =>
      editLogo(dir, 'figma', (r) => {
        r.logo.value = 'figmaa';
      }),
    );
    assert.equal(code, 1);
    assert.match(out, /figma/);
    assert.match(out, /figmaa/);
  });

  test('a vendored file that is not there fails, naming where it looked', () => {
    const { code, out } = runGate((dir) =>
      editLogo(dir, 'supernova', (r) => {
        r.logo.value = 'supernovaa.svg';
      }),
    );
    assert.equal(code, 1);
    assert.match(out, /supernova/);
    assert.match(out, /assets\/logos\/supernovaa\.svg/);
  });

  test('two broken records produce one report naming both', () => {
    const { code, out } = runGate((dir) => {
      editLogo(dir, 'figma', (r) => {
        r.logo.value = 'figmaa';
      });
      editLogo(dir, 'knapsack', (r) => {
        r.logo.value = 'knapsackk.svg';
      });
    });
    assert.equal(code, 1);
    assert.match(out, /figma/);
    assert.match(out, /knapsack/);
  });

  test('the missing package is named once, not as three missing files', () => {
    const { code, out } = runGate(null, { withPackage: false });
    assert.equal(code, 1);
    assert.match(out, /npm install/);
    // The point of the branch: one setup problem, reported as one problem.
    assert.equal(out.match(/simple-icons slug/g), null);
  });

  test('a value pointing outside its directory fails rather than reading it', () => {
    for (const value of ['../../data/platforms.json', '/etc/passwd']) {
      const { code, out } = runGate((dir) =>
        editLogo(dir, 'zeroheight', (r) => {
          r.logo.value = value;
        }),
      );
      assert.equal(code, 1, value);
      assert.match(out, /resolves outside/);
      // The schema cannot express "a file under this directory", so this is the
      // only place it is checked — and it has to report, not raise.
      assert.doesNotMatch(out, /Traceback/);
    }
  });
});

// Everything below would resolve to *some* geometry. The gate's harder job is
// refusing files whose geometry the resolver cannot carry faithfully: it keeps
// each <path>'s `d` and drops the rest, so an attribute it fails to reject is an
// attribute it silently deletes.
describe('resolve_logos stops a mark it would render wrongly', () => {
  /** @type {Record<string, [body: string, reason: RegExp]>} */
  const rejected = {
    'a viewBox that is not the 24-unit box': [
      '<svg viewBox="0 0 32 32"><path d="M4 4h6v6H4z"/></svg>',
      /viewBox is "0 0 32 32"/,
    ],
    'a hardcoded color': [
      '<svg viewBox="0 0 24 24"><path fill="#E43A5C" d="M4 4h6v6H4z"/></svg>',
      /fill=/,
    ],
    'a transform, which would draw the mark elsewhere': [
      '<svg viewBox="0 0 24 24"><path transform="scale(6)" d="M1 1h2v2H1z"/></svg>',
      /transform=/,
    ],
    'a fill-rule, without which the holes fill in': [
      '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M0 0h24v24H0zM6 6h12v12H6z"/></svg>',
      /fill-rule=/,
    ],
    'a stroked outline, which this renderer would fill': [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11H3z"/></svg>',
      /fill=|stroke=/,
    ],
    'geometry the build would drop on the floor': [
      '<svg viewBox="0 0 24 24"><path d="M0 0h4v4H0z"/><circle cx="20" cy="4" r="3"/></svg>',
      /<circle>/,
    ],
    'a clip path, which would ship as ink': [
      '<svg viewBox="0 0 24 24"><defs><clipPath id="a"><path d="M0 0h24v24H0z"/></clipPath></defs><path d="M6 6h12v12H6z"/></svg>',
      /<defs>/,
    ],
    'no path at all': ['<svg viewBox="0 0 24 24"></svg>', /no <path> to draw/],
    'a path whose d is empty': [
      '<svg viewBox="0 0 24 24"><path d=""/></svg>',
      /no <path> to draw/,
    ],
  };

  for (const [name, [body, expected]] of Object.entries(rejected)) {
    test(`${name} fails, naming the platform and the reason`, () => {
      const { code, out } = runGate((dir) => writeMark(dir, body));
      assert.equal(code, 1, out);
      assert.match(out, /zeroheight/);
      assert.match(out, expected);
    });
  }

  test('the marks the package ships all satisfy that same contract', () => {
    // The contract is checked on both sources, so this is what would tell us a
    // simple-icons release had changed its output shape.
    const { code, out } = runGate(null);
    assert.equal(code, 0, out);
  });
});
