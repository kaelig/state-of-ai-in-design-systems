// The playground shell. It owns one session (src/agent/session.js) at a time:
// a DesignAgent running in this tab, or an HttpAgent pointed at the lab's
// server. The session runs the AG-UI loop; this file only wires the three
// panes to it and answers the one frontend tool the page offers, export_code.

import { HttpAgent } from '@ag-ui/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DesignAgent } from '../../src/agent/design-agent.js';
import { createSession } from '../../src/agent/session.js';
import { catalogId, harbor } from '../../src/catalog/index.js';
import { useSession } from '../../src/react/index.js';
import { treeToJsx } from '../../src/tree/to-code.js';
import { Canvas } from './components/Canvas.jsx';
import { Composer, EXAMPLES, MODES } from './components/Composer.jsx';
import { Inspector } from './components/Inspector.jsx';

const DEFAULT_SERVER = 'http://localhost:8787/agent';
const FIRST_PROMPT = EXAMPLES[1];

/** The frontend tool this page offers besides render_ui. */
export const EXPORT_CODE_TOOL = {
  name: 'export_code',
  description: 'Turn an approved screen into React code that imports Harbor components. The playground shows the result in its Code tab.',
  parameters: {
    type: 'object',
    properties: { tree: { type: 'object', description: 'The approved UI tree: { title, root, nodes }.' } },
    required: ['tree'],
    additionalProperties: false,
  },
};

/**
 * @param {{ kind: 'local' | 'server', url: string }} transport
 * @param {(input: any) => void} onInput
 */
function makeSession(transport, onInput) {
  const agent = transport.kind === 'server' ? new HttpAgent({ url: transport.url }) : new DesignAgent();
  // A middleware sees each RunAgentInput on its way to the agent, so the
  // Contract tab can show exactly what was sent.
  agent.use((input, next) => {
    onInput(input);
    return next.run(input);
  });
  return createSession({
    agent,
    tools: [EXPORT_CODE_TOOL],
    handlers: {
      export_code: ({ tree }) => {
        const jsx = treeToJsx(tree, harbor);
        const lines = jsx.split('\n').length;
        return { message: `Exported “${tree?.title || 'Screen'}” as ${lines} lines of JSX. It is in the Code tab.`, jsx };
      },
    },
  });
}

