// The "AG-UI" addon panel: the event stream of the current generator run, as
// the preview relays it (relay.js). It is a protocol inspector, not a chat:
// every row is one AG-UI event, in order, with the one-line summary the
// session computed and the raw event a click away.
//
// Storybook API used (verified at storybook@10.6.1):
//   - `addons.register`, `addons.add`, `types.PANEL`, `addons.getChannel()`
//     from `storybook/manager-api` (dist/manager-api/index.d.ts), per
//     https://storybook.js.org/docs/addons/addons-api and the panel snippet in
//     docs/_snippets/storybook-addon-panel-initial.md.
//   - `AddonPanel` from `storybook/internal/components`
//     (dist/components/index.js: it hides inactive panels with `hidden`, so
//     children stay mounted).
//   - `styled` / `useTheme` from `storybook/theming` (dist/theming/index.d.ts),
//     so the panel follows the manager's light or dark theme.
//   - The manager bundle is built by esbuild with `jsx: "transform"` and
//     `React.createElement` (dist/_node-chunks/builder-manager-*.js), which is
//     why this file imports React explicitly.

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { addons, types } from 'storybook/manager-api';
import { AddonPanel } from 'storybook/internal/components';
import { styled } from 'storybook/theming';
import { ADDON_ID, EVENTS, PANEL_ID } from './events.js';

const MAX_ROWS = 600;

/**
 * Manager-side store. The channel listener is attached when the addon
 * registers, not when the panel mounts, so events that stream while another
 * panel tab is open are not lost.
 * @type {{ meta: any, events: import('./events.js').RelayedEvent[], status: any, sessions: number }}
 */
let state = { meta: null, events: [], status: null, sessions: 0 };
const listeners = new Set();
const set = (/** @type {Partial<typeof state>} */ patch) => {
  state = { ...state, ...patch };
  for (const l of listeners) l();
};
const subscribe = (/** @type {() => void} */ fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const useStore = () => useSyncExternalStore(subscribe, () => state);

addons.register(ADDON_ID, () => {
  const channel = addons.getChannel();
  channel.on(EVENTS.SESSION_STARTED, (meta) => set({ meta, events: [], status: null, sessions: state.sessions + 1 }));
  channel.on(EVENTS.EVENTS_LOGGED, ({ sessionId, events }) => {
    if (state.meta && sessionId !== state.meta.sessionId) return;
    const next = state.events.concat(events);
    set({ events: next.length > MAX_ROWS ? next.slice(-MAX_ROWS) : next });
  });
  channel.on(EVENTS.STATUS, (status) => {
    if (state.meta && status.sessionId !== state.meta.sessionId) return;
    set({ status });
  });

  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: PanelTitle,
    match: ({ viewMode }) => viewMode === 'story',
    render: ({ active }) => (
      <AddonPanel active={Boolean(active)}>
        <Panel />
      </AddonPanel>
    ),
  });
});

function PanelTitle() {
  const { events, status } = useStore();
  const dot = status?.running ? ' ●' : status?.interrupt ? ' ◆' : '';
  return (
    <span>
      AG-UI{events.length ? ` (${events.length})` : ''}
      {dot}
    </span>
  );
}

/** Streaming chunks are merged into one row per message or tool call unless expanded. */
const CHUNKS = new Set(['TEXT_MESSAGE_CONTENT', 'TOOL_CALL_ARGS', 'REASONING_MESSAGE_CONTENT']);

function Panel() {
  const { meta, events, status } = useStore();
  const [filter, setFilter] = useState('');
  const [merge, setMerge] = useState(true);
  const [open, setOpen] = useState(/** @type {number | null} */ (null));
  const listRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const stick = useRef(true);

  const rows = useMemo(() => toRows(events, { merge, filter }), [events, merge, filter]);
  const t0 = events[0]?.at ?? 0;

  // Follow the stream unless the reader scrolled up to look at something.
  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [rows.length]);

  if (!meta) {
    return (
      <Empty>
        <strong>No generator run yet.</strong>
        <span>
          Open <code>AG-UI / Generate</code> and send a prompt. Every AG-UI event the run produces (lifecycle, text, tool calls, state deltas, activity, interrupts)
          is listed here in order.
        </span>
      </Empty>
    );
  }

  return (
    <Wrap>
      <Bar>
        <Status data-tone={statusTone(status)}>{statusText(status)}</Status>
        <Meta title={`thread ${meta.threadId}`}>
          {meta.transport} · thread {short(meta.threadId)} · {events.length} events
          {status?.validation ? ` · ${status.validation.errors} error(s), ${status.validation.warnings} warning(s)` : ''}
        </Meta>
        <Spacer />
        <label>
          <input type="checkbox" checked={merge} onChange={(e) => setMerge(e.target.checked)} /> merge chunks
        </label>
        <Filter type="search" placeholder="Filter by type or text" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter events" />
      </Bar>
      <List
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
      >
        {rows.map((row, i) => (
          <Row key={`${row.at}-${i}`}>
            <RowHead type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <Time>+{((row.at - t0) / 1000).toFixed(2)}s</Time>
              <Type data-family={family(row.type)}>
                {row.type}
                {row.count > 1 ? ` ×${row.count}` : ''}
              </Type>
              <Summary>{row.summary}</Summary>
            </RowHead>
            {open === i ? <Detail>{row.detail}</Detail> : null}
          </Row>
        ))}
      </List>
    </Wrap>
  );
}

/**
 * @param {import('./events.js').RelayedEvent[]} events
 * @param {{ merge: boolean, filter: string }} options
 */
