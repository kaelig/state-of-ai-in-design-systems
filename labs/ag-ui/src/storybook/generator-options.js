// The generator's option lists, kept out of Generator.jsx so that file exports
// only a component. @vitejs/plugin-react can then Fast Refresh it in place
// during `storybook dev`; a module that also exports plain values is
// invalidated instead, which remounts the story and drops the session.

export const DEFAULT_AGENT_URL = 'http://localhost:8787/agent';

/** The four AG-UI mechanisms the design agent can deliver a screen through. */
export const MODES = [
  { value: 'state', label: 'Shared state', hint: 'STATE_SNAPSHOT, then one STATE_DELTA (JSON Patch) per node. Any surface on the thread renders the same document.' },
  { value: 'tool', label: 'Tool call', hint: 'A render_ui frontend tool call with streamed JSON arguments. This page validates it and answers with the report.' },
  { value: 'activity', label: 'Activity', hint: 'ACTIVITY_SNAPSHOT and ACTIVITY_DELTA: the screen is an activity message in the conversation.' },
  { value: 'a2ui', label: 'A2UI surface', hint: 'A2UI v0.9 operations carried in an "a2ui-surface" activity, decoded back to a Harbor tree.' },
];

export const TRANSPORTS = [
  { value: 'browser', label: 'In-browser DesignAgent', short: 'in-browser DesignAgent' },
  { value: 'http', label: 'HttpAgent (npm run agent)', short: 'HttpAgent' },
];

export const EXAMPLES = ['a sign up form', 'a dashboard with 4 metrics', 'pricing with three plans', 'profile settings', 'an empty state for a new project'];
