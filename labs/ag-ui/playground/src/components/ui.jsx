// Small building blocks for the playground chrome: segmented radios, a switch,
// a copy button and highlighted code. All native controls underneath, so
// keyboard behavior (arrows in a radio group, space on a switch) is the
// browser's own.

import { memo, useEffect, useId, useRef, useState } from 'react';
import { tokenizeCode, tokenizeJson } from '../lib/highlight.js';

/**
 * A radio group drawn as a segmented control.
 * @param {{
 *   legend: string,
 *   hideLegend?: boolean,
 *   name: string,
 *   value: string,
 *   options: { value: string, label: string, hint?: string, disabled?: boolean }[],
 *   onChange: (value: string) => void,
 *   size?: 'sm' | 'md',
 *   columns?: number,
 *   describedBy?: string,
 * }} props
 */
export function Segmented({ legend, hideLegend = false, name, value, options, onChange, size = 'md', columns, describedBy }) {
  const id = useId();
  return (
    <fieldset className="pg-seg-field">
      <legend className={hideLegend ? 'pg-visually-hidden' : 'pg-label'}>{legend}</legend>
      <div className="pg-seg" data-size={size} data-cols={columns} style={columns ? { '--seg-cols': columns } : undefined}>
        {options.map((o) => (
          <label key={o.value} className="pg-seg-item" data-checked={o.value === value} title={o.hint}>
            <input
              type="radio"
              name={`${name}-${id}`}
              value={o.value}
              checked={o.value === value}
              disabled={o.disabled}
              aria-describedby={describedBy}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * @param {{ id: string, label: string, description?: string, checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }} props
 */
export function Switch({ id, label, description, checked, onChange, disabled }) {
  return (
    <div className="pg-switch-row">
      <input id={id} type="checkbox" role="switch" className="pg-switch" checked={checked} disabled={disabled} aria-describedby={description ? `${id}-desc` : undefined} onChange={(e) => onChange(e.target.checked)} />
      <div className="pg-switch-text">
        <label htmlFor={id}>{label}</label>
        {description ? (
          <p id={`${id}-desc`} className="pg-muted pg-small">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Copies text on click. Falls back to selecting the target element when the
 * clipboard API is refused (some embedded views do that).
 * @param {{ text: string, label?: string, selectTarget?: () => HTMLElement | null, className?: string }} props
 */
export function CopyButton({ text, label = 'Copy', selectTarget, className = '' }) {
  const [state, setState] = useState(/** @type {'idle' | 'copied' | 'selected'} */ ('idle'));
  const timer = useRef(/** @type {any} */ (null));
  useEffect(() => () => clearTimeout(timer.current), []);
  const settle = (/** @type {'copied' | 'selected'} */ s) => {
    setState(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1600);
  };
  const onClick = () => {
    const fallback = () => {
      const el = selectTarget?.();
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      settle('selected');
    };
    try {
      const p = navigator.clipboard?.writeText(text);
      if (p) p.then(() => settle('copied'), fallback);
      else fallback();
    } catch {
      fallback();
    }
  };
  return (
    <button type="button" className={`pg-btn pg-btn-quiet pg-btn-sm ${className}`} onClick={onClick} disabled={!text}>
      <span aria-live="polite">{state === 'copied' ? 'Copied' : state === 'selected' ? 'Selected, press Ctrl+C' : label}</span>
    </button>
  );
}

/**
 * Pretty JSON with token colors.
 * @param {{ value: unknown, maxHeight?: string, label?: string, wrap?: boolean }} props
 */
export const JsonView = memo(function JsonView({ value, maxHeight, label, wrap = false }) {
  const text = safeStringify(value);
  return (
    <pre className="pg-code" data-wrap={wrap || undefined} style={maxHeight ? { maxHeight } : undefined} tabIndex={0} aria-label={label}>
      <code>
        {tokenizeJson(text).map((tok, i) =>
          tok.t === 'plain' ? (
            tok.v
          ) : (
            <span key={i} className={`tk-${tok.t}`}>
              {tok.v}
            </span>
          ),
        )}
      </code>
    </pre>
  );
});

/**
 * Highlighted JS/JSX.
 * @param {{ code: string, maxHeight?: string, label?: string, preRef?: import('react').Ref<HTMLPreElement> }} props
 */
export const CodeView = memo(function CodeView({ code, maxHeight, label, preRef }) {
  return (
    <pre className="pg-code" ref={preRef} style={maxHeight ? { maxHeight } : undefined} tabIndex={0} aria-label={label}>
      <code>
        {tokenizeCode(code).map((tok, i) =>
          tok.t === 'plain' ? (
            tok.v
          ) : (
            <span key={i} className={`tk-${tok.t}`}>
              {tok.v}
            </span>
          ),
        )}
      </code>
    </pre>
  );
});

/** JSON.stringify that never throws. */
export function safeStringify(/** @type {unknown} */ value) {
  try {
    return JSON.stringify(value, null, 2) ?? 'undefined';
  } catch (error) {
    return String(error);
  }
}

/** @param {{ children: any, title?: string, className?: string }} props */
export function Empty({ title, children, className = '' }) {
  return (
    <div className={`pg-empty ${className}`}>
      {title ? <p className="pg-empty-title">{title}</p> : null}
      <p className="pg-muted">{children}</p>
    </div>
  );
}