function toRows(events, { merge, filter }) {
  /** @type {(import('./events.js').RelayedEvent & { count: number, text?: string, chars?: number })[]} */
  const rows = [];
  for (const e of events) {
    const prev = rows.at(-1);
    if (merge && prev && CHUNKS.has(e.type) && prev.type === e.type) {
      prev.count += 1;
      prev.summary = mergedSummary(prev, e);
      prev.detail = `${prev.detail}\n${e.detail}`;
      continue;
    }
    const row = { ...e, count: 1, text: '', chars: 0 };
    if (merge && CHUNKS.has(e.type)) row.summary = mergedSummary(row, e);
    rows.push(row);
  }
  const q = filter.trim().toLowerCase();
  return q ? rows.filter((r) => r.type.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q)) : rows;
}

/**
 * Text chunks read better joined; tool-argument chunks as a running size.
 * Accumulates into `row` so each merged chunk costs one parse, not a re-join.
 * @param {{ text?: string, chars?: number }} row
 * @param {import('./events.js').RelayedEvent} e
 */
function mergedSummary(row, e) {
  let delta = '';
  try {
    delta = String(JSON.parse(e.detail).delta ?? '');
  } catch {
    // A detail truncated by the relay is not JSON; count it as nothing.
  }
  if (e.type === 'TOOL_CALL_ARGS') {
    row.chars = (row.chars ?? 0) + delta.length;
    return `${row.chars} chars of arguments`;
  }
  row.text = (row.text ?? '') + delta;
  return JSON.stringify(row.text.length > 240 ? `${row.text.slice(0, 240)}…` : row.text);
}

function family(/** @type {string} */ type) {
  if (type === 'RUN_ERROR') return 'error';
  const head = type.split('_')[0];
  return { RUN: 'run', STEP: 'step', TEXT: 'text', TOOL: 'tool', STATE: 'state', MESSAGES: 'state', ACTIVITY: 'activity', CUSTOM: 'custom', REASONING: 'text' }[head] ?? 'other';
}

function statusTone(/** @type {any} */ s) {
  if (s?.error) return 'error';
  if (s?.running) return 'running';
  if (s?.interrupt) return 'waiting';
  return 'idle';
}

function statusText(/** @type {any} */ s) {
  if (!s) return 'Starting';
  if (s.error) return `Error: ${s.error}`;
  if (s.running) return s.step ? `Running · ${s.step}` : 'Running';
  if (s.interrupt) return `Interrupted · ${s.interrupt.reason}`;
  return 'Idle';
}

const short = (/** @type {string} */ id = '') => (id.length > 14 ? `${id.slice(0, 12)}…` : id);

const Wrap = styled.div({ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 });

const Bar = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  padding: '8px 12px',
  borderBottom: `1px solid ${theme.appBorderColor}`,
  fontSize: theme.typography.size.s1,
  position: 'sticky',
  top: 0,
  background: theme.background.content,
  zIndex: 1,
  label: { display: 'flex', alignItems: 'center', gap: 4, color: theme.color.mediumdark },
}));

const Status = styled.span(({ theme }) => ({
  fontWeight: 700,
  '&[data-tone="running"]': { color: theme.color.secondary },
  '&[data-tone="waiting"]': { color: theme.color.warningText },
  '&[data-tone="error"]': { color: theme.color.negativeText },
  '&[data-tone="idle"]': { color: theme.color.positiveText },
}));

const Meta = styled.span(({ theme }) => ({ color: theme.color.mediumdark }));
const Spacer = styled.span({ flex: 1 });

const Filter = styled.input(({ theme }) => ({
  font: 'inherit',
  padding: '3px 8px',
  borderRadius: 4,
  border: `1px solid ${theme.appBorderColor}`,
  background: theme.input.background,
  color: theme.input.color,
  minWidth: 180,
}));

const List = styled.div(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  fontFamily: theme.typography.fonts.mono,
  fontSize: theme.typography.size.s1,
}));

const Row = styled.div(({ theme }) => ({ borderBottom: `1px solid ${theme.appBorderColor}` }));

const RowHead = styled.button(({ theme }) => ({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'grid',
  gridTemplateColumns: '64px 230px minmax(0, 1fr)',
  gap: 10,
  width: '100%',
  padding: '3px 12px',
  cursor: 'pointer',
  color: theme.color.defaultText,
  '&:hover': { background: theme.background.hoverable },
  '&:focus-visible': { outline: `2px solid ${theme.color.secondary}`, outlineOffset: -2 },
}));

const Time = styled.span(({ theme }) => ({ color: theme.color.mediumdark, textAlign: 'right' }));

const FAMILY = {
  run: '#1ea7fd',
  step: '#b8860b',
  text: 'inherit',
  tool: '#8b5cf6',
  state: '#16a34a',
  activity: '#0d9488',
  custom: '#ea580c',
  error: '#dc2626',
  other: 'inherit',
};

const Type = styled.span({
  fontWeight: 700,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  ...Object.fromEntries(Object.entries(FAMILY).map(([k, color]) => [`&[data-family="${k}"]`, { color }])),
});

const Summary = styled.span({ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });

const Detail = styled.pre(({ theme }) => ({
  margin: 0,
  padding: '8px 12px 10px 86px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: 280,
  overflow: 'auto',
  background: theme.background.hoverable,
  color: theme.color.defaultText,
}));

const Empty = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 20,
  maxWidth: 560,
  color: theme.color.mediumdark,
  fontSize: theme.typography.size.s2,
  strong: { color: theme.color.defaultText },
}));
