// The left pane: what to ask, how the agent should deliver it, and the thread
// of what came back.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { threadItems } from '../lib/thread.js';
import { Segmented, Switch } from './ui.jsx';

export const MODES = [
  {
    value: 'state',
    label: 'Shared state',
    events: 'STATE_SNAPSHOT, STATE_DELTA',
    blurb: 'The screen lives in shared state. The agent sends a snapshot, then one JSON Patch per component.',
  },
  {
    value: 'tool',
    label: 'Frontend tool',
    events: 'TOOL_CALL_START, TOOL_CALL_ARGS, TOOL_CALL_END',
    blurb: 'The agent calls render_ui. This page checks the tree against Harbor and answers with the result.',
  },
  {
    value: 'activity',
    label: 'Activity message',
    events: 'ACTIVITY_SNAPSHOT, ACTIVITY_DELTA',
    blurb: 'The screen is its own message in the thread, patched in place as components arrive.',
  },
  {
    value: 'a2ui',
    label: 'A2UI surface',
    events: 'ACTIVITY_SNAPSHOT (a2ui-surface)',
    blurb: 'The same activity mechanism carrying the A2UI format, so any A2UI renderer with the Harbor catalog could draw it.',
  },
];

export const EXAMPLES = ['a sign up form', 'dashboard with 4 metrics', 'pricing with 3 plans', 'profile settings', 'empty state "No reports"', 'make it dark', 'compact'];

/**
 * @param {{
 *   options: { mode: string, simulateMistake: boolean, review: boolean },
 *   setOptions: (patch: Partial<{ mode: string, simulateMistake: boolean, review: boolean }>) => void,
 *   transport: { kind: 'local' | 'server', url: string },
 *   setTransport: (t: { kind: 'local' | 'server', url: string }) => void,
 *   modes: typeof MODES,
 *   snapshot: any,
 *   onSend: (prompt: string) => void,
 *   onStop: () => void,
 * }} props
 */
export function Composer({ options, setOptions, transport, setTransport, modes, snapshot, onSend, onStop }) {
  const [prompt, setPrompt] = useState('');
  const [url, setUrl] = useState(transport.url);
  const running = snapshot.running;
  const mode = modes.find((m) => m.value === options.mode) ?? modes[0];

  const submit = (/** @type {string} */ text) => {
    const value = text.trim();
    if (!value || running) return;
    onSend(value);
    setPrompt('');
  };

  return (
    <div className="pg-composer-inner">
      <form
        className="pg-block pg-ask"
        onSubmit={(e) => {
          e.preventDefault();
          submit(prompt);
        }}
      >
        <label htmlFor="pg-prompt" className="pg-label">
          Describe a screen
        </label>
        <textarea
          id="pg-prompt"
          className="pg-input pg-textarea"
          rows={2}
          value={prompt}
          placeholder="A sign-up form, a dashboard with 4 metrics…"
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit(prompt);
            }
          }}
        />
        <div className="pg-ask-row">
          <p className="pg-muted pg-small pg-ask-hint">Enter to send</p>
          {running ? (
            <button type="button" className="pg-btn pg-btn-secondary" onClick={onStop}>
              Stop
            </button>
          ) : (
            <button type="submit" className="pg-btn pg-btn-primary" disabled={!prompt.trim()}>
              Send
            </button>
          )}
        </div>
        <div className="pg-chips" role="group" aria-label="Examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="pg-chip" disabled={running} onClick={() => submit(ex)}>
              {ex}
            </button>
          ))}
        </div>
      </form>

      <div className="pg-block pg-options">
        <Segmented legend="Delivery" name="mode" value={options.mode} options={modes} onChange={(v) => setOptions({ mode: v })} columns={2} describedBy="pg-mode-desc" />
        <div id="pg-mode-desc" className="pg-mode-desc">
          <p>{mode.blurb}</p>
          <p className="pg-mono pg-small pg-muted">{mode.events}</p>
        </div>
        <div className="pg-switches">
          <Switch
            id="pg-mistake"
            label="Plant a contract error"
            description="Shows the check catching a bad prop."
            checked={options.simulateMistake}
            onChange={(v) => setOptions({ simulateMistake: v })}
          />
          <Switch
            id="pg-review"
            label="Ask for review"
            description="Pauses on a design_review interrupt."
            checked={options.review}
            onChange={(v) => setOptions({ review: v })}
          />
        </div>
      </div>

      <Thread snapshot={snapshot} />

      <details className="pg-block pg-transport">
        <summary>
          <span className="pg-label">Agent</span>
          <span className="pg-transport-now">{transport.kind === 'local' ? 'Runs in this tab' : transport.url}</span>
        </summary>
        <div className="pg-transport-body">
          <Segmented
            legend="Where the agent runs"
            hideLegend
            name="transport"
            size="sm"
            value={transport.kind}
            options={[
              { value: 'local', label: 'In this tab' },
              { value: 'server', label: 'Agent server' },
            ]}
            onChange={(v) => setTransport({ kind: /** @type {'local' | 'server'} */ (v), url })}
          />
          {transport.kind === 'server' ? (
            <form
              className="pg-server"
              onSubmit={(e) => {
                e.preventDefault();
                setTransport({ kind: 'server', url: url.trim() });
              }}
            >
              <label htmlFor="pg-url" className="pg-visually-hidden">
                Agent server URL
              </label>
              <div className="pg-server-row">
                <input id="pg-url" className="pg-input pg-mono" type="url" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
                <button type="submit" className="pg-btn pg-btn-secondary" disabled={url.trim() === transport.url}>
                  Connect
                </button>
              </div>
              <p className="pg-muted pg-small">
                HttpAgent posts each RunAgentInput here and reads the SSE stream back. Start the server with <code className="pg-mono">npm run agent</code> in labs/ag-ui. A hosted copy of this page cannot reach localhost.
              </p>
            </form>
          ) : (
            <p className="pg-muted pg-small">DesignAgent runs inside this page with an offline planner, so there is no server and no API key. Switch to a server to send the same events over HTTP.</p>
          )}
        </div>
      </details>
    </div>
  );
}

