// Relays a generator session's AG-UI event log from the preview iframe to the
// manager, where the "AG-UI" panel (manager.jsx) draws it. The panel lives in
// a different window, so it cannot subscribe to the session directly; the
// Storybook channel (postMessage between manager and preview) is the bridge.
//
// Only a one-line summary and a truncated JSON rendering of each event cross
// the channel. That keeps each message small, and it means the manager never
// has to know AG-UI's event types to draw them.

import { EVENTS } from './events.js';

const DETAIL_MAX = 4000;

/**
 * @param {import('../agent/session.js').Session} session
 * @param {{ emit: (event: string, ...args: any[]) => void }} channel
 * @param {{ sessionId: string, transport: string, threadId: string }} meta
 * @returns {() => void} stop relaying
 */
export function relaySession(session, channel, meta) {
  /** @type {WeakSet<object>} */
  const sent = new WeakSet();
  let lastStatus = '';
  channel.emit(EVENTS.SESSION_STARTED, { ...meta, at: Date.now() });

  const flush = () => {
    const snap = session.snapshot;
    // The session keeps a sliding window of its log, so "new" means "not sent
    // before" rather than "past index n".
    const fresh = snap.events.filter((e) => !sent.has(e));
    if (fresh.length) {
      for (const e of fresh) sent.add(e);
      channel.emit(EVENTS.EVENTS_LOGGED, { sessionId: meta.sessionId, events: fresh.map(toRelayed) });
    }
    const status = {
      sessionId: meta.sessionId,
      running: snap.running,
      step: snap.step,
      interrupt: snap.interrupt ? { reason: snap.interrupt.reason, message: snap.interrupt.message ?? '' } : null,
      error: snap.error,
      validation: snap.validation ? { errors: snap.validation.errors.length, warnings: snap.validation.warnings.length } : null,
    };
    const key = JSON.stringify(status);
    if (key !== lastStatus) {
      lastStatus = key;
      channel.emit(EVENTS.STATUS, status);
    }
  };

  // Batch per animation frame: a streaming run logs dozens of events a second
  // and the panel only needs to redraw as often as the screen does.
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    const run = () => {
      scheduled = false;
      flush();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 16);
  };
  const unsubscribe = session.subscribe(schedule);
  flush();
  return () => {
    unsubscribe();
    flush();
  };
}

/**
 * @param {import('../agent/session.js').LoggedEvent} entry
 * @returns {import('./events.js').RelayedEvent}
 */
export function toRelayed(entry) {
  let detail;
  try {
    detail = JSON.stringify(entry.event, null, 2);
  } catch {
    detail = String(entry.event);
  }
  if (detail.length > DETAIL_MAX) detail = `${detail.slice(0, DETAIL_MAX)}\n… ${detail.length - DETAIL_MAX} more characters`;
  return { at: entry.at, type: entry.type, summary: entry.summary, detail };
}
