// The generator surface that AG-UI/Generate renders: a prompt, the AG-UI
// session loop (src/agent/session.js), a live Harbor canvas, the design review
// interrupt, the validation findings and a compact event log. It is a surface
// in the session's sense: a renderer plus tool handlers. The one handler it
// adds is `save_story`, which writes the approved screen into this Storybook.
//
// Storybook specifics stay at the edges: `addons.getChannel()` to relay the
// event log to the manager panel (relay.js) and to reach the server preset
// (save-story-client.js). The story file passes Storybook's args and globals in
// as plain props, so this component can be read without knowing Storybook.

import { HttpAgent } from '@ag-ui/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addons } from 'storybook/preview-api';
import { DesignAgent } from '../agent/design-agent.js';
import { createSession } from '../agent/session.js';
import { harbor } from '../catalog/index.js';
import { TreeRenderer, useSession } from '../react/index.js';
import { summarize } from '../tree/tree.js';
import { relaySession } from './relay.js';
import { createSaveStoryHandler, csfForDownload, hasServerChannel, saveStoryTool } from './save-story-client.js';
import './generator.css';

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

const uid = () => crypto.randomUUID().slice(0, 8);

/**
 * @param {{
 *   prompt?: string,
 *   mode?: 'state' | 'tool' | 'activity' | 'a2ui',
 *   transport?: 'browser' | 'http',
 *   plantMistake?: boolean,
 *   autoRun?: boolean,
 *   delayMs?: number,
 *   agentUrl?: string,
 *   theme?: { mode?: string, density?: string },
 *   onArgsChange?: (patch: Record<string, any>) => void,
 *   onThemeChange?: (patch: { harborMode?: string, harborDensity?: string }) => void,
 * }} props
 */
