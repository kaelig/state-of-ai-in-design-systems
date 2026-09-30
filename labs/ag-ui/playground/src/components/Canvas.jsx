// The middle pane: the live Harbor tree at a chosen viewport width, the review
// interrupt when the agent raises one, and the contract checks for this turn.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TreeRenderer } from '../../../src/react/index.js';
import { Segmented } from './ui.jsx';

export const VIEWPORTS = [
  { value: 'fit', label: 'Fit', width: 0 },
  { value: 'desktop', label: 'Desktop', width: 1280 },
  { value: 'tablet', label: 'Tablet', width: 768 },
  { value: 'phone', label: 'Phone', width: 390 },
];

const STAGE_PAD = 24;

/**
 * @param {{
 *   tree: any,
 *   theme: { mode: string, density: string },
 *   snapshot: any,
 *   checks: { at: number, valid: boolean, errors: any[], warnings: any[] }[],
 *   selected: string | null,
 *   onSelect: (id: string | null) => void,
 *   onApprove: () => void,
 *   onRequestChanges: (notes: string) => void,
 *   isReview: boolean,
 *   channel: string | null,
 * }} props
 */
export function Canvas({ tree, theme, snapshot, checks, selected, onSelect, onApprove, onRequestChanges, isReview, channel }) {
  const [viewport, setViewport] = useState('fit');
  const preset = VIEWPORTS.find((v) => v.value === viewport) ?? VIEWPORTS[0];
  const stageRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const frameRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [stageWidth, setStageWidth] = useState(0);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = stageWidth && stageWidth < 480 ? 12 : STAGE_PAD;
  const available = Math.max(0, stageWidth - pad * 2);
  // Fit draws the frame at the stage's own width, at 100%. The presets draw it
  // at their real width and scale it down when the stage is narrower.
  const frameWidth = preset.width || available || 640;
  const zoom = preset.width && available ? Math.min(1, available / preset.width) : 1;
  const node = selected && tree?.nodes?.[selected] ? tree.nodes[selected] : null;

  // Bring the selected node into view inside the stage.
  useEffect(() => {
    if (!selected) return;
    const el = frameRef.current?.querySelector('.h-selected');
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [selected]);

  const nodeCount = tree?.nodes ? Object.keys(tree.nodes).length : 0;

  return (
    <div className="pg-canvas-inner">
      <div className="pg-toolbar">
        <Segmented
          legend="Viewport"
          hideLegend
          name="viewport"
          size="sm"
          value={viewport}
          options={VIEWPORTS.map((v) => ({ value: v.value, label: v.label, hint: v.width ? `${v.width} px wide` : 'The width of this pane' }))}
          onChange={setViewport}
        />
        <p className="pg-toolbar-meta pg-mono pg-small">
          <span>{Math.round(frameWidth)} px</span>
          <span aria-label={`shown at ${Math.round(zoom * 100)} percent`}>{Math.round(zoom * 100)}%</span>
          <span title="Harbor theme, from shared state or the activity">
            {theme.mode} · {theme.density}
          </span>
        </p>
      </div>

      {snapshot.interrupt && isReview ? <ReviewBanner interrupt={snapshot.interrupt} running={snapshot.running} onApprove={onApprove} onRequestChanges={onRequestChanges} /> : null}

      <div className="pg-stage" ref={stageRef} style={{ '--stage-pad': `${pad}px` }}>
        {tree?.root ? (
          <div className="pg-frame-wrap" style={{ width: frameWidth * zoom }}>
            <div className="pg-frame-caption pg-small">
              <span className="pg-frame-title">{tree.title || (channel === 'a2ui-surface' ? 'A2UI surface' : 'Untitled screen')}</span>
              <span className="pg-mono pg-muted pg-frame-meta">
                {nodeCount} component{nodeCount === 1 ? '' : 's'}
                {channel ? ` · ${channel}` : ''}
                {snapshot.running ? ' · streaming' : ''}
              </span>
            </div>
            <div
              className="pg-frame"
              ref={frameRef}
              style={{ width: frameWidth, zoom }}
              data-mode={theme.mode}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onSelect(null);
              }}
            >
              <TreeRenderer tree={tree} theme={theme} onSelect={(id) => onSelect(id)} selected={selected} />
            </div>
          </div>
        ) : (
          <div className="pg-stage-empty">
            <p className="pg-empty-title">{snapshot.running ? 'Waiting for the first component' : 'Nothing on the canvas yet'}</p>
            <p className="pg-muted">Pick an example or describe a screen. Components appear here as the agent streams them, drawn by Harbor’s own React code.</p>
          </div>
        )}
      </div>

      <div className="pg-selection pg-small" aria-live="polite">
        {node ? (
          <>
            <span className="pg-mono">
              <strong>{selected}</strong> {node.type}
            </span>
            <span className="pg-mono pg-muted pg-selection-props">{propsLine(node.props)}</span>
            <button type="button" className="pg-btn pg-btn-quiet pg-btn-sm" onClick={() => onSelect(null)}>
              Clear
            </button>
          </>
        ) : (
          <span className="pg-muted">Click a component on the canvas to see its id and props.</span>
        )}
      </div>

      <Checks checks={checks} tree={tree} selected={selected} onSelect={onSelect} running={snapshot.running} />
    </div>
  );
}

