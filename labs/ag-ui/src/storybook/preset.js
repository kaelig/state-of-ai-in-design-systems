// The Node side of the AG-UI Storybook integration, loaded as a preset from
// .storybook/main.js. It adds one thing to `storybook dev`: a listener on the
// server channel that answers `save_story` requests from the generator story
// by writing stories/generated/<ExportName>.stories.jsx.
//
// Storybook API used, and where it was verified (storybook@10.6.1):
//
//   experimental_serverChannel(channel, options)
//     Applied once at dev startup by `presets.apply("experimental_serverChannel",
//     channel)` in node_modules/storybook/dist/core-server/index.js
//     (code/core/src/core-server/build-dev.ts). Core's own preset uses the same
//     hook for save-story and create-new-story and returns the channel, which
//     is what the preset chain expects back (dist/core-server/presets/
//     common-preset.js). It is undocumented and `experimental_`, so it may move
//     in 11.x. It never runs in `storybook build`: a static Storybook has no
//     server, and the generator falls back to offering the file for download.
//
//   The server channel is a Channel over a WebSocketServer at
//   /storybook-server-channel that only accepts connections carrying the
//   per-process wsToken and a valid Origin (dist/core-server/index.js,
//   ServerChannelTransport). Every browser page (manager and preview) connects
//   to it in DEVELOPMENT (createBrowserChannel in storybook/internal/channels),
//   and `channel.emit` on the server broadcasts to all of them.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from 'storybook/internal/node-logger';
import { EVENTS } from './events.js';
import { SaveStoryError, writeGeneratedStory } from './story-writer.js';

/** Where Harbor's React entry is, from this file; generated stories import it. */
const REACT_ENTRY = fileURLToPath(new URL('../react/index.js', import.meta.url));

/**
 * @param {{ on: (event: string, fn: (...args: any[]) => void) => void, emit: (event: string, ...args: any[]) => void }} channel
 * @param {{ configDir: string }} options Storybook's preset options.
 */
export const experimental_serverChannel = async (channel, options) => {
  const root = path.resolve(options.configDir, '..');
  const dir = path.join(root, 'stories', 'generated');
  const importFrom = toPosix(path.relative(dir, REACT_ENTRY));

  channel.on(EVENTS.SAVE_STORY_REQUEST, async (/** @type {import('./events.js').SaveStoryRequest} */ request) => {
    const id = typeof request?.id === 'string' ? request.id : '';
    try {
      const saved = await writeGeneratedStory(request?.payload ?? /** @type {any} */ ({}), { dir, root, importFrom });
      logger.info(`AG-UI: wrote ${saved.path} (${saved.storyId})`);
      channel.emit(EVENTS.SAVE_STORY_RESPONSE, { id, success: true, error: null, payload: saved });
    } catch (error) {
      const message = error instanceof SaveStoryError ? error.message : `Could not write the story: ${/** @type {any} */ (error)?.message ?? error}`;
      logger.warn(`AG-UI: save_story rejected: ${message}`);
      channel.emit(EVENTS.SAVE_STORY_RESPONSE, { id, success: false, error: message });
    }
  });

  return channel;
};

const toPosix = (/** @type {string} */ p) => p.split(path.sep).join('/');