export function Generator({
  prompt = '',
  mode = 'state',
  transport = 'browser',
  plantMistake = false,
  autoRun = false,
  delayMs = 45,
  agentUrl = DEFAULT_AGENT_URL,
  theme = {},
  onArgsChange,
  onThemeChange,
}) {
  const view = { mode: theme.mode ?? 'light', density: theme.density ?? 'comfortable' };
  const [text, setText] = useState(prompt);
  useEffect(() => setText(prompt), [prompt]);
  const [thread, setThread] = useState(0);
  const lastPrompt = useRef(prompt);

  // One session per transport and thread. Mode and the planted mistake are
  // per-run forwardedProps, so switching them keeps the conversation.
  const bundle = useMemo(() => {
    const threadId = `thread_${uid()}`;
    const agent = transport === 'http' ? new HttpAgent({ url: agentUrl, threadId }) : new DesignAgent({ threadId });
    const session = createSession({
      agent,
      catalog: harbor,
      tools: [saveStoryTool(harbor)],
      handlers: { save_story: createSaveStoryHandler({ prompt: () => lastPrompt.current }) },
    });
    return { agent, session, threadId, sessionId: uid() };
  }, [transport, agentUrl, thread]);

  useEffect(() => () => bundle.session.abort(), [bundle]);
  useEffect(() => {
    // Standalone iframe.html has no manager to relay to, and the channel would
    // buffer every message waiting for one.
    if (window.parent === window) return undefined;
    const label = TRANSPORTS.find((t) => t.value === transport)?.short ?? transport;
    return relaySession(bundle.session, addons.getChannel(), { sessionId: bundle.sessionId, transport: label, threadId: bundle.threadId });
  }, [bundle, transport]);

  const snap = useSession(bundle.session);

  // Every validation report of the current run, so a contract error the agent
  // caught and repaired stays visible after the final, clean report replaces it.
  const [reports, setReports] = useState(/** @type {any[]} */ ([]));
  useEffect(() => {
    if (snap.validation) setReports((r) => (r.includes(snap.validation) ? r : [...r, snap.validation]));
  }, [snap.validation]);

  // Theme: the toolbar is what the canvas shows. The agent reads it from shared
  // state (seeded before each run) and, when it changes the theme itself
  // ("make it dark"), the change is pushed back to the toolbar.
  const agentTheme = useRef(/** @type {{ mode: string, density: string } | null} */ (null));
  useEffect(() => {
    agentTheme.current = null;
  }, [bundle]);
  useEffect(() => {
    const next = { mode: snap.theme.mode, density: snap.theme.density };
    const last = agentTheme.current;
    agentTheme.current = next;
    if (!last) return;
    /** @type {{ harborMode?: string, harborDensity?: string }} */
    const patch = {};
    if (next.mode !== last.mode) patch.harborMode = next.mode;
    if (next.density !== last.density) patch.harborDensity = next.density;
    if (Object.keys(patch).length) onThemeChange?.(patch);
  }, [snap.theme.mode, snap.theme.density]);

  const generate = useCallback(
    async (/** @type {string} */ value) => {
      const p = value.trim();
      if (!p || bundle.session.snapshot.running) return;
      lastPrompt.current = p;
      setReports([]);
      const { agent } = bundle;
      agent.setState({ ...(agent.state ?? {}), theme: { ...(agent.state?.theme ?? {}), ...view } });
      agentTheme.current = { ...view };
      if (p !== prompt) onArgsChange?.({ prompt: p });
      await bundle.session.send(p, { mode, simulateMistake: plantMistake, delayMs });
    },
    [bundle, mode, plantMistake, delayMs, prompt, view.mode, view.density],
  );

  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRun && !autoRan.current && prompt.trim()) {
      autoRan.current = true;
      void generate(prompt);
    }
  }, [autoRun, generate]);

  const review = snap.interrupt && bundle.session.isReview(snap.interrupt) ? snap.interrupt : null;
  const tree = snap.tree;
  const [hovered, setHovered] = useState(/** @type {string | null} */ (null));
  const saves = snap.exports.filter((e) => e.tool === 'save_story');

  return (
    <div className="agui-gen" data-mode={view.mode}>
      <aside className="agui-rail" aria-label="Generator controls">
        <header className="agui-brand">
          <span className="agui-brand-mark" aria-hidden="true" />
          <div>
            <strong>Harbor generator</strong>
            <span>
              AG-UI · {harbor.name}@{harbor.version}
            </span>
          </div>
        </header>

        <form
          className="agui-prompt"
          onSubmit={(e) => {
            e.preventDefault();
            void generate(text);
          }}
        >
          <label htmlFor="agui-prompt-input">Describe a screen</label>
          <textarea
            id="agui-prompt-input"
            value={text}
            rows={3}
            placeholder="a sign up form"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void generate(text);
              }
            }}
          />
          <div className="agui-chips" role="list" aria-label="Examples">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" role="listitem" className="agui-chip" onClick={() => setText(ex)} disabled={snap.running}>
                {ex}
              </button>
            ))}
          </div>
          <button type="submit" className="agui-btn agui-btn-primary" disabled={snap.running || !text.trim()}>
            {snap.running ? 'Generating…' : 'Generate'}
          </button>
        </form>

        <fieldset className="agui-field">
          <legend>Delivery</legend>
          <div className="agui-segmented" role="radiogroup" aria-label="Delivery mode">
            {MODES.map((m) => (
              <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => onArgsChange?.({ mode: m.value })}>
                {m.label}
              </button>
            ))}
          </div>
          <p className="agui-hint">{MODES.find((m) => m.value === mode)?.hint}</p>
        </fieldset>

        <div className="agui-field">
          <label htmlFor="agui-transport">Transport</label>
          <select id="agui-transport" value={transport} onChange={(e) => onArgsChange?.({ transport: e.target.value })}>
            {TRANSPORTS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {transport === 'http' ? <p className="agui-hint">POSTs RunAgentInput to {agentUrl}; runs are mirrored at /threads/{'{threadId}'}/events for other surfaces.</p> : null}
        </div>

        <label className="agui-toggle">
          <input type="checkbox" checked={plantMistake} onChange={(e) => onArgsChange?.({ plantMistake: e.target.checked })} />
          <span>
            Plant a contract error
            <small>The agent emits one prop Harbor does not allow, then catches and repairs it.</small>
          </span>
        </label>

        {review ? (
          <ReviewCard
            interrupt={review}
            running={snap.running}
            onApprove={() => bundle.session.resume({ approved: true })}
            onRequestChanges={(notes) => {
              void bundle.session.resume({ approved: false, notes });
              if (notes) setText(`${lastPrompt.current}. ${notes}`);
            }}
          />
        ) : null}

        <Findings reports={reports} onHover={setHovered} />

        {saves.length ? <SavedStory entry={saves.at(-1)} prompt={lastPrompt.current} /> : null}

        <Conversation messages={snap.messages} />

        <footer className="agui-rail-foot">
          <span>
            thread <code>{bundle.threadId}</code>
          </span>
          <button type="button" className="agui-link" onClick={() => setThread((n) => n + 1)} disabled={snap.running}>
            New thread
          </button>
        </footer>
      </aside>

      <main className="agui-main">
        <div className="agui-canvas-bar">
          <div>
            <strong>{tree?.title || 'Canvas'}</strong>
            <span>{tree?.root ? summarize(tree) : 'Nothing generated yet'}</span>
          </div>
          <RunState snap={snap} review={review} />
        </div>
        <div className="agui-canvas" data-testid="agui-canvas">
          {snap.error ? (
            <div className="agui-error" role="alert">
              <strong>{snap.error}</strong>
              {transport === 'http' ? <span> Is the agent server running? Start it with <code>npm run agent</code> in labs/ag-ui.</span> : null}
            </div>
          ) : null}
          <TreeRenderer
            tree={tree}
            theme={view}
            selected={hovered}
            empty={
              <div className="agui-empty">
                <p>Describe a screen on the left. The agent may only place {harbor.name} components, and every prop it sends is checked against the catalog.</p>
              </div>
            }
          />
        </div>
        <EventLog events={snap.events} />
      </main>
    </div>
  );
}

