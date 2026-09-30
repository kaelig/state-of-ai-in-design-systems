// Channel event names shared by the three places the Storybook integration
// runs: the preview (the generator story), the manager (the AG-UI panel) and
// Node (the preset). They are namespaced under "agui/" so they cannot collide
// with Storybook's own core events.
//
// The request/response envelopes copy the shape Storybook uses for its own
// server-channel requests (`{ id, payload }` in, `{ id, success, error,
// payload }` out; see code/core/src/core-events/data/request-response.ts at
// v10.6.1), so anyone who has read core's save-story flow reads this one too.

export const ADDON_ID = 'agui';
export const PANEL_ID = 'agui/panel';

export const EVENTS = /** @type {const} */ ({
  /** preview -> server: `{ id, payload: { title, tree, prompt?, exportName? } }` */
  SAVE_STORY_REQUEST: 'agui/saveStoryRequest',
  /** server -> preview: `{ id, success, error, payload?: SavedStory }` */
  SAVE_STORY_RESPONSE: 'agui/saveStoryResponse',
  /** preview -> manager: a new generator session started; clears the panel. */
  SESSION_STARTED: 'agui/sessionStarted',
  /** preview -> manager: AG-UI events the session logged since the last batch. */
  EVENTS_LOGGED: 'agui/eventsLogged',
  /** preview -> manager: running, step, interrupt, mode, transport. */
  STATUS: 'agui/status',
});

/**
 * @typedef {{ id: string, payload: { title?: string, tree: import('../tree/tree.js').UITree, prompt?: string, exportName?: string } }} SaveStoryRequest
 * @typedef {{ path: string, exportName: string, title: string, storyId: string, warnings: number }} SavedStory
 * @typedef {{ id: string, success: true, error: null, payload: SavedStory } | { id: string, success: false, error: string, payload?: undefined }} SaveStoryResponse
 * @typedef {{ at: number, type: string, summary: string, detail: string }} RelayedEvent
 */