/** @param {{ snapshot: any }} props */
function Thread({ snapshot }) {
  const items = threadItems(snapshot.messages);
  const ref = useRef(/** @type {HTMLOListElement | null} */ (null));
  const stick = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="pg-thread" aria-label="Thread">
      <h2 className="pg-label pg-thread-title">Thread</h2>
      {items.length === 0 ? <p className="pg-muted pg-small pg-thread-empty">Messages, tool calls and tool results show up here as the agent works.</p> : null}
      <ol className="pg-thread-list" ref={ref} aria-live="polite" aria-relevant="additions text" hidden={items.length === 0}>
        {items.map((item) => (
          <ThreadRow key={item.id} item={item} />
        ))}
        {snapshot.interrupt ? (
          <li className="pg-msg pg-msg-proto" data-kind="interrupt">
            <span className="pg-proto-tag">interrupt</span>
            <span>{snapshot.interrupt.reason}: waiting for you on the canvas</span>
          </li>
        ) : null}
        {snapshot.error ? (
          <li className="pg-msg pg-msg-proto" data-kind="error">
            <span className="pg-proto-tag">error</span>
            <span>{snapshot.error}</span>
          </li>
        ) : null}
      </ol>
    </section>
  );
}

/** @param {{ item: import('../lib/thread.js').ThreadItem }} props */
function ThreadRow({ item }) {
  switch (item.kind) {
    case 'user':
      return (
        <li className="pg-msg pg-msg-user">
          <span className="pg-visually-hidden">You: </span>
          {item.text}
        </li>
      );
    case 'assistant':
      return (
        <li className="pg-msg pg-msg-agent">
          <span className="pg-visually-hidden">Agent: </span>
          {item.text}
        </li>
      );
    case 'tool-call':
      return (
        <li className="pg-msg pg-msg-proto" data-kind="call">
          <span className="pg-proto-tag">tool call</span>
          <span className="pg-mono">{item.name}()</span>
          <span className="pg-muted">{item.size.toLocaleString('en-US')} chars of arguments</span>
        </li>
      );
    case 'tool-result':
      return (
        <li className="pg-msg pg-msg-proto" data-kind={item.ok ? 'result' : 'rejected'}>
          <span className="pg-proto-tag">tool result</span>
          <span className="pg-mono">{item.name}</span>
          <span>{item.summary}</span>
        </li>
      );
    case 'activity':
      return (
        <li className="pg-msg pg-msg-proto" data-kind="activity">
          <span className="pg-proto-tag">activity</span>
          <span className="pg-mono">{item.activityType}</span>
        </li>
      );
    default:
      return null;
  }
}