/** @param {{ snap: any, review: any }} props */
function RunState({ snap, review }) {
  if (snap.running) {
    return (
      <span className="agui-state" data-tone="running">
        <span className="agui-pulse" aria-hidden="true" /> {snap.step ? `Step: ${snap.step}` : 'Running'}
      </span>
    );
  }
  if (review) return <span className="agui-state" data-tone="waiting">Waiting for review</span>;
  if (snap.events.length) return <span className="agui-state" data-tone="done">Idle</span>;
  return null;
}

/**
 * @param {{ interrupt: any, running: boolean, onApprove: () => void, onRequestChanges: (notes: string) => void }} props
 */
function ReviewCard({ interrupt, running, onApprove, onRequestChanges }) {
  const [asking, setAsking] = useState(false);
  const [notes, setNotes] = useState('');
  const tools = interrupt.metadata?.exportTools ?? [];
  return (
    <section className="agui-card agui-review" aria-label="Design review" data-testid="agui-review">
      <h3>Design review</h3>
      <p>{interrupt.message}</p>
      {tools.length ? (
        <p className="agui-hint">
          Approving resumes the thread; the agent then calls {tools.map((t) => <code key={t}>{t}</code>)}.
        </p>
      ) : null}
      {asking ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRequestChanges(notes.trim());
          }}
        >
          <label htmlFor="agui-review-notes">What should change?</label>
          <textarea id="agui-review-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Make the button secondary" />
          <div className="agui-row">
            <button type="submit" className="agui-btn">
              Send notes
            </button>
            <button type="button" className="agui-link" onClick={() => setAsking(false)}>
              Back
            </button>
          </div>
        </form>
      ) : (
        <div className="agui-row">
          <button type="button" className="agui-btn agui-btn-primary" onClick={onApprove} disabled={running}>
            Approve
          </button>
          <button type="button" className="agui-btn" onClick={() => setAsking(true)} disabled={running}>
            Request changes
          </button>
        </div>
      )}
    </section>
  );
}