/** @param {Record<string, any> | undefined} props */
function propsLine(props) {
  const entries = Object.entries(props ?? {});
  if (!entries.length) return '{}';
  return `{ ${entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')} }`;
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {{ interrupt: any, running: boolean, onApprove: () => void, onRequestChanges: (notes: string) => void }} props
 */
function ReviewBanner({ interrupt, running, onApprove, onRequestChanges }) {
  const [asking, setAsking] = useState(false);
  const [notes, setNotes] = useState('');
  const notesRef = useRef(/** @type {HTMLTextAreaElement | null} */ (null));
  useEffect(() => {
    if (asking) notesRef.current?.focus();
  }, [asking]);
  return (
    <section className="pg-review" aria-label="Design review">
      <div className="pg-review-text">
        <p className="pg-review-title">Review requested</p>
        <p>{interrupt.message ?? 'The agent is waiting for your answer.'}</p>
        <p className="pg-mono pg-small pg-muted">RUN_FINISHED · interrupt · {interrupt.reason}</p>
      </div>
      {asking ? (
        <form
          className="pg-review-notes"
          onSubmit={(e) => {
            e.preventDefault();
            onRequestChanges(notes.trim());
          }}
        >
          <label htmlFor="pg-review-notes" className="pg-label">
            What should change?
          </label>
          <textarea id="pg-review-notes" ref={notesRef} className="pg-input pg-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Make the primary button full width" />
          <div className="pg-review-actions">
            <button type="submit" className="pg-btn pg-btn-primary" disabled={running}>
              Send notes
            </button>
            <button type="button" className="pg-btn pg-btn-quiet" onClick={() => setAsking(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="pg-review-actions">
          <button type="button" className="pg-btn pg-btn-primary" onClick={onApprove} disabled={running}>
            Approve
          </button>
          <button type="button" className="pg-btn pg-btn-secondary" onClick={() => setAsking(true)} disabled={running}>
            Request changes
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * The validation reports for this turn, in order. The first is usually the
 * one with the planted error; the next is the repaired tree.
 * @param {{ checks: any[], tree: any, selected: string | null, onSelect: (id: string | null) => void, running: boolean }} props
 */
function Checks({ checks, tree, selected, onSelect, running }) {
  const last = checks.at(-1);
  let verdict = 'Not checked yet';
  let tone = 'idle';
  if (last) {
    const repaired = checks.length > 1 && checks.slice(0, -1).some((c) => c.errors.length);
    if (last.errors.length) {
      verdict = `${last.errors.length} contract error${last.errors.length > 1 ? 's' : ''}${running ? ', repairing' : ''}`;
      tone = 'error';
    } else if (last.warnings.length) {
      verdict = `Passed with ${last.warnings.length} guideline warning${last.warnings.length > 1 ? 's' : ''}`;
      tone = 'warning';
    } else {
      verdict = repaired ? 'Passed after repair' : 'Passed';
      tone = 'ok';
    }
  }
  return (
    <section className="pg-checks" aria-label="Contract check">
      <header className="pg-checks-head">
        <h2 className="pg-label">Contract check</h2>
        <span className="pg-pill" data-tone={tone}>
          {verdict}
        </span>
      </header>
      {checks.length === 0 ? (
        <p className="pg-muted pg-small">Every tree is checked against the Harbor catalog. Errors break the contract and go back to the agent. Warnings are Harbor’s usage guidelines, left for review.</p>
      ) : (
        <ol className="pg-check-list">
          {checks.map((c, i) => (
            <li key={`${c.at}-${i}`} className="pg-check">
              <p className="pg-check-title pg-small">
                <span className="pg-mono">Check {i + 1}</span>
                <span className="pg-muted">
                  {c.errors.length} error{c.errors.length === 1 ? '' : 's'} · {c.warnings.length} warning{c.warnings.length === 1 ? '' : 's'}
                  {c.via ? ` · ${c.via}` : ''}
                </span>
              </p>
              {c.errors.length || c.warnings.length ? (
                <ul className="pg-findings">
                  {[...c.errors, ...c.warnings].map((f, j) => (
                    <li key={j}>
                      <Finding finding={f} tree={tree} selected={selected} onSelect={onSelect} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** @param {{ finding: any, tree: any, selected: string | null, onSelect: (id: string | null) => void }} props */
function Finding({ finding, tree, selected, onSelect }) {
  const id = finding.nodeId;
  const exists = id && tree?.nodes?.[id];
  const body = (
    <>
      <span className="pg-sev" data-sev={finding.severity}>
        {finding.severity === 'error' ? 'Error' : 'Guideline'}
      </span>
      <span className="pg-finding-msg">{finding.message}</span>
      {id ? (
        <span className="pg-mono pg-muted pg-finding-node">
          {id}
          {exists ? ` ${tree.nodes[id].type}` : ''}
        </span>
      ) : null}
    </>
  );
  if (!exists) return <div className="pg-finding">{body}</div>;
  return (
    <button type="button" className="pg-finding" aria-pressed={selected === id} onClick={() => onSelect(selected === id ? null : id)} title="Highlight this component on the canvas">
      {body}
    </button>
  );
}
