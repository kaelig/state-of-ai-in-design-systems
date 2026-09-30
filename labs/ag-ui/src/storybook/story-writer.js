// Writes an approved UI tree to disk as a CSF story file. This is the Node half
// of the `save_story` frontend tool: the preview sends the tree over
// Storybook's channel, the preset (preset.js) calls writeGeneratedStory, and
// Storybook's own file watcher indexes the new file like any hand-written one.
//
// Everything that arrives here came over a WebSocket, so it is treated as
// untrusted: the export name becomes a file name only after it passes a strict
// identifier check, the resolved path must stay inside the generated folder,
// and the tree is validated against the catalog again rather than trusting the
// preview's validation.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
// toId and storyNameFromExport are the functions Storybook's indexer uses to
// turn a title and an export into a story id; verified as exports of
// node_modules/storybook/dist/csf/index.js at storybook@10.6.1.
import { storyNameFromExport, toId } from 'storybook/internal/csf';
import { harbor } from '../catalog/index.js';
import { toExportName, treeToCsf } from '../tree/to-code.js';
import { validateTree } from '../tree/tree.js';

/** A PascalCase JavaScript identifier, which is also a safe file name. */
const EXPORT_NAME = /^[A-Z][A-Za-z0-9]{0,63}$/;
const MAX_TITLE = 120;
/** How many numbered alternatives to try before giving up on a name. */
const MAX_SUFFIX = 50;

export class SaveStoryError extends Error {}

/**
 * @param {{ title?: unknown, tree?: unknown, prompt?: unknown, exportName?: unknown }} payload
 * @param {{
 *   dir: string,
 *   root?: string,
 *   importFrom?: string,
 *   catalog?: import('../catalog/index.js').Catalog,
 * }} options `dir` is the folder generated stories go to; `root` is what the
 *   returned path is relative to; `importFrom` is the component import path as
 *   seen from `dir`.
 * @returns {Promise<import('./events.js').SavedStory>}
 */
export async function writeGeneratedStory(payload, { dir, root = process.cwd(), importFrom, catalog = harbor }) {
  const tree = /** @type {import('../tree/tree.js').UITree} */ (payload?.tree);
  const report = validateTree(tree, catalog);
  if (!report.valid) {
    const first = report.errors.slice(0, 3).map((e) => e.message).join(' ');
    throw new SaveStoryError(`The tree breaks the ${catalog.name} contract, so it was not saved: ${first}`);
  }

  const title = storyTitle(payload.title, tree.title);
  const base = exportNameFor(payload.exportName, tree.title, title);
  const folder = path.resolve(dir);
  await mkdir(folder, { recursive: true });
  const relImport = importFrom ?? '../../src/react/index.js';
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.slice(0, 500) : '';

  // Never overwrite: a generated file says "edit freely", so someone may have.
  // The `wx` flag makes the existence check and the write one atomic step.
  for (let n = 1; n <= MAX_SUFFIX; n++) {
    const exportName = n === 1 ? base : `${base}${n}`;
    const storyTitleN = n === 1 ? title : `${title} ${n}`;
    const file = path.resolve(folder, `${exportName}.stories.jsx`);
    if (path.dirname(file) !== folder) throw new SaveStoryError(`Refusing to write outside ${folder}.`);
    const source = treeToCsf(tree, catalog, { title: storyTitleN, exportName, importFrom: relImport, prompt });
    try {
      await writeFile(file, source, { flag: 'wx' });
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EEXIST') continue;
      throw error;
    }
    return {
      path: toPosix(path.relative(root, file)),
      exportName,
      title: storyTitleN,
      storyId: toId(storyTitleN, storyNameFromExport(exportName)),
      warnings: report.warnings.length,
    };
  }
  throw new SaveStoryError(`${base}.stories.jsx and ${MAX_SUFFIX - 1} numbered alternatives already exist.`);
}

/**
 * The export name, which is also the file name. A name the caller supplies must
 * already be a clean identifier: "../../evil" is rejected outright rather than
 * quietly cleaned, because a caller sending that is not a caller to help.
 * @param {unknown} requested
 * @param {string | undefined} treeTitle
 * @param {string} title
 */
export function exportNameFor(requested, treeTitle, title) {
  if (requested !== undefined && requested !== null && requested !== '') {
    if (typeof requested !== 'string' || !EXPORT_NAME.test(requested)) {
      throw new SaveStoryError(`"${String(requested).slice(0, 80)}" is not a valid export name. Use a PascalCase identifier such as SignUpForm.`);
    }
    return requested;
  }
  const derived = toExportName(treeTitle || title.split('/').pop() || 'Generated').slice(0, 64);
  if (!EXPORT_NAME.test(derived)) throw new SaveStoryError(`Could not derive an export name from "${treeTitle}".`);
  return derived;
}

/**
 * Generated stories always live under "Generated/" in the sidebar, so a saved
 * screen is easy to find and cannot be filed in among the hand-written ones.
 * @param {unknown} requested
 * @param {string | undefined} treeTitle
 */
export function storyTitle(requested, treeTitle) {
  const raw = typeof requested === 'string' && requested.trim() ? requested : treeTitle || 'Screen';
  // Strip control characters and drop empty and dot segments. The title is not
  // a path on disk, but "Generated/../x" in a sidebar is still a lie about
  // where the story sits. JSON.stringify in treeToCsf quotes whatever is left.
  const clean = raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s && s !== '.' && s !== '..')
    .join('/')
    .slice(0, MAX_TITLE);
  const withoutPrefix = clean.replace(/^Generated\/?/i, '');
  return `Generated/${withoutPrefix || 'Screen'}`;
}

const toPosix = (/** @type {string} */ p) => p.split(path.sep).join('/');