/** @param {{ reports: any[], onHover: (id: string | null) => void }} props */
function Findings({ reports, onHover }) {
  if (!reports.length) return null;
  const latest = reports.at(-1);
  const repaired = latest.valid ? reports.slice(0, -1).flatMap((r) => r.errors) : [];
  const items = [...latest.errors, ...latest.warnings];
  return (
    <section className="agui-card" aria-label="Validation findings" data-testid="agui-findings">
      <h3>
        Validation <span className="agui-count">{latest.valid ? 'contract ok' : `${latest.errors.length} error(s)`}</span>
      </h3>
      {repaired.length ? (
        <ul className="agui-findings">
          {repaired.map((f, i) => (
            <li key={`r${i}`} data-severity="repaired" onMouseEnter={() => onHover(f.nodeId ?? null)} onMouseLeave={() => onHover(null)}>
              <span className="agui-tag">repaired</span>
              <span>{f.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {items.length ? (
        <ul className="agui-findings">
          {items.map((f, i) => (
            <li key={i} data-severity={f.severity} onMouseEnter={() => onHover(f.nodeId ?? null)} onMouseLeave={() => onHover(null)}>
              <span className="agui-tag">{f.severity}</span>
              <span>
                {f.message} {f.nodeId ? <code>{f.nodeId}</code> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="agui-hint">{repaired.length ? 'The repaired screen meets the catalog contract and the usage rules.' : 'No contract errors, no guideline warnings.'}</p>
      )}
    </section>
  );
}

/** @param {{ entry: { tool: string, args: any, result: any }, prompt: string }} props */
function SavedStory({ entry, prompt }) {
  const { result, args } = entry;
  const [copied, setCopied] = useState(false);
  const csf = useMemo(() => (result?.fallback ? csfForDownload(args, prompt) : null), [result, args, prompt]);
  const href = useMemo(() => (csf ? URL.createObjectURL(new Blob([csf.source], { type: 'text/javascript' })) : null), [csf]);
  useEffect(() => () => void (href && URL.revokeObjectURL(href)), [href]);

  if (result?.saved) {
    return (
      <section className="agui-card agui-saved" aria-label="Saved story" data-testid="agui-saved">
        <h3>Saved as a story</h3>
        <p>
          <code>{result.path}</code>
        </p>
        <p className="agui-hint">
          Indexed as <strong>{result.title}</strong>.{' '}
          <a href={`./?path=/story/${result.storyId}`} target="_top">
            Open it
          </a>
        </p>
      </section>
    );
  }
  if (csf && href) {
    return (
      <section className="agui-card agui-saved" aria-label="Story source" data-testid="agui-saved">
        <h3>Story source</h3>
        <p className="agui-hint">{hasServerChannel() ? result.message : 'This static build has no server, so nothing was written. Download the file or copy it into stories/generated/.'}</p>
        <div className="agui-row">
          <a className="agui-btn agui-btn-primary" href={href} download={csf.fileName}>
            Download {csf.fileName}
          </a>
          <button
            type="button"
            className="agui-btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(csf.source);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <details>
          <summary>Show source</summary>
          <pre>{csf.source}</pre>
        </details>
      </section>
    );
  }
  return (
    <section className="agui-card agui-saved" aria-label="Save failed" data-testid="agui-saved">
      <h3>Not saved</h3>
      <p className="agui-hint">{result?.message ?? 'save_story returned nothing.'}</p>
    </section>
  );
}

/** @param {{ messages: any[] }} props */
function Conversation({ messages }) {
  const turns = messages.filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim()).slice(-8);
  if (!turns.length) return null;
  return (
    <section className="agui-card" aria-label="Conversation">
      <h3>Conversation</h3>
      <ol className="agui-turns">
        {turns.map((m) => (
          <li key={m.id} data-role={m.role}>
            {m.content}
          </li>
        ))}
      </ol>
    </section>
  );
}

const FAMILY = { RUN: 'run', STEP: 'step', TEXT: 'text', TOOL: 'tool', STATE: 'state', ACTIVITY: 'activity', CUSTOM: 'custom', MESSAGES: 'state' };

/** @param {{ events: any[] }} props */
function EventLog({ events }) {
  const ref = useRef(/** @type {HTMLOListElement | null} */ (null));
  // Chunk events are the bulk of a stream and say little one at a time; the
  // manager panel has them all, this strip shows the shape of the run.
  const rows = events.filter((e) => e.type !== 'TEXT_MESSAGE_CONTENT' && e.type !== 'TOOL_CALL_ARGS').slice(-40);
  const t0 = events[0]?.at ?? 0;
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [rows.length]);
  return (
    <section className="agui-log" aria-label="AG-UI events">
      <div className="agui-log-head">
        <strong>Events</strong>
        <span>
          {events.length} total · text and argument chunks hidden · full stream in the AG-UI panel
        </span>
      </div>
      <ol ref={ref}>
        {rows.map((e, i) => (
          <li key={`${e.at}-${i}`}>
            <time>+{((e.at - t0) / 1000).toFixed(2)}s</time>
            <b data-family={e.type === 'RUN_ERROR' ? 'error' : (FAMILY[/** @type {keyof typeof FAMILY} */ (e.type.split('_')[0])] ?? 'other')}>{e.type}</b>
            <span>{e.summary}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
