// The preview half of `save_story`: the frontend tool the generator offers the
// agent. During `storybook dev` it asks the preset (preset.js) to write the
// file over Storybook's channel and waits for the reply. In a static build
// there is no server to ask, so it says so and hands back the CSF source for
// the person to download or copy instead of pretending it saved something.
//
// Storybook API used (verified at storybook@10.6.1):
//   - `addons.getChannel()` from `storybook/preview-api`
//     (node_modules/storybook/dist/preview-api/index.d.ts exports `addons`).
//   - Channel `on` / `off` / `emit` (dist/chunk-OG_iMtt8.d.ts, `class Channel`).
//   - `globalThis.CONFIG_TYPE`, which @storybook/builder-vite writes into
//     iframe.html as 'DEVELOPMENT' or 'PRODUCTION'
//     (node_modules/@storybook/builder-vite/input/iframe.html); the browser
//     channel only opens its WebSocket to the server when it is DEVELOPMENT
//     (createBrowserChannel in storybook/internal/channels).

import { addons } from 'storybook/preview-api';
import { harbor, treeSchema } from '../catalog/index.js';
import { toExportName, treeToCsf } from '../tree/to-code.js';
import { EVENTS } from './events.js';

/** How long to wait for the preset to answer before assuming it is not there. */
const TIMEOUT_MS = 8000;

/** True inside `storybook dev`, where a server channel exists. */
export const hasServerChannel = () => globalThis.CONFIG_TYPE === 'DEVELOPMENT';

/**
 * The AG-UI Tool definition the generator passes in RunAgentInput.tools. The
 * agent calls it after the review interrupt is approved.
 * @param {import('../catalog/index.js').Catalog} [catalog]
 * @returns {import('@ag-ui/core').Tool}
 */
export function saveStoryTool(catalog = harbor) {
  return {
    name: 'save_story',
    description:
      'Save the approved screen as a CSF story file in this Storybook, under stories/generated/. ' +
      'Pass a sidebar title (it is filed under "Generated/") and the complete tree. Answers with the file path and story id, ' +
      'or, in a static Storybook, with a note that the source was offered for download instead.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Sidebar title, e.g. "Generated/Sign up".' },
        tree: treeSchema(catalog),
      },
      required: ['title', 'tree'],
      additionalProperties: false,
    },
  };
}

export class SaveStoryRejected extends Error {}

/**
 * Send one save request and resolve with the preset's answer.
 * @param {{ title?: string, tree: import('../tree/tree.js').UITree, prompt?: string, exportName?: string }} payload
 * @param {{ channel?: { on: Function, off: Function, emit: Function }, timeoutMs?: number }} [options]
 * @returns {Promise<import('./events.js').SavedStory>}
 */
export function requestSaveStory(payload, { channel = addons.getChannel(), timeoutMs = TIMEOUT_MS } = {}) {
  const id = `save_${crypto.randomUUID()}`;
  return new Promise((resolve, reject) => {
    const done = () => {
      clearTimeout(timer);
      channel.off(EVENTS.SAVE_STORY_RESPONSE, onResponse);
    };
    const timer = setTimeout(() => {
      done();
      reject(new Error(`No answer from the Storybook server within ${timeoutMs / 1000}s. Is src/storybook/preset.js listed in .storybook/main.js?`));
    }, timeoutMs);
    // The server broadcasts every response to every connected page, so each
    // request carries its own id and ignores answers meant for someone else.
    function onResponse(/** @type {import('./events.js').SaveStoryResponse} */ response) {
      if (response?.id !== id) return;
      done();
      if (response.success) resolve(response.payload);
      else reject(new SaveStoryRejected(response.error));
    }
    channel.on(EVENTS.SAVE_STORY_RESPONSE, onResponse);
    // The tree is a flat map of nodes, so its nesting depth is fixed no matter
    // how big the screen is; it stays well inside the depth limit telejson
    // applies when the channel serializes it (maxDepth 15 on the WebSocket).
    channel.emit(EVENTS.SAVE_STORY_REQUEST, { id, payload });
  });
}

/**
 * The CSF file a static build offers instead of writing it. Same generator,
 * same import path as the preset would use for stories/generated/.
 * @param {{ title?: string, tree: import('../tree/tree.js').UITree }} args
 * @param {string} [prompt]
 */
export function csfForDownload(args, prompt = '') {
  const exportName = toExportName(args.tree?.title || String(args.title ?? '').split('/').pop() || 'Generated');
  const title = args.title && /^Generated\//.test(args.title) ? args.title : `Generated/${args.tree?.title || exportName}`;
  return {
    fileName: `${exportName}.stories.jsx`,
    source: treeToCsf(args.tree, harbor, { title, exportName, importFrom: '../../src/react/index.js', prompt }),
  };
}

/**
 * The `save_story` handler for createSession. Its return value is the tool
 * result the agent reads, so `message` is written for the agent to repeat.
 * @param {{ prompt?: () => string, channel?: { on: Function, off: Function, emit: Function }, isDev?: () => boolean }} [options]
 *   `channel` and `isDev` default to Storybook's preview channel and
 *   hasServerChannel; tests pass their own to run the loop without a browser.
 * @returns {import('../agent/session.js').ToolHandler}
 */
export function createSaveStoryHandler({ prompt = () => '', channel, isDev = hasServerChannel } = {}) {
  return async (args) => {
    const fallback = (/** @type {string} */ reason) => {
      const { fileName } = csfForDownload(args);
      return {
        saved: false,
        fallback: 'download',
        fileName,
        message: `${reason} The CSF source for ${fileName} is offered for download or copy instead; put it in stories/generated/ to add it to the sidebar.`,
      };
    };
    if (!isDev()) {
      return fallback('This is a static Storybook build with no server to write files, so nothing was saved.');
    }
    try {
      const saved = await requestSaveStory({ title: args.title, tree: args.tree, prompt: prompt() }, channel ? { channel } : {});
      return {
        saved: true,
        ...saved,
        message: `Saved ${saved.path}. It is in the sidebar as ${saved.title}${saved.warnings ? `, with ${saved.warnings} guideline warning(s) noted in review` : ''}.`,
      };
    } catch (error) {
      if (error instanceof SaveStoryRejected) return { saved: false, error: error.message, message: `The Storybook server refused to save: ${error.message}` };
      return fallback(`${/** @type {Error} */ (error).message} Nothing was saved.`);
    }
  };
}
