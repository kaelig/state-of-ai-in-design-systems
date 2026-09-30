// The right pane: everything the protocol carried, one tab per concern.

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { catalogToA2ui } from '../../../src/a2ui/index.js';
import { catalogId, catalogToContext, catalogToTools, harbor } from '../../../src/catalog/index.js';
import { treeToCsf, treeToJsx } from '../../../src/tree/to-code.js';
import { countByFamily, eventFamily, filterEvents, formatClock, formatOffset, formatSize, groupByRun, shortId, visibleFamilies } from '../lib/events.js';
import { CodeView, CopyButton, Empty, JsonView, safeStringify, Segmented } from './ui.jsx';

const TABS = [
  { id: 'events', label: 'Events' },
  { id: 'state', label: 'State' },
  { id: 'contract', label: 'Contract' },
  { id: 'code', label: 'Code' },
  { id: 'figma', label: 'Figma' },
];

/**
 * @param {{
 *   snapshot: any,
 *   tree: any,
 *   extraTools: any[],
 *   lastInput: { input: any, at: number } | null,
 *   exportRequest: { at: number | null, result: any } | null,
 *   prompt: string,
 * }} props
 */
export function Inspector({ snapshot, tree, extraTools, lastInput, exportRequest, prompt }) {
  const [tab, setTab] = useState('events');
  const tabRefs = useRef(/** @type {Record<string, HTMLButtonElement | null>} */ ({}));
  const [seenExport, setSeenExport] = useState(/** @type {number | null} */ (null));
  const exportAt = exportRequest?.at ?? null;
  const unseenExport = exportAt !== null && exportAt !== seenExport && tab !== 'code';
  useEffect(() => {
    if (tab === 'code' && exportAt !== null) setSeenExport(exportAt);
  }, [tab, exportAt]);

  const onKeyDown = (/** @type {import('react').KeyboardEvent} */ e) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  return (
    <div className="pg-inspector-inner">
      <div className="pg-tabs" role="tablist" aria-label="Inspector" onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={`pg-tab-${t.id}`}
            aria-controls={`pg-panel-${t.id}`}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            className="pg-tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'events' ? <span className="pg-tab-count pg-mono">{snapshot.events.length}</span> : null}
            {t.id === 'code' && unseenExport ? (
              <span className="pg-tab-dot" title="The agent called export_code">
                <span className="pg-visually-hidden"> (the agent called export_code)</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="pg-tabpanel" role="tabpanel" id={`pg-panel-${tab}`} aria-labelledby={`pg-tab-${tab}`}>
        {tab === 'events' ? <EventsTab events={snapshot.events} running={snapshot.running} /> : null}
        {tab === 'state' ? <StateTab snapshot={snapshot} /> : null}
        {tab === 'contract' ? <ContractTab extraTools={extraTools} lastInput={lastInput} /> : null}
        {tab === 'code' ? <CodeTab tree={tree} exportRequest={exportRequest} prompt={prompt} /> : null}
        {tab === 'figma' ? <FigmaTab tree={tree} /> : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Events */

/** @param {{ events: any[], running: boolean }} props */
function EventsTab({ events, running }) {
  const [family, setFamily] = useState('all');
  const [open, setOpen] = useState(/** @type {Set<number>} */ (new Set()));
  const counts = useMemo(() => countByFamily(events), [events]);
  const families = visibleFamilies(counts);
  const runs = useMemo(() => groupByRun(events), [events]);
  const listRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const stick = useRef(true);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  });

  const toggle = (/** @type {number} */ index) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="pg-events">
      <div className="pg-filter" role="group" aria-label="Filter events by family">
        {[{ id: 'all', label: 'All' }, ...families].map((f) => (
          <button key={f.id} type="button" className="pg-filter-chip" aria-pressed={family === f.id} data-family={f.id} onClick={() => setFamily(f.id)} disabled={f.id !== 'all' && !counts[f.id] && family !== f.id}>
            {f.id !== 'all' ? <span className="pg-dot" data-family={f.id} aria-hidden="true" /> : null}
            {f.label}
            <span className="pg-mono pg-filter-count">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>
      {events.length === 0 ? (
        <Empty title="No events yet">Every AG-UI event the agent sends lands here, in order, from RUN_STARTED to RUN_FINISHED.</Empty>
      ) : (
        <div
          className="pg-event-list"
          ref={listRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          }}
        >
          {runs.map((run) => {
            const rows = family === 'all' ? run.entries : run.entries.filter(({ entry }) => eventFamily(entry.type) === family);
            // While filtering, runs with nothing to show stay out of the way.
            if (!rows.length) return null;
            return (
              <section key={`${run.number}-${run.start}`} className="pg-run" aria-label={`Run ${run.number}`}>
                <h3 className="pg-run-head pg-small">
                  <span>Run {run.number}</span>
                  <span className="pg-mono pg-muted">{shortId(run.runId)}</span>
                  <span className="pg-mono pg-muted">{formatClock(run.start)}</span>
                  <span className="pg-run-outcome pg-mono" data-outcome={run.outcome ? run.outcome.split(':')[0].split(' ')[0] : 'open'}>
                    {run.outcome ?? (running ? 'running' : 'open')}
                  </span>
                </h3>
                <ul className="pg-event-rows">
                  {rows.map(({ index, entry }) => (
                    <EventRow key={index} index={index} entry={entry} start={run.start} open={open.has(index)} onToggle={toggle} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <p className="pg-muted pg-small pg-events-foot">
        Showing {filterEvents(events, family).length} of {events.length}. Click a row for the raw event.
      </p>
    </div>
  );
}

const EventRow = memo(function EventRow({ index, entry, start, open, onToggle }) {
  const fam = eventFamily(entry.type);
  return (
    <li className="pg-event" data-open={open}>
      <button type="button" className="pg-event-btn" aria-expanded={open} onClick={() => onToggle(index)}>
        <span className="pg-event-time pg-mono">{formatOffset(entry.at - start)}</span>
        <span className="pg-dot" data-family={fam} aria-hidden="true" />
        <span className="pg-event-type pg-mono">{entry.type}</span>
        <span className="pg-event-summary pg-mono">{entry.summary}</span>
      </button>
      {open ? <JsonView value={entry.event} maxHeight="320px" label={`${entry.type} event JSON`} /> : null}
    </li>
  );
});

/* ----------------------------------------------------------------- State */

/** @param {{ snapshot: any }} props */
function StateTab({ snapshot }) {
  const state = snapshot.state ?? {};
  const hasState = state && typeof state === 'object' && Object.keys(state).length > 0;
  // Newest first: the last one is the screen on the canvas.
  const activities = Object.entries(snapshot.activities ?? {}).reverse();
  return (
    <div className="pg-tab-scroll">
      <section className="pg-section">
        <header className="pg-section-head">
          <h3 className="pg-section-title">Shared state</h3>
          {hasState ? <CopyButton text={safeStringify(state)} /> : null}
        </header>
        <p className="pg-muted pg-small">Kept in sync by STATE_SNAPSHOT and STATE_DELTA. The client never patches it back; it sends the whole thing as RunAgentInput.state on the next run.</p>
        {hasState ? <JsonView value={state} label="Shared state JSON" /> : <Empty>Empty. In Shared state mode the agent streams the screen into /ui here, and theme follow-ups patch /theme.</Empty>}
      </section>
      <section className="pg-section">
        <header className="pg-section-head">
          <h3 className="pg-section-title">Activity messages</h3>
        </header>
        <p className="pg-muted pg-small">Built by ACTIVITY_SNAPSHOT and ACTIVITY_DELTA. They live in the thread, not in state, and the client strips them before sending messages back.</p>
        {activities.length ? (
          activities.map(([id, a], i) => (
            <div key={id} className="pg-activity">
              <p className="pg-mono pg-small">
                {a.activityType} <span className="pg-muted">· {id}</span>
                {i === 0 ? <span className="pg-pill pg-activity-latest">latest</span> : null}
              </p>
              <JsonView value={a.content} maxHeight="360px" label={`${a.activityType} content`} />
            </div>
          ))
        ) : (
          <Empty>None yet. Switch to Activity message or A2UI surface to see one.</Empty>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------- Contract */

/** @param {{ extraTools: any[], lastInput: { input: any, at: number } | null }} props */
function ContractTab({ extraTools, lastInput }) {
  const [view, setView] = useState('tools');
  const sent = lastInput?.input;
  const tools = sent?.tools ?? [...catalogToTools(harbor), ...extraTools];
  const context = sent?.context ?? catalogToContext(harbor);
  const a2ui = useMemo(() => catalogToA2ui(harbor), []);
  const renderUi = tools.find((/** @type {any} */ t) => t.name === 'render_ui');
  const componentCount = Object.keys(harbor.components).length;

  return (
    <div className="pg-tab-scroll">
      <p className="pg-contract-status pg-small">
        {sent ? (
          <>
            <span className="pg-pill" data-tone="ok">
              Sent
            </span>
            <span>
              in run <span className="pg-mono">{shortId(sent.runId)}</span> at <span className="pg-mono">{formatClock(lastInput.at)}</span>. This is the RunAgentInput the agent received.
            </span>
          </>
        ) : (
          <>
            <span className="pg-pill">Not sent yet</span>
            <span>This is what the next RunAgentInput will carry.</span>
          </>
        )}
      </p>
      <Segmented
        legend="Contract view"
        hideLegend
        name="contract"
        size="sm"
        value={view}
        onChange={setView}
        options={[
          { value: 'tools', label: 'Tools' },
          { value: 'context', label: 'Context' },
          { value: 'a2ui', label: 'A2UI catalog' },
          { value: 'input', label: 'Full input' },
        ]}
      />
      {view === 'tools' ? (
        <section className="pg-section">
          <header className="pg-section-head">
            <h3 className="pg-section-title pg-mono">RunAgentInput.tools</h3>
            <CopyButton text={safeStringify(tools)} label="Copy JSON" />
          </header>
          <p className="pg-muted pg-small">
            Frontend tools this page offers. <span className="pg-mono">render_ui</span> takes the whole tree, and its parameters are a JSON Schema with one branch per Harbor component ({componentCount} of them). Anything outside it fails validation. <span className="pg-mono">export_code</span> is answered by this page after approval.
          </p>
          <ul className="pg-tool-list">
            {tools.map((/** @type {any} */ t) => (
              <li key={t.name}>
                <span className="pg-mono">{t.name}</span>
                <span className="pg-muted pg-small">{formatSize(JSON.stringify(t.parameters ?? {}))} of schema</span>
              </li>
            ))}
          </ul>
          <JsonView value={renderUi ?? tools} maxHeight="480px" label="render_ui tool definition" />
          {tools
            .filter((/** @type {any} */ t) => t.name !== 'render_ui')
            .map((/** @type {any} */ t) => (
              <JsonView key={t.name} value={t} maxHeight="240px" label={`${t.name} tool definition`} />
            ))}
        </section>
      ) : null}
      {view === 'context' ? (
        <section className="pg-section">
          <header className="pg-section-head">
            <h3 className="pg-section-title pg-mono">RunAgentInput.context</h3>
            <CopyButton text={safeStringify(context)} label="Copy JSON" />
          </header>
          <p className="pg-muted pg-small">The prompt-sized catalog: one line per component, written as signatures because models read those well and they cost a fraction of the schema.</p>
          {context.map((/** @type {any} */ c, i) => (
            <div key={i} className="pg-context">
              <p className="pg-mono pg-small">
                description: <span className="tk-string">{JSON.stringify(c.description)}</span> · {formatSize(c.value)}
              </p>
              <pre className="pg-code" tabIndex={0} aria-label="Context value">
                <code>{c.value}</code>
              </pre>
            </div>
          ))}
        </section>
      ) : null}
      {view === 'a2ui' ? (
        <section className="pg-section">
          <header className="pg-section-head">
            <h3 className="pg-section-title pg-mono">catalogToA2ui(harbor)</h3>
            <CopyButton text={safeStringify(a2ui)} label="Copy JSON" />
          </header>
          <p className="pg-muted pg-small">
            The same {componentCount} components in A2UI’s catalog shape: a catalog id and one schema per component, props flat on the component. An A2UI renderer that registers this catalog can draw what the A2UI surface mode sends. Not part of RunAgentInput.
          </p>
          <JsonView value={a2ui} maxHeight="520px" label="Harbor A2UI catalog" />
        </section>
      ) : null}
      {view === 'input' ? (
        <section className="pg-section">
          <header className="pg-section-head">
            <h3 className="pg-section-title pg-mono">RunAgentInput</h3>
            {sent ? <CopyButton text={safeStringify(sent)} label="Copy JSON" /> : null}
          </header>
          {sent ? (
            <>
              <p className="pg-muted pg-small">
                {sent.messages?.length ?? 0} messages, {sent.tools?.length ?? 0} tools, state keys: {Object.keys(sent.state ?? {}).join(', ') || 'none'}
                {sent.resume?.length ? ', with a resume entry' : ''}. forwardedProps carry the options from the left pane.
              </p>
              <JsonView value={sent} maxHeight="560px" label="Last RunAgentInput" />
            </>
          ) : (
            <Empty>Send a prompt to capture the full input. A middleware on the agent records it on the way out.</Empty>
          )}
        </section>
      ) : null}
      <p className="pg-muted pg-small pg-contract-foot">
        Catalog <span className="pg-mono">{catalogId(harbor)}</span>. The prompt, the tool schema and the validator all come from one file, so they cannot disagree.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ Code */

/** @param {{ tree: any, exportRequest: { at: number | null, result: any } | null, prompt: string }} props */
function CodeTab({ tree, exportRequest, prompt }) {
  const [view, setView] = useState('jsx');
  const preRef = useRef(/** @type {HTMLPreElement | null} */ (null));
  const code = useMemo(() => {
    if (!tree?.root) return '';
    try {
      return view === 'jsx' ? treeToJsx(tree, harbor) : treeToCsf(tree, harbor, { prompt });
    } catch (error) {
      return `// Could not generate code: ${String(/** @type {any} */ (error)?.message ?? error)}`;
    }
  }, [tree, view, prompt]);
  const exported = exportRequest?.result?.jsx;
  const matches = exported && view === 'jsx' && exported === code;

  return (
    <div className="pg-tab-scroll">
      {exportRequest ? (
        <div className="pg-callout" data-tone="agent">
          <p>
            <strong>The agent called export_code</strong>
            {exportRequest.at ? <span className="pg-mono pg-muted"> at {formatClock(exportRequest.at)}</span> : null}
          </p>
          <p className="pg-small">
            After you approved, it asked this page for code. The handler ran <span className="pg-mono">treeToJsx</span> on the approved tree and sent the JSX back as the tool result.
            {view === 'jsx' ? (matches ? ' It is the code below.' : ' The canvas changed since, so the code below is newer.') : ''}
          </p>
        </div>
      ) : null}
      <div className="pg-section-head">
        <Segmented
          legend="Code format"
          hideLegend
          name="code"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: 'jsx', label: 'JSX' },
            { value: 'csf', label: 'Story (CSF 3)' },
          ]}
        />
        <CopyButton text={code} label={view === 'jsx' ? 'Copy JSX' : 'Copy story'} selectTarget={() => preRef.current} />
      </div>
      {code ? (
        <>
          <p className="pg-muted pg-small">{view === 'jsx' ? 'Harbor’s React components with the props the tree set. Props equal to their catalog default are left out.' : 'A Storybook story file. parameters.agui keeps the tree, so the story can be reopened in the generator or sent to Figma.'}</p>
          <CodeView code={code} preRef={preRef} label={view === 'jsx' ? 'JSX' : 'Story file'} />
        </>
      ) : (
        <Empty>Code appears once the agent starts placing components.</Empty>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Figma */

// Found with a glob so the playground still builds before the exporter
// exists: the glob matches nothing until src/figma/tree-to-figma.js lands, and
// the tab says so. Rebuild after it lands and the tab fills in. (Eager because
// a lazy glob inside a single inlined bundle trips Vite's preload helper.)
const figmaModule = /** @type {any} */ (Object.values(import.meta.glob('../../../src/figma/tree-to-figma.js', { eager: true }))[0] ?? null);

/** @param {{ tree: any }} props */
function FigmaTab({ tree }) {
  const mod = figmaModule;
  const failure = !mod ? 'missing' : typeof mod.treeToFigmaScript !== 'function' ? 'The module has no treeToFigmaScript export.' : null;
  const [view, setView] = useState('payload');
  const preRef = useRef(/** @type {HTMLPreElement | null} */ (null));

  const script = useMemo(() => {
    if (!mod?.treeToFigmaScript || !tree?.root) return '';
    try {
      return mod.treeToFigmaScript(tree, harbor, { frameName: tree.title || 'Generated screen' });
    } catch (error) {
      return `// Could not build the script: ${String(/** @type {any} */ (error)?.message ?? error)}`;
    }
  }, [mod, tree]);
  const payload = script ? JSON.stringify({ code: script }, null, 2) : '';

  return (
    <div className="pg-tab-scroll">
      <p className="pg-small">
        Paste the payload into <span className="pg-mono">figma_execute</span> from any MCP client connected to Southleft’s Figma Console MCP, with the Desktop Bridge plugin running in the file you want to draw in.
      </p>
      {failure ? (
        <Empty title="Figma exporter not in this build">
          {failure === 'missing' ? (
            <>
              <span className="pg-mono">src/figma/tree-to-figma.js</span> did not exist when this page was built. Rebuild the playground once it lands and this tab fills in.
            </>
          ) : (
            <>The exporter failed to load: {failure}</>
          )}
        </Empty>
      ) : !script ? (
        <Empty>The script appears once there is a screen on the canvas.</Empty>
      ) : (
        <>
          <div className="pg-section-head">
            <Segmented
              legend="Figma view"
              hideLegend
              name="figma"
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'payload', label: 'Payload' },
                { value: 'script', label: 'Script' },
              ]}
            />
            <CopyButton text={view === 'payload' ? payload : script} label={view === 'payload' ? 'Copy payload' : 'Copy script'} selectTarget={() => preRef.current} />
          </div>
          <p className="pg-muted pg-small">
            {view === 'payload' ? `The { code } argument for figma_execute, ${formatSize(payload)}.` : 'The Plugin API script inside the payload, unescaped so you can read it.'}
          </p>
          {view === 'payload' ? <JsonView value={{ code: script }} wrap label="figma_execute payload" /> : <CodeView code={script} preRef={preRef} label="Figma Plugin API script" />}
        </>
      )}
    </div>
  );
}