export function App() {
  const [options, setOptionsState] = useState({ mode: 'state', simulateMistake: false, review: true });
  const [transport, setTransport] = useState(/** @type {{ kind: 'local' | 'server', url: string }} */ ({ kind: 'local', url: DEFAULT_SERVER }));
  const [lastInput, setLastInput] = useState(/** @type {{ input: any, at: number } | null} */ (null));
  const [thread, setThread] = useState(0);
  const session = useMemo(() => makeSession(transport, (input) => setLastInput({ input, at: Date.now() })), [transport, thread]);
  const snap = useSession(session);
  const [selected, setSelected] = useState(/** @type {string | null} */ (null));
  const [lastPrompt, setLastPrompt] = useState('');
  const [modes, setModes] = useState(MODES);
  const [checks, markTurn] = useChecks(session);

  // Offer the modes this agent says it has. The in-tab agent lists all four;
  // an older server might not know a2ui.
  useEffect(() => {
    let live = true;
    setLastInput(null);
    setSelected(null);
    Promise.resolve(session.agent.getCapabilities?.())
      .then((caps) => {
        const offered = caps?.custom?.modes;
        if (live && Array.isArray(offered) && offered.length) setModes(MODES.filter((m) => offered.includes(m.value)));
        else if (live) setModes(MODES);
      })
      .catch(() => live && setModes(MODES));
    return () => {
      live = false;
      session.abort();
    };
  }, [session]);

  const setOptions = useCallback((/** @type {Partial<typeof options>} */ patch) => setOptionsState((o) => ({ ...o, ...patch })), []);

  const send = useCallback(
    (/** @type {string} */ prompt) => {
      markTurn();
      setSelected(null);
      setLastPrompt(prompt);
      session.send(prompt, { mode: options.mode, simulateMistake: options.simulateMistake, review: options.review });
    },
    [session, options, markTurn],
  );

  // Open on a working example rather than an empty canvas.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || transport.kind !== 'local') return;
    started.current = true;
    send(FIRST_PROMPT);
  }, [send, transport.kind]);

  const exportRequest = useMemo(() => {
    const result = [...snap.exports].reverse().find((e) => e.tool === 'export_code');
    if (!result) return null;
    const call = [...snap.events].reverse().find((e) => e.type === 'TOOL_CALL_START' && e.event?.toolCallName === 'export_code');
    return { at: call?.at ?? null, result: result.result };
  }, [snap.exports, snap.events]);

  // Which AG-UI channel carried the screen on the canvas, for its caption.
  const channel = snap.source === 'activity' ? (snap.activities?.[snap.latestActivity]?.activityType ?? 'activity') : snap.source === 'tool' ? 'render_ui' : snap.source === 'state' ? 'shared state' : null;

  const status = snap.error ? { tone: 'error', text: 'Error' } : snap.running ? { tone: 'busy', text: snap.step ? `Running · ${snap.step}` : 'Running' } : snap.interrupt ? { tone: 'wait', text: 'Waiting for review' } : { tone: 'idle', text: 'Idle' };

  return (
    <div className="pg-app">
      <header className="pg-top">
        <div className="pg-brand">
          <h1 className="pg-title">Harbor AG-UI playground</h1>
          <p className="pg-muted pg-small pg-lede">An agent that can only build with Harbor’s components. Every AG-UI event it sends is on the right.</p>
        </div>
        <div className="pg-top-meta">
          <span className="pg-mono pg-small pg-muted pg-hide-narrow">
            AG-UI 1.0 · {catalogId(harbor)} · {Object.keys(harbor.components).length} components
          </span>
          <span className="pg-status" data-tone={status.tone} role="status" aria-live="polite">
            <span className="pg-status-dot" aria-hidden="true" />
            {status.text}
          </span>
          <button type="button" className="pg-btn pg-btn-secondary pg-btn-sm" onClick={() => setThread((n) => n + 1)}>
            New thread
          </button>
        </div>
      </header>
      <main className="pg-main">
        <section className="pg-pane pg-composer" aria-label="Composer">
          <Composer options={options} setOptions={setOptions} transport={transport} setTransport={setTransport} modes={modes} snapshot={snap} onSend={send} onStop={() => session.abort()} />
        </section>
        <section className="pg-pane pg-canvas" aria-label="Canvas">
          <Canvas
            tree={snap.tree}
            theme={snap.theme}
            snapshot={snap}
            checks={checks}
            selected={selected}
            onSelect={setSelected}
            isReview={session.isReview(snap.interrupt)}
            channel={channel}
            onApprove={() => session.resume({ approved: true })}
            onRequestChanges={(notes) => session.resume({ approved: false, notes })}
          />
        </section>
        <section className="pg-pane pg-inspector" aria-label="Inspector">
          <Inspector snapshot={snap} tree={snap.tree} extraTools={[EXPORT_CODE_TOOL]} lastInput={lastInput} exportRequest={exportRequest} prompt={lastPrompt} />
        </section>
      </main>
    </div>
  );
}

/**
 * Every validation report of the current turn, in order. The session only
 * keeps the latest; the list is what shows the repair loop (an error, then a
 * clean check). A new turn starts a new list at its first report, so a theme
 * follow-up that checks nothing keeps the previous screen's checks.
 * @param {import('../../src/agent/session.js').Session} session
 * @returns {[any[], () => void]}
 */
function useChecks(session) {
  const [checks, setChecks] = useState(/** @type {any[]} */ ([]));
  const fresh = useRef(true);
  useEffect(() => {
    setChecks([]);
    fresh.current = true;
    let last = session.snapshot.validation;
    return session.subscribe(() => {
      const snap = session.snapshot;
      const v = snap.validation;
      if (v === last) return;
      last = v;
      if (!v) return;
      const reset = fresh.current;
      fresh.current = false;
      const entry = { at: Date.now(), via: snap.source === 'tool' ? 'render_ui result' : 'CUSTOM harbor.validation', ...v };
      setChecks((prev) => [...(reset ? [] : prev), entry]);
    });
  }, [session]);
  const markTurn = useCallback(() => {
    fresh.current = true;
  }, []);
  return [checks, markTurn];
}
