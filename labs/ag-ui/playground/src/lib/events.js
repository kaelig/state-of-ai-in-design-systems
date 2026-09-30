// Pure helpers for the Events tab: which family an AG-UI event type belongs
// to, filtering and counting by family, grouping a log into runs, and short
// time labels. No React here, so tests/playground.test.js can run it in Node.

/**
 * The event families of AG-UI 1.0, in the order the inspector lists them.
 * `always` families get a filter chip even before any event of theirs arrives,
 * because they are the ones this agent uses.
 * @type {{ id: string, label: string, match: (type: string) => boolean, always: boolean }[]}
 */
export const FAMILIES = [
  { id: 'lifecycle', label: 'Lifecycle', match: (t) => /^(RUN|STEP)_/.test(t), always: true },
  { id: 'text', label: 'Text', match: (t) => t.startsWith('TEXT_MESSAGE_'), always: true },
  { id: 'tool', label: 'Tool calls', match: (t) => t.startsWith('TOOL_CALL_'), always: true },
  { id: 'state', label: 'State', match: (t) => t === 'STATE_SNAPSHOT' || t === 'STATE_DELTA' || t === 'MESSAGES_SNAPSHOT', always: true },
  { id: 'activity', label: 'Activity', match: (t) => t.startsWith('ACTIVITY_'), always: true },
  { id: 'custom', label: 'Custom', match: (t) => t === 'CUSTOM' || t === 'RAW', always: true },
  { id: 'reasoning', label: 'Reasoning', match: (t) => t.startsWith('REASONING_'), always: false },
  { id: 'subagent', label: 'Subagents', match: (t) => t.startsWith('SUBAGENT_'), always: false },
];

/** @param {string} type an AG-UI EventType value, e.g. "STATE_DELTA" */
export function eventFamily(type) {
  return FAMILIES.find((f) => f.match(String(type)))?.id ?? 'other';
}

/**
 * @template {{ type: string }} E
 * @param {E[]} events
 * @param {string} family 'all' or a family id
 * @returns {E[]}
 */
export function filterEvents(events, family) {
  if (!family || family === 'all') return events;
  return events.filter((e) => eventFamily(e.type) === family);
}

/**
 * @param {{ type: string }[]} events
 * @returns {Record<string, number>} counts keyed by family id, plus `all`
 */
export function countByFamily(events) {
  /** @type {Record<string, number>} */
  const counts = { all: events.length };
  for (const f of FAMILIES) counts[f.id] = 0;
  for (const e of events) {
    const id = eventFamily(e.type);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/**
 * The filter chips to show: every family this agent uses, plus any other
 * family that has actually appeared in the log.
 * @param {Record<string, number>} counts from countByFamily
 */
export function visibleFamilies(counts) {
  return FAMILIES.filter((f) => f.always || (counts[f.id] ?? 0) > 0);
}

/**
 * Split a flat event log into runs, each starting at RUN_STARTED. Events
 * before the first RUN_STARTED (there should be none) form a run of their own.
 * Each entry keeps its index in the original log so rows can be keyed stably.
 * @template {{ type: string, at: number, event?: any }} E
 * @param {E[]} events
 * @returns {{ runId: string | null, number: number, start: number, outcome: string | null, entries: { index: number, entry: E }[] }[]}
 */
export function groupByRun(events) {
  /** @type {ReturnType<typeof groupByRun<E>>} */
  const runs = [];
  let current = null;
  events.forEach((entry, index) => {
    if (entry.type === 'RUN_STARTED' || !current) {
      current = { runId: entry.type === 'RUN_STARTED' ? (entry.event?.runId ?? null) : null, number: runs.length + 1, start: entry.at, outcome: null, entries: [] };
      runs.push(current);
    }
    current.entries.push({ index, entry });
    if (entry.type === 'RUN_FINISHED') current.outcome = runOutcome(entry.event);
    if (entry.type === 'RUN_ERROR') current.outcome = 'error';
  });
  return runs;
}

/**
 * How a RUN_FINISHED event says the run ended, in a few words.
 * @param {any} event
 */
export function runOutcome(event) {
  const outcome = event?.outcome;
  if (!outcome || outcome.type === 'success') {
    const pending = outcome?.pendingToolCallIds?.length ?? 0;
    return pending ? `waiting on ${pending} tool call${pending > 1 ? 's' : ''}` : 'success';
  }
  if (outcome.type === 'interrupt') return `interrupt: ${(outcome.interrupts ?? []).map((/** @type {any} */ i) => i.reason).join(', ')}`;
  return String(outcome.type);
}

/**
 * "+0 ms", "+845 ms", "+1.24 s", "+12.5 s"
 * @param {number} ms
 */
export function formatOffset(ms) {
  const n = Math.max(0, Math.round(Number(ms) || 0));
  if (n < 1000) return `+${n} ms`;
  const s = n / 1000;
  return `+${s < 10 ? s.toFixed(2) : s.toFixed(1)} s`;
}

/**
 * 14:03:07 in the viewer's locale-independent 24-hour form.
 * @param {number} at epoch ms
 */
export function formatClock(at) {
  const d = new Date(at);
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * "812 B", "4.2 KB", "1.3 MB" for a string's UTF-8 size.
 * @param {string} text
 */
export function formatSize(text) {
  const bytes = new TextEncoder().encode(String(text)).length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** "an 8-character id" -> first 8 characters, for labels. */
export const shortId = (/** @type {string | null | undefined} */ id) => (id ? String(id).replace(/^[a-z]+_/, '').slice(0, 8) : '');
